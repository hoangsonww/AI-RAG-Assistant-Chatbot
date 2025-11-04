"""
Researcher Agent - Gathers information from various sources
"""

from typing import Dict, Any, List
from datetime import datetime
from ..core.state import PipelineState, AgentType, AgentStatus, update_agent_state
from .base import BaseAgent


class ResearcherAgent(BaseAgent):
    """
    Researcher Agent gathers information from various sources.

    It can search documents, query databases, call APIs, and collect
    relevant information needed for the task.
    """

    def __init__(self, llm: Any, config: Dict[str, Any] = None, tools=None):
        super().__init__(AgentType.RESEARCHER, llm, config, tools)

    def _get_role_description(self) -> str:
        return """gather and collect relevant information from various sources,
including documents, databases, and external APIs"""

    async def execute(self, state: PipelineState) -> PipelineState:
        """
        Research and gather information

        Args:
            state: Current pipeline state

        Returns:
            Updated state with research findings
        """
        self._log_execution_start(state)

        try:
            # Get context from previous agents
            context = self._get_context_from_previous_agents(state)

            # Build research prompt
            prompt = self._build_research_prompt(state, context)

            # Conduct research
            research_response = await self._invoke_llm(prompt)

            # If tools are available, use them
            if self.tools:
                tool_results = await self._use_research_tools(state)
                research_response += f"\n\nTool Results:\n{tool_results}"

            # Structure research findings
            findings = self._structure_findings(research_response)

            # Update state
            state["intermediate_results"]["research_findings"] = findings

            # Add message
            self._add_message(
                state,
                f"Research completed: Found {len(findings.get('key_points', []))} key points",
                metadata={"findings": findings}
            )

            # Update agent state
            update_agent_state(
                state,
                self.agent_id,
                self.agent_type,
                AgentStatus.COMPLETED,
                output_data={"findings": findings}
            )

            self._log_execution_end(state, success=True)

        except Exception as e:
            self.logger.error(f"Researcher agent failed: {str(e)}")
            state["errors"].append({
                "agent": self.agent_type.value,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            })
            self._log_execution_end(state, success=False, error=str(e))

        return state

    def _build_research_prompt(self, state: PipelineState, context: Dict[str, Any]) -> str:
        """Build the research prompt"""
        plan = context.get(AgentType.PLANNER, {}).get("execution_plan", {})

        return f"""
Task: {state['task']}

Context: {state['context']}

Execution Plan: {plan.get('task_analysis', 'No plan available')}

Your goal is to research and gather relevant information for this task.
Focus on:
1. Key concepts and definitions
2. Relevant data and statistics
3. Best practices and methodologies
4. Potential challenges and solutions

Provide a comprehensive research summary with:
- Key findings
- Data points
- Sources (if applicable)
- Relevance to the task

Structure your response clearly with sections and bullet points.
"""

    async def _use_research_tools(self, state: PipelineState) -> str:
        """Use available research tools"""
        results = []

        for tool in self.tools:
            try:
                if hasattr(tool, "ainvoke"):
                    result = await tool.ainvoke({"query": state["task"]})
                elif hasattr(tool, "invoke"):
                    result = tool.invoke({"query": state["task"]})
                else:
                    result = str(tool)

                results.append(f"Tool {tool.name if hasattr(tool, 'name') else 'unknown'}: {result}")
            except Exception as e:
                self.logger.warning(f"Tool execution failed: {str(e)}")
                continue

        return "\n".join(results) if results else "No tool results available"

    def _structure_findings(self, research_response: str) -> Dict[str, Any]:
        """Structure the research findings"""
        # Simple structuring - can be enhanced with more sophisticated parsing
        lines = research_response.split('\n')
        key_points = [line.strip('- ').strip() for line in lines if line.strip().startswith('-')]

        return {
            "summary": research_response[:500],
            "key_points": key_points[:10],  # Top 10 points
            "full_research": research_response,
            "timestamp": datetime.utcnow().isoformat(),
            "confidence": self._estimate_confidence(research_response)
        }

    def _estimate_confidence(self, response: str) -> float:
        """Estimate confidence in research findings"""
        # Simple heuristic based on response length and structure
        has_structure = any(marker in response for marker in ['1.', '2.', '-', '*'])
        length_score = min(len(response) / 1000, 1.0)
        structure_score = 0.3 if has_structure else 0.0

        return min(length_score + structure_score, 1.0)
