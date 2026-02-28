# Agentic AI Commands

## Common commands

Run from the repository root:

```bash
python -m compileall agentic_ai
python -m agentic_ai visualize
python -m agentic_ai run --task "Summarize the current architecture"
python -m agentic_ai server --config agentic_ai/config/production_config.yaml
```

## Working notes

- `agentic_ai/__main__.py` exposes `run`, `server`, and `visualize`.
- `agentic_ai/README.md` mentions `pytest`, but do not assume test files exist in the working tree.
- Use compile-time validation first, then targeted runtime smoke checks when dependencies and credentials are present.
