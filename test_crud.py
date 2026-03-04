"""
test_crud.py  (ejecutar desde la raiz del proyecto)
────────────────────────────────────────────────────
Prueba todos los CRUD de la base de datos.
Ejecutar: python test_crud.py
"""

import asyncio
import os
from src.database.connection import test_connection, create_tables, AsyncSessionLocal

from src.database.crud_usuario    import get_all_usuarios, delete_usuario
from src.database.crud_hostelero  import create_hostelero, get_hostelero_by_id, update_hostelero, delete_hostelero
from src.database.crud_cliente    import create_cliente, get_cliente_by_id, update_cliente, delete_cliente
from src.database.crud_plato      import create_plato, get_all_platos, get_platos_by_tipo, update_plato, delete_plato
from src.database.crud_menu       import create_menu, get_menus_by_usuario, add_plato_to_menu, get_platos_de_menu, remove_plato_from_menu, delete_menu
from src.database.crud_valoracion import create_valoracion, get_valoraciones_by_plato, get_media_puntuacion, update_valoracion, delete_valoracion


OK  = "  [OK]"
ERR = "  [ERROR]"
SEP = "-" * 45


def titulo(texto: str):
    print(f"\n{'=' * 45}")
    print(f"  {texto}")
    print('=' * 45)


def paso(texto: str):
    print(f"\n{SEP}")
    print(f"  >> {texto}")
    print(SEP)


# ─────────────────────────────────────────────────
# HOSTELERO
# ─────────────────────────────────────────────────
async def test_hostelero(session) -> int:
    titulo("HOSTELERO")

    paso("CREATE hostelero")
    h = await create_hostelero(session, "chef_ana", "pass123", "Restaurante Sol")
    print(f"{OK} Creado: {h}")

    paso("READ hostelero por ID")
    h2 = await get_hostelero_by_id(session, h.IDUsuario)
    print(f"{OK} Leído: {h2}")

    paso("UPDATE nombre restaurante")
    h3 = await update_hostelero(session, h.IDUsuario, nombre_restaurante="Restaurante Luna")
    print(f"{OK} Actualizado: {h3}")

    return h.IDUsuario


# ─────────────────────────────────────────────────
# CLIENTE
# ─────────────────────────────────────────────────
async def test_cliente(session) -> int:
    titulo("CLIENTE")

    paso("CREATE cliente")
    c = await create_cliente(session, "cliente_pepe", "clave456")
    print(f"{OK} Creado: {c}")

    paso("READ cliente por ID")
    c2 = await get_cliente_by_id(session, c.IDUsuario)
    print(f"{OK} Leído: {c2}")

    paso("UPDATE contrasena")
    c3 = await update_cliente(session, c.IDUsuario, contrasena="nueva_clave")
    print(f"{OK} Actualizado: {c3}")

    return c.IDUsuario


# ─────────────────────────────────────────────────
# PLATO
# ─────────────────────────────────────────────────
async def test_plato(session) -> tuple[int, int]:
    titulo("PLATO")

    paso("CREATE 2 platos")
    p1 = await create_plato(session, "Gazpacho",  "Sopa fria andaluza", "Entrante")
    p2 = await create_plato(session, "Paella",    "Arroz con marisco",  "Principal")
    print(f"{OK} Plato 1: {p1}")
    print(f"{OK} Plato 2: {p2}")

    paso("READ todos los platos")
    todos = await get_all_platos(session)
    print(f"{OK} Total platos: {len(todos)}")

    paso("READ platos por tipo 'Entrante'")
    entrantes = await get_platos_by_tipo(session, "Entrante")
    print(f"{OK} Entrantes encontrados: {len(entrantes)}")

    paso("UPDATE descripcion plato 1")
    p1u = await update_plato(session, p1.IDPlato, descripcion="Receta tradicional sevillana")
    print(f"{OK} Actualizado: {p1u}")

    return p1.IDPlato, p2.IDPlato


# ─────────────────────────────────────────────────
# MENU
# ─────────────────────────────────────────────────
def pedir_imagen() -> bytes | None:
    """Pide al usuario una ruta de imagen y la lee como bytes."""
    print(f"\n  Introduce la ruta de una imagen para el menu")
    print(f"  (jpg, png, etc.) o pulsa ENTER para omitir:")
    ruta = input("  Ruta: ").strip().strip('"').strip("'")

    if not ruta:
        print(f"  Sin imagen, se guardara NULL")
        return None

    if not os.path.isfile(ruta):
        print(f"  Archivo no encontrado, se guardara NULL")
        return None

    with open(ruta, "rb") as f:
        datos = f.read()

    size_kb = len(datos) / 1024
    print(f"{OK} Imagen leida: {os.path.basename(ruta)} ({size_kb:.1f} KB)")
    return datos


