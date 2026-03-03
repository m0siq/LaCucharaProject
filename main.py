"""
main.py
───────
Script de prueba para connection.py y models.py
Ejecutar: python main.py
"""

import asyncio
from datetime import date, datetime
from sqlalchemy import select
from src.database.connection import test_connection, create_tables, AsyncSessionLocal
from src.database.models import Usuario, Hostelero, Cliente, Plato, Menu, MenuPlato, Valoracion


# ── 1. Comprobar conexión ─────────────────────────────────────────────────────
async def check_connection():
    print("\n[1] Probando conexión...")
    ok = await test_connection()
    print("    ✅ Conexión exitosa" if ok else "    ❌ Fallo en la conexión")
    return ok


# ── 2. Crear tablas ───────────────────────────────────────────────────────────
async def init_db():
    print("\n[2] Creando tablas (si no existen)...")
    await create_tables()
    print("    ✅ Tablas listas")

# ── Entrypoint ────────────────────────────────────────────────────────────────
async def main():
    print("=" * 50)
    print("  TEST — connection.py + models.py")
    print("=" * 50)

    if not await check_connection():
        return

    await init_db()


    print("\n✅ Test completado\n")


if __name__ == "__main__":
    asyncio.run(main())