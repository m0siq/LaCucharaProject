"""
src/api/routers/platos.py
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import get_db
from src.api.schemas import PlatoCreate, PlatoUpdate, PlatoOut, PlatoConMenuCreate, MenuPlatoOut
from src.database.crud_plato import (
    create_plato, create_plato_con_menu, get_plato_by_id, get_all_platos,
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


@router.post("/", response_model=MenuPlatoOut, status_code=201)
async def crear_plato(datos: PlatoConMenuCreate, db: AsyncSession = Depends(get_db)):
    """Crea un plato y lo asocia automáticamente a un menú en MENU_PLATO."""
    try:
        plato, menu_plato = await create_plato_con_menu(
            db, 
            datos.IDMenu, 
            datos.NombrePlato, 
            datos.Descripcion, 
            datos.Tipo
        )
        await db.commit()
        
        # Retornar con la estructura de MenuPlatoOut
        return {
            "IDMenu": menu_plato.IDMenu,
            "IDPlato": plato.IDPlato,
            "plato": {
                "IDPlato": plato.IDPlato,
                "NombrePlato": plato.NombrePlato,
                "Descripcion": plato.Descripcion,
                "Tipo": plato.Tipo,
            }
        }
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Error al crear plato: {str(e)}")


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
