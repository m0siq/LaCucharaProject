"""
crud_menu.py
────────────
CRUD para el modelo Menu (con gestión de platos asociados via MENU_PLATO).
"""

from datetime import date
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models import Menu, MenuPlato, Plato


# ── CREATE ────────────────────────────────────────────────────────────────────
async def create_menu(
    session: AsyncSession,
    id_usuario: int,
    imagen_menu: bytes | None = None,
    fecha: date | None = None,
) -> Menu:
    menu = Menu(IDUsuario=id_usuario, Imagen_menu=imagen_menu, Fecha=fecha or date.today())
    session.add(menu)
    await session.flush()
    return menu


# ── READ ──────────────────────────────────────────────────────────────────────
async def get_menu_by_id(session: AsyncSession, id_menu: int) -> Menu | None:
    result = await session.execute(select(Menu).where(Menu.IDMenu == id_menu))
    return result.scalar_one_or_none()


async def get_all_menus(session: AsyncSession) -> list[Menu]:
    result = await session.execute(select(Menu))
    return result.scalars().all()


async def get_menus_by_usuario(session: AsyncSession, id_usuario: int) -> list[Menu]:
    result = await session.execute(select(Menu).where(Menu.IDUsuario == id_usuario))
    return result.scalars().all()


async def get_platos_de_menu(session: AsyncSession, id_menu: int) -> list[Plato]:
    """Devuelve todos los Platos asociados a un Menu."""
    result = await session.execute(
        select(Plato)
        .join(MenuPlato, MenuPlato.IDPlato == Plato.IDPlato)
        .where(MenuPlato.IDMenu == id_menu)
    )
    return result.scalars().all()


# ── UPDATE ────────────────────────────────────────────────────────────────────
async def update_menu(
    session: AsyncSession,
    id_menu: int,
    imagen_menu: bytes | None = None,
    fecha: date | None = None,
    precio: float | None = None,  # ← Nuevo
) -> Menu | None:
    menu = await get_menu_by_id(session, id_menu)
    if not menu:
        return None
    if imagen_menu is not None:
        menu.Imagen_menu = imagen_menu
    if fecha is not None:
        menu.Fecha = fecha
    if precio is not None:
        menu.Precio = precio
    await session.flush()
    return menu


async def add_plato_to_menu(session: AsyncSession, id_menu: int, id_plato: int) -> MenuPlato | None:
    """Añade un Plato a un Menu (MENU_PLATO). Ignora si ya existe."""
    existe = await session.execute(
        select(MenuPlato).where(MenuPlato.IDMenu == id_menu, MenuPlato.IDPlato == id_plato)
    )
    if existe.scalar_one_or_none():
        return None   # ya asociado
    mp = MenuPlato(IDMenu=id_menu, IDPlato=id_plato)
    session.add(mp)
    await session.flush()
    return mp


async def remove_plato_from_menu(session: AsyncSession, id_menu: int, id_plato: int) -> bool:
    """Elimina la asociación de un Plato con un Menu."""
    result = await session.execute(
        select(MenuPlato).where(MenuPlato.IDMenu == id_menu, MenuPlato.IDPlato == id_plato)
    )
    mp = result.scalar_one_or_none()
    if not mp:
        return False
    await session.delete(mp)
    await session.flush()
    return True


# ── DELETE ────────────────────────────────────────────────────────────────────
async def delete_menu(session: AsyncSession, id_menu: int) -> bool:
    """Elimina el Menu y sus MenuPlato asociados (cascade)."""
    menu = await get_menu_by_id(session, id_menu)
    if not menu:
        return False
    await session.delete(menu)
    await session.flush()
    return True
