"""
Code analysis and search tools.
"""

from __future__ import annotations

import os
import subprocess
from pathlib import Path
from typing import Any, Dict

import mcp.types as types

from .base import ToolHandler
from ..middleware.validator import validate_path_safe
from ..utils.logger import get_logger

_logger = get_logger("tools.code")


class SearchCodeTool(ToolHandler):
    def __init__(self) -> None:
        super().__init__(
            types.Tool(
                name="search_code",
                description=(
                    "Search for a pattern in code files using ripgrep (rg) or fallback grep. "
                    "Returns matching lines with file paths and line numbers."
                ),
                inputSchema={
                    "type": "object",
                    "properties": {
                        "pattern": {
                            "type": "string",
                            "description": "Regex or literal pattern to search for",
                        },
                        "path": {
                            "type": "string",
                            "description": "Directory to search in (default: current dir)",
                            "default": ".",
                        },
                        "file_glob": {
                            "type": "string",
                            "description": "File glob filter, e.g. '*.py' or '*.ts'",
                        },
                        "case_insensitive": {
                            "type": "boolean",
                            "description": "Case-insensitive search (default false)",
                            "default": False,
                        },
                        "max_results": {
                            "type": "integer",
                            "description": "Maximum matches to return (default 50)",
                            "default": 50,
                        },
                    },
                    "required": ["pattern"],
                },
            )
        )

    async def execute(self, arguments: Dict[str, Any]) -> Any:
        pattern = arguments["pattern"]
        search_path = validate_path_safe(arguments.get("path", "."))
        glob = arguments.get("file_glob")
        case_i = arguments.get("case_insensitive", False)
        max_res = arguments.get("max_results", 50)

        cmd = ["rg", "--json", "-m", str(max_res)]
        if case_i:
            cmd.append("-i")
        if glob:
            cmd.extend(["-g", glob])
        cmd.extend([pattern, search_path])

        try:
            proc = subprocess.run(
                cmd, capture_output=True, text=True, timeout=30
            )
            lines = [l for l in proc.stdout.strip().split("\n") if l][:max_res]
            matches = []
            import json as _json

            for line in lines:
                try:
                    obj = _json.loads(line)
                    if obj.get("type") == "match":
                        data = obj["data"]
                        matches.append({
                            "file": data["path"]["text"],
                            "line_number": data["line_number"],
                            "text": data["lines"]["text"].strip(),
                        })
                except Exception:
                    continue
            return {"success": True, "matches": matches, "count": len(matches)}
        except FileNotFoundError:
            # Fallback to findstr on Windows or grep on Unix
            return await self._fallback_search(pattern, search_path, max_res)
        except subprocess.TimeoutExpired:
            return {"success": False, "error": "Search timed out after 30s"}

    async def _fallback_search(self, pattern: str, path: str, limit: int) -> Any:
        matches = []
        try:
            for root, _, files in os.walk(path):
                for fname in files:
                    if len(matches) >= limit:
                        break
                    fpath = os.path.join(root, fname)
                    try:
                        with open(fpath, "r", errors="replace") as fh:
                            for i, line in enumerate(fh, 1):
                                if pattern.lower() in line.lower():
                                    matches.append({
                                        "file": fpath,
                                        "line_number": i,
                                        "text": line.strip()[:200],
                                    })
                                    if len(matches) >= limit:
                                        break
                    except (OSError, UnicodeDecodeError):
                        continue
        except Exception as exc:
            return {"success": False, "error": str(exc)}
        return {"success": True, "matches": matches, "count": len(matches)}


