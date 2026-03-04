"""
crud_plato.py
─────────────
CRUD para el modelo Plato.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models import Plato


# ── CREATE ────────────────────────────────────────────────────────────────────
async def create_plato(
    session: AsyncSession,
    nombre: str,
    descripcion: str | None = None,
    tipo: str | None = None,
) -> Plato:
    plato = Plato(NombrePlato=nombre, Descripcion=descripcion, Tipo=tipo)
    session.add(plato)
    await session.flush()
    return plato


# ── READ ──────────────────────────────────────────────────────────────────────
async def get_plato_by_id(session: AsyncSession, id_plato: int) -> Plato | None:
    result = await session.execute(select(Plato).where(Plato.IDPlato == id_plato))
    return result.scalar_one_or_none()


async def get_all_platos(session: AsyncSession) -> list[Plato]:
    result = await session.execute(select(Plato))
    return result.scalars().all()


async def get_platos_by_tipo(session: AsyncSession, tipo: str) -> list[Plato]:
    result = await session.execute(select(Plato).where(Plato.Tipo.ilike(f"%{tipo}%")))
    return result.scalars().all()


async def search_platos(session: AsyncSession, nombre: str) -> list[Plato]:
    result = await session.execute(
        select(Plato).where(Plato.NombrePlato.ilike(f"%{nombre}%"))
    )
    return result.scalars().all()


# ── UPDATE ────────────────────────────────────────────────────────────────────
async def update_plato(
    session: AsyncSession,
    id_plato: int,
    nombre: str | None = None,
    descripcion: str | None = None,
    tipo: str | None = None,
) -> Plato | None:
    plato = await get_plato_by_id(session, id_plato)
    if not plato:
        return None
    if nombre is not None:
        plato.NombrePlato = nombre
    if descripcion is not None:
        plato.Descripcion = descripcion
    if tipo is not None:
        plato.Tipo = tipo
    await session.flush()
    return plato


# ── DELETE ────────────────────────────────────────────────────────────────────
async def delete_plato(session: AsyncSession, id_plato: int) -> bool:
    plato = await get_plato_by_id(session, id_plato)
    if not plato:
        return False
    await session.delete(plato)
    await session.flush()
    return True
