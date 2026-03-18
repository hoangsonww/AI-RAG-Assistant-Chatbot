"""
Custom exception hierarchy for the Lumina MCP Server.
"""


class MCPServerError(Exception):
    """Base exception for all MCP server errors."""


class ToolExecutionError(MCPServerError):
    """Raised when a tool invocation fails."""

    def __init__(self, tool_name: str, detail: str) -> None:
        self.tool_name = tool_name
        self.detail = detail
        super().__init__(f"Tool '{tool_name}' failed: {detail}")


class ResourceNotFoundError(MCPServerError):
    """Raised when a requested resource URI cannot be resolved."""

    def __init__(self, uri: str) -> None:
        self.uri = uri
        super().__init__(f"Resource not found: {uri}")


class PromptNotFoundError(MCPServerError):
    """Raised when a requested prompt name is unknown."""

    def __init__(self, name: str) -> None:
        self.name = name
        super().__init__(f"Prompt not found: {name}")


class ValidationError(MCPServerError):
    """Raised when input validation fails."""


class RateLimitError(MCPServerError):
    """Raised when a caller exceeds the rate limit."""


class AuthenticationError(MCPServerError):
    """Raised when authentication fails."""


class ConfigurationError(MCPServerError):
    """Raised for invalid configuration."""
