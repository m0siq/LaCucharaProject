"""
src/api/dependencies.py
────────────────────────
Dependencias compartidas por todos los routers.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from src.database.connection import AsyncSessionLocal


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
