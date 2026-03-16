"""
src/ml_logic/demand_model.py
──────────────────────────────
Motor de demanda basado en reglas y pesos para La Cuchara.

Funciones públicas:
  - classify_dish()        → categoría dietética + keywords
  - get_recommendations()  → platos recomendados para un usuario
  - get_popular_dishes()   → platos más populares (fallback sin historial)
  - get_keywords()         → extracción de palabras clave
  - get_weighted_scores()  → score ponderado por plato desde dbo.Valoracion
  - suggest_weekly_menu()  → propuesta semanal (5 primeros + 5 segundos)
                             con regla de variedad dietética (máx. 2 seguidos)
  - predict_success()      → % de éxito estimado para una lista de IDPlato
"""

from __future__ import annotations

import math
from collections import defaultdict
from typing import Any

from src.ml_logic.classifier import predict_diet, load_classifier
from src.ml_logic.recommender import recommend_for_user, recommend_popular
from src.ml_logic.preprocessor import extract_keywords, build_feature_text


# ──────────────────────────────────────────────────────────────────────────────
# CONSTANTES DE CONFIGURACIÓN
# ──────────────────────────────────────────────────────────────────────────────

# Puntuación neutra que se asigna a platos con menos de MIN_VALORACIONES votos
NEUTRAL_SCORE: float = 3.0
MIN_VALORACIONES: int = 3

# Escala de puntuación visual (1‑5 → 0‑100 %)
PUNTUACION_MAX: float = 5.0

# Número de platos por tipo a incluir en el menú semanal
TOP_PRIMEROS: int = 5
TOP_SEGUNDOS: int = 5

# Máximo de platos consecutivos de la misma categoría dietética
MAX_CONSECUTIVOS: int = 2

# Tipos de plato reconocidos (comparación case‑insensitive)
TIPO_PRIMER_PLATO = {"primer plato", "primeros", "primer", "entrante"}
TIPO_SEGUNDO_PLATO = {"segundo plato", "segundos", "segundo", "principal"}

# Peso del volumen (cantidad de valoraciones) vs. la nota media
#   weighted_score = media_bayesiana * K_NOTA + log_boost * K_VOLUME
K_NOTA: float = 0.7
K_VOLUME: float = 0.3


# ──────────────────────────────────────────────────────────────────────────────
# FUNCIONES INTERNAS
# ──────────────────────────────────────────────────────────────────────────────

def _bayesian_avg(
    total_puntuacion: float,
    n_valoraciones: int,
    global_avg: float,
    m: int = MIN_VALORACIONES,
) -> float:
    """
    Media bayesiana que suaviza platos poco valorados hacia la media global.

    Formula: (n * media_plato + m * prior) / (n + m)
    Donde 'prior' es la puntuación neutra (NEUTRAL_SCORE) si el plato tiene
    pocas valoraciones (<= m), o la media global del catálogo si n > m.
    """
    if n_valoraciones == 0:
        return NEUTRAL_SCORE
    avg_plato = total_puntuacion / n_valoraciones
    prior = global_avg if n_valoraciones >= m else NEUTRAL_SCORE
    return (n_valoraciones * avg_plato + m * prior) / (n_valoraciones + m)


def _log_volume_boost(n_valoraciones: int) -> float:
    """
    Boost logarítmico por volumen de votos, normalizado a [0, 1].
    log(n+1) / log(n_max+1)  → devuelve 0 si n=0, ~1 si n muy alto.
    Usamos log(200+1) como denominador de referencia razonable.
    """
    return math.log1p(n_valoraciones) / math.log1p(200)


def _get_categoria(plato: dict) -> str:
    """
    Obtiene la categoría dietética de un plato.
    Si el plato ya trae el campo 'CategoriaDietetica' lo usa directamente;
    si no, llama al clasificador en tiempo real.
    """
    if plato.get("CategoriaDietetica"):
        return plato["CategoriaDietetica"]
    result = predict_diet(
        nombre_plato=plato.get("NombrePlato", ""),
        descripcion=plato.get("Descripcion"),
        tipo=plato.get("Tipo"),
    )
    return result.get("categoria", "Otro")


