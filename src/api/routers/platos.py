"""
src/api/routers/platos.py
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from src.api.dependencies import get_db
from src.api.schemas import PlatoCreate, PlatoUpdate, PlatoOut, PlatoConMenuCreate, MenuPlatoOut
from src.database.crud_plato import (
    create_plato, create_plato_con_menu, get_plato_by_id, get_all_platos,
    get_platos_by_tipo, search_platos, update_plato, delete_plato,
    get_plato_by_nombre_exact, create_menu_plato,
)

router = APIRouter(prefix="/platos", tags=["Platos"])


# Schemas locales para OCR
class PlatoOCRItem(BaseModel):
    """Representa un plato extraído del OCR con nombre y precio opcional."""
    nombre: str
    precio: float | None = None


class PlatosOCRInput(BaseModel):
    menuId: int
    Primer_plato: list[PlatoOCRItem | str]  # Acepta strings antiguos o nuevos objetos
    Segundo_plato: list[PlatoOCRItem | str]
    Postres: list[PlatoOCRItem | str]
    Precio: float | None = None  # Campo adicional para precio del menú


class PlatosOCRResponse(BaseModel):
    creados: int
    relacionados: int
    mensaje: str


@router.get("/", response_model=list[PlatoOut])
async def listar_platos(
    tipo:   str | None = Query(None, description="Filtrar por tipo (Entrante, Principal, Postre...)"),
    buscar: str | None = Query(None, description="Buscar por nombre"),
    db: AsyncSession = Depends(get_db),
):
    if buscar:
        return await search_platos(db, buscar)
    if tipo:
        return await get_platos_by_tipo(db, tipo)
    return await get_all_platos(db)


@router.get("/{id_plato}", response_model=PlatoOut)
async def obtener_plato(id_plato: int, db: AsyncSession = Depends(get_db)):
    p = await get_plato_by_id(db, id_plato)
    if not p:
        raise HTTPException(status_code=404, detail="Plato no encontrado")
    return p


@router.post("/ocr/procesar", response_model=PlatosOCRResponse, status_code=201)
async def procesar_platos_ocr(datos: PlatosOCRInput, db: AsyncSession = Depends(get_db)):
    """
    Procesa los platos extraídos por OCR:
    - Si el plato existe (por nombre), lo relaciona con el menú
    - Si no existe, lo crea con el tipo correspondiente y lo relaciona
    - Extrae y guarda el precio en el Menu
    """
    try:
        menuId = datos.menuId
        
        # LOG CRÍTICO: Verificar menuId al inicio
        print(f"\n" + "="*80)
        print(f"🚨 [BACKEND OCR] VERIFICACIÓN DE menuId")
        print("="*80)
        print(f"✓ menuId extraído de datos: {menuId}")
        print(f"✓ Tipo de menuId: {type(menuId)}")
        print(f"✓ Valor es None?: {menuId is None}")
        print(f"✓ Valor es 0?: {menuId == 0}")
        print("="*80 + "\n")
        # Mapear tipos de OCR a tipos de BD (valores correctos)
        tipo_mapping = {
            "Primer_plato": "primero",
            "Segundo_plato": "segundo",
            "Postres": "postre",
        }
        
        platos_por_tipo = {
            "Primer_plato": datos.Primer_plato,
            "Segundo_plato": datos.Segundo_plato,
            "Postres": datos.Postres,
        }
        
        creados = 0
        relacionados = 0
        precio_menu = None  # Variable para guardar el precio extraído del OCR
        
        # Log completo de TODOS los campos recibidos
        print(f"\n" + "="*80)
        print(f"📥 [BACKEND OCR] DATOS COMPLETOS RECIBIDOS DEL FRONTEND")
        print("="*80)
        print(f"\n🔹 MenuID: {menuId}")
        print(f"🔹 Precio del menú (campo separado): {datos.Precio}")
        print(f"\n📊 PLATOS RECIBIDOS:")
        print(f"  • Primer_plato: {len(datos.Primer_plato)} items")
        for i, p in enumerate(datos.Primer_plato):
            if isinstance(p, str):
                print(f"      [{i}] String: {p}")
            else:
                nombre = getattr(p, 'nombre', p.get('nombre', 'N/A') if isinstance(p, dict) else 'N/A')
                precio = getattr(p, 'precio', p.get('precio', None) if isinstance(p, dict) else None)
                print(f"      [{i}] {nombre} → Precio: {precio}")
        print(f"  • Segundo_plato: {len(datos.Segundo_plato)} items")
        for i, p in enumerate(datos.Segundo_plato):
            if isinstance(p, str):
                print(f"      [{i}] String: {p}")
            else:
                nombre = getattr(p, 'nombre', p.get('nombre', 'N/A') if isinstance(p, dict) else 'N/A')
                precio = getattr(p, 'precio', p.get('precio', None) if isinstance(p, dict) else None)
                print(f"      [{i}] {nombre} → Precio: {precio}")
        print(f"  • Postres: {len(datos.Postres)} items")
        for i, p in enumerate(datos.Postres):
            if isinstance(p, str):
                print(f"      [{i}] String: {p}")
            else:
                nombre = getattr(p, 'nombre', p.get('nombre', 'N/A') if isinstance(p, dict) else 'N/A')
                precio = getattr(p, 'precio', p.get('precio', None) if isinstance(p, dict) else None)
                print(f"      [{i}] {nombre} → Precio: {precio}")
        print("="*80 + "\n")
        
        # Procesar cada tipo de plato
        for tipo_ocr, items_platos in platos_por_tipo.items():
            tipo_bd = tipo_mapping[tipo_ocr]  # Mapear a nombre correcto
            print(f"\n🍽️  Procesando {tipo_ocr} (se guardará como: {tipo_bd}): {len(items_platos)} platos")
            
            for item in items_platos:
                # Compatibilidad: aceptar strings antiguos o nuevos objetos con precio
                nombre_plato = None
                precio = None
                
                if isinstance(item, str):
                    # String antiguo
                    nombre_plato = item
                    precio = None
                elif isinstance(item, dict):
                    # Dict deserializado por Pydantic
                    nombre_plato = item.get("nombre")
                    precio = item.get("precio")
                else:
                    # Objeto PlatoOCRItem
                    nombre_plato = getattr(item, "nombre", None)
                    precio = getattr(item, "precio", None)
                
                if not nombre_plato or not nombre_plato.strip():
                    continue
                
                nombre_plato = nombre_plato.strip()
                print(f"  → Buscando/creando: '{nombre_plato}' ({tipo_bd}){f' - Precio: {precio}€' if precio else ''}")
                
                # Guardar el primer precio encontrado para el Menu
                if precio is not None and precio_menu is None:
                    precio_menu = precio
                    print(f"    💰 Precio extraído para el menú: {precio_menu}€")
                
                # Buscar si existe el plato por nombre exacto
                plato_existente = await get_plato_by_nombre_exact(db, nombre_plato)
                
                if plato_existente:
                    print(f"    ✅ Plato existente encontrado (ID={plato_existente.IDPlato})")
                    # Crear la relación con el menú
                    menu_plato = await create_menu_plato(db, menuId, plato_existente.IDPlato)
                    if menu_plato:
                        relacionados += 1
                        print(f"    ✅ Relacionado con menú")
                else:
                    print(f"    ❌ Plato no existe, creando como '{tipo_bd}'...")
                    # Crear el nuevo plato con el tipo mapeado
                    nuevo_plato = await create_plato(db, nombre_plato, tipo=tipo_bd)
                    # Relacionarlo con el menú
                    menu_plato = await create_menu_plato(db, menuId, nuevo_plato.IDPlato)
                    creados += 1
                    relacionados += 1
                    print(f"    ✅ Plato creado (ID={nuevo_plato.IDPlato}) y relacionado")
        
        # Actualizar precio en el Menu 
        # Prioridad: Campo Precio separado > Primer precio de platos
        if datos.Precio is not None:
            precio_menu = datos.Precio
            print(f"\n💰 [BACKEND] Campo Precio separado detectado: {precio_menu}€")
        
        print(f"\n" + "="*80)
        print(f"🚨 [BACKEND OCR] ANTES DE ACTUALIZAR MENU")
        print("="*80)
        print(f"✓ menuId a usar: {menuId}")
        print(f"✓ precio_menu a guardar: {precio_menu}")
        print("="*80 + "\n")
        
        if precio_menu is not None:
            from src.database.crud_menu import update_menu
            print(f"📞 [BACKEND] Llamando: update_menu(db, {menuId}, precio={precio_menu})")
            menu_actualizado = await update_menu(db, menuId, precio=precio_menu)
            if menu_actualizado:
                print(f"✅ [BACKEND] Precio del menú actualizado a {precio_menu}€")
                print(f"   Menu actualizado: IDMenu={menu_actualizado.IDMenu}, Precio={menu_actualizado.Precio}")
            else:
                print(f"❌ [BACKEND] update_menu retornó None para menuId={menuId}")
        else:
            print(f"⚠️  [BACKEND] No se encontró precio para guardar (ni en campo separado ni en platos)")
        
        await db.commit()
        
        total = creados + relacionados
        print(f"\n✅ [BACKEND] OCR procesado: {creados} creados, {relacionados-creados} relacionados")
        
        return {
            "creados": creados,
            "relacionados": relacionados,
            "mensaje": f"Se procesaron {total} platos: {creados} creados, {relacionados-creados} relacionados con menú"
        }
        
    except Exception as e:
        await db.rollback()
        print(f"❌ [BACKEND] Error al procesar OCR: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error al procesar platos OCR: {str(e)}")


@router.post("/", response_model=MenuPlatoOut, status_code=201)
async def crear_plato(datos: PlatoConMenuCreate, db: AsyncSession = Depends(get_db)):
    """Crea un plato y lo asocia automáticamente a un menú en MENU_PLATO."""
    try:
        plato, menu_plato = await create_plato_con_menu(
            db, 
            datos.IDMenu, 
            datos.NombrePlato, 
            datos.Descripcion, 
            datos.Tipo
        )
        await db.commit()
        
        # Retornar con la estructura de MenuPlatoOut
        return {
            "IDMenu": menu_plato.IDMenu,
            "IDPlato": plato.IDPlato,
            "plato": {
                "IDPlato": plato.IDPlato,
                "NombrePlato": plato.NombrePlato,
                "Descripcion": plato.Descripcion,
                "Tipo": plato.Tipo,
            }
        }
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Error al crear plato: {str(e)}")


@router.put("/{id_plato}", response_model=PlatoOut)
async def actualizar_plato(
    id_plato: int,
    datos: PlatoUpdate,
    db: AsyncSession = Depends(get_db),
):
    p = await update_plato(db, id_plato, datos.NombrePlato, datos.Descripcion, datos.Tipo)
    if not p:
        raise HTTPException(status_code=404, detail="Plato no encontrado")
    return p


@router.delete("/{id_plato}", status_code=204)
async def eliminar_plato(id_plato: int, db: AsyncSession = Depends(get_db)):
    eliminado = await delete_plato(db, id_plato)
    if not eliminado:
        raise HTTPException(status_code=404, detail="Plato no encontrado")


@router.post("/ocr/procesar", response_model=PlatosOCRResponse, status_code=201)
async def procesar_platos_ocr(datos: PlatosOCRInput, db: AsyncSession = Depends(get_db)):
    """
    Procesa los platos extraídos por OCR:
    - Si el plato existe (por nombre), lo relaciona con el menú
    - Si no existe, lo crea con el tipo correspondiente y lo relaciona
    """
    try:
        menuId = datos.menuId
        # Mapear tipos de OCR a tipos de BD
        tipo_mapping = {
            "Primer_plato": "Primero",
            "Segundo_plato": "Segundo",
            "Postres": "Postre",
        }
        
        platos_por_tipo = {
            "Primer_plato": datos.Primer_plato,
            "Segundo_plato": datos.Segundo_plato,
            "Postres": datos.Postres,
        }
        
        creados = 0
        relacionados = 0
        
        print(f"\n📥 [BACKEND] Procesando platos OCR para menuId={menuId}")
        
        # Procesar cada tipo de plato
        for tipo_ocr, nombres_platos in platos_por_tipo.items():
            tipo_bd = tipo_mapping[tipo_ocr]  # Mapear a nombre correcto
            print(f"\n🍽️  Procesando {tipo_ocr} (se guardará como: {tipo_bd}): {len(nombres_platos)} platos")
            
            for nombre_plato in nombres_platos:
                if not nombre_plato or not nombre_plato.strip():
                    continue
                
                nombre_plato = nombre_plato.strip()
                print(f"  → Buscando/creando: '{nombre_plato}' ({tipo_bd})")
                
                # Buscar si existe el plato por nombre exacto
                plato_existente = await get_plato_by_nombre_exact(db, nombre_plato)
                
                if plato_existente:
                    print(f"    ✅ Plato existente encontrado (ID={plato_existente.IDPlato})")
                    # Crear la relación con el menú
                    menu_plato = await create_menu_plato(db, menuId, plato_existente.IDPlato)
                    if menu_plato:
                        relacionados += 1
                        print(f"    ✅ Relacionado con menú")
                else:
                    print(f"    ❌ Plato no existe, creando como '{tipo_bd}'...")
                    # Crear el nuevo plato con el tipo mapeado
                    nuevo_plato = await create_plato(db, nombre_plato, tipo=tipo_bd)
                    # Relacionarlo con el menú
                    menu_plato = await create_menu_plato(db, menuId, nuevo_plato.IDPlato)
                    creados += 1
                    relacionados += 1
                    print(f"    ✅ Plato creado (ID={nuevo_plato.IDPlato}) y relacionado")
        
        await db.commit()
        
        total = creados + relacionados
        print(f"\n✅ [BACKEND] OCR procesado: {creados} creados, {relacionados-creados} relacionados")
        
        return {
            "creados": creados,
            "relacionados": relacionados,
            "mensaje": f"Se procesaron {total} platos: {creados} creados, {relacionados-creados} relacionados con menú"
        }
        
    except Exception as e:
        await db.rollback()
        print(f"❌ [BACKEND] Error al procesar OCR: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error al procesar platos OCR: {str(e)}")
