"""The shared processing contract.

This module is the **future-proofing seam** of the whole platform.

Every processing stage — hearing or vision, rule-based or AI — implements the
same protocol so it can be composed, tested, and (later) swapped for an ML model
without touching routers, schemas, or the frontend.
"""
