"""
src/ml_logic/classifier.py
───────────────────────────
Clasificador de categoría dietética de platos.

Pipeline: TF-IDF → LogisticRegression
Clases: Pescado | Carne | Vegetariano | Pasta | Otro

Uso:
    from src.ml_logic.classifier import predict_diet, load_classifier
    load_classifier()          # carga o genera el modelo
    result = predict_diet("Merluza a la romana", "Filete rebozado", "Segundo Plato")
"""

import os
import joblib
import logging
from pathlib import Path

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer

from src.ml_logic.preprocessor import (
    build_feature_text,
    extract_keywords,
    CATEGORY_KEYWORDS,
    _remove_accents,
)

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────────────
# Ruta del modelo serializado
# ──────────────────────────────────────────────────────────────────────────────
MODEL_DIR = Path(__file__).parent / "models"
MODEL_PATH = MODEL_DIR / "classifier.pkl"

CLASSES = ["Pescado", "Carne", "Vegetariano", "Pasta", "Otro"]

_pipeline: Pipeline | None = None


# ──────────────────────────────────────────────────────────────────────────────
# Construcción del pipeline sklearn
# ──────────────────────────────────────────────────────────────────────────────

def _build_pipeline() -> Pipeline:
    return Pipeline([
        ("tfidf", TfidfVectorizer(
            analyzer="word",
            ngram_range=(1, 2),
            max_features=5000,
            sublinear_tf=True,
            min_df=1,
        )),
        ("clf", LogisticRegression(
            multi_class="multinomial",
            solver="lbfgs",
            max_iter=1000,
            C=1.5,
            class_weight="balanced",
        )),
    ])


# ──────────────────────────────────────────────────────────────────────────────
# Generación de datos sintéticos de entrenamiento (fallback cold-start)
# ──────────────────────────────────────────────────────────────────────────────

