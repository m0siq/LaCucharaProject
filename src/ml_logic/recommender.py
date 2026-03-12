"""
src/ml_logic/recommender.py
────────────────────────────
Sistema de recomendación híbrido para La Cuchara:

 1. Collaborative Filtering (User-Based):
    Calcula la similitud coseno entre perfiles de usuario (vectores de ratings)
    y recomienda platos que usuarios similares han valorado bien.

 2. Popularidad (fallback cold-start):
    Cuando un usuario no tiene historial suficiente, recomienda los platos
    con mayor puntuación media global.
"""

from __future__ import annotations

import logging
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────────────
# Tipos de datos
# ──────────────────────────────────────────────────────────────────────────────
# Valoracion dict esperado:
#   {"IDUsuario": int, "IDPlato": int, "Puntuacion": float}
# Plato dict esperado:
#   {"IDPlato": int, "NombrePlato": str, "Descripcion": str|None, "Tipo": str|None}

Rating = dict[str, Any]
PlatoInfo = dict[str, Any]


# ──────────────────────────────────────────────────────────────────────────────
# Utilidades
# ──────────────────────────────────────────────────────────────────────────────

def _cosine_similarity_row(v1: np.ndarray, v2: np.ndarray) -> float:
    """Similitud coseno entre dos vectores."""
    norm1 = np.linalg.norm(v1)
    norm2 = np.linalg.norm(v2)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return float(np.dot(v1, v2) / (norm1 * norm2))


def _build_rating_matrix(
    valoraciones: list[Rating],
) -> tuple[np.ndarray, list[int], list[int]]:
    """
    Construye la matriz usuario×plato de ratings.

    Returns:
        matrix:    np.ndarray shape (n_usuarios, n_platos)
        user_ids:  lista ordenada de IDUsuario
        plato_ids: lista ordenada de IDPlato
    """
    user_ids = sorted({v["IDUsuario"] for v in valoraciones})
    plato_ids = sorted({v["IDPlato"] for v in valoraciones})

    user_idx = {u: i for i, u in enumerate(user_ids)}
    plato_idx = {p: j for j, p in enumerate(plato_ids)}

    matrix = np.zeros((len(user_ids), len(plato_ids)), dtype=np.float32)
    for v in valoraciones:
        ui = user_idx[v["IDUsuario"]]
        pi = plato_idx[v["IDPlato"]]
        matrix[ui, pi] = float(v["Puntuacion"])

    return matrix, user_ids, plato_ids


# ──────────────────────────────────────────────────────────────────────────────
# Recomendación por popularidad (cold start)
# ──────────────────────────────────────────────────────────────────────────────

def recommend_popular(
    valoraciones: list[Rating],
    platos: list[PlatoInfo],
    top_n: int = 5,
) -> list[dict]:
    """
    Recomienda los platos con mayor puntuación media global.
    Fallback para usuarios nuevos sin historial.

    Returns:
        Lista de dicts con IDPlato, NombrePlato, score y motivo.
    """
    if not valoraciones:
        logger.warning("Sin valoraciones disponibles para popularidad")
        return []

    # Agregar puntuaciones por plato
    scores: dict[int, list[float]] = {}
    for v in valoraciones:
        pid = v["IDPlato"]
        if pid not in scores:
            scores[pid] = []
        scores[pid].append(float(v["Puntuacion"]))

    # Media ponderada: bayesian average (con prior m=3.0, C=5 valoraciones)
    C = 5.0
    m = 3.0
    bayesian: list[tuple[int, float]] = []
    for pid, ratings in scores.items():
        n = len(ratings)
        mean = np.mean(ratings)
        bayes_score = (C * m + n * mean) / (C + n)
        bayesian.append((pid, round(float(bayes_score), 4)))

    bayesian.sort(key=lambda x: x[1], reverse=True)

    # Enriquecer con info de plato
    plato_map = {p["IDPlato"]: p for p in platos}
    result = []
    for pid, score in bayesian[:top_n]:
        info = plato_map.get(pid, {})
        result.append({
            "IDPlato": pid,
            "NombrePlato": info.get("NombrePlato", f"Plato #{pid}"),
            "Tipo": info.get("Tipo"),
            "Descripcion": info.get("Descripcion"),
            "score": score,
            "motivo": "popular",
        })
    return result


