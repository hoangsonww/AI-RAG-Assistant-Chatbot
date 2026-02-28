# Backend Validation

## Primary command

Run from `server/`:

```bash
npm run build
```

## Validate adjacent artifacts

- Update `openapi.yaml` when endpoint contracts change.
- Check frontend callers if payload shapes or route paths changed.
- Check knowledge and chat behavior separately when backend changes touch RAG-adjacent code.

## Important caveat

`server/package.json` defines `npm test` as a placeholder success script. Do not treat it as meaningful validation.
