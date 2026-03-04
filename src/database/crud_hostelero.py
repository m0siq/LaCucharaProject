"""
crud_hostelero.py
─────────────────
CRUD para el modelo Hostelero (subtipo de Usuario).
Al crear un Hostelero se crea primero el Usuario padre.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models import Hostelero, Usuario


# ── CREATE ────────────────────────────────────────────────────────────────────
async def create_hostelero(
    session: AsyncSession,
    nombre_usuario: str,
    contrasena: str,
    nombre_restaurante: str,
    logo: bytes | None = None,        # ← nuevo
) -> Hostelero:
    # 1. Crear el Usuario padre
    usuario = Usuario(NombreUsuario=nombre_usuario, Contrasena=contrasena)
    session.add(usuario)
    await session.flush()

    # 2. Crear el Hostelero vinculado
    hostelero = Hostelero(
        IDUsuario=usuario.IDUsuario,
        NombreRestaurante=nombre_restaurante,
        Logo=logo,                    # ← nuevo
    )
    session.add(hostelero)
    await session.flush()
    return hostelero


# ── READ ──────────────────────────────────────────────────────────────────────
async def get_hostelero_by_id(session: AsyncSession, id_usuario: int) -> Hostelero | None:
    result = await session.execute(select(Hostelero).where(Hostelero.IDUsuario == id_usuario))
    return result.scalar_one_or_none()


async def get_all_hosteleros(session: AsyncSession) -> list[Hostelero]:
    result = await session.execute(select(Hostelero))
    return result.scalars().all()


async def get_hostelero_by_restaurante(session: AsyncSession, nombre: str) -> list[Hostelero]:
    result = await session.execute(
        select(Hostelero).where(Hostelero.NombreRestaurante.ilike(f"%{nombre}%"))
    )
    return result.scalars().all()


# ── UPDATE ────────────────────────────────────────────────────────────────────
async def update_hostelero(
    session: AsyncSession,
    id_usuario: int,
    nombre_restaurante: str | None = None,
    nombre_usuario: str | None = None,
    contrasena: str | None = None,
    logo: bytes | None = None,        # ← nuevo
) -> Hostelero | None:
    hostelero = await get_hostelero_by_id(session, id_usuario)
    if not hostelero:
        return None
    if nombre_restaurante is not None:
        hostelero.NombreRestaurante = nombre_restaurante
    if logo is not None:
        hostelero.Logo = logo         # ← nuevo

    # Actualizar campos del Usuario padre si se proporcionan
    if nombre_usuario is not None or contrasena is not None:
        result = await session.execute(select(Usuario).where(Usuario.IDUsuario == id_usuario))
        usuario = result.scalar_one_or_none()
        if usuario:
            if nombre_usuario is not None:
                usuario.NombreUsuario = nombre_usuario
            if contrasena is not None:
                usuario.Contrasena = contrasena

    await session.flush()
    return hostelero


# ── DELETE ────────────────────────────────────────────────────────────────────
async def delete_hostelero(session: AsyncSession, id_usuario: int) -> bool:
    """Eliminar Hostelero y su Usuario padre (CASCADE)."""
    result = await session.execute(select(Usuario).where(Usuario.IDUsuario == id_usuario))
    usuario = result.scalar_one_or_none()
    if not usuario:
        return False
    await session.delete(usuario)   # CASCADE borra el Hostelero también
    await session.flush()
    return True
