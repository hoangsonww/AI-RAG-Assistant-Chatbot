"""
Executor Agent - Executes specific actions or commands
"""

from typing import Dict, Any, List
from datetime import datetime
from ..core.state import PipelineState, AgentType, AgentStatus, update_agent_state
from .base import BaseAgent


class ExecutorAgent(BaseAgent):
    """
    Executor Agent executes specific actions or commands.

    It takes validated plans and synthesis and executes concrete actions,
    such as API calls, file operations, or other system interactions.
    """

    def __init__(self, llm: Any, config: Dict[str, Any] = None, tools=None):
        super().__init__(AgentType.EXECUTOR, llm, config, tools)

    def _get_role_description(self) -> str:
        return """execute specific actions and commands based on validated plans,
including API calls, file operations, and system interactions"""

    async def execute(self, state: PipelineState) -> PipelineState:
        """
        Execute planned actions

        Args:
            state: Current pipeline state

        Returns:
            Updated state with execution results
        """
        self._log_execution_start(state)

        try:
            # Get context from previous agents
            context = self._get_context_from_previous_agents(state)

            # Get actions to execute
            actions = self._identify_actions(context)

            if not actions:
                self.logger.info("No actions to execute")
                state["intermediate_results"]["execution"] = {
                    "status": "skipped",
                    "reason": "No actions identified"
                }
                update_agent_state(
                    state,
                    self.agent_id,
                    self.agent_type,
                    AgentStatus.SKIPPED
                )
                return state

            # Execute actions
            execution_results = await self._execute_actions(actions, state)

            # Structure results
            execution = {
                "actions_executed": len(execution_results),
                "results": execution_results,
                "success_rate": self._calculate_success_rate(execution_results),
                "timestamp": datetime.utcnow().isoformat()
            }

            # Update state
            state["intermediate_results"]["execution"] = execution

            # Add message
            self._add_message(
                state,
                f"Executed {len(execution_results)} actions with {execution['success_rate']:.1%} success rate",
                metadata={"execution": execution}
            )

            # Update agent state
            update_agent_state(
                state,
                self.agent_id,
                self.agent_type,
                AgentStatus.COMPLETED,
                output_data={"execution": execution}
            )

            self._log_execution_end(state, success=True)

        except Exception as e:
            self.logger.error(f"Executor agent failed: {str(e)}")
            state["errors"].append({
                "agent": self.agent_type.value,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            })
            self._log_execution_end(state, success=False, error=str(e))

        return state

    def _identify_actions(self, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Identify actions to execute from context"""
        actions = []

        # Get actions from synthesis
        synthesis = context.get(AgentType.SYNTHESIZER, {}).get("synthesis", {})
        actionable_items = synthesis.get("actionable_items", [])

        for item in actionable_items:
            action = self._parse_action(item)
            if action:
                actions.append(action)

        # Get actions from validation suggestions
        validation = context.get(AgentType.VALIDATOR, {}).get("validation", {})
        for suggestion in validation.get("suggestions", []):
            action = self._parse_action(suggestion)
            if action:
                actions.append(action)

        return actions

    def _parse_action(self, action_text: str) -> Dict[str, Any]:
        """Parse an action description into structured format"""
        # Simple parsing - can be enhanced with NLP
        action_type = "general"

        if "api" in action_text.lower() or "call" in action_text.lower():
            action_type = "api_call"
        elif "file" in action_text.lower() or "save" in action_text.lower():
            action_type = "file_operation"
        elif "query" in action_text.lower() or "search" in action_text.lower():
            action_type = "query"

        return {
            "type": action_type,
            "description": action_text,
            "status": "pending"
        }

    async def _execute_actions(self, actions: List[Dict[str, Any]], state: PipelineState) -> List[Dict[str, Any]]:
        """Execute all identified actions"""
        results = []

        for action in actions:
            try:
                result = await self._execute_single_action(action, state)
                results.append(result)
            except Exception as e:
                self.logger.error(f"Action execution failed: {str(e)}")
                results.append({
                    "action": action["description"],
                    "status": "failed",
                    "error": str(e),
                    "timestamp": datetime.utcnow().isoformat()
                })

        return results

    async def _execute_single_action(self, action: Dict[str, Any], state: PipelineState) -> Dict[str, Any]:
        """Execute a single action"""
        action_type = action["type"]

        # Route to appropriate execution method
        if action_type == "api_call":
            result = await self._execute_api_call(action)
        elif action_type == "file_operation":
            result = await self._execute_file_operation(action)
        elif action_type == "query":
            result = await self._execute_query(action)
        else:
            result = await self._execute_general_action(action)

        return {
            "action": action["description"],
            "type": action_type,
            "status": "completed",
            "result": result,
            "timestamp": datetime.utcnow().isoformat()
        }

    async def _execute_api_call(self, action: Dict[str, Any]) -> str:
        """Execute an API call"""
        # Placeholder - implement actual API calls based on your needs
        self.logger.info(f"Executing API call: {action['description']}")
        return "API call simulated successfully"

    async def _execute_file_operation(self, action: Dict[str, Any]) -> str:
        """Execute a file operation"""
        # Placeholder - implement actual file operations
        self.logger.info(f"Executing file operation: {action['description']}")
        return "File operation simulated successfully"

    async def _execute_query(self, action: Dict[str, Any]) -> str:
        """Execute a query"""
        # Use tools if available
        if self.tools:
            for tool in self.tools:
                try:
                    if hasattr(tool, "ainvoke"):
                        result = await tool.ainvoke({"query": action["description"]})
                        return str(result)
                except Exception as e:
                    self.logger.warning(f"Tool execution failed: {str(e)}")

        return "Query executed successfully"

    async def _execute_general_action(self, action: Dict[str, Any]) -> str:
        """Execute a general action"""
        self.logger.info(f"Executing general action: {action['description']}")
        return "Action executed successfully"

    def _calculate_success_rate(self, results: List[Dict[str, Any]]) -> float:
        """Calculate success rate of executed actions"""
        if not results:
            return 0.0

        successful = sum(1 for r in results if r.get("status") == "completed")
        return successful / len(results)
