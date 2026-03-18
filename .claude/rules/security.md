---
paths:
  - "server/src/middleware/**"
  - "server/src/routes/auth.ts"
  - "mcp_server/middleware/**"
---

# Security Rules

- Never log secrets, API keys, tokens, or passwords — even at DEBUG level.
- Keep JWT validation in middleware; do not scatter token checks into route handlers.
- Sanitize all user input before passing to database queries or AI model prompts.
- Use `bcrypt` for password hashing; do not roll custom hashing.
- Rate limiting must remain enabled in production MCP server configuration.
- API key authentication for the MCP server must be enforced via `MCP_API_KEY` in production.
