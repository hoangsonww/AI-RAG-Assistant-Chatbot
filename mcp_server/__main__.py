"""
Entry point for running the Lumina MCP Server.

Usage:
    python -m mcp_server
    python -m mcp_server --config mcp_server/config/production.yaml
    python -m mcp_server --transport stdio
    python -m mcp_server --transport sse --port 8080
"""

import asyncio
import argparse
import sys


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Lumina MCP Server — enterprise-grade Model Context Protocol server"
    )
    parser.add_argument(
        "--config",
        type=str,
        default=None,
        help="Path to YAML/JSON configuration file",
    )
    parser.add_argument(
        "--transport",
        choices=["stdio", "sse"],
        default="stdio",
        help="Transport layer (default: stdio)",
    )
    parser.add_argument(
        "--host",
        type=str,
        default="0.0.0.0",
        help="Host for SSE transport (default: 0.0.0.0)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8080,
        help="Port for SSE transport (default: 8080)",
    )
    parser.add_argument(
        "--log-level",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        default="INFO",
        help="Logging verbosity (default: INFO)",
    )
    return parser.parse_args()


async def main() -> None:
    args = parse_args()

    from .server import LuminaMCPServer
    from .utils.logger import setup_logging

    setup_logging(level=args.log_level)

    server = LuminaMCPServer(config_path=args.config)

    if args.transport == "stdio":
        await server.run_stdio()
    else:
        await server.run_sse(host=args.host, port=args.port)


if __name__ == "__main__":
    asyncio.run(main())
