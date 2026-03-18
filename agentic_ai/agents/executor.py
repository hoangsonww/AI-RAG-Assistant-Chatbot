"""
Executor Agent - Executes specific actions or commands

Enhanced with MCP tool integration — can use file operations, git commands,
web fetches, code search, and pipeline invocations through MCP tools.
"""

from typing import Dict, Any, List
from datetime import datetime
from ..core.state import PipelineState, AgentType, AgentStatus, update_agent_state
from .base import BaseAgent


class ExecutorAgent(BaseAgent):
    """
    Executor Agent executes specific actions or commands.

    It takes validated plans and synthesis and executes concrete actions
    using MCP tools (file I/O, git, web, code search) or LLM-based
    reasoning when no matching tool is available.
    """

    def __init__(self, llm: Any, config: Dict[str, Any] = None, tools=None):
        super().__init__(AgentType.EXECUTOR, llm, config, tools)

    def _get_role_description(self) -> str:
        return """execute specific actions and commands based on validated plans,
using available MCP tools for file operations, code search, web access,
git operations, data processing, and system interactions"""

    async def execute(self, state: PipelineState) -> PipelineState:
        self._log_execution_start(state)

        try:
            context = self._get_context_from_previous_agents(state)
            actions = self._identify_actions(context)

            if not actions:
                self.logger.info("No actions to execute")
                state["intermediate_results"]["execution"] = {
                    "status": "skipped",
                    "reason": "No actions identified"
                }
                update_agent_state(state, self.agent_id, self.agent_type, AgentStatus.SKIPPED)
                return state

            execution_results = await self._execute_actions(actions, state)

            execution = {
                "actions_executed": len(execution_results),
                "results": execution_results,
                "success_rate": self._calculate_success_rate(execution_results),
                "tools_available": len(self.tools),
                "timestamp": datetime.utcnow().isoformat()
            }

            state["intermediate_results"]["execution"] = execution

            self._add_message(
                state,
                f"Executed {len(execution_results)} actions with {execution['success_rate']:.1%} success rate "
                f"({len(self.tools)} tools available)",
                metadata={"execution": execution}
            )

            update_agent_state(
                state, self.agent_id, self.agent_type,
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
        """Identify actions to execute from context."""
        actions = []

        synthesis = context.get(AgentType.SYNTHESIZER, {}).get("synthesis", {})
        for item in synthesis.get("actionable_items", []):
            action = self._parse_action(item)
            if action:
                actions.append(action)

        validation = context.get(AgentType.VALIDATOR, {}).get("validation", {})
        for suggestion in validation.get("suggestions", []):
            action = self._parse_action(suggestion)
            if action:
                actions.append(action)

        return actions

    def _parse_action(self, action_text: str) -> Dict[str, Any]:
        """Parse an action description and match it to an MCP tool."""
        lower = action_text.lower()

        # Map action descriptions to MCP tool names
        if any(kw in lower for kw in ["read", "open", "view", "inspect"]) and any(kw in lower for kw in ["file", "document", "source"]):
            return {"type": "mcp_tool", "tool": "read_file", "description": action_text, "status": "pending"}
        elif any(kw in lower for kw in ["write", "save", "create", "output"]) and "file" in lower:
            return {"type": "mcp_tool", "tool": "write_file", "description": action_text, "status": "pending"}
        elif any(kw in lower for kw in ["search", "find", "grep"]) and "code" in lower:
            return {"type": "mcp_tool", "tool": "search_code", "description": action_text, "status": "pending"}
        elif any(kw in lower for kw in ["fetch", "download", "http", "url", "web"]):
            return {"type": "mcp_tool", "tool": "fetch_url", "description": action_text, "status": "pending"}
        elif any(kw in lower for kw in ["git", "commit", "diff", "status"]):
            return {"type": "mcp_tool", "tool": "git_status", "description": action_text, "status": "pending"}
        elif any(kw in lower for kw in ["knowledge", "rag", "knowledge base"]):
            return {"type": "mcp_tool", "tool": "search_knowledge", "description": action_text, "status": "pending"}
        elif any(kw in lower for kw in ["analyse", "analyze"]) and "file" in lower:
            return {"type": "mcp_tool", "tool": "analyze_file", "description": action_text, "status": "pending"}
        elif any(kw in lower for kw in ["csv", "data", "parse"]):
            return {"type": "mcp_tool", "tool": "parse_csv", "description": action_text, "status": "pending"}
        else:
            return {"type": "llm_action", "description": action_text, "status": "pending"}

    async def _execute_actions(self, actions: List[Dict[str, Any]], state: PipelineState) -> List[Dict[str, Any]]:
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
        if action["type"] == "mcp_tool":
            return await self._execute_mcp_tool(action, state)
        else:
            return await self._execute_llm_action(action, state)

    async def _execute_mcp_tool(self, action: Dict[str, Any], state: PipelineState) -> Dict[str, Any]:
        """Execute an action using an MCP tool adapter."""
        tool_name = action.get("tool", "")
        matching_tools = [t for t in self.tools if hasattr(t, "name") and t.name == tool_name]

        if matching_tools:
            tool = matching_tools[0]
            try:
                # Build arguments based on tool and task context
                arguments = self._build_tool_arguments(tool_name, action, state)
                if hasattr(tool, "ainvoke"):
                    result = await tool.ainvoke(arguments)
                elif hasattr(tool, "invoke"):
                    result = tool.invoke(arguments)
                else:
                    result = str(tool)

                return {
                    "action": action["description"],
                    "type": "mcp_tool",
                    "tool_used": tool_name,
                    "status": "completed",
                    "result": result if isinstance(result, dict) else str(result)[:2000],
                    "timestamp": datetime.utcnow().isoformat()
                }
            except Exception as e:
                self.logger.warning(f"MCP tool {tool_name} failed: {e}")
                return await self._execute_llm_action(action, state)

        # No matching tool — fall back to LLM-based execution
        return await self._execute_llm_action(action, state)

    def _build_tool_arguments(self, tool_name: str, action: Dict, state: PipelineState) -> Dict[str, Any]:
        """Construct tool arguments from action context."""
        desc = action["description"]

        if tool_name == "search_code":
            return {"pattern": desc[:100], "path": ".", "max_results": 20}
        elif tool_name == "read_file":
            import re
            path_match = re.search(r'[\w./\\]+\.\w+', desc)
            return {"path": path_match.group() if path_match else "."}
        elif tool_name == "fetch_url":
            import re
            url_match = re.search(r'https?://\S+', desc)
            return {"url": url_match.group() if url_match else ""}
        elif tool_name == "search_knowledge":
            return {"query": desc[:200], "top_k": 5}
        elif tool_name == "git_status":
            return {"path": "."}
        elif tool_name == "analyze_file":
            import re
            path_match = re.search(r'[\w./\\]+\.\w+', desc)
            return {"path": path_match.group() if path_match else "."}
        else:
            return {"query": state["task"]}

    async def _execute_llm_action(self, action: Dict[str, Any], state: PipelineState) -> Dict[str, Any]:
        """Execute via LLM reasoning when no tool is available."""
        prompt = f"Execute this action and describe the result:\n\nAction: {action['description']}\nTask context: {state['task']}"
        try:
            result = await self._invoke_llm(prompt)
            return {
                "action": action["description"],
                "type": "llm_action",
                "status": "completed",
                "result": result[:2000],
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            return {
                "action": action["description"],
                "type": "llm_action",
                "status": "failed",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }

    def _calculate_success_rate(self, results: List[Dict[str, Any]]) -> float:
        if not results:
            return 0.0
        successful = sum(1 for r in results if r.get("status") == "completed")
        return successful / len(results)