def _generate_synthetic_data() -> tuple[list[str], list[str]]:
    """
    Genera dataset de entrenamiento sintético (~350 muestras) con platos
    típicos de restaurantes españoles. Se usa cuando no hay datos reales.
    """
    samples_by_class = {
        "Pescado": [
            "Merluza a la romana filete rebozado limón",
            "Salmón a la plancha con verduras",
            "Bacalao al pil pil salsa tradicional vasca",
            "Dorada al horno con patatas y limón",
            "Pulpo a la gallega con pimentón y aceite",
            "Gambas al ajillo ajo guindilla aceite oliva",
            "Lubina a la sal pescado fresco horno",
            "Atún encebollado cebolla tomate",
            "Calamares a la romana rebozados fritos",
            "Rape en salsa verde perejil ajo mejillón",
            "Boquerones en vinagre marinados frescos",
            "Sardinas a la plancha brasa limón",
            "Sepia plancha ajo perejil guarnición",
            "Langostinos plancha marisco fresco",
            "Mejillones al vapor vino blanco",
            "Trucha a la navarra jamón serrano",
            "Rodaballo al horno con tomate",
            "Anchoas del cantábrico aceite oliva",
            "Langosta a la brasa marisco premium",
            "Almejas a la marinera vino blanco ajo",
            "Ceviche corvina lima coriandro",
            "Bacalao confitado aceite oliva bajo temperatura",
            "Vieiras gratinadas bechamel gratín",
            "Salpicón de marisco gambas langostinos pulpo",
            "Merluza al pil pil salsa vasca tradicional",
            "Lubina salvaje a la espalda ajo vinagre",
            "Besugo al horno Navidad pescado blanco",
            "Chipirones rellenos tinta cebolla",
            "Gambón plancha sal gruesa marisco",
            "Bacalao brandada puré patatas aceite",
        ],
        "Carne": [
            "Solomillo de ternera con salsa de pimienta",
            "Pollo asado al horno patatas guarnición",
            "Cordero asado lento especias romero",
            "Costillas cerdo BBQ barbacoa miel",
            "Filete de buey con mantequilla trufada",
            "Albóndigas en salsa tomate casera",
            "Rabo de toro estofado vino tinto",
            "Pato confitado naranja salsa agridulce",
            "Pechuga pollo plancha limón hierbas",
            "Lomo de cerdo ibérico bellota",
            "Chuleta vaca vieja madurada brasa",
            "Hamburguesa artesanal carne angus queso",
            "Conejo al ajillo ajo perejil vino blanco",
            "Carrillada cerdo ibérico vino Pedro Ximénez",
            "Magret pato higos reducción oporto",
            "Escalope ternera milanesa limón alcaparra",
            "Jarrete ternera gelatina caldo",
            "Cochinillo asado Segovia piel crujiente",
            "Pollo pepitoria salsa almendra azafrán",
            "Entrecot angus chimichurri hierba argentina",
            "Callos madrileños chorizo morcilla tripa",
            "Estofado ternera zanahoria patata",
            "Pavo relleno navideño frutos secos",
            "Chuletón angus 400g brasa sal",
            "Secreto ibérico plancha sal ahumada",
            "Panceta crujiente miel mostaza",
            "Osobuco milanese gremolata risotto",
            "Codillo alemán cerveza chucrut",
            "Pollo tandoori especias yogur marino",
            "Ternera guisada patatas verduras caldo",
        ],
        "Vegetariano": [
            "Ensalada mixta tomate lechuga cebolla",
            "Gazpacho andaluz tomate pepino pimiento",
            "Crema de calabaza jengibre leche coco",
            "Revuelto de setas silvestres huevo",
            "Tortilla española patatas cebolla huevo",
            "Pisto manchego calabacín pimiento tomate",
            "Berenjenas rellenas queso verduras",
            "Espárragos trigueros plancha mayonesa",
            "Ensalada caprese tomate mozzarella albahaca",
            "Queso de cabra rulo miel nueces",
            "Croquetas caseras bechamel queso jamón",
            "Hummus garbanzos tahini limón",
            "Salmorejo cordobés tomate pan ajo",
            "Menestra verduras temporada",
            "Pimientos rellenos arroz verduras",
            "Patatas bravas salsa brava aioli",
            "Champiñones rellenos ajo perejil",
            "Crema guisantes menta nata",
            "Ensalada rúcula parmesano piñones",
            "Quiche lorraine puerro queso gruyère",
            "Wok verduras salsa soja jengibre",
            "Tarta queso philadelphia base galleta",
            "Aguacate tostada tomate", 
            "Currys lentejas rojas coco especias",
            "Risotto hongos parmesano mantequilla",
            "Crema espárragos blancos trufa",
            "Ceviche vegano mezclum lima mango",
            "Tartar remolacha aguacate semillas",
            "Gazpacho sandía pepino hierbabuena",
            "Timbal berenjena tomate pesto",
        ],
        "Pasta": [
            "Espagueti carbonara panceta huevo parmesano",
            "Lasaña boloñesa carne picada bechamel",
            "Macarrones gratinados queso horno",
            "Tagliatelle trufa negra parmesano mantequilla",
            "Ravioli ricotta espinacas salsa tomate",
            "Penne arrabbiata picante tomate guindilla",
            "Linguine gambas ajo tomate cherry",
            "Fettuccine alfredo nata parmesano",
            "Paella valenciana pollo conejo garrofón",
            "Arroz negro calamar tinta sepia",
            "Risotto setas silvestres parmesano",
            "Fideuà mariscos caldo pescado",
            "Gnocchi gorgonzola nuez salsa cremosa",
            "Canelon carne picada bechamel gratín",
            "Sopa seca fideos tomate pollo",
            "Pasta fresca casera huevo harina",
            "Espagueti almejas marinera vino blanco",
            "Rigatoni salchicha italiana fenol",
            "Arroz caldoso bogavante",
            "Macarrones boloñesa carne tomate",
            "Pasta pesto genovés albahaca piñones",
            "Tortellini ricotta mantequilla salvia",
            "Arroz pilaf verduras caldo",
            "Noodles pollo salsa soja wok",
            "Pasta estival tomate fresco albahaca",
            "Lasaña vegetal calabacín berenjena",
            "Espagueti marinara tomate ajo aceitunas",
            "Risotto langostinos azafrán nata",
            "Pasta integral atún tomate cherry",
            "Fideos soba miso caldo japonés",
        ],
        "Otro": [
            "Tabla quesos selección variados",
            "Brownie chocolate nueces caliente",
            "Tarta San Marcos bizcocho nata yema",
            "Helado artesanal vainilla chocolate",
            "Crema catalana azúcar quemado",
            "Tiramisú mascarpone café amaretto",
            "Coulant chocolate caliente interior",
            "Sopa minestrone verduras pasta legumbre",
            "Consomé caldo pollo fideos",
            "Caldo gallego grelos lacón chorizo",
            "Natillas caseras vainilla canela",
            "Flan casero huevo caramelo",
            "Mousse limón suave espumoso",
            "Panna cotta vainilla frutos rojos",
            "Tarta manzana hojaldre canela",
            "Pan de ajo mantequilla hierbas",
            "Caldo de verduras caldo ligero",
            "Sopa de cebolla gratinada queso",
            "Tabla embutidos ibéricos selección",
            "Jamón ibérico bellota cortado cuchillo",
            "Chistorra txistorra navarra plancha",
            "Morcilla arroz asada plancha",
            "Picoteo surtido aceitunas frutos secos pan",
            "Macedonia frutas tropicales frescas",
            "Sorbete limón granizado helado",
            "Profiteroles chocolate crema",
            "Tarta zanahoria queso Philadelphia",
            "Pannacotta frutos bosque coulis",
            "Yogur griego miel nueces",
            "Gelatina frutas menta refrescante",
        ],
    }

    texts, labels = [], []
    for category, examples in samples_by_class.items():
        for example in examples:
            # Normalizar con el preprocessor
            from src.ml_logic.preprocessor import clean_text
            texts.append(clean_text(example))
            labels.append(category)

    return texts, labels


