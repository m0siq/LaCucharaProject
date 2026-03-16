"""
src/ai_engine/synthesizer.py
─────────────────────────────────────────────────────────────────────────────
Generador de valoraciones sintéticas realistas para dbo.Valoracion.

Estrategia de síntesis (multi-dimensional):
  1. Perfil base por categoría dietética   → distribución de puntuación base
  2. Sesgo por tipo de plato               → ajuste según Primer/Segundo/Postre
  3. Sesgo de popularidad del nombre       → platos reconocibles puntúan más
  4. Sesgo de longitud de descripción      → más detalle = mayor confianza del cliente
  5. Ruido gaussiano controlado            → simula variación real entre usuarios
  6. Sesgo de usuario                      → cada usuario sintético tiene una tendencia
  7. Asimetría positiva                    → más valoraciones altas que bajas (comportamiento real)
  8. Efectos estacionales opcionales       → mes del año afecta a ciertos platos

Uso como librería:
    from src.ai_engine.synthesizer import SyntheticRatingGenerator
    gen = SyntheticRatingGenerator(seed=42)
    rows = gen.generate(platos, n_usuarios=50)

Uso como script CLI (inserta en BD):
    python -m src.ai_engine.synthesizer --n-usuarios 80 --dry-run
    python -m src.ai_engine.synthesizer --n-usuarios 80
"""

from __future__ import annotations

import asyncio
import argparse
import logging
import math
import random
import sys
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# CONSTANTES DE DISTRIBUCIÓN
# ─────────────────────────────────────────────────────────────────────────────

# Puntuación base media y desviación típica por categoría dietética
#   Basado en bibliografía de comportamiento de reseñas en restauración:
#   - Carne: puntuaciones más altas y consistentes
#   - Pescado: ligera mayor varianza (gustos más polarizados)
#   - Vegetariano: alta varianza (nichos de mercado)
#   - Pasta: el "nivel seguro", pocas sorpresas
#   - Otro: neutro
CATEGORY_PROFILE: dict[str, tuple[float, float]] = {
    "Carne":       (4.20, 0.65),
    "Pescado":     (3.95, 0.80),
    "Vegetariano": (3.75, 0.90),
    "Pasta":       (4.05, 0.60),
    "Otro":        (3.60, 0.85),
}

# Ajuste por tipo de plato (desviación sobre la base de categoría)
TIPO_ADJUSTMENT: dict[str, float] = {
    "primer plato": -0.10,
    "primeros":     -0.10,
    "primer":       -0.10,
    "entrante":     -0.05,
    "segundo plato": +0.15,
    "segundos":      +0.15,
    "segundo":       +0.15,
    "principal":     +0.15,
    "postre":        +0.20,   # los postres gustan mucho
    "bebida":         0.00,
}

# Palabras en el nombre que sugieren un plato popular/reconocible → boost
POPULAR_KEYWORDS = {
    "cocido", "paella", "fabada", "gazpacho", "tortilla", "croqueta",
    "croquetas", "callos", "migas", "puchero", "potaje", "lentejas",
    "sopa", "ensaladilla", "salmon", "bacalao", "cordero", "cochinillo",
    "lechazo", "merluza", "lubina", "dorada", "lubina", "calamares",
    "pulpo", "gambas", "solomillo", "entrecot", "carrillera", "rabo",
    "oxtail", "brownie", "flan", "tarta", "helado", "natillas",
}
POPULAR_BOOST = 0.18

# Palabras negativas en nombre → penalización ligera
NEGATIVE_KEYWORDS = {"light", "vegano", "sin gluten", "integral", "bajo en"}
NEGATIVE_PENALTY = -0.12

# Boost por longitud de descripción (más texto → más trabajado → mejor puntuación esperada)
# Si descripcion es None o < 20 chars: sin boost
# Si > 60 chars → +0.15; entre 20-60 → +0.08
DESC_BOOST_LONG  = 0.15
DESC_BOOST_SHORT = 0.08
DESC_THRESHOLD_LONG  = 60
DESC_THRESHOLD_SHORT = 20

# Rango de puntuación válido [1.0, 5.0] con paso 0.5
SCORE_MIN  = 1.0
SCORE_MAX  = 5.0
SCORE_STEP = 0.5

