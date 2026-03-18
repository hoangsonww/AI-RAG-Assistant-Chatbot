# MCP Tool Development Guide

## Adding a new tool

1. Choose the category module in `mcp_server/tools/` or create a new one.

2. Subclass `ToolHandler(ABC)`:

```python
from mcp_server.tools.base import ToolHandler

class MyNewTool(ToolHandler):
    name = "my_new_tool"
    description = "What this tool does"
    input_schema = {
        "type": "object",
        "properties": {
            "param": {"type": "string", "description": "A required parameter"}
        },
        "required": ["param"]
    }

    async def handle(self, arguments: dict) -> str:
        return f"Result for {arguments['param']}"
```

3. Register in the module's `register(cfg)` function.

4. If adding a new category, add the module to `_ToolRegistry` in `tools/__init__.py`.

## Tool contract rules

- `name` must be unique across all categories.
- `input_schema` must be valid JSON Schema with descriptions on all properties.
- `handle()` must be async and return a string.
- Tool names are external contracts — rename only when explicitly requested.

## Testing

```bash
python -m compileall mcp_server
python -m mcp_server --log-level DEBUG  # startup smoke test
```
