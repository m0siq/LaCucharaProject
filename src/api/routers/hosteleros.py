"""
src/api/routers/hosteleros.py
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import get_db
from src.api.schemas import HosteleroCreate, HosteleroUpdate, HosteleroOut
from src.database.crud_hostelero import (
    create_hostelero, get_hostelero_by_id, get_all_hosteleros,
    update_hostelero, delete_hostelero,
)

router = APIRouter(prefix="/hosteleros", tags=["Hosteleros"])


@router.get("/", response_model=list[dict])
async def listar_hosteleros(db: AsyncSession = Depends(get_db)):
    hosteleros = await get_all_hosteleros(db)
    # Mapear Logo a has_logo
    return [
        {
            "IDUsuario": h.IDUsuario,
            "NombreRestaurante": h.NombreRestaurante,
            "has_logo": bool(h.Logo),
        }
        for h in hosteleros
    ]


@router.get("/{id_usuario}", response_model=HosteleroOut)
async def obtener_hostelero(id_usuario: int, db: AsyncSession = Depends(get_db)):
    h = await get_hostelero_by_id(db, id_usuario)
    if not h:
        raise HTTPException(status_code=404, detail="Hostelero no encontrado")
    return h


@router.post("/", response_model=HosteleroOut, status_code=201)
async def crear_hostelero(
    NombreUsuario: str = Form(...),
    Contrasena: str = Form(...),
    NombreRestaurante: str = Form(...),
    logo: UploadFile = File(None),
    db: AsyncSession = Depends(get_db),
):
    logo_contenido = None
    if logo:
        logo_contenido = await logo.read()
    
    return await create_hostelero(
        db,
        NombreUsuario,
        Contrasena,
        NombreRestaurante,
        logo=logo_contenido,
    )


@router.put("/{id_usuario}", response_model=HosteleroOut)
async def actualizar_hostelero(
    id_usuario: int,
    datos: HosteleroUpdate,
    db: AsyncSession = Depends(get_db),
):
    h = await update_hostelero(
        db, id_usuario,
        nombre_restaurante=datos.NombreRestaurante,
        nombre_usuario=datos.NombreUsuario,
        contrasena=datos.Contrasena,
    )
    if not h:
        raise HTTPException(status_code=404, detail="Hostelero no encontrado")
    return h


@router.post("/{id_usuario}/logo", status_code=200)
async def subir_logo(
    id_usuario: int,
    logo: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    contenido = await logo.read()
    h = await update_hostelero(db, id_usuario, logo=contenido)
    if not h:
        raise HTTPException(status_code=404, detail="Hostelero no encontrado")
    return {"mensaje": "Logo actualizado correctamente"}


@router.get("/{id_usuario}/logo")
async def obtener_logo(id_usuario: int, db: AsyncSession = Depends(get_db)):
    h = await get_hostelero_by_id(db, id_usuario)
    if not h:
        raise HTTPException(status_code=404, detail="Hostelero no encontrado")
    if not h.Logo:
        raise HTTPException(status_code=404, detail="Este hostelero no tiene logo")
    return Response(content=h.Logo, media_type="image/jpeg")


@router.delete("/{id_usuario}", status_code=204)
async def eliminar_hostelero(id_usuario: int, db: AsyncSession = Depends(get_db)):
    eliminado = await delete_hostelero(db, id_usuario)
    if not eliminado:
        raise HTTPException(status_code=404, detail="Hostelero no encontrado")
