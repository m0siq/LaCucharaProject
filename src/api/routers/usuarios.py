from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import get_db
from src.api.schemas import UsuarioOut
from src.database.crud_usuario import get_all_usuarios, get_usuario_by_id
from src.database.models import Usuario, Cliente, Hostelero
from pydantic import BaseModel

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])


class LoginRequest(BaseModel):
    NombreUsuario: str
    Contrasena: str


class LoginResponse(BaseModel):
    IDUsuario: int
    NombreUsuario: str
    Rol: str
    NombreRestaurante: str | None = None


@router.get("/", response_model=list[UsuarioOut])
async def listar_usuarios(db: AsyncSession = Depends(get_db)):
    return await get_all_usuarios(db)


@router.get("/{id_usuario}", response_model=UsuarioOut)
async def obtener_usuario(id_usuario: int, db: AsyncSession = Depends(get_db)):
    usuario = await get_usuario_by_id(db, id_usuario)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return usuario


@router.post("/login", response_model=LoginResponse)
async def login(datos: LoginRequest, db: AsyncSession = Depends(get_db)):
    # Busca el usuario por nombre y contraseña
    result = await db.execute(
        select(Usuario).where(
            Usuario.NombreUsuario == datos.NombreUsuario,
            Usuario.Contrasena == datos.Contrasena,
        )
    )
    usuario = result.scalar_one_or_none()

    if not usuario:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    # Detecta el rol automáticamente
    hostelero = (
        await db.execute(select(Hostelero).where(Hostelero.IDUsuario == usuario.IDUsuario))
    ).scalar_one_or_none()

    if hostelero:
        return LoginResponse(
            IDUsuario=usuario.IDUsuario,
            NombreUsuario=usuario.NombreUsuario,
            Rol="hostelero",
            NombreRestaurante=hostelero.NombreRestaurante,
        )

    cliente = (
        await db.execute(select(Cliente).where(Cliente.IDUsuario == usuario.IDUsuario))
    ).scalar_one_or_none()

    if cliente:
        return LoginResponse(
            IDUsuario=usuario.IDUsuario,
            NombreUsuario=usuario.NombreUsuario,
            Rol="cliente",
        )

    raise HTTPException(status_code=401, detail="Usuario sin rol asignado")