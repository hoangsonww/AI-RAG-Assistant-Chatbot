"""
Synthesizer Agent - Synthesizes information from multiple sources
"""

from typing import Dict, Any, List
from datetime import datetime
from ..core.state import PipelineState, AgentType, AgentStatus, update_agent_state
from .base import BaseAgent


class SynthesizerAgent(BaseAgent):
    """
    Synthesizer Agent combines information from multiple agents.

    It creates a coherent synthesis of research, analysis, and other
    agent outputs to form a comprehensive understanding.
    """

    def __init__(self, llm: Any, config: Dict[str, Any] = None, tools=None):
        super().__init__(AgentType.SYNTHESIZER, llm, config, tools)

    def _get_role_description(self) -> str:
        return """combine and synthesize information from multiple sources and agents,
creating coherent and comprehensive summaries"""

    async def execute(self, state: PipelineState) -> PipelineState:
        """
        Synthesize information from all previous agents

        Args:
            state: Current pipeline state

        Returns:
            Updated state with synthesis
        """
        self._log_execution_start(state)

        try:
            # Get context from all previous agents
            context = self._get_context_from_previous_agents(state)

            # Build synthesis prompt
            prompt = self._build_synthesis_prompt(state, context)

            # Perform synthesis
            synthesis_response = await self._invoke_llm(prompt)

            # Structure synthesis
            synthesis = self._structure_synthesis(synthesis_response, context)

            # Update state
            state["intermediate_results"]["synthesis"] = synthesis

            # Add message
            self._add_message(
                state,
                "Synthesis completed: Combined insights from all agents",
                metadata={"synthesis": synthesis}
            )

            # Update agent state
            update_agent_state(
                state,
                self.agent_id,
                self.agent_type,
                AgentStatus.COMPLETED,
                output_data={"synthesis": synthesis}
            )

            self._log_execution_end(state, success=True)

        except Exception as e:
            self.logger.error(f"Synthesizer agent failed: {str(e)}")
            state["errors"].append({
                "agent": self.agent_type.value,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            })
            self._log_execution_end(state, success=False, error=str(e))

        return state

    def _build_synthesis_prompt(self, state: PipelineState, context: Dict[str, Any]) -> str:
        """Build the synthesis prompt"""
        plan = context.get(AgentType.PLANNER, {}).get("execution_plan", {})
        research = context.get(AgentType.RESEARCHER, {}).get("findings", {})
        analysis = context.get(AgentType.ANALYZER, {}).get("analysis", {})

        return f"""
Task: {state['task']}

You have the following information from different agents:

EXECUTION PLAN:
{plan.get('task_analysis', 'Not available')}

RESEARCH FINDINGS:
{research.get('summary', 'Not available')}
Key Points: {', '.join(research.get('key_points', [])[:5])}

ANALYSIS:
Insights: {', '.join(analysis.get('insights', [])[:5])}
Recommendations: {', '.join(analysis.get('recommendations', [])[:3])}

Your task is to synthesize all this information into a coherent, comprehensive response that:

1. **Integrates** findings from all agents
2. **Highlights** the most important points
3. **Resolves** any conflicts or contradictions
4. **Provides** a clear, actionable summary
5. **Identifies** next steps or conclusions

Create a well-structured synthesis that combines all the information logically and coherently.
"""

    def _structure_synthesis(self, synthesis_response: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Structure the synthesis results"""
        return {
            "summary": self._extract_summary(synthesis_response),
            "key_takeaways": self._extract_takeaways(synthesis_response),
            "integrated_insights": self._integrate_insights(context),
            "actionable_items": self._extract_actions(synthesis_response),
            "next_steps": self._identify_next_steps(synthesis_response),
            "full_synthesis": synthesis_response,
            "timestamp": datetime.utcnow().isoformat(),
            "sources": list(context.keys()),
            "completeness_score": self._assess_completeness(context)
        }

    def _extract_summary(self, text: str) -> str:
        """Extract the main summary"""
        lines = text.split('\n')
        summary_lines = []

        for line in lines[:10]:  # Look in first 10 lines
            if line.strip() and not line.strip().startswith('#'):
                summary_lines.append(line.strip())
                if len(' '.join(summary_lines)) > 200:
                    break

        return ' '.join(summary_lines) if summary_lines else text[:200]

    def _extract_takeaways(self, text: str) -> List[str]:
        """Extract key takeaways"""
        takeaways = []
        for line in text.split('\n'):
            line = line.strip()
            if line.startswith(('-', '*', '•', '1.', '2.', '3.')):
                takeaway = line.strip('- *•0123456789.').strip()
                if len(takeaway) > 15:
                    takeaways.append(takeaway)

        return takeaways[:10]

    def _integrate_insights(self, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Integrate insights from all agents"""
        integrated = []

        # Get insights from analyzer
        analysis = context.get(AgentType.ANALYZER, {}).get("analysis", {})
        for insight in analysis.get('insights', [])[:5]:
            integrated.append({
                "source": "analyzer",
                "insight": insight,
                "priority": "high"
            })

        # Get key points from researcher
        research = context.get(AgentType.RESEARCHER, {}).get("findings", {})
        for point in research.get('key_points', [])[:3]:
            integrated.append({
                "source": "researcher",
                "insight": point,
                "priority": "medium"
            })

        return integrated

    def _extract_actions(self, text: str) -> List[str]:
        """Extract actionable items"""
        actions = []
        action_keywords = ['should', 'must', 'need to', 'recommend', 'action', 'step']

        for line in text.split('\n'):
            if any(keyword in line.lower() for keyword in action_keywords):
                action = line.strip('- *•').strip()
                if action and len(action) > 10:
                    actions.append(action)

        return actions[:8]

    def _identify_next_steps(self, text: str) -> List[str]:
        """Identify next steps"""
        next_steps = []

        # Look for "next steps" section
        in_next_steps = False
        for line in text.split('\n'):
            lower_line = line.lower()
            if 'next step' in lower_line or 'next action' in lower_line:
                in_next_steps = True
                continue

            if in_next_steps and line.strip().startswith(('-', '*', '•')):
                step = line.strip('- *•').strip()
                if step:
                    next_steps.append(step)

            if in_next_steps and line.strip() and not line.startswith(('-', '*', '•', ' ')):
                in_next_steps = False

        return next_steps[:5]

    def _assess_completeness(self, context: Dict[str, Any]) -> float:
        """Assess completeness of the synthesis"""
        expected_agents = [AgentType.PLANNER, AgentType.RESEARCHER, AgentType.ANALYZER]
        present_agents = [agent for agent in expected_agents if agent in context]

        return len(present_agents) / len(expected_agents)
