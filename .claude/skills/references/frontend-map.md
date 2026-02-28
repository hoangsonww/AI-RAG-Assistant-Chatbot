# Frontend Map

## Route-level surfaces

- `client/src/App.tsx`: route wiring.
- `client/src/pages/LandingPage.tsx`: marketing surface, motion, branded storytelling.
- `client/src/pages/Home.tsx`: main chat shell.
- `client/src/pages/Login.tsx`, `Signup.tsx`, `ForgotPassword.tsx`: auth flows.
- `client/src/pages/Terms.tsx`: legal copy.

## Shared components

- `client/src/components/ChatArea.tsx`: chat transcript rendering, markdown, citations, math.
- `client/src/components/Sidebar.tsx`: conversation navigation.
- `client/src/components/Navbar.tsx`: top-level navigation.

## Shared services and styling

- `client/src/services/api.ts`: API calls and payload wiring.
- `client/src/theme.ts`: MUI theme.
- `client/src/globals.css`, `client/src/index.css`, `client/src/styles/`: global styling.

## Frontend-specific reminders

- Preserve responsive behavior on both chat and landing surfaces.
- Chat rendering changes should be checked for markdown and citation regressions.
