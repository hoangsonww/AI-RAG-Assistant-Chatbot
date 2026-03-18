"""
Logging utilities for the Lumina MCP Server.
"""

import logging
import sys
from typing import Optional

_loggers: dict = {}


def setup_logging(
    level: str = "INFO",
    log_file: Optional[str] = None,
    fmt: Optional[str] = None,
) -> None:
    if fmt is None:
        fmt = "%(asctime)s [%(name)s] %(levelname)s %(message)s"

    root = logging.getLogger()
    root.setLevel(getattr(logging, level.upper(), logging.INFO))
    root.handlers.clear()

    console = logging.StreamHandler(sys.stderr)
    console.setFormatter(logging.Formatter(fmt))
    root.addHandler(console)

    if log_file:
        from pathlib import Path

        Path(log_file).parent.mkdir(parents=True, exist_ok=True)
        fh = logging.FileHandler(log_file)
        fh.setFormatter(logging.Formatter(fmt))
        root.addHandler(fh)


def get_logger(name: str) -> logging.Logger:
    if name not in _loggers:
        _loggers[name] = logging.getLogger(f"mcp_server.{name}")
    return _loggers[name]
