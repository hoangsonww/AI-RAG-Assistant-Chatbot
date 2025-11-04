"""
Reviewer Agent - Reviews final outputs for quality assurance
"""

from typing import Dict, Any, List
from datetime import datetime
from ..core.state import PipelineState, AgentType, AgentStatus, update_agent_state
from .base import BaseAgent


class ReviewerAgent(BaseAgent):
    """
    Reviewer Agent performs final review of all outputs.

    It provides a comprehensive review of the entire pipeline execution,
    ensuring quality, completeness, and alignment with the original task.
    """

    def __init__(self, llm: Any, config: Dict[str, Any] = None, tools=None):
        super().__init__(AgentType.REVIEWER, llm, config, tools)

    def _get_role_description(self) -> str:
        return """perform comprehensive final review of all outputs, ensuring quality,
completeness, and alignment with the original task requirements"""

    async def execute(self, state: PipelineState) -> PipelineState:
        """
        Review all pipeline outputs

        Args:
            state: Current pipeline state

        Returns:
            Updated state with review results
        """
        self._log_execution_start(state)

        try:
            # Get context from all agents
            context = self._get_context_from_previous_agents(state)

            # Build review prompt
            prompt = self._build_review_prompt(state, context)

            # Perform review
            review_response = await self._invoke_llm(prompt)

            # Structure review
            review = self._structure_review(review_response, context, state)

            # Create final result
            final_result = self._create_final_result(context, review)

            # Update state
            state["intermediate_results"]["review"] = review
            state["final_result"] = final_result

            # Add message
            self._add_message(
                state,
                f"Review completed: Overall quality score {review['quality_score']:.2f}",
                metadata={"review": review}
            )

            # Update agent state
            update_agent_state(
                state,
                self.agent_id,
                self.agent_type,
                AgentStatus.COMPLETED,
                output_data={"review": review, "final_result": final_result}
            )

            self._log_execution_end(state, success=True)

        except Exception as e:
            self.logger.error(f"Reviewer agent failed: {str(e)}")
            state["errors"].append({
                "agent": self.agent_type.value,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            })
            self._log_execution_end(state, success=False, error=str(e))

        return state

    def _build_review_prompt(self, state: PipelineState, context: Dict[str, Any]) -> str:
        """Build the review prompt"""
        synthesis = context.get(AgentType.SYNTHESIZER, {}).get("synthesis", {})
        validation = context.get(AgentType.VALIDATOR, {}).get("validation", {})
        execution = context.get(AgentType.EXECUTOR, {}).get("execution", {})

        return f"""
Original Task: {state['task']}

Pipeline Execution Summary:
- Agents involved: {', '.join([str(k) for k in context.keys()])}
- Validation score: {validation.get('overall_score', 'N/A')}
- Execution success rate: {execution.get('success_rate', 'N/A')}

SYNTHESIS:
{synthesis.get('full_synthesis', 'Not available')}

VALIDATION RESULTS:
Issues: {len(validation.get('issues', []))}
Suggestions: {len(validation.get('suggestions', []))}

Perform a comprehensive final review:

1. **Task Alignment**: Does the output fully address the original task?
2. **Quality Assessment**: Is the output of high quality?
3. **Completeness**: Is anything missing or incomplete?
4. **Value Delivered**: Does this provide real value?
5. **Recommendations**: Any final recommendations?

Provide:
- Overall quality score (0-1)
- Strengths of the output
- Areas for improvement
- Final recommendations
- Whether the task was successfully completed

Be thorough but constructive in your review.
"""

    def _structure_review(self, review_response: str, context: Dict[str, Any], state: PipelineState) -> Dict[str, Any]:
        """Structure the review results"""
        quality_score = self._extract_quality_score(review_response)
        strengths = self._extract_strengths(review_response)
        improvements = self._extract_improvements(review_response)
        recommendations = self._extract_recommendations(review_response)

        return {
            "quality_score": quality_score,
            "strengths": strengths,
            "areas_for_improvement": improvements,
            "recommendations": recommendations,
            "task_completed": quality_score >= 0.7,
            "pipeline_summary": self._create_pipeline_summary(context, state),
            "full_review": review_response,
            "timestamp": datetime.utcnow().isoformat()
        }

    def _extract_quality_score(self, text: str) -> float:
        """Extract overall quality score"""
        import re

        # Look for patterns like "score: 0.8" or "8/10" or "80%"
        patterns = [
            r"quality score[:\-\s]+(\d+\.?\d*)",
            r"overall[:\-\s]+(\d+\.?\d*)",
            r"score[:\-\s]+(\d+\.?\d*)"
        ]

        for pattern in patterns:
            match = re.search(pattern, text.lower())
            if match:
                score = float(match.group(1))
                if score > 1:
                    score = score / 10
                return min(score, 1.0)

        # Default score if not found - estimate from sentiment
        positive_words = ["excellent", "good", "strong", "effective", "successful"]
        negative_words = ["poor", "weak", "insufficient", "incomplete", "failed"]

        positive_count = sum(1 for word in positive_words if word in text.lower())
        negative_count = sum(1 for word in negative_words if word in text.lower())

        if positive_count > negative_count:
            return 0.8
        elif negative_count > positive_count:
            return 0.5
        else:
            return 0.7

    def _extract_strengths(self, text: str) -> List[str]:
        """Extract identified strengths"""
        strengths = []
        in_strengths_section = False

        for line in text.split('\n'):
            lower_line = line.lower()

            if 'strength' in lower_line or 'positive' in lower_line:
                in_strengths_section = True
                continue

            if in_strengths_section and line.strip().startswith(('-', '*', '•')):
                strength = line.strip('- *•').strip()
                if strength:
                    strengths.append(strength)

            if in_strengths_section and line.strip() and not line.startswith(('-', '*', '•', ' ')):
                in_strengths_section = False

        return strengths[:8]

    def _extract_improvements(self, text: str) -> List[str]:
        """Extract areas for improvement"""
        improvements = []
        keywords = ["improve", "enhancement", "could be better", "area for improvement", "weakness"]

        for line in text.split('\n'):
            if any(keyword in line.lower() for keyword in keywords):
                improvement = line.strip('- *•').strip()
                if improvement and len(improvement) > 15:
                    improvements.append(improvement)

        return improvements[:8]

    def _extract_recommendations(self, text: str) -> List[str]:
        """Extract final recommendations"""
        recommendations = []
        in_recommendations_section = False

        for line in text.split('\n'):
            lower_line = line.lower()

            if 'recommendation' in lower_line or 'suggest' in lower_line:
                in_recommendations_section = True
                continue

            if in_recommendations_section and line.strip().startswith(('-', '*', '•')):
                recommendation = line.strip('- *•').strip()
                if recommendation:
                    recommendations.append(recommendation)

            if in_recommendations_section and line.strip() and not line.startswith(('-', '*', '•', ' ')):
                in_recommendations_section = False

        return recommendations[:6]

    def _create_pipeline_summary(self, context: Dict[str, Any], state: PipelineState) -> Dict[str, Any]:
        """Create a summary of the pipeline execution"""
        completed_agents = [
            agent_type for agent_type, data in context.items()
            if isinstance(data, dict)
        ]

        return {
            "pipeline_id": state["pipeline_id"],
            "agents_executed": len(completed_agents),
            "total_messages": len(state["messages"]),
            "errors_encountered": len(state["errors"]),
            "retry_count": state["retry_count"],
            "start_time": state["start_time"].isoformat() if isinstance(state["start_time"], datetime) else state["start_time"],
            "end_time": datetime.utcnow().isoformat(),
            "completed_agents": [str(agent) for agent in completed_agents]
        }

    def _create_final_result(self, context: Dict[str, Any], review: Dict[str, Any]) -> Dict[str, Any]:
        """Create the final result combining all outputs"""
        synthesis = context.get(AgentType.SYNTHESIZER, {}).get("synthesis", {})

        return {
            "summary": synthesis.get("summary", "Task completed"),
            "key_takeaways": synthesis.get("key_takeaways", []),
            "detailed_output": synthesis.get("full_synthesis", ""),
            "quality_score": review["quality_score"],
            "task_completed": review["task_completed"],
            "strengths": review["strengths"],
            "recommendations": review["recommendations"],
            "pipeline_summary": review["pipeline_summary"],
            "timestamp": datetime.utcnow().isoformat()
        }