def _apply_variety_rule(
    candidates: list[dict],
    max_consecutive: int = MAX_CONSECUTIVOS,
) -> list[dict]:
    """
    Filtra la lista de candidatos para que no aparezcan más de
    `max_consecutive` platos de la misma categoría dietética seguidos.

    Algoritmo greedy: itera los candidatos (ya ordenados por score desc.)
    e inserta cada uno si no rompe la restricción; los restantes que no
    encajan se añaden al final respetando el orden relativo.
    """
    selected: list[dict] = []
    pending: list[dict] = list(candidates)

    while pending:
        placed = False
        for i, plato in enumerate(pending):
            cat = plato.get("_categoria", "Otro")
            # Contar cuántos seguidos hay al final de `selected`
            consecutive = 0
            for p in reversed(selected):
                if p.get("_categoria") == cat:
                    consecutive += 1
                else:
                    break
            if consecutive < max_consecutive:
                selected.append(plato)
                pending.pop(i)
                placed = True
                break
        if not placed:
            # Ningún candidato encaja ahora → tomar el primero restante
            # (evita bucle infinito)
            selected.append(pending.pop(0))

    return selected


# ──────────────────────────────────────────────────────────────────────────────
# API PÚBLICA — FUNCIONES HEREDADAS (compatibilidad con el resto del proyecto)
# ──────────────────────────────────────────────────────────────────────────────

def classify_dish(
    nombre_plato: str,
    descripcion: str | None = None,
    tipo: str | None = None,
) -> dict[str, Any]:
    """
    Clasifica un plato por categoría dietética.

    Returns:
        {
          "categoria":      "Pescado" | "Carne" | "Vegetariano" | "Pasta" | "Otro",
          "confianza":      float (0-1),
          "probabilidades": dict,
          "keywords":       list[str],
        }
    """
    return predict_diet(nombre_plato, descripcion, tipo)


def get_recommendations(
    id_usuario: int,
    valoraciones: list[dict],
    platos: list[dict],
    top_n: int = 5,
) -> list[dict[str, Any]]:
    """
    Devuelve recomendaciones de platos para un usuario.

    Args:
        id_usuario:   ID del usuario
        valoraciones: Lista de valoraciones [{IDUsuario, IDPlato, Puntuacion}]
        platos:       Lista de platos [{IDPlato, NombrePlato, Descripcion, Tipo}]
        top_n:        Máximo de recomendaciones

    Returns:
        Lista ordenada de platos recomendados con score y motivo.
    """
    return recommend_for_user(id_usuario, valoraciones, platos, top_n)


def get_popular_dishes(
    valoraciones: list[dict],
    platos: list[dict],
    top_n: int = 5,
) -> list[dict[str, Any]]:
    """
    Devuelve los platos más populares (para usuarios sin historial).

    Args:
        valoraciones: Lista de valoraciones
        platos:       Lista de platos
        top_n:        Máximo de resultados

    Returns:
        Lista de platos populares con score Bayesiano.
    """
    return recommend_popular(valoraciones, platos, top_n)


def get_keywords(texto: str, n: int = 5) -> list[str]:
    """
    Extrae palabras clave de un texto de plato para el frontend Next.js.

    Args:
        texto: Nombre y/o descripción del plato
        n:     Número de keywords

    Returns:
        Lista de strings con las palabras clave
    """
    return extract_keywords(texto, n)


# ──────────────────────────────────────────────────────────────────────────────
# NUEVAS FUNCIONES — MOTOR DE DEMANDA BASADO EN REGLAS Y PESOS
# ──────────────────────────────────────────────────────────────────────────────

