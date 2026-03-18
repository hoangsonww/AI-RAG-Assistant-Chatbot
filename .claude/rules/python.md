---
paths:
  - "agentic_ai/**/*.py"
  - "mcp_server/**/*.py"
---

# Python Rules

- Use `async def` for all handler and pipeline functions; the codebase is async-first.
- Add type hints on all function signatures and class attributes.
- Subclass `ToolHandler(ABC)` for new MCP tools; subclass `BaseAgent` for new pipeline agents.
- Keep imports sorted: stdlib, third-party, then local — separated by blank lines.
- Prefer `logging.getLogger(__name__)` over `print()` for diagnostics.
- Configuration should flow through config objects, not hard-coded values.
