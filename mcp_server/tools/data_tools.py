"""
Data processing tools — parse CSV/JSON, transform, and query data.
"""

from __future__ import annotations

import csv
import io
import json
from pathlib import Path
from typing import Any, Dict, List

import mcp.types as types

from .base import ToolHandler
from ..middleware.validator import validate_path_safe
from ..utils.logger import get_logger

_logger = get_logger("tools.data")


class ParseCsvTool(ToolHandler):
    def __init__(self) -> None:
        super().__init__(
            types.Tool(
                name="parse_csv",
                description="Parse a CSV file or CSV string and return structured data.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "path": {
                            "type": "string",
                            "description": "Path to CSV file (mutually exclusive with 'content')",
                        },
                        "content": {
                            "type": "string",
                            "description": "Raw CSV string (mutually exclusive with 'path')",
                        },
                        "delimiter": {
                            "type": "string",
                            "description": "Column delimiter (default ',')",
                            "default": ",",
                        },
                        "max_rows": {
                            "type": "integer",
                            "description": "Max rows to return (default 100)",
                            "default": 100,
                        },
                    },
                },
            )
        )

    async def execute(self, arguments: Dict[str, Any]) -> Any:
        path = arguments.get("path")
        content = arguments.get("content")
        delimiter = arguments.get("delimiter", ",")
        max_rows = arguments.get("max_rows", 100)

        if path:
            p = Path(validate_path_safe(path))
            if not p.exists():
                return {"success": False, "error": f"File not found: {path}"}
            content = p.read_text(errors="replace")

        if not content:
            return {"success": False, "error": "Provide 'path' or 'content'"}

        reader = csv.DictReader(io.StringIO(content), delimiter=delimiter)
        rows: List[Dict] = []
        for row in reader:
            rows.append(dict(row))
            if len(rows) >= max_rows:
                break

        return {
            "success": True,
            "columns": reader.fieldnames or [],
            "rows": rows,
            "row_count": len(rows),
            "truncated": len(rows) >= max_rows,
        }


class ParseJsonTool(ToolHandler):
    def __init__(self) -> None:
        super().__init__(
            types.Tool(
                name="parse_json",
                description="Parse a JSON file or string and return the data with schema summary.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "path": {"type": "string", "description": "Path to JSON file"},
                        "content": {"type": "string", "description": "Raw JSON string"},
                        "query": {
                            "type": "string",
                            "description": "Dot-notation key path to extract, e.g. 'data.items[0].name'",
                        },
                    },
                },
            )
        )

    async def execute(self, arguments: Dict[str, Any]) -> Any:
        path = arguments.get("path")
        content = arguments.get("content")
        query = arguments.get("query")

        if path:
            p = Path(validate_path_safe(path))
            if not p.exists():
                return {"success": False, "error": f"File not found: {path}"}
            content = p.read_text(errors="replace")

        if not content:
            return {"success": False, "error": "Provide 'path' or 'content'"}

        try:
            data = json.loads(content)
        except json.JSONDecodeError as exc:
            return {"success": False, "error": f"Invalid JSON: {exc}"}

        if query:
            data = self._extract_path(data, query)

        schema = self._infer_schema(data)
        preview = json.dumps(data, indent=2, default=str)[:5000]

        return {
            "success": True,
            "data": data if len(json.dumps(data, default=str)) < 50_000 else "[data too large — use query]",
            "schema": schema,
            "preview": preview,
        }

    @staticmethod
    def _extract_path(data: Any, query: str) -> Any:
        import re
        parts = re.split(r"\.|\[|\]", query)
        node = data
        for part in parts:
            if not part:
                continue
            try:
                idx = int(part)
                node = node[idx]
            except (ValueError, TypeError):
                node = node[part] if isinstance(node, dict) else getattr(node, part, None)
        return node

    @staticmethod
    def _infer_schema(data: Any, depth: int = 0) -> Any:
        if depth > 3:
            return str(type(data).__name__)
        if isinstance(data, dict):
            return {k: ParseJsonTool._infer_schema(v, depth + 1) for k, v in list(data.items())[:20]}
        if isinstance(data, list):
            if data:
                return [ParseJsonTool._infer_schema(data[0], depth + 1)]
            return ["empty"]
        return type(data).__name__


class TransformDataTool(ToolHandler):
    def __init__(self) -> None:
        super().__init__(
            types.Tool(
                name="transform_data",
                description=(
                    "Apply transformations to structured data: filter rows, "
                    "select columns, sort, aggregate, and compute new fields."
                ),
                inputSchema={
                    "type": "object",
                    "properties": {
                        "data": {
                            "type": "array",
                            "description": "Array of objects to transform",
                            "items": {"type": "object"},
                        },
                        "select": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Columns to keep",
                        },
                        "filter_field": {"type": "string", "description": "Field to filter on"},
                        "filter_value": {"type": "string", "description": "Value to match"},
                        "sort_by": {"type": "string", "description": "Field to sort by"},
                        "sort_desc": {"type": "boolean", "default": False},
                        "limit": {"type": "integer", "default": 100},
                    },
                    "required": ["data"],
                },
            )
        )

    async def execute(self, arguments: Dict[str, Any]) -> Any:
        data = arguments["data"]
        select = arguments.get("select")
        filter_field = arguments.get("filter_field")
        filter_value = arguments.get("filter_value")
        sort_by = arguments.get("sort_by")
        sort_desc = arguments.get("sort_desc", False)
        limit = arguments.get("limit", 100)

        result = list(data)

        if filter_field and filter_value is not None:
            result = [r for r in result if str(r.get(filter_field, "")) == str(filter_value)]

        if sort_by:
            result.sort(key=lambda r: r.get(sort_by, ""), reverse=sort_desc)

        if select:
            result = [{k: r.get(k) for k in select} for r in result]

        result = result[:limit]
        return {"success": True, "data": result, "count": len(result)}


def register(cfg: Any) -> Dict[str, ToolHandler]:
    return {
        h.name: h
        for h in [ParseCsvTool(), ParseJsonTool(), TransformDataTool()]
    }