# Sesgo de asimetría positiva: los usuarios tienden a NO valorar platos mediocres.
# Simulamos esto aumentando ligeramente la probabilidad de seleccionar valores altos.
POSITIVE_ASYMMETRY = 0.15   # desviación media adicional al resultado final

# Sesgo estacional por categoría y mes (1=enero…12=diciembre)
# Platos de carne puntúan mejor en invierno; pescado ligero en verano, etc.
SEASONAL_BOOST: dict[str, dict[int, float]] = {
    "Carne":       {1: +0.10, 2: +0.10, 11: +0.10, 12: +0.15,
                    6: -0.05, 7: -0.08, 8: -0.08},
    "Pescado":     {5: +0.05, 6: +0.10, 7: +0.12, 8: +0.10,
                    12: -0.05, 1: -0.05, 2: -0.05},
    "Vegetariano": {3: +0.05, 4: +0.08, 5: +0.05},
    "Pasta":       {},   # estable todo el año
    "Otro":        {},
}

# ─────────────────────────────────────────────────────────────────────────────
# PERFILES DE USUARIO SINTÉTICO
# ─────────────────────────────────────────────────────────────────────────────
# Cada usuario tiene un "sesgo interno" que simula su tendencia a valorar
# alto o bajo de forma consistente (como en la realidad).

USER_PROFILES = [
    {"nombre": "exigente",  "bias": -0.35, "noise": 0.5},
    {"nombre": "generoso",  "bias": +0.30, "noise": 0.4},
    {"nombre": "neutro",    "bias":  0.00, "noise": 0.6},
    {"nombre": "fluctuante","bias":  0.00, "noise": 1.0},
    {"nombre": "positivo",  "bias": +0.15, "noise": 0.3},
]


# ─────────────────────────────────────────────────────────────────────────────
# DATACLASSES
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class SyntheticUser:
    IDUsuario:   int
    NombreUsuario: str
    bias:        float   # sesgo personal constante
    noise_sigma: float   # cuánto varía entre valoraciones

    @classmethod
    def generate_pool(cls, n: int, rng: random.Random) -> list["SyntheticUser"]:
        users: list[SyntheticUser] = []
        for i in range(n):
            profile = rng.choice(USER_PROFILES)
            users.append(cls(
                IDUsuario=i + 1,
                NombreUsuario=f"usuario_sintetico_{i + 1}",
                bias=profile["bias"] + rng.gauss(0, 0.10),
                noise_sigma=profile["noise"],
            ))
        return users


@dataclass
class RatingRow:
    IDPlato:    int
    IDUsuario:  int
    Puntuacion: float
    Comentario: str | None
    Fecha:      datetime


# ─────────────────────────────────────────────────────────────────────────────
# GENERADOR PRINCIPAL
# ─────────────────────────────────────────────────────────────────────────────

