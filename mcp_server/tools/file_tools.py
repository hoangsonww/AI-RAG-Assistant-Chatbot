"""
File system tools — read, write, list, search files safely.
"""

from __future__ import annotations

import mimetypes
import os
from pathlib import Path
from typing import Any, Dict

import mcp.types as types

from .base import ToolHandler
from ..middleware.validator import validate_path_safe
from ..utils.logger import get_logger

_logger = get_logger("tools.file")

_BLOCKED_EXTENSIONS = {".exe", ".dll", ".so", ".dylib", ".bin", ".com", ".bat", ".cmd"}
_MAX_READ_SIZE = 10 * 1024 * 1024  # 10 MB


class ReadFileTool(ToolHandler):
    def __init__(self) -> None:
        super().__init__(
            types.Tool(
                name="read_file",
                description="Read the content of a file. Supports text files up to 10 MB.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "path": {"type": "string", "description": "Path to the file"},
                        "encoding": {
                            "type": "string",
                            "description": "File encoding (default: utf-8)",
                            "default": "utf-8",
                        },
                        "line_range": {
                            "type": "array",
                            "items": {"type": "integer"},
                            "description": "[start, end] line numbers (1-based, inclusive)",
                        },
                    },
                    "required": ["path"],
                },
            )
        )

    async def execute(self, arguments: Dict[str, Any]) -> Any:
        file_path = validate_path_safe(arguments["path"])
        encoding = arguments.get("encoding", "utf-8")
        line_range = arguments.get("line_range")

        p = Path(file_path)
        if not p.exists():
            return {"success": False, "error": f"File not found: {file_path}"}
        if not p.is_file():
            return {"success": False, "error": f"Not a file: {file_path}"}
        if p.stat().st_size > _MAX_READ_SIZE:
            return {"success": False, "error": f"File too large (>{_MAX_READ_SIZE} bytes)"}

        content = p.read_text(encoding=encoding, errors="replace")
        if line_range and len(line_range) == 2:
            lines = content.split("\n")
            start, end = max(1, line_range[0]) - 1, line_range[1]
            content = "\n".join(lines[start:end])

        return {
            "success": True,
            "path": file_path,
            "content": content,
            "size_bytes": p.stat().st_size,
            "line_count": content.count("\n") + 1,
        }


class WriteFileTool(ToolHandler):
    def __init__(self) -> None:
        super().__init__(
            types.Tool(
                name="write_file",
                description="Write or overwrite content to a file. Creates parent dirs as needed.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "path": {"type": "string", "description": "Target file path"},
                        "content": {"type": "string", "description": "Content to write"},
                        "create_dirs": {
                            "type": "boolean",
                            "description": "Create parent directories if missing (default true)",
                            "default": True,
                        },
                    },
                    "required": ["path", "content"],
                },
            )
        )

    async def execute(self, arguments: Dict[str, Any]) -> Any:
        file_path = validate_path_safe(arguments["path"])
        content = arguments["content"]
        create_dirs = arguments.get("create_dirs", True)

        p = Path(file_path)
        if p.suffix.lower() in _BLOCKED_EXTENSIONS:
            return {"success": False, "error": f"Blocked file extension: {p.suffix}"}

        if create_dirs:
            p.parent.mkdir(parents=True, exist_ok=True)

        p.write_text(content, encoding="utf-8")
        _logger.info("Wrote %d bytes to %s", len(content), file_path)
        return {"success": True, "path": file_path, "bytes_written": len(content)}


class ListDirectoryTool(ToolHandler):
    def __init__(self) -> None:
        super().__init__(
            types.Tool(
                name="list_directory",
                description="List files and subdirectories in a directory.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "path": {
                            "type": "string",
                            "description": "Directory path (default: current dir)",
                            "default": ".",
                        },
                        "pattern": {
                            "type": "string",
                            "description": "Optional glob pattern filter, e.g. '*.py'",
                        },
                        "recursive": {
                            "type": "boolean",
                            "description": "Recurse into subdirectories (default false)",
                            "default": False,
                        },
                    },
                },
            )
        )

    async def execute(self, arguments: Dict[str, Any]) -> Any:
        dir_path = validate_path_safe(arguments.get("path", "."))
        pattern = arguments.get("pattern")
        recursive = arguments.get("recursive", False)

        p = Path(dir_path)
        if not p.is_dir():
            return {"success": False, "error": f"Not a directory: {dir_path}"}

        entries = []
        iterator = p.rglob(pattern or "*") if recursive else p.glob(pattern or "*")
        for entry in sorted(iterator):
            if entry.name.startswith("."):
                continue
            entries.append({
                "name": str(entry.relative_to(p)),
                "type": "directory" if entry.is_dir() else "file",
                "size": entry.stat().st_size if entry.is_file() else None,
            })
            if len(entries) >= 500:
                break

        return {"success": True, "path": dir_path, "entries": entries, "count": len(entries)}


class FileInfoTool(ToolHandler):
    def __init__(self) -> None:
        super().__init__(
            types.Tool(
                name="file_info",
                description="Get metadata about a file: size, type, modification time, etc.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "path": {"type": "string", "description": "Path to the file"}
                    },
                    "required": ["path"],
                },
            )
        )

    async def execute(self, arguments: Dict[str, Any]) -> Any:
        file_path = validate_path_safe(arguments["path"])
        p = Path(file_path)
        if not p.exists():
            return {"success": False, "error": f"Path not found: {file_path}"}

        stat = p.stat()
        mime, _ = mimetypes.guess_type(str(p))
        from datetime import datetime, timezone

        return {
            "success": True,
            "path": file_path,
            "name": p.name,
            "extension": p.suffix,
            "is_file": p.is_file(),
            "is_directory": p.is_dir(),
            "size_bytes": stat.st_size,
            "mime_type": mime,
            "modified": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
            "created": datetime.fromtimestamp(stat.st_ctime, tz=timezone.utc).isoformat(),
        }


class SearchFilesTool(ToolHandler):
    def __init__(self) -> None:
        super().__init__(
            types.Tool(
                name="search_files",
                description="Find files by name pattern across the directory tree.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "pattern": {
                            "type": "string",
                            "description": "Glob pattern, e.g. '**/*.ts' or '**/test_*.py'",
                        },
                        "path": {
                            "type": "string",
                            "description": "Root directory to search from (default: current dir)",
                            "default": ".",
                        },
                        "max_results": {
                            "type": "integer",
                            "description": "Max files to return (default 100)",
                            "default": 100,
                        },
                    },
                    "required": ["pattern"],
                },
            )
        )

    async def execute(self, arguments: Dict[str, Any]) -> Any:
        pattern = arguments["pattern"]
        root = validate_path_safe(arguments.get("path", "."))
        limit = arguments.get("max_results", 100)

        results = []
        for match in Path(root).glob(pattern):
            if match.name.startswith("."):
                continue
            results.append({
                "path": str(match),
                "type": "directory" if match.is_dir() else "file",
                "size": match.stat().st_size if match.is_file() else None,
            })
            if len(results) >= limit:
                break

        return {"success": True, "pattern": pattern, "results": results, "count": len(results)}


def register(cfg: Any) -> Dict[str, ToolHandler]:
    return {
        h.name: h
        for h in [
            ReadFileTool(),
            WriteFileTool(),
            ListDirectoryTool(),
            FileInfoTool(),
            SearchFilesTool(),
        ]
    }
