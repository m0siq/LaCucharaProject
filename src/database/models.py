"""
models.py
─────────
Modelos SQLAlchemy que reflejan el diagrama ER:

    Hostelero ──┐
    Cliente  ──►├── Usuario (supertype)
                │
    Usuario ────► Menu  ──► MENU_PLATO ◄── Plato ◄── Valoracion
                                                         │
                                                     Cliente / Usuario
"""

from datetime import date, datetime
from sqlalchemy import (
    Integer, String, Float, Date, DateTime,
    ForeignKey, UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.database.connection import Base
from sqlalchemy.dialects.mssql import VARBINARY


# ══════════════════════════════════════════════════════════════════════════════
# USUARIO  (supertype — herencia de tabla concreta con join)
# ══════════════════════════════════════════════════════════════════════════════
class Usuario(Base):
    __tablename__ = "Usuario"

    IDUsuario:     Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    NombreUsuario: Mapped[str] = mapped_column(String(100), nullable=False)
    Contrasena:    Mapped[str] = mapped_column(String(255), nullable=False)

    hostelero: Mapped["Hostelero"] = relationship(
        back_populates="usuario",
        uselist=False,
        cascade="all, delete-orphan",  # ← añadir
        passive_deletes=True,           # ← añadir
    )
    cliente: Mapped["Cliente"] = relationship(
        back_populates="usuario",
        uselist=False,
        cascade="all, delete-orphan",  # ← añadir
        passive_deletes=True,           # ← añadir
    )
    menus:        Mapped[list["Menu"]]       = relationship(back_populates="usuario")
    valoraciones: Mapped[list["Valoracion"]] = relationship(back_populates="usuario")


# ══════════════════════════════════════════════════════════════════════════════
# HOSTELERO  (subtipo de Usuario)
# ══════════════════════════════════════════════════════════════════════════════
class Hostelero(Base):
    __tablename__ = "Hostelero"

    IDUsuario:        Mapped[int] = mapped_column(
        Integer, ForeignKey("Usuario.IDUsuario", ondelete="CASCADE"),
        primary_key=True,
    )
    NombreRestaurante: Mapped[str] = mapped_column(String(200), nullable=False)
    Logo:              Mapped[bytes|None] = mapped_column(VARBINARY("max"))  # ← nuevo

    # Relaciones
    usuario: Mapped["Usuario"] = relationship(back_populates="hostelero",
        passive_deletes=True)

    def __repr__(self) -> str:
        return f"<Hostelero id={self.IDUsuario} restaurante={self.NombreRestaurante!r}>"


# ══════════════════════════════════════════════════════════════════════════════
# CLIENTE  (subtipo de Usuario)
# ══════════════════════════════════════════════════════════════════════════════
class Cliente(Base):
    __tablename__ = "Cliente"

    IDUsuario: Mapped[int] = mapped_column(
        Integer, ForeignKey("Usuario.IDUsuario", ondelete="CASCADE"),
        primary_key=True,
    )

    # Relaciones
    usuario: Mapped["Usuario"] = relationship(back_populates="cliente",
        passive_deletes=True)

    def __repr__(self) -> str:
        return f"<Cliente id={self.IDUsuario}>"


# ══════════════════════════════════════════════════════════════════════════════
# PLATO
# ══════════════════════════════════════════════════════════════════════════════
class Plato(Base):
    __tablename__ = "Plato"

    IDPlato:     Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    NombrePlato: Mapped[str] = mapped_column(String(150), nullable=False)
    Descripcion: Mapped[str | None] = mapped_column(String(500))
    Tipo:        Mapped[str | None] = mapped_column(String(50))  # ej: entrante, principal, postre

    # Relaciones
    valoraciones: Mapped[list["Valoracion"]] = relationship(back_populates="plato")
    menu_platos:  Mapped[list["MenuPlato"]]  = relationship(back_populates="plato", passive_deletes=True)

    def __repr__(self) -> str:
        return f"<Plato id={self.IDPlato} nombre={self.NombrePlato!r}>"


# ══════════════════════════════════════════════════════════════════════════════
# MENU
# ══════════════════════════════════════════════════════════════════════════════
class Menu(Base):
    __tablename__ = "Menu"

    IDMenu:      Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    IDUsuario:   Mapped[int] = mapped_column(Integer, ForeignKey("Usuario.IDUsuario"), nullable=False)
    Imagen_menu: Mapped[bytes | None] = mapped_column(VARBINARY("max"))
    Fecha:       Mapped[date | None] = mapped_column(Date)
    Precio:      Mapped[float | None] = mapped_column(Float)  # ← Nuevo: precio del menú del día

    # Relaciones
    usuario:     Mapped["Usuario"]         = relationship(back_populates="menus")
    menu_platos: Mapped[list["MenuPlato"]] = relationship(back_populates="menu", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Menu id={self.IDMenu} usuario={self.IDUsuario}>"


# ══════════════════════════════════════════════════════════════════════════════
# MENU_PLATO  (tabla de unión Menu ↔ Plato)
# ══════════════════════════════════════════════════════════════════════════════
class MenuPlato(Base):
    __tablename__ = "MENU_PLATO"

    IDMenu:  Mapped[int] = mapped_column(Integer, ForeignKey("Menu.IDMenu",   ondelete="CASCADE"), primary_key=True)
    IDPlato: Mapped[int] = mapped_column(Integer, ForeignKey("Plato.IDPlato", ondelete="CASCADE"), primary_key=True)

    # Relaciones
    menu:  Mapped["Menu"]  = relationship(back_populates="menu_platos")
    plato: Mapped["Plato"] = relationship(back_populates="menu_platos")

    def __repr__(self) -> str:
        return f"<MenuPlato menu={self.IDMenu} plato={self.IDPlato}>"


# ══════════════════════════════════════════════════════════════════════════════
# VALORACION
# ══════════════════════════════════════════════════════════════════════════════
class Valoracion(Base):
    __tablename__ = "Valoracion"

    IDValoracion: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    IDPlato:      Mapped[int] = mapped_column(Integer, ForeignKey("Plato.IDPlato"),   nullable=False)
    IDUsuario:    Mapped[int] = mapped_column(Integer, ForeignKey("Usuario.IDUsuario"), nullable=False)
    Puntuacion:   Mapped[float | None] = mapped_column(Float)   # ej: 1.0 – 5.0
    Comentario:   Mapped[str | None]   = mapped_column(String(1000))
    Fecha:        Mapped[datetime | None] = mapped_column(DateTime)

    # Restricción: un usuario solo puede valorar una vez el mismo plato
    __table_args__ = (
        UniqueConstraint("IDPlato", "IDUsuario", name="uq_valoracion_plato_usuario"),
    )

    # Relaciones
    plato:   Mapped["Plato"]   = relationship(back_populates="valoraciones")
    usuario: Mapped["Usuario"] = relationship(back_populates="valoraciones")

    def __repr__(self) -> str:
        return (
            f"<Valoracion id={self.IDValoracion} "
            f"plato={self.IDPlato} usuario={self.IDUsuario} "
            f"puntuacion={self.Puntuacion}>"
        )