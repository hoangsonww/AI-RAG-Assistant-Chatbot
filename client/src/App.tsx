import React, { useState } from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import LandingPage from "./pages/LandingPage";
import NotFoundPage from "./pages/NotFoundPage";
import TermsPage from "./pages/Terms";
import Passkeys from "./pages/Passkeys";
import { ThemeProvider } from "@mui/material/styles";
import { lightTheme, darkTheme } from "./theme";
import { Analytics } from "@vercel/analytics/react";

/**
 * The main App component
 *
 * @constructor The App component
 */
const App: React.FC = () => {
  // Initialize dark mode from local storage; default to false if not set.
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : false;
  });

  /**
   * Toggle the theme mode
   */
  const toggleThemeMode = () => {
    setDarkMode((prev) => {
      const newMode = !prev;
      localStorage.setItem("darkMode", JSON.stringify(newMode));
      return newMode;
    });
  };

  return (
    <ThemeProvider theme={darkMode ? darkTheme : lightTheme}>
      <Routes>
        <Route
          path="/chat"
          element={<Home onToggleTheme={toggleThemeMode} darkMode={darkMode} />}
        />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/" element={<LandingPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/passkeys" element={<Passkeys />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Analytics />
    </ThemeProvider>
  );
};

export default App;
