"""
Main entry point for the Agentic AI Pipeline
"""

import asyncio
import argparse
import sys
from pathlib import Path

from .core.pipeline import AgenticPipeline
from .utils.logger import setup_logging


def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(
        description="Agentic AI Pipeline - Multi-agent AI system"
    )

    parser.add_argument(
        "command",
        choices=["run", "server", "visualize"],
        help="Command to execute"
    )

    parser.add_argument(
        "--config",
        type=str,
        help="Path to configuration file",
        default=None
    )

    parser.add_argument(
        "--task",
        type=str,
        help="Task to execute (for run command)",
        default=None
    )

    parser.add_argument(
        "--log-level",
        type=str,
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        default="INFO",
        help="Logging level"
    )

    parser.add_argument(
        "--stream",
        action="store_true",
        help="Stream execution updates (for run command)"
    )

    return parser.parse_args()


async def run_command(args):
    """Run pipeline command"""
    if not args.task:
        print("Error: --task is required for run command")
        sys.exit(1)

    # Setup logging
    setup_logging(level=args.log_level)

    # Initialize pipeline
    print("Initializing pipeline...")
    pipeline = AgenticPipeline(config_path=args.config)

    # Run or stream
    if args.stream:
        print(f"\nStreaming task execution: {args.task}")
        print("-" * 60)

        async for update in pipeline.stream(task=args.task):
            step = update.get('current_step', 'unknown')
            status = update.get('status', 'unknown')
            print(f"[{step}] {status}")

        print("-" * 60)
        print("Task completed!")

    else:
        print(f"\nExecuting task: {args.task}")
        result = await pipeline.run(task=args.task)

        print("\n" + "=" * 60)
        print("Results")
        print("=" * 60)
        print(f"\nSuccess: {result['success']}")
        print(f"Quality Score: {result['quality_score']:.2f}")
        print(f"\n{result['summary']}")
        print("=" * 60)


async def server_command(args):
    """Start MCP server"""
    from .mcp_server.server import AgenticMCPServer

    setup_logging(level=args.log_level)

    print("Starting MCP server...")
    server = AgenticMCPServer(config_path=args.config)
    await server.run()


async def visualize_command(args):
    """Visualize pipeline graph"""
    setup_logging(level=args.log_level)

    pipeline = AgenticPipeline(config_path=args.config)

    print("Pipeline Graph Visualization (Mermaid)")
    print("=" * 60)
    print(pipeline.get_graph_visualization())
    print("=" * 60)


async def main():
    """Main entry point"""
    args = parse_args()

    if args.command == "run":
        await run_command(args)
    elif args.command == "server":
        await server_command(args)
    elif args.command == "visualize":
        await visualize_command(args)


if __name__ == "__main__":
    asyncio.run(main())
