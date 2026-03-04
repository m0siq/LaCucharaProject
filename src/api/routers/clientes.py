"""
src/api/routers/clientes.py
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import get_db
from src.api.schemas import ClienteCreate, ClienteUpdate, ClienteOut
from src.database.crud_cliente import (
    create_cliente, get_cliente_by_id, get_all_clientes,
    update_cliente, delete_cliente,
)

router = APIRouter(prefix="/clientes", tags=["Clientes"])


@router.get("/", response_model=list[ClienteOut])
async def listar_clientes(db: AsyncSession = Depends(get_db)):
    return await get_all_clientes(db)


@router.get("/{id_usuario}", response_model=ClienteOut)
async def obtener_cliente(id_usuario: int, db: AsyncSession = Depends(get_db)):
    c = await get_cliente_by_id(db, id_usuario)
    if not c:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return c


@router.post("/", response_model=ClienteOut, status_code=201)
async def crear_cliente(datos: ClienteCreate, db: AsyncSession = Depends(get_db)):
    return await create_cliente(db, datos.NombreUsuario, datos.Contrasena)


@router.put("/{id_usuario}", response_model=ClienteOut)
async def actualizar_cliente(
    id_usuario: int,
    datos: ClienteUpdate,
    db: AsyncSession = Depends(get_db),
):
    c = await update_cliente(
        db, id_usuario,
        nombre_usuario=datos.NombreUsuario,
        contrasena=datos.Contrasena,
    )
    if not c:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return c


@router.delete("/{id_usuario}", status_code=204)
async def eliminar_cliente(id_usuario: int, db: AsyncSession = Depends(get_db)):
    eliminado = await delete_cliente(db, id_usuario)
    if not eliminado:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
