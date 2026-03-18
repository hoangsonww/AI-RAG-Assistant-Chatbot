---
paths:
  - "client/src/components/**/*.tsx"
  - "client/src/pages/**/*.tsx"
---

# React Component Rules

- Use functional components with hooks; avoid class components.
- Keep component files focused: one primary exported component per file.
- Use MUI's `sx` prop or `styled()` for component styling; do not introduce new CSS-in-JS libraries.
- Preserve Framer Motion animations on the landing page and chat surfaces — do not strip them.
- Keep markdown, math (KaTeX), and citation rendering intact in `ChatArea.tsx`.
- Use `React.memo()` on expensive list items and frequently re-rendered components.
- Destructure props in the function signature for clarity.
