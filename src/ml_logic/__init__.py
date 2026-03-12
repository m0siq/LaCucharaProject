"""
src/ml_logic/__init__.py
─────────────────────────
Exports públicos del módulo ML de La Cuchara.
"""

from src.ml_logic.demand_model import (
    classify_dish,
    get_recommendations,
    get_popular_dishes,
    get_keywords,
)

__all__ = [
    "classify_dish",
    "get_recommendations",
    "get_popular_dishes",
    "get_keywords",
]