# ──────────────────────────────────────────────────────────────────────────────
# Carga y entrenamiento del modelo
# ──────────────────────────────────────────────────────────────────────────────

def train_and_save(texts: list[str], labels: list[str]) -> Pipeline:
    """Entrena el pipeline y lo persiste en disco."""
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    pipeline = _build_pipeline()
    pipeline.fit(texts, labels)
    joblib.dump(pipeline, MODEL_PATH)
    logger.info("✅ Modelo clasificador guardado en %s", MODEL_PATH)
    return pipeline


def load_classifier() -> Pipeline:
    """
    Carga el modelo desde disco.
    Si no existe, entrena con datos sintéticos automáticamente.
    """
    global _pipeline
    if _pipeline is not None:
        return _pipeline

    if MODEL_PATH.exists():
        logger.info("📦 Cargando clasificador desde %s", MODEL_PATH)
        _pipeline = joblib.load(MODEL_PATH)
    else:
        logger.warning("⚠️  Modelo no encontrado. Entrenando con datos sintéticos...")
        texts, labels = _generate_synthetic_data()
        _pipeline = train_and_save(texts, labels)

    return _pipeline


# ──────────────────────────────────────────────────────────────────────────────
# Inferencia
# ──────────────────────────────────────────────────────────────────────────────

def predict_diet(
    nombre_plato: str,
    descripcion: str | None = None,
    tipo: str | None = None,
) -> dict:
    """
    Predice la categoría dietética de un plato.

    Args:
        nombre_plato: Nombre del plato (columna NombrePlato)
        descripcion:  Descripción libre (max 150 chars recomendado)
        tipo:         Tipo de plato (Primer Plato, Segundo Plato, Postre…)

    Returns:
        {
            "categoria":  "Pescado" | "Carne" | "Vegetariano" | "Pasta" | "Otro",
            "confianza":  0.0 – 1.0,
            "probabilidades": {"Pescado": 0.x, "Carne": 0.x, ...},
            "keywords":   ["merluza", "plancha", ...],
        }
    """
    pipeline = load_classifier()

    feature_text = build_feature_text(nombre_plato, descripcion, tipo)
    from src.ml_logic.preprocessor import clean_text
    cleaned = clean_text(feature_text)

    proba_array = pipeline.predict_proba([cleaned])[0]
    classes = pipeline.classes_
    proba_dict = {cls: round(float(p), 4) for cls, p in zip(classes, proba_array)}

    best_idx = int(np.argmax(proba_array))
    categoria = classes[best_idx]
    confianza = round(float(proba_array[best_idx]), 4)

    keywords = extract_keywords(feature_text)

    return {
        "categoria": categoria,
        "confianza": confianza,
        "probabilidades": proba_dict,
        "keywords": keywords,
    }
