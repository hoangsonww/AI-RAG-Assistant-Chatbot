"""
API-key authentication middleware.
"""

import os
from typing import Optional

from ..utils.errors import AuthenticationError
from ..utils.logger import get_logger

_logger = get_logger("auth")


def check_api_key(
    provided_key: Optional[str] = None,
    *,
    required: bool = False,
) -> bool:
    """Validate an API key against the server's expected key.

    The expected key is read from ``MCP_API_KEY`` environment variable.
    Returns *True* when authentication succeeds.

    Raises:
        AuthenticationError: when *required* is True and the key is
            missing or does not match.
    """
    expected = os.getenv("MCP_API_KEY")

    if not required or not expected:
        return True

    if not provided_key:
        _logger.warning("API key required but not provided")
        raise AuthenticationError("API key is required")

    if provided_key != expected:
        _logger.warning("Invalid API key presented")
        raise AuthenticationError("Invalid API key")

    return True
