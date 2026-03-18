"""
Comprehensive prompt library for the Lumina MCP Server.
"""

from __future__ import annotations

from typing import Any, Dict

import mcp.types as types

from .base import PromptHandler


class AnalyzeTaskPrompt(PromptHandler):
    def __init__(self) -> None:
        super().__init__(
            types.Prompt(
                name="analyze_task",
                description="Analyze a task and create a detailed execution plan using the agentic pipeline",
                arguments=[
                    types.PromptArgument(name="task", description="The task to analyze", required=True),
                    types.PromptArgument(name="depth", description="Analysis depth: brief, standard, deep", required=False),
                ],
            )
        )

    async def render(self, arguments: Dict[str, str]) -> types.GetPromptResult:
        task = arguments.get("task", "")
        depth = arguments.get("depth", "standard")
        detail = {
            "brief": "Provide a high-level overview with key steps.",
            "standard": "Break down into detailed steps with dependencies and agent assignments.",
            "deep": "Perform exhaustive analysis including risk assessment, alternatives, and fallback strategies.",
        }.get(depth, "Break down into detailed steps.")

        return types.GetPromptResult(
            description="Task analysis and execution planning",
            messages=[
                types.PromptMessage(
                    role="user",
                    content=types.TextContent(
                        type="text",
                        text=(
                            f"Analyze the following task and create a structured execution plan.\n\n"
                            f"Task: {task}\n\n"
                            f"Depth: {depth}\n"
                            f"Instructions: {detail}\n\n"
                            f"Include:\n"
                            f"1. Task breakdown into logical subtasks\n"
                            f"2. Recommended agent sequence (planner → researcher → analyzer → synthesizer → validator → executor → reviewer)\n"
                            f"3. Expected inputs/outputs for each step\n"
                            f"4. Success criteria\n"
                            f"5. Potential risks and mitigations"
                        ),
                    ),
                )
            ],
        )


class ResearchTopicPrompt(PromptHandler):
    def __init__(self) -> None:
        super().__init__(
            types.Prompt(
                name="research_topic",
                description="Research a topic comprehensively using available tools",
                arguments=[
                    types.PromptArgument(name="topic", description="Topic to research", required=True),
                    types.PromptArgument(name="focus_areas", description="Comma-separated focus areas", required=False),
                ],
            )
        )

    async def render(self, arguments: Dict[str, str]) -> types.GetPromptResult:
        topic = arguments.get("topic", "")
        focus = arguments.get("focus_areas", "")

        return types.GetPromptResult(
            description="Comprehensive topic research",
            messages=[
                types.PromptMessage(
                    role="user",
                    content=types.TextContent(
                        type="text",
                        text=(
                            f"Research the following topic comprehensively.\n\n"
                            f"Topic: {topic}\n"
                            f"{'Focus areas: ' + focus if focus else ''}\n\n"
                            f"Use available tools to:\n"
                            f"1. Search the knowledge base for relevant documents\n"
                            f"2. Analyze related code if applicable\n"
                            f"3. Fetch relevant web resources\n"
                            f"4. Compile findings with citations\n\n"
                            f"Provide a structured research report with sections, key findings, "
                            f"and recommendations."
                        ),
                    ),
                )
            ],
        )


class CodeReviewPrompt(PromptHandler):
    def __init__(self) -> None:
        super().__init__(
            types.Prompt(
                name="code_review",
                description="Review code changes for quality, security, and best practices",
                arguments=[
                    types.PromptArgument(name="file_path", description="Path to file or directory to review", required=False),
                    types.PromptArgument(name="focus", description="Review focus: security, performance, quality, all", required=False),
                ],
            )
        )

    async def render(self, arguments: Dict[str, str]) -> types.GetPromptResult:
        file_path = arguments.get("file_path", ".")
        focus = arguments.get("focus", "all")

        return types.GetPromptResult(
            description="Code review workflow",
            messages=[
                types.PromptMessage(
                    role="user",
                    content=types.TextContent(
                        type="text",
                        text=(
                            f"Perform a code review with the following parameters.\n\n"
                            f"Target: {file_path}\n"
                            f"Focus: {focus}\n\n"
                            f"Steps:\n"
                            f"1. Use git_diff to see recent changes\n"
                            f"2. Use read_file / analyze_file to inspect the code\n"
                            f"3. Use search_code to find related patterns\n\n"
                            f"Review for:\n"
                            f"- Correctness and logic errors\n"
                            f"- Security vulnerabilities\n"
                            f"- Performance issues\n"
                            f"- Code style and maintainability\n"
                            f"- Test coverage gaps\n\n"
                            f"Provide specific, actionable feedback with file paths and line numbers."
                        ),
                    ),
                )
            ],
        )


