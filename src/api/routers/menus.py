"""
src/api/routers/menus.py
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import get_db
from src.api.schemas import MenuCreate, MenuUpdate, MenuOut, MenuPlatoAdd, PlatoOut
from src.database.crud_menu import (
    create_menu, get_menu_by_id, get_all_menus, get_menus_by_usuario,
    update_menu, delete_menu, add_plato_to_menu,
    remove_plato_from_menu, get_platos_de_menu,
)

router = APIRouter(prefix="/menus", tags=["Menus"])


@router.get("/", response_model=list[MenuOut])
async def listar_menus(
    id_usuario: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    if id_usuario:
        return await get_menus_by_usuario(db, id_usuario)
    return await get_all_menus(db)


@router.get("/{id_menu}", response_model=MenuOut)
async def obtener_menu(id_menu: int, db: AsyncSession = Depends(get_db)):
    m = await get_menu_by_id(db, id_menu)
    if not m:
        raise HTTPException(status_code=404, detail="Menu no encontrado")
    return m


@router.post("/", response_model=MenuOut, status_code=201)
async def crear_menu(datos: MenuCreate, db: AsyncSession = Depends(get_db)):
    return await create_menu(db, datos.IDUsuario, fecha=datos.Fecha)


@router.put("/{id_menu}", response_model=MenuOut)
async def actualizar_menu(
    id_menu: int,
    datos: MenuUpdate,
    db: AsyncSession = Depends(get_db),
):
    m = await update_menu(db, id_menu, fecha=datos.Fecha)
    if not m:
        raise HTTPException(status_code=404, detail="Menu no encontrado")
    return m


@router.post("/{id_menu}/imagen", status_code=200)
async def subir_imagen_menu(
    id_menu: int,
    imagen: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    contenido = await imagen.read()
    m = await update_menu(db, id_menu, imagen_menu=contenido)
    if not m:
        raise HTTPException(status_code=404, detail="Menu no encontrado")
    await db.commit()
    return {"mensaje": "Imagen actualizada correctamente"}


@router.get("/{id_menu}/imagen")
async def obtener_imagen_menu(id_menu: int, db: AsyncSession = Depends(get_db)):
    m = await get_menu_by_id(db, id_menu)
    if not m:
        raise HTTPException(status_code=404, detail="Menu no encontrado")
    if not m.Imagen_menu:
        raise HTTPException(status_code=404, detail="Este menu no tiene imagen")
    return Response(content=m.Imagen_menu, media_type="image/jpeg")


@router.get("/{id_menu}/platos", response_model=list[PlatoOut])
async def listar_platos_menu(id_menu: int, db: AsyncSession = Depends(get_db)):
    return await get_platos_de_menu(db, id_menu)


@router.post("/{id_menu}/platos", status_code=201)
async def añadir_plato_menu(
    id_menu: int,
    datos: MenuPlatoAdd,
    db: AsyncSession = Depends(get_db),
):
    mp = await add_plato_to_menu(db, id_menu, datos.IDPlato)
    if not mp:
        raise HTTPException(status_code=409, detail="El plato ya esta en este menu")
    return {"mensaje": "Plato añadido al menu"}


@router.delete("/{id_menu}/platos/{id_plato}", status_code=204)
async def eliminar_plato_menu(
    id_menu: int,
    id_plato: int,
    db: AsyncSession = Depends(get_db),
):
    eliminado = await remove_plato_from_menu(db, id_menu, id_plato)
    if not eliminado:
        raise HTTPException(status_code=404, detail="Plato no encontrado en este menu")


@router.delete("/{id_menu}", status_code=204)
async def eliminar_menu(id_menu: int, db: AsyncSession = Depends(get_db)):
    eliminado = await delete_menu(db, id_menu)
    if not eliminado:
        raise HTTPException(status_code=404, detail="Menu no encontrado")
