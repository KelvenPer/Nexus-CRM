"""Service layer utilities."""

from .data_store import data_store
from .sql_guard import validar_e_executar_sql_seguro

__all__ = ["data_store", "validar_e_executar_sql_seguro"]
