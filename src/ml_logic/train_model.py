"""
src/ml_logic/train_model.py
────────────────────────────
Script de entrenamiento del clasificador dietético de La Cuchara.

Uso:
    cd d:\\proyectoCuchara\\LaCucharaProject
    .venv\\Scripts\\python.exe -m src.ml_logic.train_model

El script:
 1. Intenta cargar platos reales desde la BD (failsafe)
 2. Combina datos reales con datos sintéticos
 3. Entrena pipeline TF-IDF + LogisticRegression
 4. Guarda el modelo en src/ml_logic/models/classifier.pkl
 5. Imprime métricas de evaluación
"""

from __future__ import annotations

import asyncio
import logging
import sys
from pathlib import Path

import numpy as np
from sklearn.metrics import classification_report, accuracy_score
from sklearn.model_selection import train_test_split, cross_val_score

# Asegurar que el root del proyecto está en el path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("train_model")


# ──────────────────────────────────────────────────────────────────────────────
# Carga de datos reales desde la BD (opcional, failsafe)
# ──────────────────────────────────────────────────────────────────────────────

async def _load_real_data() -> list[dict]:
    """
    Intenta cargar platos reales desde Azure SQL.
    Retorna lista vacía si falla la conexión.
    """
    try:
        from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
        from sqlalchemy import select
        from src.database.models import Plato
        from src.database.connection import async_engine

        async with AsyncSession(async_engine) as session:
            result = await session.execute(
                select(Plato).where(Plato.Descripcion.isnot(None))
            )
            platos = result.scalars().all()
            logger.info("✅ Cargados %d platos reales de la BD", len(platos))
            return [
                {
                    "NombrePlato": p.NombrePlato,
                    "Descripcion": p.Descripcion,
                    "Tipo": p.Tipo,
                }
                for p in platos
            ]
    except Exception as exc:  # noqa: BLE001
        logger.warning("⚠️  No se pudo conectar a la BD: %s. Usando solo datos sintéticos.", exc)
        return []


# ──────────────────────────────────────────────────────────────────────────────
# Heurística de etiquetado automático para datos reales sin etiqueta
# ──────────────────────────────────────────────────────────────────────────────

def _auto_label(nombre: str, descripcion: str | None, tipo: str | None) -> str | None:
    """
    Intenta etiquetar automáticamente un plato real usando palabras clave.
    Retorna None si no se puede determinar la categoría con suficiente confianza.
    """
    from src.ml_logic.preprocessor import CATEGORY_KEYWORDS, _remove_accents, clean_text

    text = clean_text(f"{nombre} {descripcion or ''}")
    tokens = set(text.split())

    best_cat = None
    best_count = 0

    for category, keywords in CATEGORY_KEYWORDS.items():
        normalized_kws = {_remove_accents(kw) for kw in keywords}
        count = len(tokens & normalized_kws)
        if count > best_count:
            best_count = count
            best_cat = category

    # Solo aceptar si hay al menos 1 coincidencia
    return best_cat if best_count >= 1 else None


# ──────────────────────────────────────────────────────────────────────────────
# Entrenamiento principal
# ──────────────────────────────────────────────────────────────────────────────