def get_weighted_scores(
    valoraciones: list[dict],
    platos: list[dict],
) -> list[dict[str, Any]]:
    """
    Calcula el Weighted Score de cada plato a partir de las valoraciones.

    El score combina:
      - Media bayesiana (suavizada con NEUTRAL_SCORE para platos < 3 votos)
      - Boost logarítmico por volumen de votos

    Args:
        valoraciones: Lista de dicts con al menos {IDPlato, Puntuacion}.
                      Acepta tanto pydantic-like objects como dicts planos.
        platos:       Lista de dicts con al menos {IDPlato, NombrePlato, Tipo}.

    Returns:
        Lista de dicts ordenada de mayor a menor weighted_score:
        [
          {
            "IDPlato":          int,
            "NombrePlato":      str,
            "Tipo":             str | None,
            "media_puntuacion": float,   # media real (o NEUTRAL_SCORE si < 3)
            "n_valoraciones":   int,
            "weighted_score":   float,   # valor final usado por el modelo
          },
          ...
        ]
    """
    # Normalizar valoraciones (objetos SQLAlchemy o dicts)
    def _get(obj, key, default=None):
        if isinstance(obj, dict):
            return obj.get(key, default)
        return getattr(obj, key, default)

    # Acumular puntuaciones por plato
    acumulado: dict[int, list[float]] = defaultdict(list)
    for v in valoraciones:
        plato_id = _get(v, "IDPlato")
        puntuacion = _get(v, "Puntuacion")
        if plato_id is not None and puntuacion is not None:
            acumulado[plato_id].append(float(puntuacion))

    # Media global de todas las valoraciones válidas
    todas = [p for puntos in acumulado.values() for p in puntos]
    global_avg = sum(todas) / len(todas) if todas else NEUTRAL_SCORE

    # Construir índice de platos
    plato_index: dict[int, dict] = {}
    for p in platos:
        pid = _get(p, "IDPlato")
        if pid is not None:
            plato_index[pid] = {
                "IDPlato":     pid,
                "NombrePlato": _get(p, "NombrePlato", ""),
                "Tipo":        _get(p, "Tipo"),
                "Descripcion": _get(p, "Descripcion"),
            }

    results: list[dict] = []
    for pid, plato_data in plato_index.items():
        puntos = acumulado.get(pid, [])
        n = len(puntos)
        total = sum(puntos)

        # Failsafe: < MIN_VALORACIONES → puntuación neutra
        if n < MIN_VALORACIONES:
            media_real = (total / n) if n > 0 else NEUTRAL_SCORE
            bayes = NEUTRAL_SCORE          # se castiga con la neutra
            boost = _log_volume_boost(n)
        else:
            media_real = total / n
            bayes = _bayesian_avg(total, n, global_avg)
            boost = _log_volume_boost(n)

        weighted_score = K_NOTA * bayes + K_VOLUME * boost * PUNTUACION_MAX

        results.append({
            "IDPlato":          pid,
            "NombrePlato":      plato_data["NombrePlato"],
            "Tipo":             plato_data["Tipo"],
            "Descripcion":      plato_data.get("Descripcion"),
            "media_puntuacion": round(media_real, 4),
            "n_valoraciones":   n,
            "weighted_score":   round(weighted_score, 4),
        })

    return sorted(results, key=lambda x: x["weighted_score"], reverse=True)


