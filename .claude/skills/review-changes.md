---
name: review-changes
description: Use when asked to review changes in this repository. Focus on bugs, regressions, API contract drift, retrieval and citation breakage, generated-file mistakes, missing validation, and repo-specific risks rather than style commentary.
disable-model-invocation: true
---

# Review Changes

Use this skill for code review or self-review passes.

## First read

- `@CLAUDE.md`
- `@.claude/skills/references/review-checklist.md`

## Review priorities

1. User-visible regressions
2. API contract drift and missing `openapi.yaml` updates
3. Retrieval grounding and citation integrity
4. Broken validation assumptions, especially placeholder `npm test` scripts
5. Generated artifact edits in `client/build/` or `server/dist/`
6. Infra changes without narrow validation

## Output style

- Lead with findings ordered by severity.
- Include file references when possible.
- State explicitly if no findings were found.
- Mention remaining risk or validation gaps after the findings.