class SyntheticRatingGenerator:
    """
    Genera valoraciones sintéticas realistas para una lista de platos.

    Args:
        seed:              Semilla para reproducibilidad.
        min_ratings:       Mínimo de valoraciones por plato.
        max_ratings:       Máximo de valoraciones por plato.
        date_range_days:   Ventana temporal hacia atrás desde hoy para generar fechas.
    """

    def __init__(
        self,
        seed: int = 42,
        min_ratings: int = 5,
        max_ratings: int = 25,
        date_range_days: int = 365,
    ) -> None:
        self.rng = random.Random(seed)
        self.min_ratings   = min_ratings
        self.max_ratings   = max_ratings
        self.date_range_days = date_range_days

    # ------------------------------------------------------------------
    # Helpers internos
    # ------------------------------------------------------------------

    def _get_classifier(self):
        """Carga el clasificador ML si está disponible."""
        try:
            from src.ml_logic.classifier import predict_diet
            return predict_diet
        except Exception:
            return None

    @staticmethod
    def _normalize_nombre(nombre: str) -> set[str]:
        import unicodedata
        normalized = unicodedata.normalize("NFD", nombre.lower())
        cleaned = "".join(c for c in normalized if unicodedata.category(c) != "Mn")
        return set(cleaned.split())

    def _desc_boost(self, descripcion: str | None) -> float:
        if not descripcion:
            return 0.0
        n = len(descripcion.strip())
        if n >= DESC_THRESHOLD_LONG:
            return DESC_BOOST_LONG
        if n >= DESC_THRESHOLD_SHORT:
            return DESC_BOOST_SHORT
        return 0.0

    def _name_boost(self, nombre: str) -> float:
        tokens = self._normalize_nombre(nombre)
        boost  = POPULAR_BOOST if tokens & POPULAR_KEYWORDS else 0.0
        penalty = NEGATIVE_PENALTY if tokens & NEGATIVE_KEYWORDS else 0.0
        return boost + penalty

    def _tipo_adjustment(self, tipo: str | None) -> float:
        if not tipo:
            return 0.0
        return TIPO_ADJUSTMENT.get(tipo.lower().strip(), 0.0)

    def _seasonal_boost(self, categoria: str, fecha: datetime) -> float:
        month = fecha.month
        return SEASONAL_BOOST.get(categoria, {}).get(month, 0.0)

    def _snap_to_scale(self, value: float) -> float:
        """Redondea al múltiplo de 0.5 más cercano y clampea a [1.0, 5.0]."""
        snapped = round(value / SCORE_STEP) * SCORE_STEP
        return max(SCORE_MIN, min(SCORE_MAX, snapped))

    def _random_date(self) -> datetime:
        delta = self.rng.randint(0, self.date_range_days)
        return datetime.now() - timedelta(days=delta)

    def _compute_base_score(
        self,
        categoria: str,
        tipo: str | None,
        nombre: str,
        descripcion: str | None,
        fecha: datetime,
    ) -> float:
        """Calcula la puntuación base del plato (sin sesgo de usuario ni ruido)."""
        mu, _ = CATEGORY_PROFILE.get(categoria, CATEGORY_PROFILE["Otro"])

        mu += self._tipo_adjustment(tipo)
        mu += self._desc_boost(descripcion)
        mu += self._name_boost(nombre)
        mu += self._seasonal_boost(categoria, fecha)
        mu += POSITIVE_ASYMMETRY

        return mu

    def _score_for_user(
        self,
        base: float,
        sigma: float,
        user: SyntheticUser,
    ) -> float:
        """Aplica el sesgo y ruido del usuario al score base."""
        noise = self.rng.gauss(0, sigma + user.noise_sigma * 0.5)
        raw   = base + user.bias + noise
        return self._snap_to_scale(raw)

    def _generate_comment(self, score: float, nombre: str) -> str | None:
        """Genera un comentario breve y coherente con la puntuación."""
        if self.rng.random() < 0.35:   # 35% de probabilidad de dejar comentario
            return None

        positives = [
            f"Excelente {nombre}, lo repetiría sin duda.",
            f"Muy bueno el {nombre}.",
            f"El {nombre} estaba delicioso, muy bien presentado.",
            f"Grande el {nombre}, me encantó.",
            f"Recomiendo el {nombre} totalmente.",
        ]
        neutrals = [
            f"El {nombre} estaba bien, sin más.",
            f"Correcto el {nombre}, nada especial.",
            f"El {nombre} cumplió las expectativas.",
            f"Normal, como siempre.",
        ]
        negatives = [
            f"El {nombre} me decepcionó un poco.",
            f"Esperaba más del {nombre}.",
            f"El {nombre} estaba algo soso.",
            f"No lo volvería a pedir.",
        ]

        if score >= 4.0:
            pool = positives
        elif score >= 3.0:
            pool = neutrals
        else:
            pool = negatives

        return self.rng.choice(pool)

    # ------------------------------------------------------------------
    # API pública
    # ------------------------------------------------------------------

    def generate(
        self,
        platos: list[dict],
        n_usuarios: int = 50,
        classify_fn=None,
    ) -> list[RatingRow]:
        """
        Genera valoraciones sintéticas para la lista de platos dada.

        Args:
            platos:      Lista de dicts con claves IDPlato, NombrePlato,
                         Descripcion (opcional), Tipo (opcional),
                         CategoriaDietetica (opcional).
            n_usuarios:  Número de usuarios sintéticos a simular.
            classify_fn: Función clasificadora (si es None, intenta cargar la del proyecto).

        Returns:
            Lista de RatingRow, una fila por (IDPlato, IDUsuario) único.
        """
        if classify_fn is None:
            classify_fn = self._get_classifier()

        users = SyntheticUser.generate_pool(n_usuarios, self.rng)
        rows:  list[RatingRow] = []
        seen:  set[tuple[int, int]] = set()   # evitar duplicados (IDPlato, IDUsuario)

        for plato in platos:
            pid     = plato.get("IDPlato") or plato.get("id_plato")
            nombre  = plato.get("NombrePlato") or plato.get("nombre_plato") or ""
            desc    = plato.get("Descripcion") or plato.get("descripcion")
            tipo    = plato.get("Tipo") or plato.get("tipo")
            cat     = plato.get("CategoriaDietetica") or plato.get("categoria")

            if pid is None:
                continue

            # Clasificar si no viene dada la categoría
            if not cat and classify_fn:
                try:
                    result = classify_fn(nombre, desc, tipo)
                    cat = result.get("categoria", "Otro")
                except Exception:
                    cat = "Otro"
            cat = cat or "Otro"

            # Media y sigma de la distribución de este plato
            mu, sigma = CATEGORY_PROFILE.get(cat, CATEGORY_PROFILE["Otro"])

            # Número de valoraciones para este plato (distribución log-normal: mayoría 8-15)
            n_val = int(self.rng.lognormvariate(
                math.log(max(1, (self.min_ratings + self.max_ratings) / 2)),
                0.4
            ))
            n_val = max(self.min_ratings, min(self.max_ratings, n_val))

            # Elegir usuarios sin repetición para este plato
            user_sample = self.rng.sample(users, min(n_val, len(users)))

            for user in user_sample:
                key = (pid, user.IDUsuario)
                if key in seen:
                    continue
                seen.add(key)

                fecha = self._random_date()
                base  = self._compute_base_score(cat, tipo, nombre, desc, fecha)
                score = self._score_for_user(base, sigma, user)
                comentario = self._generate_comment(score, nombre)

                rows.append(RatingRow(
                    IDPlato=pid,
                    IDUsuario=user.IDUsuario,
                    Puntuacion=score,
                    Comentario=comentario,
                    Fecha=fecha,
                ))

        logger.info(
            "✅ Generadas %d valoraciones sintéticas para %d platos y %d usuarios",
            len(rows), len(platos), n_usuarios,
        )
        return rows

    def as_dicts(self, rows: list[RatingRow]) -> list[dict[str, Any]]:
        """Convierte la lista de RatingRow a lista de dicts (útil para inserción en BD)."""
        return [
            {
                "IDPlato":    r.IDPlato,
                "IDUsuario":  r.IDUsuario,
                "Puntuacion": r.Puntuacion,
                "Comentario": r.Comentario,
                "Fecha":      r.Fecha,
            }
            for r in rows
        ]

    def summary(self, rows: list[RatingRow]) -> dict[str, Any]:
        """Estadísticas descriptivas de las valoraciones generadas."""
        if not rows:
            return {}
        scores = [r.Puntuacion for r in rows]
        from collections import Counter
        dist = Counter(scores)
        return {
            "total":         len(rows),
            "media":         round(sum(scores) / len(rows), 3),
            "min":           min(scores),
            "max":           max(scores),
            "distribucion":  dict(sorted(dist.items())),
            "platos_cubiertos": len({r.IDPlato for r in rows}),
            "usuarios_sinteticos": len({r.IDUsuario for r in rows}),
        }


