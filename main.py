import streamlit as st
from src.ui import view_cliente, view_hostelero 
import sys
import os

# Añade la carpeta raíz del proyecto al sistema de rutas de Python
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

def main():
    st.set_page_config(page_title="La Cuchara - Azca", page_icon="🥄", layout="wide")
    
    st.sidebar.title("Navegación")
    st.sidebar.write("Seleccione su rol de usuario:")
    
    # Barra lateral (sidebar) para seleccionar el rol
    rol = st.sidebar.radio("Rol de Usuario", ["Cliente", "Hostelero"])
    
    if rol == "Cliente":
        view_cliente.render()
    elif rol == "Hostelero":
        view_hostelero.render()

if __name__ == "__main__":
    main()
