import { useCallback, useEffect, useState } from "react";
import { ThemeContext } from "../contexts/ThemeContext";
const STORAGE_KEY = "gdt_theme";

// FEATURE PAUSED: light theme isn't finished/rolled out yet — the toggle UI
// is hidden (see Navbar.jsx / App.jsx toolbar) and this always forces dark,
// regardless of saved preference or OS setting. toggleTheme/setTheme below
// still work programmatically, so re-enabling later is just restoring the
// toggle buttons and the logic that was here before this feature was paused:
//
//   try {
//     const stored = localStorage.getItem(STORAGE_KEY);
//     if (stored === "light" || stored === "dark") return stored;
//   } catch {}
//   if (window.matchMedia?.("(prefers-color-scheme: light)").matches) return "light";
//   return "dark";
function getInitialTheme() {
  return "dark";
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* ignore */ }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
