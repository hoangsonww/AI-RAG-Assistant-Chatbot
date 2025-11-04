"""
Validator Agent - Validates results and ensures quality
"""

from typing import Dict, Any, List
from datetime import datetime
from ..core.state import PipelineState, AgentType, AgentStatus, update_agent_state
from .base import BaseAgent


class ValidatorAgent(BaseAgent):
    """
    Validator Agent validates results and ensures quality standards.

    It checks outputs from other agents for accuracy, completeness,
    and adherence to quality standards.
    """

    def __init__(self, llm: Any, config: Dict[str, Any] = None, tools=None):
        super().__init__(AgentType.VALIDATOR, llm, config, tools)

    def _get_role_description(self) -> str:
        return """validate results, ensure quality standards, check for accuracy and
completeness, and identify any issues or improvements needed"""

    async def execute(self, state: PipelineState) -> PipelineState:
        """
        Validate all previous agent outputs

        Args:
            state: Current pipeline state

        Returns:
            Updated state with validation results
        """
        self._log_execution_start(state)

        try:
            # Get context from all previous agents
            context = self._get_context_from_previous_agents(state)

            # Build validation prompt
            prompt = self._build_validation_prompt(state, context)

            # Perform validation
            validation_response = await self._invoke_llm(prompt)

            # Structure validation results
            validation = self._structure_validation(validation_response, context)

            # Update state
            state["intermediate_results"]["validation"] = validation

            # Determine if validation passed
            passed = validation["overall_score"] >= self.config.get("min_score", 0.7)

            # Add message
            self._add_message(
                state,
                f"Validation {'passed' if passed else 'failed'}: Score {validation['overall_score']:.2f}",
                metadata={"validation": validation}
            )

            # Update agent state
            update_agent_state(
                state,
                self.agent_id,
                self.agent_type,
                AgentStatus.COMPLETED,
                output_data={"validation": validation}
            )

            # If validation failed and retries available, mark for retry
            if not passed and state["retry_count"] < state["config"].get("max_retries", 3):
                state["retry_count"] += 1
                state["intermediate_results"]["needs_retry"] = True

            self._log_execution_end(state, success=True)

        except Exception as e:
            self.logger.error(f"Validator agent failed: {str(e)}")
            state["errors"].append({
                "agent": self.agent_type.value,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            })
            self._log_execution_end(state, success=False, error=str(e))

        return state

    def _build_validation_prompt(self, state: PipelineState, context: Dict[str, Any]) -> str:
        """Build the validation prompt"""
        synthesis = context.get(AgentType.SYNTHESIZER, {}).get("synthesis", {})

        return f"""
Task: {state['task']}

SYNTHESIS TO VALIDATE:
{synthesis.get('full_synthesis', 'Not available')}

Validate the synthesis against the following criteria:

1. **Accuracy**: Is the information correct and well-supported?
2. **Completeness**: Does it address all aspects of the task?
3. **Coherence**: Is it logically structured and easy to understand?
4. **Relevance**: Is all information relevant to the task?
5. **Quality**: Does it meet professional standards?

For each criterion, provide:
- Score (0-1)
- Assessment
- Issues found (if any)
- Suggestions for improvement

Also identify:
- Critical errors that must be fixed
- Minor issues that could be improved
- Strengths and positive aspects

Provide your validation in a structured format with clear scores and feedback.
"""

    def _structure_validation(self, validation_response: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Structure the validation results"""
        criteria_scores = self._extract_criteria_scores(validation_response)
        issues = self._extract_issues(validation_response)
        suggestions = self._extract_suggestions(validation_response)

        overall_score = sum(criteria_scores.values()) / len(criteria_scores) if criteria_scores else 0.5

        return {
            "overall_score": overall_score,
            "criteria_scores": criteria_scores,
            "issues": issues,
            "suggestions": suggestions,
            "critical_errors": [issue for issue in issues if issue.get("severity") == "critical"],
            "passed": overall_score >= 0.7,
            "full_validation": validation_response,
            "timestamp": datetime.utcnow().isoformat(),
            "validated_components": list(context.keys())
        }

    def _extract_criteria_scores(self, text: str) -> Dict[str, float]:
        """Extract scores for each validation criterion"""
        import re

        criteria = ["accuracy", "completeness", "coherence", "relevance", "quality"]
        scores = {}

        for criterion in criteria:
            # Look for patterns like "Accuracy: 0.8" or "Accuracy - 8/10"
            pattern = rf"{criterion}[:\-\s]+(\d+\.?\d*)"
            match = re.search(pattern, text, re.IGNORECASE)

            if match:
                score = float(match.group(1))
                # Normalize to 0-1 if it looks like it's out of 10
                if score > 1:
                    score = score / 10
                scores[criterion] = min(score, 1.0)
            else:
                # Default score if not found
                scores[criterion] = 0.7

        return scores

    def _extract_issues(self, text: str) -> List[Dict[str, Any]]:
        """Extract issues from validation"""
        issues = []
        issue_keywords = ["error", "issue", "problem", "concern", "missing", "incorrect"]

        for line in text.split('\n'):
            lower_line = line.lower()
            if any(keyword in lower_line for keyword in issue_keywords):
                # Determine severity
                severity = "critical" if "critical" in lower_line or "error" in lower_line else "minor"

                issue = {
                    "description": line.strip('- *•').strip(),
                    "severity": severity,
                    "timestamp": datetime.utcnow().isoformat()
                }
                issues.append(issue)

        return issues[:10]  # Limit to 10 issues

    def _extract_suggestions(self, text: str) -> List[str]:
        """Extract improvement suggestions"""
        suggestions = []
        suggestion_keywords = ["suggest", "recommend", "improve", "could", "should consider"]

        for line in text.split('\n'):
            lower_line = line.lower()
            if any(keyword in lower_line for keyword in suggestion_keywords):
                suggestion = line.strip('- *•').strip()
                if suggestion and len(suggestion) > 15:
                    suggestions.append(suggestion)

        return suggestions[:8]