# ─────────────────────────────────────────────────────────────────────────────
# INSERCIÓN ASYNC EN BD
# ─────────────────────────────────────────────────────────────────────────────

async def _insert_ratings(rows: list[RatingRow], batch_size: int = 100) -> int:
    """
    Inserta las valoraciones en dbo.Valoracion.
    Omite silenciosamente filas que violen la restricción UNIQUE (IDPlato, IDUsuario).
    Devuelve el número de filas insertadas efectivamente.
    """
    from sqlalchemy.dialects.mssql import insert as mssql_insert
    from sqlalchemy.exc import IntegrityError
    from sqlalchemy.ext.asyncio import AsyncSession
    from src.database.connection import AsyncSessionLocal
    from src.database.models import Valoracion

    inserted = 0
    async with AsyncSessionLocal() as session:
        for i in range(0, len(rows), batch_size):
            batch = rows[i : i + batch_size]
            for row in batch:
                obj = Valoracion(
                    IDPlato=row.IDPlato,
                    IDUsuario=row.IDUsuario,
                    Puntuacion=row.Puntuacion,
                    Comentario=row.Comentario,
                    Fecha=row.Fecha,
                )
                session.add(obj)
            try:
                await session.flush()
                inserted += len(batch)
            except IntegrityError:
                await session.rollback()
                # Insertar de uno en uno para no perder todo el batch
                for row in batch:
                    try:
                        obj = Valoracion(
                            IDPlato=row.IDPlato,
                            IDUsuario=row.IDUsuario,
                            Puntuacion=row.Puntuacion,
                            Comentario=row.Comentario,
                            Fecha=row.Fecha,
                        )
                        session.add(obj)
                        await session.flush()
                        inserted += 1
                    except IntegrityError:
                        await session.rollback()
        await session.commit()

    return inserted