class AnalyzeFileTool(ToolHandler):
    def __init__(self) -> None:
        super().__init__(
            types.Tool(
                name="analyze_file",
                description=(
                    "Analyze a source file and return metadata: language, line count, "
                    "imports/exports, function/class definitions, and complexity estimate."
                ),
                inputSchema={
                    "type": "object",
                    "properties": {
                        "path": {
                            "type": "string",
                            "description": "Path to the file to analyze",
                        }
                    },
                    "required": ["path"],
                },
            )
        )

    async def execute(self, arguments: Dict[str, Any]) -> Any:
        file_path = validate_path_safe(arguments["path"])
        p = Path(file_path)
        if not p.exists():
            return {"success": False, "error": f"File not found: {file_path}"}

        content = p.read_text(errors="replace")
        lines = content.split("\n")
        ext = p.suffix.lower()

        language_map = {
            ".py": "Python", ".ts": "TypeScript", ".tsx": "TypeScript/React",
            ".js": "JavaScript", ".jsx": "JavaScript/React",
            ".java": "Java", ".go": "Go", ".rs": "Rust", ".rb": "Ruby",
            ".yaml": "YAML", ".yml": "YAML", ".json": "JSON",
            ".md": "Markdown", ".html": "HTML", ".css": "CSS",
        }
        language = language_map.get(ext, "Unknown")

        imports = [l.strip() for l in lines if l.strip().startswith(("import ", "from ", "require(", "const ", "export "))][:20]
        functions = []
        classes = []
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            if stripped.startswith(("def ", "async def ")):
                functions.append({"line": i, "signature": stripped[:120]})
            elif stripped.startswith("class "):
                classes.append({"line": i, "name": stripped[:80]})
            elif stripped.startswith(("function ", "const ", "export function", "export const", "export default")):
                if "=>" in stripped or "function" in stripped:
                    functions.append({"line": i, "signature": stripped[:120]})

        return {
            "success": True,
            "path": file_path,
            "language": language,
            "size_bytes": p.stat().st_size,
            "line_count": len(lines),
            "non_empty_lines": sum(1 for l in lines if l.strip()),
            "imports": imports[:15],
            "functions": functions[:30],
            "classes": classes[:20],
            "complexity_estimate": "high" if len(lines) > 500 else "medium" if len(lines) > 100 else "low",
        }


class GetProjectStructureTool(ToolHandler):
    def __init__(self) -> None:
        super().__init__(
            types.Tool(
                name="get_project_structure",
                description=(
                    "Get the directory tree structure of a project. "
                    "Returns a hierarchical view of files and directories."
                ),
                inputSchema={
                    "type": "object",
                    "properties": {
                        "path": {
                            "type": "string",
                            "description": "Root path to scan (default: current dir)",
                            "default": ".",
                        },
                        "max_depth": {
                            "type": "integer",
                            "description": "Maximum directory depth (default 3)",
                            "default": 3,
                        },
                        "include_hidden": {
                            "type": "boolean",
                            "description": "Include hidden files/dirs (default false)",
                            "default": False,
                        },
                    },
                },
            )
        )

    async def execute(self, arguments: Dict[str, Any]) -> Any:
        root = validate_path_safe(arguments.get("path", "."))
        max_depth = arguments.get("max_depth", 3)
        include_hidden = arguments.get("include_hidden", False)

        SKIP = {".git", "node_modules", "__pycache__", ".venv", "venv", "dist", "build", ".next"}

        def _walk(dir_path: Path, depth: int) -> Dict:
            if depth > max_depth:
                return {"name": dir_path.name, "type": "directory", "children": ["..."]}
            children = []
            try:
                entries = sorted(dir_path.iterdir(), key=lambda e: (not e.is_dir(), e.name.lower()))
                for entry in entries:
                    if not include_hidden and entry.name.startswith("."):
                        continue
                    if entry.name in SKIP:
                        continue
                    if entry.is_dir():
                        children.append(_walk(entry, depth + 1))
                    else:
                        children.append({"name": entry.name, "type": "file", "size": entry.stat().st_size})
            except PermissionError:
                pass
            return {"name": dir_path.name, "type": "directory", "children": children}

        tree = _walk(Path(root), 0)
        return {"success": True, "tree": tree}


def register(cfg: Any) -> Dict[str, ToolHandler]:
    return {
        h.name: h
        for h in [
            SearchCodeTool(),
            AnalyzeFileTool(),
            GetProjectStructureTool(),
        ]
    }
