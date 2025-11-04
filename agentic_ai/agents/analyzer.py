"""
Analyzer Agent - Analyzes data and extracts insights
"""

from typing import Dict, Any
from datetime import datetime
from ..core.state import PipelineState, AgentType, AgentStatus, update_agent_state
from .base import BaseAgent


class AnalyzerAgent(BaseAgent):
    """
    Analyzer Agent analyzes data and extracts meaningful insights.

    It processes information from the researcher and other agents,
    identifies patterns, and draws conclusions.
    """

    def __init__(self, llm: Any, config: Dict[str, Any] = None, tools=None):
        super().__init__(AgentType.ANALYZER, llm, config, tools)

    def _get_role_description(self) -> str:
        return """analyze data, identify patterns, extract insights, and draw meaningful
conclusions from the gathered information"""

    async def execute(self, state: PipelineState) -> PipelineState:
        """
        Analyze gathered information

        Args:
            state: Current pipeline state

        Returns:
            Updated state with analysis results
        """
        self._log_execution_start(state)

        try:
            # Get context from previous agents
            context = self._get_context_from_previous_agents(state)

            # Build analysis prompt
            prompt = self._build_analysis_prompt(state, context)

            # Perform analysis
            analysis_response = await self._invoke_llm(prompt)

            # Structure analysis
            analysis = self._structure_analysis(analysis_response)

            # Update state
            state["intermediate_results"]["analysis"] = analysis

            # Add message
            self._add_message(
                state,
                f"Analysis completed: {len(analysis.get('insights', []))} insights identified",
                metadata={"analysis": analysis}
            )

            # Update agent state
            update_agent_state(
                state,
                self.agent_id,
                self.agent_type,
                AgentStatus.COMPLETED,
                output_data={"analysis": analysis}
            )

            self._log_execution_end(state, success=True)

        except Exception as e:
            self.logger.error(f"Analyzer agent failed: {str(e)}")
            state["errors"].append({
                "agent": self.agent_type.value,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            })
            self._log_execution_end(state, success=False, error=str(e))

        return state

    def _build_analysis_prompt(self, state: PipelineState, context: Dict[str, Any]) -> str:
        """Build the analysis prompt"""
        research_findings = context.get(AgentType.RESEARCHER, {}).get("findings", {})

        return f"""
Task: {state['task']}

Research Findings:
{research_findings.get('full_research', 'No research available')}

Analyze the research findings and provide:

1. **Key Insights**: What are the most important findings?
2. **Patterns**: What patterns or trends do you observe?
3. **Implications**: What do these findings mean for the task?
4. **Gaps**: What information is missing or unclear?
5. **Recommendations**: What actions or next steps are suggested?

Provide a thorough analysis with:
- Clear categorization of insights
- Evidence-based reasoning
- Actionable recommendations
- Confidence levels for each insight
"""

    def _structure_analysis(self, analysis_response: str) -> Dict[str, Any]:
        """Structure the analysis results"""
        sections = self._extract_sections(analysis_response)

        return {
            "insights": self._extract_insights(analysis_response),
            "patterns": sections.get("patterns", []),
            "implications": sections.get("implications", []),
            "gaps": sections.get("gaps", []),
            "recommendations": sections.get("recommendations", []),
            "full_analysis": analysis_response,
            "timestamp": datetime.utcnow().isoformat(),
            "confidence_score": self._calculate_confidence(analysis_response)
        }

    def _extract_sections(self, text: str) -> Dict[str, list]:
        """Extract different sections from the analysis"""
        sections = {
            "patterns": [],
            "implications": [],
            "gaps": [],
            "recommendations": []
        }

        current_section = None
        for line in text.split('\n'):
            line = line.strip()
            if not line:
                continue

            # Detect section headers
            lower_line = line.lower()
            if 'pattern' in lower_line and ':' in line:
                current_section = 'patterns'
            elif 'implication' in lower_line and ':' in line:
                current_section = 'implications'
            elif 'gap' in lower_line and ':' in line:
                current_section = 'gaps'
            elif 'recommendation' in lower_line and ':' in line:
                current_section = 'recommendations'
            elif line.startswith(('-', '*', '•')) and current_section:
                sections[current_section].append(line.strip('- *•').strip())

        return sections

    def _extract_insights(self, text: str) -> list:
        """Extract key insights from the analysis"""
        insights = []
        for line in text.split('\n'):
            if line.strip().startswith(('-', '*', '•')):
                insight = line.strip('- *•').strip()
                if len(insight) > 20:  # Filter out very short lines
                    insights.append(insight)

        return insights[:15]  # Return top 15 insights

    def _calculate_confidence(self, analysis: str) -> float:
        """Calculate confidence score for the analysis"""
        # Heuristic based on analysis completeness
        score = 0.5

        # Check for structured sections
        if any(keyword in analysis.lower() for keyword in ['insight', 'pattern', 'recommendation']):
            score += 0.2

        # Check for evidence markers
        if any(marker in analysis for marker in ['evidence', 'data shows', 'according to']):
            score += 0.15

        # Check for quantitative information
        import re
        if re.search(r'\d+%|\d+\.\d+', analysis):
            score += 0.15

        return min(score, 1.0)