# ──────────────────────────────────────────────────────────────────────────────
# Recomendación colaborativa (User-Based CF)
# ──────────────────────────────────────────────────────────────────────────────

def recommend_for_user(
    id_usuario: int,
    valoraciones: list[Rating],
    platos: list[PlatoInfo],
    top_n: int = 5,
    min_ratings: int = 2,
) -> list[dict]:
    """
    Recomienda platos para un usuario específico usando User-Based CF.

    Si el usuario tiene menos de `min_ratings` valoraciones, hace fallback
    a popularidad global (cold start).

    Args:
        id_usuario:   ID del usuario objetivo
        valoraciones: Lista de todas las valoraciones en la BD
        platos:       Lista de todos los platos en la BD
        top_n:        Número de recomendaciones a devolver
        min_ratings:  Mínimo de valoraciones para usar CF

    Returns:
        Lista de dicts con IDPlato, NombrePlato, score y motivo.
    """
    if not valoraciones:
        logger.warning("Sin valoraciones disponibles")
        return []

    plato_map = {p["IDPlato"]: p for p in platos}

    # Valoraciones del usuario objetivo
    user_ratings = [v for v in valoraciones if v["IDUsuario"] == id_usuario]

    if len(user_ratings) < min_ratings:
        logger.info(
            "Usuario %d tiene %d valoraciones < %d → fallback popularidad",
            id_usuario, len(user_ratings), min_ratings
        )
        popular = recommend_popular(valoraciones, platos, top_n)
        # Excluir platos que el usuario ya valoró
        ya_valorados = {v["IDPlato"] for v in user_ratings}
        popular = [r for r in popular if r["IDPlato"] not in ya_valorados]
        return popular[:top_n]

    # Construir matriz de ratings
    matrix, user_ids, plato_ids = _build_rating_matrix(valoraciones)

    if id_usuario not in user_ids:
        return recommend_popular(valoraciones, platos, top_n)

    user_idx_map = {u: i for i, u in enumerate(user_ids)}
    plato_idx_map = {p: j for j, p in enumerate(plato_ids)}

    target_idx = user_idx_map[id_usuario]
    target_vector = matrix[target_idx]

    # Calcular similitud con todos los demás usuarios
    similarities: list[tuple[int, float]] = []
    for i, uid in enumerate(user_ids):
        if uid == id_usuario:
            continue
        sim = _cosine_similarity_row(target_vector, matrix[i])
        if sim > 0:
            similarities.append((i, sim))

    if not similarities:
        return recommend_popular(valoraciones, platos, top_n)

    # Ordenar por similitud descendente, tomar top-K vecinos
    similarities.sort(key=lambda x: x[1], reverse=True)
    top_k_neighbors = similarities[:10]

    # Platos que el usuario objetivo ya valoró (excluir de recomendaciones)
    ya_valorados = {v["IDPlato"] for v in user_ratings}

    # Calcular puntuaciones ponderadas para platos no valorados
    weighted_scores: dict[int, float] = {}
    sim_sums: dict[int, float] = {}

    for neighbor_idx, sim in top_k_neighbors:
        for j, pid in enumerate(plato_ids):
            if pid in ya_valorados:
                continue
            rating = matrix[neighbor_idx, j]
            if rating > 0:
                weighted_scores[pid] = weighted_scores.get(pid, 0.0) + sim * rating
                sim_sums[pid] = sim_sums.get(pid, 0.0) + sim

    if not weighted_scores:
        return recommend_popular(valoraciones, platos, top_n)

    # Normalizar puntuaciones
    predictions: list[tuple[int, float]] = []
    for pid, wscore in weighted_scores.items():
        if sim_sums[pid] > 0:
            pred = wscore / sim_sums[pid]
            predictions.append((pid, round(float(pred), 4)))

    predictions.sort(key=lambda x: x[1], reverse=True)

    # Enriquecer resultado con info del plato
    result = []
    for pid, score in predictions[:top_n]:
        info = plato_map.get(pid, {})
        result.append({
            "IDPlato": pid,
            "NombrePlato": info.get("NombrePlato", f"Plato #{pid}"),
            "Tipo": info.get("Tipo"),
            "Descripcion": info.get("Descripcion"),
            "score": score,
            "motivo": "colaborativo",
        })
    return result
