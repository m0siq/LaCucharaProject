"""
src/api/schemas.py
───────────────────
Esquemas Pydantic para validación de entrada y salida.
"""

from datetime import date, datetime
from pydantic import BaseModel, Field, model_validator
from typing import Any


# ══════════════════════════════════════════════════════════════════════════════
# USUARIO
# ══════════════════════════════════════════════════════════════════════════════
class UsuarioOut(BaseModel):
    IDUsuario:     int
    NombreUsuario: str

    model_config = {"from_attributes": True}


# ══════════════════════════════════════════════════════════════════════════════
# HOSTELERO
# ══════════════════════════════════════════════════════════════════════════════
class HosteleroCreate(BaseModel):
    NombreUsuario:     str = Field(..., min_length=3, max_length=100)
    Contrasena:        str = Field(..., min_length=6)
    NombreRestaurante: str = Field(..., min_length=2, max_length=150)
    # Logo se sube aparte via endpoint /logo


class HosteleroUpdate(BaseModel):
    NombreRestaurante: str | None = None
    NombreUsuario:     str | None = None
    Contrasena:        str | None = None


class HosteleroOut(BaseModel):
    IDUsuario:         int
    NombreRestaurante: str
    has_logo:          bool = False

    model_config = {"from_attributes": True}


# ══════════════════════════════════════════════════════════════════════════════
# CLIENTE
# ══════════════════════════════════════════════════════════════════════════════
class ClienteCreate(BaseModel):
    NombreUsuario: str = Field(..., min_length=3, max_length=100)
    Contrasena:    str = Field(..., min_length=6)


class ClienteUpdate(BaseModel):
    NombreUsuario: str | None = None
    Contrasena:    str | None = None


class ClienteOut(BaseModel):
    IDUsuario:     int
    NombreUsuario: str | None = None

    model_config = {"from_attributes": True}


# ══════════════════════════════════════════════════════════════════════════════
# PLATO
# ══════════════════════════════════════════════════════════════════════════════
class PlatoCreate(BaseModel):
    NombrePlato: str = Field(..., min_length=2, max_length=150)
    Descripcion: str | None = None
    Tipo:        str | None = None


class PlatoConMenuCreate(BaseModel):
    IDMenu:      int
    NombrePlato: str = Field(..., min_length=2, max_length=150)
    Descripcion: str | None = None
    Tipo:        str | None = None


class PlatoUpdate(BaseModel):
    NombrePlato: str | None = None
    Descripcion: str | None = None
    Tipo:        str | None = None


class PlatoOut(BaseModel):
    IDPlato:     int
    NombrePlato: str
    Descripcion: str | None
    Tipo:        str | None

    model_config = {"from_attributes": True}


class MenuPlatoOut(BaseModel):
    IDMenu:      int
    IDPlato:     int
    plato:       PlatoOut

    model_config = {"from_attributes": True}


# ══════════════════════════════════════════════════════════════════════════════
# MENU
# ══════════════════════════════════════════════════════════════════════════════
class MenuCreate(BaseModel):
    IDUsuario: int
    Fecha:     date | None = None
    # Imagen se sube aparte via endpoint /imagen


class MenuUpdate(BaseModel):
    Fecha: date | None = None


class MenuOut(BaseModel):
    IDMenu:     int
    IDUsuario:  int
    Fecha:      date | None
    has_imagen: bool = False

    @model_validator(mode="before")
    @classmethod
    def _compute_has_imagen(cls, data: Any) -> Any:
        # Si viene un objeto ORM (SQLAlchemy), lo convertimos a dict
        if hasattr(data, "Imagen_menu"):
            return {
                "IDMenu":     data.IDMenu,
                "IDUsuario":  data.IDUsuario,
                "Fecha":      data.Fecha,
                "has_imagen": bool(data.Imagen_menu),
            }
        return data

    model_config = {"from_attributes": True}


class MenuPlatoAdd(BaseModel):
    IDPlato: int


# ══════════════════════════════════════════════════════════════════════════════
# VALORACION
# ══════════════════════════════════════════════════════════════════════════════
class ValoracionCreate(BaseModel):
    IDPlato:    int
    IDUsuario:  int
    Puntuacion: float | None = Field(None, ge=1, le=5)
    Comentario: str   | None = None


class ValoracionUpdate(BaseModel):
    Puntuacion: float | None = Field(None, ge=1, le=5)
    Comentario: str   | None = None


class ValoracionOut(BaseModel):
    IDValoracion: int
    IDPlato:      int
    IDUsuario:    int
    Puntuacion:   float | None
    Comentario:   str   | None
    Fecha:        datetime | None

    model_config = {"from_attributes": True}
