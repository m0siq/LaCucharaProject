"""
src/api/main.py
───────────────
Punto de entrada de la API FastAPI.
Ejecutar: uvicorn src.api.main:app --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.api.routers import usuarios, hosteleros, clientes, platos, menus, valoraciones

app = FastAPI(
    title="RecomendadorDB API",
    description="API REST para el sistema de recomendación de restaurantes",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(usuarios.router)
app.include_router(hosteleros.router)
app.include_router(clientes.router)
app.include_router(platos.router)
app.include_router(menus.router)
app.include_router(valoraciones.router)


@app.get("/", tags=["root"])
async def root():
    return {"mensaje": "API funcionando correctamente"}