def train(extra_platos: list[dict] | None = None) -> None:
    from src.ml_logic.classifier import (
        _generate_synthetic_data,
        train_and_save,
        MODEL_PATH,
    )
    from src.ml_logic.preprocessor import clean_text, build_feature_text

    logger.info("=" * 60)
    logger.info("  ENTRENAMIENTO — Clasificador Dietético La Cuchara")
    logger.info("=" * 60)

    # 1. Datos sintéticos base
    texts_synth, labels_synth = _generate_synthetic_data()
    logger.info("📦 Datos sintéticos: %d muestras", len(texts_synth))

    # 2. Datos reales etiquetados automáticamente
    texts_real, labels_real = [], []
    if extra_platos:
        for p in extra_platos:
            label = _auto_label(p["NombrePlato"], p.get("Descripcion"), p.get("Tipo"))
            if label:
                feature = build_feature_text(
                    p["NombrePlato"], p.get("Descripcion"), p.get("Tipo")
                )
                texts_real.append(clean_text(feature))
                labels_real.append(label)
        logger.info("🏷️  Datos reales etiquetados: %d muestras", len(texts_real))

    # 3. Combinar datasets
    all_texts = texts_synth + texts_real
    all_labels = labels_synth + labels_real
    logger.info("📊 Total muestras de entrenamiento: %d", len(all_texts))

    # Distribución de clases
    from collections import Counter
    dist = Counter(all_labels)
    for cat, count in sorted(dist.items()):
        logger.info("   %-15s %d muestras", cat, count)

    # 4. Split train/test
    if len(all_texts) >= 20:
        X_train, X_test, y_train, y_test = train_test_split(
            all_texts, all_labels, test_size=0.2, random_state=42, stratify=all_labels
        )
    else:
        X_train, X_test, y_train, y_test = all_texts, all_texts, all_labels, all_labels

    logger.info("\n🔧 Entrenando pipeline TF-IDF + LogisticRegression...")

    # 5. Construir y entrenar pipeline
    from src.ml_logic.classifier import _build_pipeline
    pipeline = _build_pipeline()
    pipeline.fit(X_train, y_train)

    # 6. Métricas en test set
    y_pred = pipeline.predict(X_test)
    acc = accuracy_score(y_test, y_pred)

    logger.info("\n📈 MÉTRICAS DE EVALUACIÓN")
    logger.info("-" * 40)
    logger.info("Accuracy: %.4f (%.1f%%)", acc, acc * 100)
    logger.info("\nClassification Report:")
    report = classification_report(y_test, y_pred, zero_division=0)
    for line in report.split("\n"):
        logger.info("  %s", line)

    # 7. Cross-validation (si hay suficientes datos)
    if len(all_texts) >= 30:
        cv_scores = cross_val_score(pipeline, all_texts, all_labels, cv=5, scoring="accuracy")
        logger.info("\n✅ Cross-Validation (5-fold): %.4f ± %.4f", cv_scores.mean(), cv_scores.std())

    # 8. Prueba con algunos ejemplos
    logger.info("\n🧪 PRUEBA RÁPIDA DE INFERENCIA")
    logger.info("-" * 40)
    test_cases = [
        ("Merluza a la romana", "Filete de merluza rebozado con limón y perejil", "Segundo Plato"),
        ("Solomillo de ternera", "Con salsa de pimienta verde y patatas al horno", "Segundo Plato"),
        ("Ensalada caprese", "Tomate, mozzarella y albahaca fresca con aceite", "Primero"),
        ("Espagueti carbonara", "Con panceta, yema de huevo y parmesano", "Primero"),
        ("Brownie de chocolate", "Con helado de vainilla y salsa de caramelo", "Postre"),
    ]
    for nombre, desc, tipo in test_cases:
        feature = clean_text(build_feature_text(nombre, desc, tipo))
        pred = pipeline.predict([feature])[0]
        proba = max(pipeline.predict_proba([feature])[0])
        logger.info("  %-35s → %-15s (%.0f%%)", nombre[:35], pred, proba * 100)

    # 9. Guardar modelo
    pipeline_final = _build_pipeline()
    pipeline_final.fit(all_texts, all_labels)
    saved_path = train_and_save(all_texts, all_labels)
    logger.info("\n💾 Modelo guardado en: %s", MODEL_PATH)
    logger.info("=" * 60)
    logger.info("  ✅ ENTRENAMIENTO COMPLETADO")
    logger.info("=" * 60)


def main() -> None:
    """Punto de entrada principal del script."""
    # Intentar cargar datos reales
    try:
        loop = asyncio.get_event_loop()
        real_platos = loop.run_until_complete(_load_real_data())
    except Exception:  # noqa: BLE001
        real_platos = []

    train(extra_platos=real_platos)


if __name__ == "__main__":
    main()
