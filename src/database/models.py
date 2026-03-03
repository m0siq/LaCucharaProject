from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Date, Table
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime

Base = declarative_base()

# Tabla intermedia MENU_PLATO
menu_plato = Table(
    'MENU_PLATO',
    Base.metadata,
    Column('IDMenu', Integer, ForeignKey('Menu.IDMenu'), primary_key=True),
    Column('IDPlato', Integer, ForeignKey('Plato.IDPlato'), primary_key=True)
)

class Usuario(Base):
    __tablename__ = 'Usuario'

    IDUsuario = Column(Integer, primary_key=True, index=True)
    NombreUsuario = Column(String(50), unique=True, nullable=False)
    Contrasena = Column(String(100), nullable=False)
    TipoUsuario = Column(String(20), nullable=False) # 'cliente' o 'hostelero'
    
    # Campos específicos de Hostelero (Single Table Inheritance basic)
    NombreRestaurante = Column(String(100), nullable=True)

    menus = relationship("Menu", back_populates="hostelero")
    valoraciones = relationship("Valoracion", back_populates="usuario")

class Menu(Base):
    __tablename__ = 'Menu'

    IDMenu = Column(Integer, primary_key=True, index=True)
    IDUsuario = Column(Integer, ForeignKey('Usuario.IDUsuario'), nullable=False)
    Imagen_menu = Column(String(255), nullable=True) # Ruta o URL de la imagen
    Fecha = Column(Date, nullable=False)
    
    # Campo extra añadido requerido por la vista: Precio del menú
    Precio = Column(Float, nullable=True)

    hostelero = relationship("Usuario", back_populates="menus")
    platos = relationship("Plato", secondary=menu_plato, back_populates="menus")

class Plato(Base):
    __tablename__ = 'Plato'

    IDPlato = Column(Integer, primary_key=True, index=True)
    NombrePlato = Column(String(100), nullable=False)
    Descripcion = Column(String(150), nullable=True) # Límite max 150 caracteres
    Tipo = Column(String(50), nullable=True) # Ej: Entrante, Principal, Postre

    menus = relationship("Menu", secondary=menu_plato, back_populates="platos")
    valoraciones = relationship("Valoracion", back_populates="plato")


class Valoracion(Base):
    __tablename__ = 'Valoracion'

    IDValoracion = Column(Integer, primary_key=True, index=True)
    IDPlato = Column(Integer, ForeignKey('Plato.IDPlato'), nullable=False)
    IDUsuario = Column(Integer, ForeignKey('Usuario.IDUsuario'), nullable=False)
    Puntuacion = Column(Integer, nullable=False) # 1 a 5
    Comentario = Column(String(150), nullable=True) # Límite max 150 caracteres
    Fecha = Column(DateTime, default=datetime.utcnow)

    plato = relationship("Plato", back_populates="valoraciones")
    usuario = relationship("Usuario", back_populates="valoraciones")
