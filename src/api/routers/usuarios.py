"""
src/api/routers/usuarios.py
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import get_db
from src.api.schemas import UsuarioOut
from src.database.crud_usuario import get_all_usuarios, get_usuario_by_id

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])


@router.get("/", response_model=list[UsuarioOut])
async def listar_usuarios(db: AsyncSession = Depends(get_db)):
    return await get_all_usuarios(db)


@router.get("/{id_usuario}", response_model=UsuarioOut)
async def obtener_usuario(id_usuario: int, db: AsyncSession = Depends(get_db)):
    usuario = await get_usuario_by_id(db, id_usuario)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return usuario
