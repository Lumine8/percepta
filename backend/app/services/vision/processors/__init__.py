"""Individual vision enhancement stages.

Each stage is registered under a ``vision.<name>`` key and implements the shared
``Processor`` contract. Input is an :class:`ImageDocument`; options such as the
requested zoom live in ``input.metadata["options"]``.
"""
