import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text

import os
from dotenv import load_dotenv

# ── Parámetros de conexión ────────────────────────────────────────────────────


load_dotenv()  # lee el archivo .env automáticamente

DB_SERVER   = os.getenv("DB_SERVER")
DB_PORT     = os.getenv("DB_PORT", "1433")
DB_NAME     = os.getenv("DB_NAME")
DB_USER     = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_DRIVER   = os.getenv("DB_DRIVER", "ODBC Driver 17 for SQL Server")

# ── Cadena de conexión ────────────────────────────────────────────────────────
# SQLAlchemy async con pyodbc → dialecto mssql+aioodbc  (o mssql+pyodbc síncrono)
# Para async se recomienda aioodbc; si usas pyodbc puro, cambia a mssql+pyodbc
# y usa SessionLocal sin "await".

CONNECTION_STRING = (
    f"mssql+aioodbc://{DB_USER}:{DB_PASSWORD}@{DB_SERVER}:{DB_PORT}/{DB_NAME}"
    f"?driver={DB_DRIVER.replace(' ', '+')}"
)

# ── Motor async ───────────────────────────────────────────────────────────────
engine = create_async_engine(
    CONNECTION_STRING,
    echo=False,          # True para ver las queries en consola (debug)
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,  # Valida la conexión antes de usarla
)

# ── Fábrica de sesiones ───────────────────────────────────────────────────────
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# ── Base declarativa compartida por todos los modelos ─────────────────────────
class Base(DeclarativeBase):
    pass


# ── Dependency / context manager para obtener una sesión ─────────────────────
async def get_session() -> AsyncSession:
    """
    Uso en FastAPI / funciones async:

        async with get_session() as session:
            result = await session.execute(select(Usuario))

    En Streamlit (que es síncrono) usa asyncio.run() o nest_asyncio:

        import asyncio
        usuarios = asyncio.run(get_all_usuarios())
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# ── Utilidad: crear todas las tablas (solo en desarrollo) ─────────────────────
async def create_tables():
    """Crea las tablas en la BD a partir de los modelos si no existen."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


# ── Utilidad: comprobar conexión ──────────────────────────────────────────────
async def test_connection() -> bool:
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        print(f"[connection] Error al conectar: {e}")
        return False