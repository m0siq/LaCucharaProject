"""
src/api/routers/ml.py
──────────────────────
Router FastAPI para el motor ML de La Cuchara.

Endpoints:
  POST /ml/clasificar                → Categoría dietética de un plato
  GET  /ml/recomendar/{id_usuario}   → Platos recomendados para un usuario
  POST /ml/keywords                  → Palabras clave para filtrado frontend
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.api.dependencies import get_db
from src.database.models import Plato, Valoracion
from src.ml_logic.demand_model import (
    classify_dish,
    get_recommendations,
    get_popular_dishes,
    get_keywords,
    get_weighted_scores,
    suggest_weekly_menu,
    predict_success,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ml", tags=["Machine Learning"])


# ──────────────────────────────────────────────────────────────────────────────
# Schemas Pydantic
# ──────────────────────────────────────────────────────────────────────────────

class ClasificarRequest(BaseModel):
    nombre_plato: str = Field(..., min_length=1, max_length=150, example="Merluza a la romana")
    descripcion:  str | None = Field(None, max_length=500, example="Filete de merluza rebozado con limón y perejil")
    tipo:         str | None = Field(None, max_length=50, example="Segundo Plato")


class ClasificarResponse(BaseModel):
    categoria:      str
    confianza:      float
    probabilidades: dict[str, float]
    keywords:       list[str]


class PlatoRecomendado(BaseModel):
    IDPlato:     int
    NombrePlato: str
    Tipo:        str | None
    Descripcion: str | None
    score:       float
    motivo:      str   # "colaborativo" | "popular"


class RecomendacionResponse(BaseModel):
    id_usuario:      int
    recomendaciones: list[PlatoRecomendado]
    total:           int


class KeywordsRequest(BaseModel):
    texto: str = Field(..., min_length=1, max_length=600, example="Ensalada César con pollo a la plancha")
    n:     int = Field(5, ge=1, le=15, description="Número de palabras clave")


class KeywordsResponse(BaseModel):
    keywords: list[str]
    total:    int


# ── Schemas para Menú Semanal ─────────────────────────────────────────────────

class PlatoMenuSemanal(BaseModel):
    IDPlato:          int
    NombrePlato:      str
    Tipo:             str | None
    weighted_score:   float
    media_puntuacion: float
    n_valoraciones:   int
    categoria:        str


class MenuSemanalResponse(BaseModel):
    primeros: list[PlatoMenuSemanal]
    segundos: list[PlatoMenuSemanal]


# ── Schemas para Predictor de Éxito ──────────────────────────────────────────

class ExitoRequest(BaseModel):
    id_platos: list[int] = Field(..., min_length=1, max_length=50)


class DetallePlato(BaseModel):
    IDPlato:        int
    NombrePlato:    str
    weighted_score: float
    n_valoraciones: int


class ExitoResponse(BaseModel):
    porcentaje_exito: float
    score_medio:      float
    detalle:          list[DetallePlato]


# ──────────────────────────────────────────────────────────────────────────────
# Helper: extraer datos de la BD para ML
# ──────────────────────────────────────────────────────────────────────────────

async def _get_valoraciones_dict(db: AsyncSession) -> list[dict]:
    result = await db.execute(
        select(Valoracion.IDUsuario, Valoracion.IDPlato, Valoracion.Puntuacion)
        .where(Valoracion.Puntuacion.isnot(None))
    )
    rows = result.all()
    return [
        {"IDUsuario": r.IDUsuario, "IDPlato": r.IDPlato, "Puntuacion": float(r.Puntuacion)}
        for r in rows
    ]


async def _get_platos_dict(db: AsyncSession) -> list[dict]:
    result = await db.execute(
        select(Plato.IDPlato, Plato.NombrePlato, Plato.Descripcion, Plato.Tipo)
    )
    rows = result.all()
    return [
        {"IDPlato": r.IDPlato, "NombrePlato": r.NombrePlato,
         "Descripcion": r.Descripcion, "Tipo": r.Tipo}
        for r in rows
    ]


# ──────────────────────────────────────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.post(
    "/clasificar",
    response_model=ClasificarResponse,
    summary="Clasifica la categoría dietética de un plato",
    description=(
        "Analiza el nombre, descripción y tipo de un plato mediante NLP "
        "y devuelve su categoría dietética (Pescado, Carne, Vegetariano, Pasta u Otro), "
        "el nivel de confianza y las palabras clave extraídas."
    ),
)
async def clasificar_plato(datos: ClasificarRequest) -> ClasificarResponse:
    """
    Clasifica un plato por categoría dietética usando el clasificador ML.
    """
    try:
        result = classify_dish(
            nombre_plato=datos.nombre_plato,
            descripcion=datos.descripcion,
            tipo=datos.tipo,
        )
        return ClasificarResponse(**result)
    except Exception as exc:
        logger.exception("Error al clasificar plato: %s", exc)
        raise HTTPException(status_code=500, detail=f"Error en clasificación ML: {exc}") from exc


@router.get(
    "/recomendar/{id_usuario}",
    response_model=RecomendacionResponse,
    summary="Recomienda platos para un usuario",
    description=(
        "Devuelve platos recomendados para un usuario basándose en "
        "su historial de valoraciones (Collaborative Filtering). "
        "Si el usuario no tiene historial, usa popularidad global (cold start)."
    ),
)
async def recomendar_platos(
    id_usuario: int,
    top_n: int = Query(5, ge=1, le=20, description="Número de recomendaciones"),
    db: AsyncSession = Depends(get_db),
) -> RecomendacionResponse:
    """
    Recomienda platos personalizados para un usuario.
    """
    try:
        valoraciones = await _get_valoraciones_dict(db)
        platos = await _get_platos_dict(db)

        if not platos:
            raise HTTPException(
                status_code=404,
                detail="No hay platos en la base de datos para generar recomendaciones"
            )

        recomendaciones = get_recommendations(
            id_usuario=id_usuario,
            valoraciones=valoraciones,
            platos=platos,
            top_n=top_n,
        )

        # Si no hay recomendaciones colaborativas, usar popularidad
        if not recomendaciones:
            recomendaciones = get_popular_dishes(valoraciones, platos, top_n)

        return RecomendacionResponse(
            id_usuario=id_usuario,
            recomendaciones=[PlatoRecomendado(**r) for r in recomendaciones],
            total=len(recomendaciones),
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error al generar recomendaciones: %s", exc)
        raise HTTPException(status_code=500, detail=f"Error en recomendator ML: {exc}") from exc


@router.get(
    "/populares",
    response_model=RecomendacionResponse,
    summary="Platos más populares (sin historial de usuario)",
    description="Devuelve los platos con mejor puntuación media bayesiana. Ideal para la pantalla de inicio.",
)
async def platos_populares(
    top_n: int = Query(5, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
) -> RecomendacionResponse:
    """
    Devuelve los platos más populares basándose en las valoraciones.
    """
    try:
        valoraciones = await _get_valoraciones_dict(db)
        platos = await _get_platos_dict(db)

        populares = get_popular_dishes(valoraciones, platos, top_n)

        return RecomendacionResponse(
            id_usuario=0,
            recomendaciones=[PlatoRecomendado(**r) for r in populares],
            total=len(populares),
        )
    except Exception as exc:
        logger.exception("Error al obtener platos populares: %s", exc)
        raise HTTPException(status_code=500, detail=f"Error en popularidad ML: {exc}") from exc


@router.post(
    "/keywords",
    response_model=KeywordsResponse,
    summary="Extrae palabras clave de un texto de plato",
    description=(
        "Extrae las N palabras clave más relevantes de la descripción de un plato "
        "para usarlas en filtros y búsquedas del frontend Next.js."
    ),
)
async def extraer_keywords(datos: KeywordsRequest) -> KeywordsResponse:
    """
    Extrae palabras clave de una descripción para filtrado en frontend.
    """
    try:
        keywords = get_keywords(datos.texto, datos.n)
        return KeywordsResponse(keywords=keywords, total=len(keywords))
    except Exception as exc:
        logger.exception("Error al extraer keywords: %s", exc)
        raise HTTPException(status_code=500, detail=f"Error extrayendo keywords: {exc}") from exc


@router.post(
    "/clasificar/batch",
    response_model=list[ClasificarResponse],
    summary="Clasifica varios platos en lote",
    description="Clasifica hasta 50 platos de una sola llamada. Útil tras una extracción OCR.",
)
async def clasificar_batch(platos: list[ClasificarRequest]) -> list[ClasificarResponse]:
    """
    Clasifica múltiples platos en lote (máximo 50).
    """
    if len(platos) > 50:
        raise HTTPException(status_code=400, detail="Máximo 50 platos por lote")
    results = []
    for p in platos:
        try:
            r = classify_dish(p.nombre_plato, p.descripcion, p.tipo)
            results.append(ClasificarResponse(**r))
        except Exception as exc:
            logger.warning("Error clasificando '%s': %s", p.nombre_plato, exc)
            results.append(ClasificarResponse(
                categoria="Otro",
                confianza=0.0,
                probabilidades={},
                keywords=[],
            ))
    return results


@router.get(
    "/menu-semanal",
    response_model=MenuSemanalResponse,
    summary="Propuesta de menú semanal basada en demanda",
    description=(
        "Devuelve los 5 mejores primeros platos y 5 mejores segundos platos "
        "ordenados por Weighted Score (media bayesiana + volumen de votos). "
        "Aplica la regla de variedad dietética: máx. 2 platos seguidos del mismo tipo."
    ),
)
async def menu_semanal(
    top_primeros: int = Query(5, ge=1, le=10, description="Número de primeros platos"),
    top_segundos: int = Query(5, ge=1, le=10, description="Número de segundos platos"),
    db: AsyncSession = Depends(get_db),
) -> MenuSemanalResponse:
    """Propone el mejor menú semanal según las valoraciones históricas."""
    try:
        valoraciones = await _get_valoraciones_dict(db)
        platos       = await _get_platos_dict(db)

        resultado = suggest_weekly_menu(
            valoraciones=valoraciones,
            platos=platos,
            top_primeros=top_primeros,
            top_segundos=top_segundos,
        )

        return MenuSemanalResponse(
            primeros=[PlatoMenuSemanal(**p) for p in resultado["primeros"]],
            segundos=[PlatoMenuSemanal(**p) for p in resultado["segundos"]],
        )
    except Exception as exc:
        logger.exception("Error en menu-semanal: %s", exc)
        raise HTTPException(status_code=500, detail=f"Error generando menú semanal: {exc}") from exc


@router.post(
    "/exito",
    response_model=ExitoResponse,
    summary="Predictor de éxito para una selección de platos",
    description=(
        "Recibe una lista de IDPlato y devuelve el porcentaje de éxito esperado "
        "basado en la media de sus Weighted Scores históricos. "
        "Platos sin valoraciones reciben puntuación neutra (3.0 / 60%)."
    ),
)
async def predecir_exito(
    datos: ExitoRequest,
    db: AsyncSession = Depends(get_db),
) -> ExitoResponse:
    """Calcula el porcentaje de éxito estimado para una lista de platos."""
    try:
        valoraciones = await _get_valoraciones_dict(db)
        platos       = await _get_platos_dict(db)

        resultado = predict_success(
            id_platos=datos.id_platos,
            valoraciones=valoraciones,
            platos=platos,
        )

        return ExitoResponse(
            porcentaje_exito=resultado["porcentaje_exito"],
            score_medio=resultado["score_medio"],
            detalle=[DetallePlato(**d) for d in resultado["detalle"]],
        )
    except Exception as exc:
        logger.exception("Error en predictor de éxito: %s", exc)
        raise HTTPException(status_code=500, detail=f"Error en predictor: {exc}") from exc
