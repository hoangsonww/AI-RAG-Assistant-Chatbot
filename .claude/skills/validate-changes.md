---
name: validate-changes
description: Use when you need a repo-specific validation workflow after edits. Choose the narrowest meaningful checks for frontend, backend, retrieval, Python, or infrastructure work instead of defaulting to placeholder test scripts.
disable-model-invocation: true
---

# Validate Changes

Use this skill to choose the right validation commands for the touched surface.

## Validation matrix

- `@.claude/skills/references/validation-matrix.md`

## Workflow

1. Map changed files to one or more surfaces.
2. Run the narrowest meaningful validations for those surfaces.
3. Do not treat placeholder `npm test` scripts as useful evidence.
4. If runtime checks need external services or secrets, say what was not verified.
5. Report validation results separately from implementation summary.
