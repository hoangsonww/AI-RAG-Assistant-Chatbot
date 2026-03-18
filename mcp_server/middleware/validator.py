"""
Input validation helpers.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Set

from ..utils.errors import ValidationError


def validate_tool_input(
    arguments: Dict[str, Any],
    required: Optional[List[str]] = None,
    optional: Optional[List[str]] = None,
    *,
    extra_ok: bool = True,
) -> Dict[str, Any]:
    """Validate tool call arguments.

    Raises:
        ValidationError: on missing required keys or unexpected keys.
    """
    required = required or []
    optional = optional or []

    missing = [k for k in required if k not in arguments]
    if missing:
        raise ValidationError(f"Missing required arguments: {', '.join(missing)}")

    if not extra_ok:
        allowed: Set[str] = set(required) | set(optional)
        extra = [k for k in arguments if k not in allowed]
        if extra:
            raise ValidationError(f"Unexpected arguments: {', '.join(extra)}")

    return arguments


def validate_path_safe(path: str) -> str:
    """Reject obviously dangerous path components."""
    import os

    normalized = os.path.normpath(path)
    if ".." in normalized.split(os.sep):
        raise ValidationError(f"Path traversal not allowed: {path}")
    return normalized
