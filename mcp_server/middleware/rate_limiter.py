"""
Token-bucket rate limiter.
"""

from __future__ import annotations

import time
from typing import Dict

from ..utils.errors import RateLimitError
from ..utils.logger import get_logger

_logger = get_logger("rate_limiter")


class RateLimiter:
    """Simple in-memory token-bucket rate limiter."""

    def __init__(self, requests_per_minute: int = 120) -> None:
        self._rpm = requests_per_minute
        self._interval = 60.0 / max(requests_per_minute, 1)
        self._buckets: Dict[str, float] = {}

    def check(self, key: str = "global") -> None:
        """Raise :class:`RateLimitError` if the caller is over quota."""
        now = time.monotonic()
        last = self._buckets.get(key, 0.0)
        if now - last < self._interval:
            _logger.warning("Rate limit exceeded for key=%s", key)
            raise RateLimitError(
                f"Rate limit exceeded ({self._rpm} req/min). "
                f"Retry after {self._interval - (now - last):.1f}s."
            )
        self._buckets[key] = now
