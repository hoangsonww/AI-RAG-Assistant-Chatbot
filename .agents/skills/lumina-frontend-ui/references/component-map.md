# Frontend Component Map

## Entry points

- `client/src/App.tsx`: route wiring.
- `client/src/index.tsx`: app bootstrap.
- `client/src/theme.ts`: MUI theme definition.

## Pages

- `client/src/pages/LandingPage.tsx`: branded marketing surface and first impression.
- `client/src/pages/Home.tsx`: authenticated chat shell.
- `client/src/pages/Login.tsx`: login flow.
- `client/src/pages/Signup.tsx`: signup flow.
- `client/src/pages/ForgotPassword.tsx`: password reset flow.
- `client/src/pages/Terms.tsx`: terms and legal copy.
- `client/src/pages/NotFoundPage.tsx`: fallback route.

## Shared chat UI

- `client/src/components/ChatArea.tsx`: assistant/user message rendering, markdown display, interaction affordances.
- `client/src/components/Sidebar.tsx`: conversation navigation.
- `client/src/components/Navbar.tsx`: top navigation and session controls.
- `client/src/components/CopyIcon.tsx`: response copy affordance.

## Client-side data layer

- `client/src/services/api.ts`: API calls and request wiring.
- `client/src/types/conversation.d.ts`: conversation shapes.
- `client/src/types/user.d.ts`: user/session types.

## Styling

- `client/src/globals.css`, `client/src/index.css`: global styles.
- `client/src/styles/`: additional style entry points.

## Working notes

- Prefer changing the narrowest owner of the behavior.
- Preserve existing motion and layout intent when editing the landing page or chat surfaces.
- Check for route, type, and API wiring fallout before moving shared props or state.
