"""
src/ml_logic/demand_model.py
──────────────────────────────
Fachada pública del motor ML de La Cuchara.

Importa y expone de forma unificada:
 - classify_dish()     → categoría dietética + keywords
 - get_recommendations() → platos recomendados para un usuario
"""

from __future__ import annotations

from typing import Any

from src.ml_logic.classifier import predict_diet, load_classifier
from src.ml_logic.recommender import recommend_for_user, recommend_popular
from src.ml_logic.preprocessor import extract_keywords, build_feature_text


def classify_dish(
    nombre_plato: str,
    descripcion: str | None = None,
    tipo: str | None = None,
) -> dict[str, Any]:
    """
    Clasifica un plato por categoría dietética.

    Args:
        nombre_plato: Nombre del plato
        descripcion:  Descripción (máx. 150 chars recomendado)
        tipo:         Tipo de plato (Primer Plato, Segundo Plato, Postre…)

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
