# Review Checklist

## High-priority risk areas

1. Frontend or backend contract drift not reflected in both sides.
2. Missing `openapi.yaml` updates for API changes.
3. Retrieval regressions that break grounded answers or inline citations.
4. Edits to generated output directories instead of source files.
5. Validation claims based only on placeholder `npm test` scripts.
6. Infra changes without matching validation or doc updates.

## File hotspots

- `client/src/components/ChatArea.tsx`
- `client/src/services/api.ts`
- `server/src/routes/chat.ts`
- `server/src/services/knowledgeBase.ts`
- `server/src/scripts/knowledgeCli.ts`
- `agentic_ai/mcp_server/server.py`
- `openapi.yaml`
