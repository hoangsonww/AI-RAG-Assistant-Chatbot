---
paths:
  - "mcp_server/tools/**/*.py"
  - "mcp_server/resources/**/*.py"
  - "mcp_server/prompts/**/*.py"
---

# MCP Tool Rules

- Every tool must subclass `ToolHandler(ABC)` and define `name`, `description`, `input_schema`, and `handle()`.
- Tool names are external contracts used by MCP clients — rename only when explicitly requested.
- Keep `input_schema` as valid JSON Schema with complete `description` fields on every property.
- Tools must return strings (serialized JSON for structured data).
- Register new tools by adding them to the category module's `register(cfg)` function.
- New tool categories require a new module file in `tools/` and a registry entry in `tools/__init__.py`.
