"""
Logging utilities for the Agentic AI Pipeline
"""

import logging
import sys
from typing import Optional
from pathlib import Path
from datetime import datetime


# Global logger cache
_loggers = {}


def setup_logging(
    level: str = "INFO",
    log_file: Optional[str] = None,
    format_string: Optional[str] = None
) -> None:
    """
    Setup logging configuration

    Args:
        level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_file: Optional log file path
        format_string: Optional custom format string
    """
    if format_string is None:
        format_string = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level.upper()))

    # Remove existing handlers
    root_logger.handlers = []

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(getattr(logging, level.upper()))
    console_handler.setFormatter(logging.Formatter(format_string))
    root_logger.addHandler(console_handler)

    # File handler (if specified)
    if log_file:
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)

        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(getattr(logging, level.upper()))
        file_handler.setFormatter(logging.Formatter(format_string))
        root_logger.addHandler(file_handler)


def get_logger(name: str, level: Optional[str] = None) -> logging.Logger:
    """
    Get or create a logger

    Args:
        name: Logger name
        level: Optional logging level

    Returns:
        Logger instance
    """
    if name in _loggers:
        return _loggers[name]

    logger = logging.getLogger(f"agentic_ai.{name}")

    if level:
        logger.setLevel(getattr(logging, level.upper()))

    _loggers[name] = logger
    return logger


class StructuredLogger:
    """
    Structured logger that adds context to log messages
    """

    def __init__(self, name: str, context: Optional[dict] = None):
        """
        Initialize structured logger

        Args:
            name: Logger name
            context: Additional context to include in logs
        """
        self.logger = get_logger(name)
        self.context = context or {}

    def _format_message(self, message: str, extra: Optional[dict] = None) -> str:
        """Format message with context"""
        ctx = {**self.context, **(extra or {})}
        if ctx:
            ctx_str = " | ".join(f"{k}={v}" for k, v in ctx.items())
            return f"{message} | {ctx_str}"
        return message

    def debug(self, message: str, extra: Optional[dict] = None) -> None:
        """Log debug message"""
        self.logger.debug(self._format_message(message, extra))

    def info(self, message: str, extra: Optional[dict] = None) -> None:
        """Log info message"""
        self.logger.info(self._format_message(message, extra))

    def warning(self, message: str, extra: Optional[dict] = None) -> None:
        """Log warning message"""
        self.logger.warning(self._format_message(message, extra))

    def error(self, message: str, extra: Optional[dict] = None) -> None:
        """Log error message"""
        self.logger.error(self._format_message(message, extra))

    def critical(self, message: str, extra: Optional[dict] = None) -> None:
        """Log critical message"""
        self.logger.critical(self._format_message(message, extra))


# Initialize default logging
setup_logging()