async def _load_platos_from_db() -> list[dict]:
    """Carga todos los platos de la BD para sintetizar sus valoraciones."""
    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy import select
    from src.database.connection import AsyncSessionLocal
    from src.database.models import Plato

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Plato))
        platos = result.scalars().all()
        return [
            {
                "IDPlato":    p.IDPlato,
                "NombrePlato": p.NombrePlato,
                "Descripcion": p.Descripcion,
                "Tipo":        p.Tipo,
            }
            for p in platos
        ]


# ─────────────────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────────────────

def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Generador de valoraciones sintéticas para dbo.Valoracion"
    )
    p.add_argument(
        "--n-usuarios", type=int, default=60,
        help="Número de usuarios sintéticos a simular (default: 60)",
    )
    p.add_argument(
        "--min-ratings", type=int, default=5,
        help="Mínimo de valoraciones por plato (default: 5)",
    )
    p.add_argument(
        "--max-ratings", type=int, default=25,
        help="Máximo de valoraciones por plato (default: 25)",
    )
    p.add_argument(
        "--date-range", type=int, default=365,
        help="Ventana temporal en días hacia atrás para generar fechas (default: 365)",
    )
    p.add_argument(
        "--seed", type=int, default=42,
        help="Semilla aleatoria para reproducibilidad (default: 42)",
    )
    p.add_argument(
        "--dry-run", action="store_true",
        help="Solo muestra estadísticas sin insertar en BD",
    )
    return p.parse_args()


async def main_async(args: argparse.Namespace) -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )

    logger.info("=" * 60)
    logger.info("  SINTETIZADOR DE VALORACIONES — La Cuchara")
    logger.info("=" * 60)

    # 1. Cargar platos
    logger.info("📦 Cargando platos desde la BD...")
    platos = await _load_platos_from_db()
    if not platos:
        logger.error("❌ No se encontraron platos en la BD. Abortando.")
        return
    logger.info("   %d platos cargados", len(platos))

    # 2. Generar valoraciones
    gen = SyntheticRatingGenerator(
        seed=args.seed,
        min_ratings=args.min_ratings,
        max_ratings=args.max_ratings,
        date_range_days=args.date_range,
    )
    rows = gen.generate(platos, n_usuarios=args.n_usuarios)

    # 3. Estadísticas
    stats = gen.summary(rows)
    logger.info("\n📊 ESTADÍSTICAS DE SÍNTESIS")
    logger.info("   Total valoraciones:   %d", stats["total"])
    logger.info("   Platos cubiertos:     %d", stats["platos_cubiertos"])
    logger.info("   Usuarios sintéticos:  %d", stats["usuarios_sinteticos"])
    logger.info("   Puntuación media:     %.3f", stats["media"])
    logger.info("   Rango:                %.1f — %.1f", stats["min"], stats["max"])
    logger.info("   Distribución:")
    for score, count in stats["distribucion"].items():
        bar = "█" * int(count / max(1, stats["total"]) * 40)
        logger.info("     %.1f ★  %s %d", score, bar, count)

    # 4. Insertar (o dry-run)
    if args.dry_run:
        logger.info("\n⚠️  DRY RUN — no se insertará nada en la BD.")
    else:
        logger.info("\n💾 Insertando en dbo.Valoracion...")
        inserted = await _insert_ratings(rows)
        logger.info("   ✅ %d filas insertadas (%d omitidas por duplicado)",
                    inserted, len(rows) - inserted)

    logger.info("\n" + "=" * 60)
    logger.info("  ✅ SINTETIZADOR COMPLETADO")
    logger.info("=" * 60)


def main() -> None:
    args = _parse_args()
    asyncio.run(main_async(args))


if __name__ == "__main__":
    main()
