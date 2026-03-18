# MCP Server File Map

## Core

- `mcp_server/__init__.py`: package init, exports LuminaMCPServer.
- `mcp_server/__main__.py`: CLI entry point (--config, --transport, --host, --port, --log-level).
- `mcp_server/server.py`: LuminaMCPServer class, handler registration, stdio and SSE transport.
- `mcp_server/config.py`: ServerConfig with deep merge, env overrides, dot-notation access.

## Tools (32 total)

- `mcp_server/tools/__init__.py`: _ToolRegistry.build(cfg) — dynamic category loader.
- `mcp_server/tools/base.py`: abstract ToolHandler(ABC).
- `mcp_server/tools/pipeline_tools.py`: 5 tools — run_pipeline, get_pipeline_status, list_pipelines, cancel_pipeline, get_pipeline_graph.
- `mcp_server/tools/knowledge_tools.py`: 4 tools — search_knowledge, list_knowledge_sources, get_knowledge_document, similarity_search.
- `mcp_server/tools/code_tools.py`: 3 tools — search_code, analyze_file, get_project_structure.
- `mcp_server/tools/file_tools.py`: 5 tools — read_file, write_file, list_directory, file_info, search_files.
- `mcp_server/tools/web_tools.py`: 2 tools — fetch_url, extract_content.
- `mcp_server/tools/data_tools.py`: 3 tools — parse_csv, parse_json, transform_data.
- `mcp_server/tools/git_tools.py`: 4 tools — git_status, git_log, git_diff, git_blame.
- `mcp_server/tools/system_tools.py`: 6 tools — health_check, system_info, get_server_config, get_server_metrics, list_available_tools, environment_check.

## Resources (7 total)

- `mcp_server/resources/pipeline_resources.py`: lumina://pipeline/{config,metrics,agents}.
- `mcp_server/resources/knowledge_resources.py`: lumina://knowledge/{manifest,stats}.
- `mcp_server/resources/system_resources.py`: lumina://system/{info,capabilities}.

## Prompts (6 total)

- `mcp_server/prompts/prompt_library.py`: analyze_task, research_topic, code_review, debug_issue, summarize_project, analyze_data.

## Middleware

- `mcp_server/middleware/auth.py`: API key authentication.
- `mcp_server/middleware/rate_limiter.py`: token-bucket rate limiting.
- `mcp_server/middleware/validator.py`: JSON Schema input validation.

## Configuration

- `mcp_server/config/default.yaml`: shipped defaults.
- `mcp_server/config/production.yaml`: production overrides.
