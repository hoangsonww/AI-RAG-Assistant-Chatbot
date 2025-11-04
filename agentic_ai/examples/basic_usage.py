"""
Basic usage example for the Agentic AI Pipeline
"""

import asyncio
import os
from pathlib import Path

# Add parent directory to path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from agentic_ai import AgenticPipeline


async def main():
    """Run basic example"""
    print("=" * 60)
    print("Agentic AI Pipeline - Basic Usage Example")
    print("=" * 60)

    # Initialize pipeline
    print("\n1. Initializing pipeline...")
    pipeline = AgenticPipeline(
        config_path="config/default_config.yaml"
    )
    print("✓ Pipeline initialized")

    # Define task
    task = """
    Analyze the current state of artificial intelligence in healthcare.
    Focus on recent developments, challenges, and future opportunities.
    """

    context = {
        "focus_areas": ["diagnostics", "patient care", "drug discovery"],
        "timeframe": "last 3 years",
        "depth": "comprehensive"
    }

    # Run pipeline
    print(f"\n2. Running pipeline for task...")
    print(f"Task: {task.strip()}")

    result = await pipeline.run(task=task, context=context)

    # Display results
    print("\n" + "=" * 60)
    print("Results")
    print("=" * 60)

    print(f"\n✓ Pipeline ID: {result['pipeline_id']}")
    print(f"✓ Success: {result['success']}")
    print(f"✓ Quality Score: {result['quality_score']:.2f}")
    print(f"✓ Agents Executed: {result['agents_executed']}")

    print("\n--- Summary ---")
    print(result['summary'])

    print("\n--- Key Takeaways ---")
    for i, takeaway in enumerate(result['key_takeaways'][:5], 1):
        print(f"{i}. {takeaway}")

    print("\n--- Recommendations ---")
    for i, rec in enumerate(result['recommendations'][:3], 1):
        print(f"{i}. {rec}")

    if result['errors']:
        print("\n--- Errors Encountered ---")
        for error in result['errors']:
            print(f"- {error['agent']}: {error['error']}")

    print("\n" + "=" * 60)
    print("Example completed successfully!")
    print("=" * 60)


async def streaming_example():
    """Run streaming example"""
    print("=" * 60)
    print("Agentic AI Pipeline - Streaming Example")
    print("=" * 60)

    # Initialize pipeline
    pipeline = AgenticPipeline()

    # Define task
    task = "Research the latest trends in renewable energy"

    print(f"\nStreaming task execution: {task}")
    print("-" * 60)

    # Stream execution
    async for update in pipeline.stream(task=task):
        step = update.get('current_step', 'unknown')
        status = update.get('status', 'unknown')
        print(f"[{step}] Status: {status}")

        if update.get('latest_message'):
            msg = update['latest_message']
            print(f"  → {msg.get('content', '')[:100]}...")

    print("-" * 60)
    print("Streaming example completed!")


async def visualization_example():
    """Show pipeline visualization"""
    print("=" * 60)
    print("Agentic AI Pipeline - Visualization Example")
    print("=" * 60)

    # Initialize pipeline
    pipeline = AgenticPipeline()

    # Get graph visualization
    print("\nPipeline Graph (Mermaid):")
    print("-" * 60)
    graph = pipeline.get_graph_visualization()
    print(graph)
    print("-" * 60)


if __name__ == "__main__":
    # Check for API key
    if not os.getenv("OPENAI_API_KEY"):
        print("Error: OPENAI_API_KEY environment variable not set")
        print("Please set your OpenAI API key:")
        print("  export OPENAI_API_KEY=your-key-here")
        sys.exit(1)

    # Run examples
    print("\nRunning basic example...")
    asyncio.run(main())

    print("\n\nRunning streaming example...")
    asyncio.run(streaming_example())

    print("\n\nShowing visualization...")
    asyncio.run(visualization_example())
