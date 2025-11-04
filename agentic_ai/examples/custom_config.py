"""
Example of using the pipeline with custom configuration
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from agentic_ai import AgenticPipeline


async def main():
    """Run example with custom configuration"""
    print("=" * 60)
    print("Custom Configuration Example")
    print("=" * 60)

    # Custom configuration
    custom_config = {
        "llm": {
            "provider": "openai",
            "model": "gpt-4",
            "temperature": 0.5,  # Lower temperature for more focused responses
            "max_tokens": 2048
        },
        "agents": {
            "planner": {
                "enabled": True,
                "timeout": 45
            },
            "researcher": {
                "enabled": True,
                "timeout": 90
            },
            "analyzer": {
                "enabled": True,
                "timeout": 60
            },
            "synthesizer": {
                "enabled": True,
                "timeout": 60
            },
            "validator": {
                "enabled": True,
                "timeout": 45,
                "min_score": 0.75  # Higher quality threshold
            },
            "executor": {
                "enabled": False  # Disable executor for read-only tasks
            },
            "reviewer": {
                "enabled": True,
                "timeout": 45
            }
        },
        "pipeline": {
            "max_retries": 2,
            "timeout_seconds": 300,
            "enable_parallel": False,
            "enable_caching": True
        },
        "monitoring": {
            "enabled": True,
            "log_level": "DEBUG"
        }
    }

    # Initialize pipeline with custom config
    print("\nInitializing pipeline with custom configuration...")
    pipeline = AgenticPipeline.from_dict(custom_config)
    print("✓ Pipeline initialized")

    # Run task
    task = "Provide a brief analysis of cloud computing market trends"

    print(f"\nExecuting task: {task}")
    result = await pipeline.run(task=task)

    # Display results
    print("\n" + "=" * 60)
    print("Results")
    print("=" * 60)
    print(f"\nQuality Score: {result['quality_score']:.2f}")
    print(f"Agents Executed: {result['agents_executed']}")
    print(f"\n{result['summary']}")

    print("\n" + "=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
