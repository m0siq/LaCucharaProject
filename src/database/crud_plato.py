"""
crud_plato.py
─────────────
CRUD para el modelo Plato.
"""

from sqlalchemy import select, delete as sql_delete
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models import Plato, MenuPlato, Valoracion


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


async def create_plato_con_menu(
    session: AsyncSession,
    id_menu: int,
    nombre: str,
    descripcion: str | None = None,
    tipo: str | None = None,
) -> tuple[Plato, MenuPlato]:
    """Crea un plato y lo asocia a un menú en MENU_PLATO."""
    # Crear el plato
    plato = Plato(NombrePlato=nombre, Descripcion=descripcion, Tipo=tipo)
    session.add(plato)
    await session.flush()
    
    # Crear la asociación en MENU_PLATO
    menu_plato = MenuPlato(IDMenu=id_menu, IDPlato=plato.IDPlato)
    session.add(menu_plato)
    await session.flush()
    
    return plato, menu_plato


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


async def get_plato_by_nombre_exact(session: AsyncSession, nombre: str) -> Plato | None:
    """Busca un plato por nombre exacto (case-insensitive)."""
    result = await session.execute(
        select(Plato).where(Plato.NombrePlato.ilike(nombre))
    )
    return result.scalar_one_or_none()


async def create_menu_plato(
    session: AsyncSession,
    id_menu: int,
    id_plato: int,
) -> MenuPlato | None:
    """Crea la relación entre menú y plato sin duplicados."""
    # Verificar si ya existe
    result = await session.execute(
        select(MenuPlato).where(
            (MenuPlato.IDMenu == id_menu) & (MenuPlato.IDPlato == id_plato)
        )
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        return existing  # Ya existe la relación
    
    menu_plato = MenuPlato(IDMenu=id_menu, IDPlato=id_plato)
    session.add(menu_plato)
    await session.flush()
    return menu_plato


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
    # Borrar dependientes explícitamente (los FK en BD no tienen CASCADE real)
    await session.execute(sql_delete(Valoracion).where(Valoracion.IDPlato == id_plato))
    await session.execute(sql_delete(MenuPlato).where(MenuPlato.IDPlato == id_plato))
    await session.delete(plato)
    await session.flush()
    return True
