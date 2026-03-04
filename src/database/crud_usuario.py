"""
crud_usuario.py
───────────────
CRUD para el modelo Usuario.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models import Usuario


# ── CREATE ────────────────────────────────────────────────────────────────────
async def create_usuario(session: AsyncSession, nombre: str, contrasena: str) -> Usuario:
    usuario = Usuario(NombreUsuario=nombre, Contrasena=contrasena)
    session.add(usuario)
    await session.flush()   # obtiene el ID sin cerrar la transacción
    return usuario


# ── READ ──────────────────────────────────────────────────────────────────────
async def get_usuario_by_id(session: AsyncSession, id_usuario: int) -> Usuario | None:
    result = await session.execute(select(Usuario).where(Usuario.IDUsuario == id_usuario))
    return result.scalar_one_or_none()


async def get_usuario_by_nombre(session: AsyncSession, nombre: str) -> Usuario | None:
    result = await session.execute(select(Usuario).where(Usuario.NombreUsuario == nombre))
    return result.scalar_one_or_none()


async def get_all_usuarios(session: AsyncSession) -> list[Usuario]:
    result = await session.execute(select(Usuario))
    return result.scalars().all()


# ── UPDATE ────────────────────────────────────────────────────────────────────
async def update_usuario(
    session: AsyncSession,
    id_usuario: int,
    nombre: str | None = None,
    contrasena: str | None = None,
) -> Usuario | None:
    usuario = await get_usuario_by_id(session, id_usuario)
    if not usuario:
        return None
    if nombre is not None:
        usuario.NombreUsuario = nombre
    if contrasena is not None:
        usuario.Contrasena = contrasena
    await session.flush()
    return usuario


# ── DELETE ────────────────────────────────────────────────────────────────────
async def delete_usuario(session: AsyncSession, id_usuario: int) -> bool:
    usuario = await get_usuario_by_id(session, id_usuario)
    if not usuario:
        return False
    await session.delete(usuario)
    await session.flush()
    return True
