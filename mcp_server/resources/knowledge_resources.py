"""
Knowledge-base resources.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict

import mcp.types as types

from .base import ResourceHandler


class KnowledgeManifestResource(ResourceHandler):
    def __init__(self) -> None:
        super().__init__(
            types.Resource(
                uri="lumina://knowledge/manifest",
                name="Knowledge Manifest",
                description="List of all knowledge sources and their ingestion status",
                mimeType="application/json",
            )
        )

    async def read(self) -> str:
        manifest = Path("server/knowledge/manifest.json")
        if manifest.exists():
            return manifest.read_text()
        return json.dumps({"sources": [], "note": "No manifest file found"})


class KnowledgeStatsResource(ResourceHandler):
    def __init__(self) -> None:
        super().__init__(
            types.Resource(
                uri="lumina://knowledge/stats",
                name="Knowledge Base Statistics",
                description="Statistics about the knowledge base: document count, total size, types",
                mimeType="application/json",
            )
        )

    async def read(self) -> str:
        knowledge_dir = Path("server/knowledge")
        if not knowledge_dir.exists():
            return json.dumps({"note": "Knowledge directory not found"})

        files = list(knowledge_dir.rglob("*"))
        total_size = sum(f.stat().st_size for f in files if f.is_file())
        extensions = {}
        for f in files:
            if f.is_file():
                ext = f.suffix or "no_ext"
                extensions[ext] = extensions.get(ext, 0) + 1

        return json.dumps({
            "total_files": len([f for f in files if f.is_file()]),
            "total_size_bytes": total_size,
            "file_types": extensions,
        }, indent=2)


def register(cfg: Any) -> Dict[str, ResourceHandler]:
    handlers = [KnowledgeManifestResource(), KnowledgeStatsResource()]
    return {h.uri: h for h in handlers}
