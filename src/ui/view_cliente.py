import streamlit as st
import pandas as pd
from datetime import datetime

# Simulación de extracción de base de datos
def obtener_menus_simulados():
    return [
        {
            "IDMenu": 1, 
            "Restaurante": "La Taberna de Azca", 
            "PuntuacionMedia": 4.8, 
            "Precio": 12.50, 
            "Fecha": "2024-03-24",
            "Platos": [
                {"IDPlato": 101, "NombrePlato": "Sopa de Ajo", "Descripcion": "Sopa tradicional con pan, ajo y huevo escalfado.", "Tipo": "Entrante"},
                {"IDPlato": 102, "NombrePlato": "Codillo Asado", "Descripcion": "Codillo de cerdo asado a baja temperatura con patatas.", "Tipo": "Principal"}
            ]
        },
        {
            "IDMenu": 2, 
            "Restaurante": "Bistro Verde", 
            "PuntuacionMedia": 4.2, 
            "Precio": 14.00, 
            "Fecha": "2024-03-24",
            "Platos": [
                {"IDPlato": 103, "NombrePlato": "Ensalada César", "Descripcion": "Ensalada verde con pollo, costrones y salsa César.", "Tipo": "Entrante"},
                {"IDPlato": 104, "NombrePlato": "Lasaña Vegetal", "Descripcion": "Lasaña casera con verduras de temporada y bechamel.", "Tipo": "Principal"}
            ]
        }
    ]

def render():
    st.title("🍽️ Bienvenid@ a La Cuchara (Azca)")
    st.write("Encuentra los mejores menús del día cerca de ti.")
    
    # 1. Búsqueda y Filtrado
    termino_busqueda = st.text_input("🔍 Buscar por Plato (ej. Sopa) o Tipo (ej. Entrante)")
    
    # Obtener menús de la base de datos (simulado) y ordenar por puntuación
    menus = obtener_menus_simulados()
    # ORDENACIÓN POR VALORACIÓN (Funcionalidad Clave)
    menus = sorted(menus, key=lambda x: x["PuntuacionMedia"], reverse=True)
    
    # Filtrado en memoria (simulado, idealmente en consulta SQL)
    if termino_busqueda:
        menus_filtrados = []
        for menu in menus:
            coincide = False
            for plato in menu["Platos"]:
                if termino_busqueda.lower() in plato["NombrePlato"].lower() or termino_busqueda.lower() in plato["Tipo"].lower():
                    coincide = True
            if coincide:
                menus_filtrados.append(menu)
        menus = menus_filtrados

    st.divider()
    
    # 2. Visualización de Cartas/Menús
    st.header("Menús Destacados")
    
    if not menus:
        st.warning("No se encontraron menús que coincidan con tu búsqueda.")
    
    for menu in menus:
        # Tarjeta del menú
        with st.container(border=True):
            col1, col2, col3 = st.columns([1, 2, 1])
            with col1:
                st.image("https://via.placeholder.com/150?text=Menu", width=120)
            with col2:
                st.subheader(menu["Restaurante"])
                st.write(f"📅 Fecha: {menu['Fecha']}")
                st.write(f"💶 Precio: **{menu['Precio']:.2f} €**")
            with col3:
                st.subheader(f"⭐ {menu['PuntuacionMedia']}/5")
                ver_detalle = st.button("Ver Selección y Valorar", key=f"btn_ver_{menu['IDMenu']}")
            
            # 3. Detalle del Menú y Sistema de Valoración
            if st.session_state.get(f"ver_{menu['IDMenu']}", False) or ver_detalle:
                st.session_state[f"ver_{menu['IDMenu']}"] = True # Mantener estado abierto
                
                st.write("---")
                st.write("**Platos del menú:**")
                for plato in menu["Platos"]:
                    with st.expander(f"{plato['Tipo'].upper()}: {plato['NombrePlato']}"):
                        st.write(f"_{plato['Descripcion']}_")
                        
                        # Formulario de valoración incrustado por plato
                        with st.form(key=f"form_val_{plato['IDPlato']}"):
                            st.write("Valora este plato:")
                            puntuacion = st.slider("Puntuación", 1, 5, 5, key=f"slider_{plato['IDPlato']}")
                            comentario = st.text_area("Comentario (máx 150 caracteres)", max_chars=150, key=f"text_{plato['IDPlato']}")
                            submitted = st.form_submit_button("Enviar Valoración")
                            if submitted:
                                # Aquí iría el insert SQL real en la tabla Valoracion
                                st.success("¡Tu valoración ha sido registrada!")
