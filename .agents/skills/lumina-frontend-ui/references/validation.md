# Frontend Validation

## Primary command

Run from `client/`:

```bash
npm run build
```

## What to watch for

- Broken imports after moving shared components or page files.
- Type errors in `services/api.ts` or `types/*.d.ts` after contract changes.
- Regressions to markdown or math rendering in `ChatArea.tsx`.
- Layout regressions on both chat and landing page surfaces.

## Important caveat

`client/package.json` defines `npm test` as a placeholder success script. Do not treat it as meaningful validation.
