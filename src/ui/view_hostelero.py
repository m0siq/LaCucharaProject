import streamlit as st
import pandas as pd
from datetime import datetime

# Simulador de OCR de Azure AI Document Intelligence
def mock_ocr_service(image_file):
    # Retorna algunos platos fijos asumiendo que el OCR leyó una carta de menú
    return [
        {"Nombre": "Sopa de Ajo", "Descripcion": "Sopa tradicional con pan, ajo y huevo escalfado.", "Tipo": "Entrante"},
        {"Nombre": "Codillo Asado", "Descripcion": "Codillo de cerdo asado a baja temperatura con patatas.", "Tipo": "Principal"},
        {"Nombre": "Tarta de Queso", "Descripcion": "Tarta de queso casera horneada.", "Tipo": "Postre"}
    ]

def render():
    st.title("👨‍🍳 Panel de Hostelero")
    
    # 1. Identificación
    st.header("Identificación")
    nombre_restaurante = st.text_input("Nombre de su Restaurante (Ej. Casa Paco)", value="La Taberna de Azca")
    
    # Asumimos o "simulamos" que se encuentra el usuario en DB
    # (Para no hacer login completo en este mock)
    id_usuario_simulado = 1 

    st.divider()

    # 2. Subir Menú
    st.header("📝 Subir Nuevo Menú")
    
    col1, col2 = st.columns(2)
    with col1:
        fecha_menu = st.date_input("Fecha del menú")
    with col2:
        precio_menu = st.number_input("Precio del menú (€)", min_value=0.0, format="%.2f", step=0.5)
        
    imagen_menu = st.file_uploader("Sube una foto del menú para digitalizar (JPG, PNG)", type=["jpg", "png", "jpeg"])
    
    if imagen_menu is not None:
        st.info("Procesando imagen con IA OCR...")
        st.image(imagen_menu, caption="Vista previa del Menú subido", width=300)
        
        # Simulación
        ocr_resultados = mock_ocr_service(imagen_menu)
        
        # 3. Confirmación y Edición
        st.subheader("Platos Detectados (Revisión)")
        st.write("Edite la información detectada. Asegúrese de que las descripciones no superen 150 caracteres.")
        
        df_platos = pd.DataFrame(ocr_resultados)
        
        # st.data_editor permite editar la tabla directamente en Streamlit
        df_editado = st.data_editor(df_platos, num_rows="dynamic", key="editor_platos")
        
        # Validar longitud
        longitudes_invalidas = df_editado['Descripcion'].str.len() > 150
        if longitudes_invalidas.any():
            st.error("⚠️ Atención: Hay descripciones que superan los 150 caracteres.")
        
        if st.button("Guardar Menú y Platos en Base de Datos"):
            if not longitudes_invalidas.any():
                st.success(f"Menú del restaurante '{nombre_restaurante}' guardado exitosamente.")
                st.balloons()
                # Aquí iría la lógica SQLAlchemy real:
                # db = next(get_db())
                # nuevo_menu = Menu(IDUsuario=id_usuario_simulado, Imagen_menu=imagen_menu.name, Fecha=fecha_menu, Precio=precio_menu)
                # db.add(nuevo_menu)
                # db.commit()
                # for index, row in df_editado.iterrows():
                #    nuevo_plato = Plato(NombrePlato=row['Nombre'], Descripcion=row['Descripcion'], Tipo=row['Tipo'])
                #    db.add(nuevo_plato)
                #    db.commit()
                #    db.execute(menu_plato.insert().values(IDMenu=nuevo_menu.IDMenu, IDPlato=nuevo_plato.IDPlato))
                # db.commit()
            else:
                st.warning("Corrija las descripciones antes de guardar.")
