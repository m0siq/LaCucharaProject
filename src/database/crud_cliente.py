"""
crud_cliente.py
───────────────
CRUD para el modelo Cliente (subtipo de Usuario).
Al crear un Cliente se crea primero el Usuario padre.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models import Cliente, Usuario


# ── CREATE ────────────────────────────────────────────────────────────────────
async def create_cliente(
    session: AsyncSession,
    nombre_usuario: str,
    contrasena: str,
) -> Cliente:
    usuario = Usuario(NombreUsuario=nombre_usuario, Contrasena=contrasena)
    session.add(usuario)
    await session.flush()

    cliente = Cliente(IDUsuario=usuario.IDUsuario)
    session.add(cliente)
    await session.flush()
    return cliente


# ── READ ──────────────────────────────────────────────────────────────────────
async def get_cliente_by_id(session: AsyncSession, id_usuario: int) -> Cliente | None:
    result = await session.execute(select(Cliente).where(Cliente.IDUsuario == id_usuario))
    return result.scalar_one_or_none()


async def get_all_clientes(session: AsyncSession) -> list[Cliente]:
    result = await session.execute(select(Cliente))
    return result.scalars().all()


# ── UPDATE ────────────────────────────────────────────────────────────────────
async def update_cliente(
    session: AsyncSession,
    id_usuario: int,
    nombre_usuario: str | None = None,
    contrasena: str | None = None,
) -> Cliente | None:
    cliente = await get_cliente_by_id(session, id_usuario)
    if not cliente:
        return None

    if nombre_usuario is not None or contrasena is not None:
        result = await session.execute(select(Usuario).where(Usuario.IDUsuario == id_usuario))
        usuario = result.scalar_one_or_none()
        if usuario:
            if nombre_usuario is not None:
                usuario.NombreUsuario = nombre_usuario
            if contrasena is not None:
                usuario.Contrasena = contrasena

    await session.flush()
    return cliente


# ── DELETE ────────────────────────────────────────────────────────────────────
async def delete_cliente(session: AsyncSession, id_usuario: int) -> bool:
    """Eliminar Cliente y su Usuario padre (CASCADE)."""
    result = await session.execute(select(Usuario).where(Usuario.IDUsuario == id_usuario))
    usuario = result.scalar_one_or_none()
    if not usuario:
        return False
    await session.delete(usuario)
    await session.flush()
    return True
