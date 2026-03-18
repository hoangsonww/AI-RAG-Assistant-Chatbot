---
paths:
  - "server/src/**/*.ts"
  - "client/src/**/*.{ts,tsx}"
---

# TypeScript Rules

- Use explicit return types on exported functions and public methods.
- Prefer `interface` over `type` for object shapes unless a union or intersection is needed.
- Use `readonly` on properties that should not be reassigned after initialization.
- Keep `any` usage to a minimum; prefer `unknown` with type guards.
- Import types with `import type` when the import is only used for type checking.
