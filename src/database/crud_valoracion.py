"""
crud_valoracion.py
──────────────────
CRUD para el modelo Valoracion.
"""

from datetime import datetime
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models import Valoracion


# ── CREATE ────────────────────────────────────────────────────────────────────
async def create_valoracion(
    session: AsyncSession,
    id_plato: int,
    id_usuario: int,
    puntuacion: float | None = None,
    comentario: str | None = None,
) -> Valoracion:
    valoracion = Valoracion(
        IDPlato=id_plato,
        IDUsuario=id_usuario,
        Puntuacion=puntuacion,
        Comentario=comentario,
        Fecha=datetime.now(),
    )
    session.add(valoracion)
    await session.flush()
    return valoracion


# ── READ ──────────────────────────────────────────────────────────────────────
async def get_valoracion_by_id(session: AsyncSession, id_valoracion: int) -> Valoracion | None:
    result = await session.execute(
        select(Valoracion).where(Valoracion.IDValoracion == id_valoracion)
    )
    return result.scalar_one_or_none()


async def get_all_valoraciones(session: AsyncSession) -> list[Valoracion]:
    result = await session.execute(select(Valoracion))
    return result.scalars().all()


async def get_valoraciones_by_plato(session: AsyncSession, id_plato: int) -> list[Valoracion]:
    result = await session.execute(
        select(Valoracion).where(Valoracion.IDPlato == id_plato)
    )
    return result.scalars().all()


async def get_valoraciones_by_usuario(session: AsyncSession, id_usuario: int) -> list[Valoracion]:
    result = await session.execute(
        select(Valoracion).where(Valoracion.IDUsuario == id_usuario)
    )
    return result.scalars().all()


async def get_media_puntuacion(session: AsyncSession, id_plato: int) -> float | None:
    """Devuelve la puntuación media de un plato."""
    result = await session.execute(
        select(func.avg(Valoracion.Puntuacion)).where(Valoracion.IDPlato == id_plato)
    )
    return result.scalar_one_or_none()


async def get_valoracion_usuario_plato(
    session: AsyncSession, id_usuario: int, id_plato: int
) -> Valoracion | None:
    """Comprueba si un usuario ya valoró un plato concreto."""
    result = await session.execute(
        select(Valoracion).where(
            Valoracion.IDUsuario == id_usuario,
            Valoracion.IDPlato == id_plato,
        )
    )
    return result.scalar_one_or_none()


# ── UPDATE ────────────────────────────────────────────────────────────────────
async def update_valoracion(
    session: AsyncSession,
    id_valoracion: int,
    puntuacion: float | None = None,
    comentario: str | None = None,
) -> Valoracion | None:
    valoracion = await get_valoracion_by_id(session, id_valoracion)
    if not valoracion:
        return None
    if puntuacion is not None:
        valoracion.Puntuacion = puntuacion
    if comentario is not None:
        valoracion.Comentario = comentario
    valoracion.Fecha = datetime.now()   # actualiza la fecha al editar
    await session.flush()
    return valoracion


# ── DELETE ────────────────────────────────────────────────────────────────────
async def delete_valoracion(session: AsyncSession, id_valoracion: int) -> bool:
    valoracion = await get_valoracion_by_id(session, id_valoracion)
    if not valoracion:
        return False
    await session.delete(valoracion)
    await session.flush()
    return True
