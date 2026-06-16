# Lumina Frontend 🚗

![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![MUI](https://img.shields.io/badge/MUI-%230081CB.svg?style=for-the-badge&logo=mui&logoColor=white)

This directory contains the **client** side of the **Lumina** project – a sleek, responsive React application that serves as the user interface for David Nguyen's Personal AI Assistant. The frontend allows users to interact with the AI, manage their conversation history, authenticate, and enjoy a modern, animated experience.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Technologies Used](#technologies-used)
- [User Interface](#user-interface)
- [Setup & Installation](#setup--installation)
  - [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

The Lumina frontend is built with **React** and **TypeScript** and styled using **Material‑UI (MUI)**. It provides a dynamic, modern user interface featuring:

- A responsive design adaptable to all screen sizes
- Smooth animations and theme toggling (dark/light mode)
- A collapsible sidebar for easy access to conversation history
- Dedicated pages for login, signup, and password reset

The frontend seamlessly integrates with the backend to provide functionalities such as user authentication, conversation management, and AI chat interactions.

---

## Key Features

- **AI Chat Interface:** Interact with an intelligent assistant that answers questions about David Nguyen and various topics.
- **3D Landing Hero:** A fully procedural WebGL background (Three.js + React Three Fiber) renders a noise-displaced, iridescent fresnel-shaded "core," an additive glow halo, a ~6,000-point GPU particle starfield, orbiting knowledge-node accents, and glow rings — all geometry and GLSL generated in code with no binary assets. It is theme-aware, reacts to mouse parallax and scroll, scales across mobile/tablet/desktop tiers, respects `prefers-reduced-motion`, falls back gracefully when WebGL is unavailable, and is lazy-loaded into its own chunk. The same scene is reused as the ambient backdrop on the auth pages.
- **User Authentication:** Sign up, log in, and manage your account with JWT-based authentication.
- **Passkey (WebAuthn) Sign-in:** Passwordless login with Touch ID, Face ID, Windows Hello, or a phone via QR. Supports discoverable (usernameless) credentials, an optional post-signup enrollment prompt, and a `/passkeys` management page for adding, naming, and revoking credentials. Email + password remains as a fallback.
- **Branded Auth Experience:** Login, signup, password reset, passkeys, and terms pages share a cohesive glassmorphism layout (`AuthShell`) built over the 3D backdrop, are fully theme-aware (light/dark), and use proper `<form>` semantics with autocomplete hints. Signup includes a live password-strength meter, a real-time "passwords match" indicator, and an enhanced post-signup passkey enrollment dialog; forgot-password walks through a 2-step recovery indicator.
- **Toast Notifications:** Global `ToastProvider` surfaces success and error messages from auth/passkey flows instead of relying on `alert()`.
- **Conversation History:** Save, retrieve, rename, and search your past interactions (available for authenticated users). The signed-in conversation list is cached in `localStorage` and rendered instantly on reload (stale-while-revalidate), so the sidebar spinner only appears when nothing is cached; the cache is cleared on logout.
- **Auto-Generated Titles:** AI automatically generates concise titles for conversations based on the first message.
- **Theme Toggle:** Switch between dark and light modes, with your preference stored locally.
- **Responsive Design:** Enjoy a fully optimized experience on mobile, tablet, and desktop devices.

---

## Technologies Used

- **Vite** – lightning-fast build tool and dev server
- **React** with **TypeScript** – for building the user interface
- **Material‑UI (MUI)** – for modern, responsive UI components
- **Three.js** & **@react-three/fiber** – for the procedural WebGL landing hero and ambient auth backdrop
- **React Router** – for seamless navigation between pages
- **Axios** – for API communication with the backend
- **@simplewebauthn/browser** – browser-side WebAuthn helpers (`startRegistration`, `startAuthentication`) for passkey flows
- **React Markdown** – for rendering AI-generated markdown content

---

## User Interface

The client application features several distinct pages and components:

- **Landing Page:** Showcases the app’s features with animations and call-to-action buttons, set against a fixed full-viewport procedural 3D/WebGL hero scene (`pointer-events: none`, so it never blocks interaction).
- **Homepage:** The central hub for chatting with the AI, featuring a collapsible sidebar for conversation history (cached for instant reloads).
- **Authentication Pages:** Login, signup, password reset, passkeys, and terms pages share a branded glassmorphism shell (`AuthShell`) layered over the ambient 3D backdrop and adapt to dark/light themes. The login page exposes a "Sign in with passkey" action when WebAuthn is available; signup offers a password-strength meter, a live passwords-match indicator, and a one-time passkey enrollment dialog after account creation.
- **Passkeys Page (`/passkeys`):** Authenticated route for adding, naming, and revoking passkeys. Reachable via the fingerprint icon in the navbar.
- **Theme Toggle:** Easily switch between dark and light modes using the navigation bar.
- **Responsive Design:** Ensures a consistent experience across all devices.

---

## Setup & Installation

### Development Setup

1. **Navigate to the client folder:**

   ```bash
   cd client
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Run the frontend development server:**

   ```bash
   npm start
   # or
   npm run dev
   ```

   The application will start on [http://localhost:3000](http://localhost:3000).

4. **Build for production:**

   ```bash
   npm run build
   ```

   The optimized build will be in the `build/` directory.

---

## Project Structure

Below is an overview of the key directories and files within the client subdirectory:

```
client/
├── package.json              # Project configuration and dependencies
├── tsconfig.json             # TypeScript configuration
├── tsconfig.node.json        # TypeScript config for Vite
├── vite.config.ts            # Vite configuration
├── index.html                # HTML entry point (Vite serves this)
├── Dockerfile                # Docker configuration for the frontend
├── docker-compose.yml        # Docker Compose configuration for multi-container setup
└── src/
    ├── App.tsx               # Main React component
    ├── index.tsx             # Entry point of the React application
    ├── theme.ts              # Custom Material‑UI theme settings
    ├── dev/                 # Development-specific configuration and utilities
    │   ├── palette.tsx
    │   ├── previews.tsx
    │   ├── index.ts
    │   └── useInitial.ts
    ├── services/             # API service for communicating with the backend
    │   └── api.ts
    ├── types/                # Type definitions for conversations, users, etc.
    │   ├── conversation.d.ts
    │   └── user.d.ts
    ├── components/           # Reusable UI components
    │   ├── Navbar.tsx
    │   ├── Sidebar.tsx
    │   ├── ChatArea.tsx
    │   ├── three/            # Procedural WebGL scene (lazy-loaded, no binary assets)
    │   │   └── LuminaScene.tsx
    │   └── auth/             # Shared branded auth UI system
    │       ├── AuthShell.tsx           # Glass layout reusing the 3D backdrop
    │       ├── PasswordField.tsx       # Input with show/hide toggle
    │       ├── PasswordStrengthMeter.tsx
    │       └── styles.ts               # Gradient-text, brand-button, field helpers
    └── pages/                # Application pages (Landing, Home, Login, Signup, etc.)
        ├── LandingPage.tsx
        ├── Home.tsx
        ├── Login.tsx
        ├── Signup.tsx
        ├── NotFoundPage.tsx
        └── ForgotPassword.tsx
```

---

## Deployment

For production deployments, consider using services like **Vercel**, **Netlify**, or **GitHub Pages**. Update API endpoint URLs as needed to ensure smooth integration with your backend services.

---

## Contributing

1. **Fork** the repository.
2. **Create** your feature branch:

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Commit** your changes:

   ```bash
   git commit -m "Add feature: description"
   ```

4. **Push** to the branch:

   ```bash
   git push origin feature/your-feature-name
   ```

5. Open a **Pull Request** with a detailed description of your changes.

---

## License

This project is licensed under the [MIT License](../LICENSE).

---

Thank you for checking out the Lumina frontend! If you have any questions or feedback, feel free to reach out. Happy coding! 🚗
