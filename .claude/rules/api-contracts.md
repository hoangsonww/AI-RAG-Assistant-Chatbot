---
paths:
  - "server/src/routes/**/*.ts"
  - "openapi.yaml"
  - "client/src/services/api.ts"
---

# API Contract Rules

- Update `openapi.yaml` whenever endpoint request or response shapes change.
- Keep route handlers thin: delegate business logic to service modules.
- Maintain backward compatibility unless the task explicitly introduces a breaking change.
- Coordinate frontend `api.ts` changes when backend routes change payloads or paths.
- Use consistent error response shapes: `{ error: string, details?: object }`.
