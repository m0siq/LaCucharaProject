"""
src/api/routers/valoraciones.py
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import get_db
from src.api.schemas import ValoracionCreate, ValoracionUpdate, ValoracionOut
from src.database.crud_valoracion import (
    create_valoracion, get_valoracion_by_id, get_all_valoraciones,
    get_valoraciones_by_plato, get_valoraciones_by_usuario,
    get_valoracion_usuario_plato,
    get_media_puntuacion, update_valoracion, delete_valoracion,
)

router = APIRouter(prefix="/valoraciones", tags=["Valoraciones"])


@router.get("/", response_model=list[ValoracionOut])
async def listar_valoraciones(
    id_plato:   int | None = None,
    id_usuario: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    if id_plato and id_usuario:
        v = await get_valoracion_usuario_plato(db, id_usuario, id_plato)
        return [v] if v else []
    if id_plato:
        return await get_valoraciones_by_plato(db, id_plato)
    if id_usuario:
        return await get_valoraciones_by_usuario(db, id_usuario)
    return await get_all_valoraciones(db)


@router.get("/media/{id_plato}")
async def media_puntuacion(id_plato: int, db: AsyncSession = Depends(get_db)):
    media = await get_media_puntuacion(db, id_plato)
    return {"IDPlato": id_plato, "media": round(media, 2) if media else None}


@router.get("/{id_valoracion}", response_model=ValoracionOut)
async def obtener_valoracion(id_valoracion: int, db: AsyncSession = Depends(get_db)):
    v = await get_valoracion_by_id(db, id_valoracion)
    if not v:
        raise HTTPException(status_code=404, detail="Valoracion no encontrada")
    return v


@router.post("/", response_model=ValoracionOut, status_code=201)
async def crear_valoracion(datos: ValoracionCreate, db: AsyncSession = Depends(get_db)):
    return await create_valoracion(
        db,
        datos.IDPlato,
        datos.IDUsuario,
        puntuacion=datos.Puntuacion,
        comentario=datos.Comentario,
    )


@router.put("/{id_valoracion}", response_model=ValoracionOut)
async def actualizar_valoracion(
    id_valoracion: int,
    datos: ValoracionUpdate,
    db: AsyncSession = Depends(get_db),
):
    v = await update_valoracion(db, id_valoracion, datos.Puntuacion, datos.Comentario)
    if not v:
        raise HTTPException(status_code=404, detail="Valoracion no encontrada")
    return v


@router.delete("/{id_valoracion}", status_code=204)
async def eliminar_valoracion(id_valoracion: int, db: AsyncSession = Depends(get_db)):
    eliminado = await delete_valoracion(db, id_valoracion)
    if not eliminado:
        raise HTTPException(status_code=404, detail="Valoracion no encontrada")
