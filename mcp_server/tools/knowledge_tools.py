"""
Knowledge-base and RAG tools — search, list, and retrieve knowledge documents.
"""

from __future__ import annotations

from typing import Any, Dict

import mcp.types as types

from .base import ToolHandler
from ..utils.logger import get_logger

_logger = get_logger("tools.knowledge")


class SearchKnowledgeTool(ToolHandler):
    def __init__(self) -> None:
        super().__init__(
            types.Tool(
                name="search_knowledge",
                description=(
                    "Semantic search across the Lumina knowledge base. "
                    "Returns the most relevant documents/chunks for a query."
                ),
                inputSchema={
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "Natural-language search query",
                        },
                        "top_k": {
                            "type": "integer",
                            "description": "Number of results to return (default 5)",
                            "default": 5,
                        },
                        "namespace": {
                            "type": "string",
                            "description": "Optional Pinecone namespace to scope the search",
                        },
                    },
                    "required": ["query"],
                },
            )
        )

    async def execute(self, arguments: Dict[str, Any]) -> Any:
        query = arguments["query"]
        top_k = arguments.get("top_k", 5)
        namespace = arguments.get("namespace")
        _logger.info("Knowledge search: query=%s top_k=%d", query[:80], top_k)

        try:
            # Try using the server's knowledge service
            from importlib import import_module

            kb = import_module("server.src.services.knowledgeBase")
            results = await kb.search(query, top_k=top_k, namespace=namespace)
            return {"success": True, "results": results, "count": len(results)}
        except Exception:
            return {
                "success": True,
                "results": [],
                "count": 0,
                "note": "Knowledge service not available — ensure Pinecone is configured",
            }


class ListKnowledgeSourcesTool(ToolHandler):
    def __init__(self) -> None:
        super().__init__(
            types.Tool(
                name="list_knowledge_sources",
                description="List all knowledge sources ingested into the RAG system.",
                inputSchema={"type": "object", "properties": {}},
            )
        )

    async def execute(self, arguments: Dict[str, Any]) -> Any:
        try:
            import json
            from pathlib import Path

            manifest = Path("server/knowledge/manifest.json")
            if manifest.exists():
                data = json.loads(manifest.read_text())
                return {"success": True, "sources": data}
            return {"success": True, "sources": [], "note": "No manifest found"}
        except Exception as exc:
            return {"success": False, "error": str(exc)}


class GetDocumentTool(ToolHandler):
    def __init__(self) -> None:
        super().__init__(
            types.Tool(
                name="get_knowledge_document",
                description="Retrieve a specific knowledge document by its source ID or filename.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "source_id": {
                            "type": "string",
                            "description": "Source identifier or filename",
                        }
                    },
                    "required": ["source_id"],
                },
            )
        )

    async def execute(self, arguments: Dict[str, Any]) -> Any:
        source_id = arguments["source_id"]
        try:
            from pathlib import Path

            knowledge_dir = Path("server/knowledge")
            for f in knowledge_dir.rglob("*"):
                if source_id in f.name and f.is_file():
                    content = f.read_text(errors="replace")[:10_000]
                    return {
                        "success": True,
                        "source_id": source_id,
                        "path": str(f),
                        "content_preview": content,
                    }
            return {"success": False, "error": f"Document '{source_id}' not found"}
        except Exception as exc:
            return {"success": False, "error": str(exc)}


class SimilaritySearchTool(ToolHandler):
    def __init__(self) -> None:
        super().__init__(
            types.Tool(
                name="similarity_search",
                description=(
                    "Find documents similar to a given text using vector similarity. "
                    "Useful for finding related content or deduplication."
                ),
                inputSchema={
                    "type": "object",
                    "properties": {
                        "text": {
                            "type": "string",
                            "description": "Reference text to find similar documents for",
                        },
                        "threshold": {
                            "type": "number",
                            "description": "Minimum similarity score 0-1 (default 0.7)",
                            "default": 0.7,
                        },
                        "limit": {
                            "type": "integer",
                            "description": "Max results (default 10)",
                            "default": 10,
                        },
                    },
                    "required": ["text"],
                },
            )
        )

    async def execute(self, arguments: Dict[str, Any]) -> Any:
        text = arguments["text"]
        threshold = arguments.get("threshold", 0.7)
        limit = arguments.get("limit", 10)
        return {
            "success": True,
            "results": [],
            "note": "Similarity search requires vector store connection",
            "query_length": len(text),
            "threshold": threshold,
            "limit": limit,
        }


def register(cfg: Any) -> Dict[str, ToolHandler]:
    return {
        h.name: h
        for h in [
            SearchKnowledgeTool(),
            ListKnowledgeSourcesTool(),
            GetDocumentTool(),
            SimilaritySearchTool(),
        ]
    }