async def test_menu(session, id_hostelero: int, id_plato1: int, id_plato2: int) -> int:
    titulo("MENU")

    paso("CREATE menu (se pedira una imagen)")
    imagen_bytes = pedir_imagen()
    m = await create_menu(session, id_hostelero, imagen_menu=imagen_bytes)
    print(f"{OK} Creado: {m}")

    paso("ADD 2 platos al menu")
    await add_plato_to_menu(session, m.IDMenu, id_plato1)
    await add_plato_to_menu(session, m.IDMenu, id_plato2)
    print(f"{OK} Platos añadidos")

    paso("READ platos del menu")
    platos = await get_platos_de_menu(session, m.IDMenu)
    print(f"{OK} Platos en menu: {[p.NombrePlato for p in platos]}")

    paso("REMOVE plato 2 del menu")
    eliminado = await remove_plato_from_menu(session, m.IDMenu, id_plato2)
    print(f"{OK} Plato eliminado del menu: {eliminado}")

    paso("READ menus del hostelero")
    menus = await get_menus_by_usuario(session, id_hostelero)
    print(f"{OK} Menus del hostelero: {len(menus)}")

    return m.IDMenu


# ─────────────────────────────────────────────────
# VALORACION
# ─────────────────────────────────────────────────
async def test_valoracion(session, id_cliente: int, id_plato: int) -> int:
    titulo("VALORACION")

    paso("CREATE valoracion")
    v = await create_valoracion(session, id_plato, id_cliente, puntuacion=4.5, comentario="Excelente!")
    print(f"{OK} Creada: {v}")

    paso("READ valoraciones del plato")
    vals = await get_valoraciones_by_plato(session, id_plato)
    print(f"{OK} Valoraciones: {len(vals)}")

    paso("READ media de puntuacion")
    media = await get_media_puntuacion(session, id_plato)
    print(f"{OK} Media puntuacion: {media:.2f}")

    paso("UPDATE comentario")
    vu = await update_valoracion(session, v.IDValoracion, puntuacion=5.0, comentario="Increible, repito!")
    print(f"{OK} Actualizada: {vu}")

    return v.IDValoracion


# ─────────────────────────────────────────────────
# LIMPIEZA
# ─────────────────────────────────────────────────
async def cleanup(session, id_valoracion, id_menu, id_plato1, id_plato2, id_hostelero, id_cliente):
    titulo("LIMPIEZA")

    await delete_valoracion(session, id_valoracion);  print(f"{OK} Valoracion eliminada")
    await delete_menu(session, id_menu);              print(f"{OK} Menu eliminado")
    await delete_plato(session, id_plato1);           print(f"{OK} Plato 1 eliminado")
    await delete_plato(session, id_plato2);           print(f"{OK} Plato 2 eliminado")
    await delete_hostelero(session, id_hostelero);    print(f"{OK} Hostelero eliminado")
    await delete_cliente(session, id_cliente);        print(f"{OK} Cliente eliminado")

    usuarios = await get_all_usuarios(session)
    print(f"\n{OK} Usuarios restantes en BD: {len(usuarios)}")


# ─────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────
async def main():
    print("\n" + "=" * 45)
    print("  TEST COMPLETO DE CRUDS")
    print("=" * 45)

    # 1. Conexion
    print("\n>> Comprobando conexion...")
    if not await test_connection():
        print(f"{ERR} No se pudo conectar. Revisa el .env")
        return
    print(f"{OK} Conexion establecida")

    # 2. Tablas
    print("\n>> Creando tablas...")
    await create_tables()
    print(f"{OK} Tablas listas")

    # 3. Tests dentro de UNA sola sesion/transaccion
    async with AsyncSessionLocal() as session:
        try:
            id_hostelero            = await test_hostelero(session)
            id_cliente              = await test_cliente(session)
            id_plato1, id_plato2   = await test_plato(session)
            id_menu                 = await test_menu(session, id_hostelero, id_plato1, id_plato2)
            id_valoracion           = await test_valoracion(session, id_cliente, id_plato1)

            respuesta = input("\nEliminar datos de prueba? (s/n): ").strip().lower()
            if respuesta == "s":
                await cleanup(session, id_valoracion, id_menu, id_plato1, id_plato2, id_hostelero, id_cliente)

            await session.commit()

        except Exception as e:
            await session.rollback()
            print(f"\n{ERR} Error durante el test: {e}")
            raise

    print("\n" + "=" * 45)
    print("  TEST COMPLETADO CON EXITO")
    print("=" * 45 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