def suggest_weekly_menu(
    valoraciones: list[dict],
    platos: list[dict],
    top_primeros: int = TOP_PRIMEROS,
    top_segundos: int = TOP_SEGUNDOS,
) -> dict[str, list[dict[str, Any]]]:
    """
    Propone un menú semanal seleccionando los mejores platos por tipo,
    aplicando la regla de variedad dietética (máx. 2 del mismo tipo seguidos).

    Args:
        valoraciones:  Lista de valoraciones [{IDPlato, Puntuacion}]
        platos:        Lista de platos [{IDPlato, NombrePlato, Tipo, ...}]
        top_primeros:  Número de primeros platos a seleccionar (def. 5)
        top_segundos:  Número de segundos platos a seleccionar (def. 5)

    Returns:
        {
          "primeros": [ {IDPlato, NombrePlato, weighted_score, categoria, ...} ],
          "segundos": [ {IDPlato, NombrePlato, weighted_score, categoria, ...} ],
        }
    """
    scores = get_weighted_scores(valoraciones, platos)

    primeros_pool: list[dict] = []
    segundos_pool: list[dict] = []

    for plato in scores:
        raw_tipo = (plato.get("Tipo") or "").lower().strip()
        if raw_tipo in TIPO_PRIMER_PLATO:
            categoria = _get_categoria(plato)
            plato["_categoria"] = categoria
            primeros_pool.append(plato)
        elif raw_tipo in TIPO_SEGUNDO_PLATO:
            categoria = _get_categoria(plato)
            plato["_categoria"] = categoria
            segundos_pool.append(plato)

    # Ya están ordenados por score desc. → aplicar regla de variedad
    primeros_sel = _apply_variety_rule(primeros_pool)[:top_primeros]
    segundos_sel = _apply_variety_rule(segundos_pool)[:top_segundos]

    def _clean(platos_sel: list[dict]) -> list[dict]:
        """Elimina campos internos y añade campo legible 'categoria'."""
        out = []
        for p in platos_sel:
            item = {k: v for k, v in p.items() if not k.startswith("_")}
            item["categoria"] = p.get("_categoria", "Otro")
            out.append(item)
        return out

    return {
        "primeros": _clean(primeros_sel),
        "segundos": _clean(segundos_sel),
    }


def predict_success(
    id_platos: list[int],
    valoraciones: list[dict],
    platos: list[dict],
) -> dict[str, Any]:
    """
    Predictor de éxito para una selección de platos (p.ej. un menú concreto).

    Calcula el porcentaje de éxito esperado basado en la media de los
    Weighted Scores históricos de los platos indicados.

    Args:
        id_platos:    Lista de IDPlato a evaluar.
        valoraciones: Lista completa de valoraciones [{IDPlato, Puntuacion}].
        platos:       Lista completa de platos [{IDPlato, NombrePlato, ...}].

    Returns:
        {
          "porcentaje_exito": float,    # 0 – 100 %
          "score_medio":      float,    # Weighted Score medio (0 – 5)
          "detalle": [
              {
                "IDPlato":        int,
                "NombrePlato":    str,
                "weighted_score": float,
                "n_valoraciones": int,
              },
              ...
          ]
        }
    """
    if not id_platos:
        return {"porcentaje_exito": 0.0, "score_medio": 0.0, "detalle": []}

    all_scores = get_weighted_scores(valoraciones, platos)
    score_by_id = {s["IDPlato"]: s for s in all_scores}

    detalle: list[dict] = []
    total_score = 0.0

    for pid in id_platos:
        if pid in score_by_id:
            s = score_by_id[pid]
            detalle.append({
                "IDPlato":        pid,
                "NombrePlato":    s["NombrePlato"],
                "weighted_score": s["weighted_score"],
                "n_valoraciones": s["n_valoraciones"],
            })
            total_score += s["weighted_score"]
        else:
            # Plato sin datos → puntuación neutra
            plato_info = next(
                (p for p in platos if (
                    p.get("IDPlato") if isinstance(p, dict) else getattr(p, "IDPlato", None)
                ) == pid),
                None,
            )
            nombre = ""
            if plato_info:
                nombre = (
                    plato_info.get("NombrePlato")
                    if isinstance(plato_info, dict)
                    else getattr(plato_info, "NombrePlato", "")
                ) or ""
            detalle.append({
                "IDPlato":        pid,
                "NombrePlato":    nombre,
                "weighted_score": NEUTRAL_SCORE,
                "n_valoraciones": 0,
            })
            total_score += NEUTRAL_SCORE

    score_medio = total_score / len(id_platos)

    # Convertir score medio (0–5) a porcentaje (0–100 %)
    porcentaje = round((score_medio / PUNTUACION_MAX) * 100, 2)

    return {
        "porcentaje_exito": porcentaje,
        "score_medio":      round(score_medio, 4),
        "detalle":          detalle,
    }
