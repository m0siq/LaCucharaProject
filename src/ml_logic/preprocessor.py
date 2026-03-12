"""
src/ml_logic/preprocessor.py
─────────────────────────────
Utilidades NLP para La Cuchara:
 - Limpieza y normalización de texto en español
 - Extracción de palabras clave para filtrado en frontend
"""

import re
import unicodedata
from typing import List

# ──────────────────────────────────────────────────────────────────────────────
# STOPWORDS en español (general + gastronómicas)
# ──────────────────────────────────────────────────────────────────────────────
STOPWORDS_ES = {
    # Artículos y preposiciones
    "a", "al", "ante", "bajo", "con", "contra", "de", "del", "desde", "el",
    "en", "entre", "hacia", "hasta", "la", "las", "le", "les", "lo", "los",
    "mas", "me", "mi", "mis", "muy", "ni", "nos", "o", "para", "per", "pero",
    "por", "que", "se", "si", "sin", "sobre", "su", "sus", "te", "ti", "tu",
    "tus", "un", "una", "unas", "unos", "y", "ya",
    # Verbos comunes
    "es", "son", "fue", "era", "ser", "estar", "tiene", "han", "hay",
    # Gastronómicos neutros (no aportan categoría)
    "plato", "dish", "receta", "elaborado", "preparado", "servido",
    "fresco", "natural", "casero", "hecho", "acompañado", "junto",
    "toque", "punto", "base", "producto", "ingrediente", "ingredientes",
}

# Palabras clave dominantes por categoría dietética
CATEGORY_KEYWORDS = {
    "Pescado":     ["merluza", "salmón", "atún", "bacalao", "lubina", "dorada",
                    "gambas", "pulpo", "calamar", "sepia", "mejillón", "almeja",
                    "sardina", "boquerón", "rape", "rodaballo", "langosta",
                    "langostino", "anchoa", "marisco", "pescado", "trucha"],
    "Carne":       ["ternera", "cerdo", "pollo", "cordero", "buey", "pato",
                    "conejo", "pavo", "carne", "lomo", "solomillo", "costilla",
                    "chuleta", "filete", "jamón", "embutido", "chorizo",
                    "morcilla", "bacon", "panceta", "hamburguesa", "albóndiga"],
    "Vegetariano": ["verdura", "ensalada", "tomate", "lechuga", "espinaca",
                    "berenjena", "calabacín", "pimiento", "cebolla", "ajo",
                    "zanahoria", "brócoli", "coliflor", "judía", "garbanzo",
                    "lentejas", "champiñón", "seta", "queso", "huevo",
                    "vegetal", "vegetariano", "vegano", "espárrago"],
    "Pasta":       ["pasta", "espagueti", "macarrón", "lasaña", "fideos",
                    "tallarines", "ravioli", "linguine", "penne", "gnocchi",
                    "risotto", "arroz", "paella", "canelones"],
}


# ──────────────────────────────────────────────────────────────────────────────
# Funciones
# ──────────────────────────────────────────────────────────────────────────────

def _remove_accents(text: str) -> str:
    """Elimina acentos y diacríticos."""
    nfkd = unicodedata.normalize("NFKD", text)
    return "".join(c for c in nfkd if not unicodedata.combining(c))


def clean_text(text: str) -> str:
    """
    Normaliza texto para NLP:
    - Minúsculas
    - Elimina caracteres especiales
    - Elimina stopwords en español
    - Devuelve tokens concatenados
    """
    if not text:
        return ""
    text = text.lower()
    text = _remove_accents(text)
    text = re.sub(r"[^a-záéíóúüñ\s]", " ", text, flags=re.UNICODE)
    tokens = text.split()
    tokens = [t for t in tokens if t not in STOPWORDS_ES and len(t) > 2]
    return " ".join(tokens)


def extract_keywords(text: str, n: int = 5) -> List[str]:
    """
    Extrae las N palabras más relevantes del texto para el filtrado en frontend.
    Prioriza palabras que coincidan con categorías conocidas.
    
    Args:
        text: Texto libre del nombre/descripción del plato (max ~150 chars)
        n:    Número de palabras clave a devolver

    Returns:
        Lista de palabras clave en minúsculas sin acentos
    """
    if not text:
        return []

    cleaned = clean_text(text)
    tokens = cleaned.split()

    # Eliminar duplicados preservando orden
    seen: set = set()
    unique_tokens = []
    for t in tokens:
        if t not in seen:
            seen.add(t)
            unique_tokens.append(t)

    # Dar prioridad a términos de categoría conocida
    priority_tokens = []
    normal_tokens = []

    all_category_words = {
        word for words in CATEGORY_KEYWORDS.values() for word in words
    }
    normalized_cat_words = {_remove_accents(w) for w in all_category_words}

    for t in unique_tokens:
        if t in normalized_cat_words:
            priority_tokens.append(t)
        else:
            normal_tokens.append(t)

    keywords = (priority_tokens + normal_tokens)[:n]
    return keywords


def build_feature_text(nombre: str, descripcion: str | None, tipo: str | None) -> str:
    """
    Construye el texto de features combinando nombre + descripcion + tipo
    para el clasificador ML. Max 150 chars de entrada raw.
    """
    parts = [nombre or ""]
    if descripcion:
        parts.append(descripcion[:150])
    if tipo:
        parts.append(tipo)
    return " ".join(parts)