class DebugIssuePrompt(PromptHandler):
    def __init__(self) -> None:
        super().__init__(
            types.Prompt(
                name="debug_issue",
                description="Systematically debug an issue using available tools",
                arguments=[
                    types.PromptArgument(name="description", description="Description of the issue or error", required=True),
                    types.PromptArgument(name="error_message", description="Error message or stack trace", required=False),
                ],
            )
        )

    async def render(self, arguments: Dict[str, str]) -> types.GetPromptResult:
        desc = arguments.get("description", "")
        error = arguments.get("error_message", "")

        return types.GetPromptResult(
            description="Systematic debugging workflow",
            messages=[
                types.PromptMessage(
                    role="user",
                    content=types.TextContent(
                        type="text",
                        text=(
                            f"Debug the following issue systematically.\n\n"
                            f"Issue: {desc}\n"
                            f"{'Error: ' + error if error else ''}\n\n"
                            f"Debugging steps:\n"
                            f"1. Use search_code to find relevant code\n"
                            f"2. Use read_file to examine the problematic files\n"
                            f"3. Use analyze_file for structure understanding\n"
                            f"4. Use git_log / git_blame for change history\n"
                            f"5. Form hypothesis and verify\n\n"
                            f"Provide: root cause, explanation, and fix recommendation."
                        ),
                    ),
                )
            ],
        )


class SummarizeProjectPrompt(PromptHandler):
    def __init__(self) -> None:
        super().__init__(
            types.Prompt(
                name="summarize_project",
                description="Generate a high-level summary of a codebase or project",
                arguments=[
                    types.PromptArgument(name="path", description="Project root path", required=False),
                ],
            )
        )

    async def render(self, arguments: Dict[str, str]) -> types.GetPromptResult:
        path = arguments.get("path", ".")

        return types.GetPromptResult(
            description="Project summarization",
            messages=[
                types.PromptMessage(
                    role="user",
                    content=types.TextContent(
                        type="text",
                        text=(
                            f"Summarize the project at: {path}\n\n"
                            f"Use the following tools:\n"
                            f"1. get_project_structure — map the directory tree\n"
                            f"2. read_file — read README, package.json, requirements.txt\n"
                            f"3. search_code — identify key patterns and frameworks\n"
                            f"4. git_log — understand recent development activity\n\n"
                            f"Produce a summary covering:\n"
                            f"- Purpose and goals\n"
                            f"- Tech stack and frameworks\n"
                            f"- Architecture overview\n"
                            f"- Key components and their roles\n"
                            f"- Recent development activity"
                        ),
                    ),
                )
            ],
        )


class DataAnalysisPrompt(PromptHandler):
    def __init__(self) -> None:
        super().__init__(
            types.Prompt(
                name="analyze_data",
                description="Analyze a data file (CSV/JSON) and provide insights",
                arguments=[
                    types.PromptArgument(name="file_path", description="Path to data file", required=True),
                    types.PromptArgument(name="question", description="Specific question about the data", required=False),
                ],
            )
        )

    async def render(self, arguments: Dict[str, str]) -> types.GetPromptResult:
        path = arguments.get("file_path", "")
        question = arguments.get("question", "")

        return types.GetPromptResult(
            description="Data analysis workflow",
            messages=[
                types.PromptMessage(
                    role="user",
                    content=types.TextContent(
                        type="text",
                        text=(
                            f"Analyze the data file: {path}\n"
                            f"{'Question: ' + question if question else ''}\n\n"
                            f"Steps:\n"
                            f"1. Use file_info to check file type and size\n"
                            f"2. Use parse_csv or parse_json to load the data\n"
                            f"3. Use transform_data to filter/sort as needed\n\n"
                            f"Provide:\n"
                            f"- Data overview (shape, columns, types)\n"
                            f"- Key statistics and patterns\n"
                            f"- Anomalies or data quality issues\n"
                            f"- Actionable insights"
                        ),
                    ),
                )
            ],
        )


def register(cfg: Any) -> Dict[str, PromptHandler]:
    handlers = [
        AnalyzeTaskPrompt(),
        ResearchTopicPrompt(),
        CodeReviewPrompt(),
        DebugIssuePrompt(),
        SummarizeProjectPrompt(),
        DataAnalysisPrompt(),
    ]
    return {h.name: h for h in handlers}
