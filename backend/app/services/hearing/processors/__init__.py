"""Individual hearing processing stages.

Each stage is registered under a ``hearing.<name>`` key and implements the shared
``Processor`` contract. The pipeline in :mod:`app.services.hearing.pipeline`
composes them in order.
"""
