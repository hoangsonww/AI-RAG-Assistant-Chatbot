"""
Git operation tools — status, log, diff, blame.
"""

from __future__ import annotations

import subprocess
from typing import Any, Dict

import mcp.types as types

from .base import ToolHandler
from ..middleware.validator import validate_path_safe
from ..utils.logger import get_logger

_logger = get_logger("tools.git")


def _run_git(args: list[str], cwd: str = ".") -> Dict[str, Any]:
    """Run a git command and return structured output."""
    try:
        proc = subprocess.run(
            ["git", "--no-pager"] + args,
            capture_output=True,
            text=True,
            cwd=cwd,
            timeout=30,
        )
        return {
            "success": proc.returncode == 0,
            "stdout": proc.stdout,
            "stderr": proc.stderr.strip() if proc.stderr else None,
        }
    except FileNotFoundError:
        return {"success": False, "error": "git not found on PATH"}
    except subprocess.TimeoutExpired:
        return {"success": False, "error": "git command timed out after 30s"}


class GitStatusTool(ToolHandler):
    def __init__(self) -> None:
        super().__init__(
            types.Tool(
                name="git_status",
                description="Get the current git repository status (branch, staged, modified, untracked files).",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "path": {
                            "type": "string",
                            "description": "Repository path (default: current dir)",
                            "default": ".",
                        }
                    },
                },
            )
        )

    async def execute(self, arguments: Dict[str, Any]) -> Any:
        cwd = validate_path_safe(arguments.get("path", "."))
        result = _run_git(["status", "--porcelain=v2", "--branch"], cwd)
        if not result["success"]:
            return result

        lines = result["stdout"].strip().split("\n") if result["stdout"] else []
        branch = None
        staged, modified, untracked = [], [], []
        for line in lines:
            if line.startswith("# branch.head"):
                branch = line.split()[-1]
            elif line.startswith("1 ") or line.startswith("2 "):
                parts = line.split(None, 8)
                xy = parts[1] if len(parts) > 1 else ""
                fname = parts[-1] if parts else ""
                if xy[0] != ".":
                    staged.append(fname)
                if xy[1] != ".":
                    modified.append(fname)
            elif line.startswith("? "):
                untracked.append(line[2:])

        return {
            "success": True,
            "branch": branch,
            "staged": staged,
            "modified": modified,
            "untracked": untracked,
            "clean": not staged and not modified and not untracked,
        }


class GitLogTool(ToolHandler):
    def __init__(self) -> None:
        super().__init__(
            types.Tool(
                name="git_log",
                description="Show recent git commits with author, date, and message.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "path": {"type": "string", "default": "."},
                        "max_count": {
                            "type": "integer",
                            "description": "Number of commits (default 20)",
                            "default": 20,
                        },
                        "file": {
                            "type": "string",
                            "description": "Optional: show commits for a specific file",
                        },
                        "author": {"type": "string", "description": "Filter by author"},
                    },
                },
            )
        )

    async def execute(self, arguments: Dict[str, Any]) -> Any:
        cwd = validate_path_safe(arguments.get("path", "."))
        count = arguments.get("max_count", 20)
        file_filter = arguments.get("file")
        author = arguments.get("author")

        args = ["log", f"-{count}", "--format=%H|%an|%ae|%aI|%s"]
        if author:
            args.append(f"--author={author}")
        if file_filter:
            args.extend(["--", file_filter])

        result = _run_git(args, cwd)
        if not result["success"]:
            return result

        commits = []
        for line in result["stdout"].strip().split("\n"):
            if not line:
                continue
            parts = line.split("|", 4)
            if len(parts) >= 5:
                commits.append({
                    "sha": parts[0][:12],
                    "author": parts[1],
                    "email": parts[2],
                    "date": parts[3],
                    "message": parts[4],
                })

        return {"success": True, "commits": commits, "count": len(commits)}


class GitDiffTool(ToolHandler):
    def __init__(self) -> None:
        super().__init__(
            types.Tool(
                name="git_diff",
                description="Show git diff — unstaged changes, staged changes, or between commits.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "path": {"type": "string", "default": "."},
                        "staged": {
                            "type": "boolean",
                            "description": "Show staged changes (default: unstaged)",
                            "default": False,
                        },
                        "commit": {
                            "type": "string",
                            "description": "Compare against a specific commit/branch",
                        },
                        "file": {
                            "type": "string",
                            "description": "Limit diff to a specific file",
                        },
                        "stat_only": {
                            "type": "boolean",
                            "description": "Show only file stats, not full diff",
                            "default": False,
                        },
                    },
                },
            )
        )

    async def execute(self, arguments: Dict[str, Any]) -> Any:
        cwd = validate_path_safe(arguments.get("path", "."))
        staged = arguments.get("staged", False)
        commit = arguments.get("commit")
        file_filter = arguments.get("file")
        stat_only = arguments.get("stat_only", False)

        args = ["diff"]
        if staged:
            args.append("--cached")
        if commit:
            args.append(commit)
        if stat_only:
            args.append("--stat")
        if file_filter:
            args.extend(["--", file_filter])

        result = _run_git(args, cwd)
        if not result["success"]:
            return result

        output = result["stdout"][:50_000]  # Cap output size
        return {
            "success": True,
            "diff": output,
            "truncated": len(result["stdout"]) > 50_000,
        }


class GitBlameTool(ToolHandler):
    def __init__(self) -> None:
        super().__init__(
            types.Tool(
                name="git_blame",
                description="Show line-by-line authorship for a file.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "file": {"type": "string", "description": "File to blame"},
                        "path": {"type": "string", "default": "."},
                        "line_range": {
                            "type": "array",
                            "items": {"type": "integer"},
                            "description": "[start, end] line range (1-based)",
                        },
                    },
                    "required": ["file"],
                },
            )
        )

    async def execute(self, arguments: Dict[str, Any]) -> Any:
        cwd = validate_path_safe(arguments.get("path", "."))
        file = arguments["file"]
        line_range = arguments.get("line_range")

        args = ["blame", "--porcelain"]
        if line_range and len(line_range) == 2:
            args.extend([f"-L{line_range[0]},{line_range[1]}"])
        args.append(file)

        result = _run_git(args, cwd)
        if not result["success"]:
            return result

        # Parse porcelain blame output (summarised)
        output = result["stdout"][:30_000]
        return {"success": True, "blame": output, "file": file}


def register(cfg: Any) -> Dict[str, ToolHandler]:
    return {
        h.name: h
        for h in [GitStatusTool(), GitLogTool(), GitDiffTool(), GitBlameTool()]
    }
