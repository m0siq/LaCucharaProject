"""
src/api/routers/platos.py
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import get_db
from src.api.schemas import PlatoCreate, PlatoUpdate, PlatoOut
from src.database.crud_plato import (
    create_plato, get_plato_by_id, get_all_platos,
    get_platos_by_tipo, search_platos, update_plato, delete_plato,
)

router = APIRouter(prefix="/platos", tags=["Platos"])


@router.get("/", response_model=list[PlatoOut])
async def listar_platos(
    tipo:   str | None = Query(None, description="Filtrar por tipo (Entrante, Principal, Postre...)"),
    buscar: str | None = Query(None, description="Buscar por nombre"),
    db: AsyncSession = Depends(get_db),
):
    if buscar:
        return await search_platos(db, buscar)
    if tipo:
        return await get_platos_by_tipo(db, tipo)
    return await get_all_platos(db)


@router.get("/{id_plato}", response_model=PlatoOut)
async def obtener_plato(id_plato: int, db: AsyncSession = Depends(get_db)):
    p = await get_plato_by_id(db, id_plato)
    if not p:
        raise HTTPException(status_code=404, detail="Plato no encontrado")
    return p


@router.post("/", response_model=PlatoOut, status_code=201)
async def crear_plato(datos: PlatoCreate, db: AsyncSession = Depends(get_db)):
    return await create_plato(db, datos.NombrePlato, datos.Descripcion, datos.Tipo)


@router.put("/{id_plato}", response_model=PlatoOut)
async def actualizar_plato(
    id_plato: int,
    datos: PlatoUpdate,
    db: AsyncSession = Depends(get_db),
):
    p = await update_plato(db, id_plato, datos.NombrePlato, datos.Descripcion, datos.Tipo)
    if not p:
        raise HTTPException(status_code=404, detail="Plato no encontrado")
    return p


@router.delete("/{id_plato}", status_code=204)
async def eliminar_plato(id_plato: int, db: AsyncSession = Depends(get_db)):
    eliminado = await delete_plato(db, id_plato)
    if not eliminado:
        raise HTTPException(status_code=404, detail="Plato no encontrado")
