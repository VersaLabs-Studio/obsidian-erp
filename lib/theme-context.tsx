// lib/theme-context.tsx
// Obsidian ERP v4.0 - Global Theme Context with Dark Mode Support

"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  /** Current theme setting */
  theme: Theme;
  /** Resolved theme (light or dark based on system preference if theme is 'system') */
  resolvedTheme: "light" | "dark";
  /** Set the theme */
  setTheme: (theme: Theme) => void;
  /** Toggle between light and dark */
  toggleTheme: () => void;
  /** Whether dark mode is active */
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = "obsidian-erp-theme";

interface ThemeProviderProps {
  children: React.ReactNode;
  /** Default theme if no preference is stored */
  defaultTheme?: Theme;
  /** Force a specific theme (ignores user preference) */
  forcedTheme?: "light" | "dark";
}

/**
 * ThemeProvider - Global theme context for dark/light mode
 *
 * @example
 * ```tsx
 * // In layout.tsx
 * <ThemeProvider defaultTheme="system">
 *   {children}
 * </ThemeProvider>
 *
 * // In any component
 * const { theme, toggleTheme, isDark } = useTheme();
 * ```
 */
export function ThemeProvider({
  children,
  defaultTheme = "system",
  forcedTheme,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Initialize from localStorage on first render
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
      return stored || defaultTheme;
    }
    return defaultTheme;
  });

  const [mounted, setMounted] = useState(false);

  // Get system preference
  const getSystemTheme = useCallback((): "light" | "dark" => {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }, []);

  // Resolve the actual theme
  const resolveTheme = useCallback(
    (t: Theme): "light" | "dark" => {
      if (forcedTheme) return forcedTheme;
      if (t === "system") return getSystemTheme();
      return t;
    },
    [forcedTheme, getSystemTheme]
  );

  // Get current resolved theme
  const resolvedTheme = resolveTheme(theme);

  // Apply theme to document
  const applyTheme = useCallback((resolved: "light" | "dark") => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;

    // Add transitioning class for smooth animation
    root.classList.add("transitioning");

    // Apply theme classes
    root.classList.remove("light", "dark");
    root.classList.add(resolved);
    // Also set data attribute for more specific styling
    root.setAttribute("data-theme", resolved);

    // Remove transitioning class after animation completes
    setTimeout(() => {
      root.classList.remove("transitioning");
    }, 200);
  }, []);

  // Initialize theme on mount
  useEffect(() => {
    applyTheme(resolvedTheme);
    setMounted(true);
  }, []);

  // Apply theme whenever it changes
  useEffect(() => {
    if (mounted) {
      applyTheme(resolvedTheme);
    }
  }, [resolvedTheme, mounted, applyTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const resolved = getSystemTheme();
      applyTheme(resolved);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, getSystemTheme, applyTheme]);

  // Set theme
  const setTheme = useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme);
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, newTheme);
      }
      const resolved = resolveTheme(newTheme);
      applyTheme(resolved);
    },
    [resolveTheme, applyTheme]
  );

  // Toggle between light and dark
  const toggleTheme = useCallback(() => {
    const newTheme = resolvedTheme === "light" ? "dark" : "light";
    setTheme(newTheme);
  }, [resolvedTheme, setTheme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme,
        toggleTheme,
        isDark: resolvedTheme === "dark",
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * useTheme - Hook to access theme context
 *
 * @example
 * ```tsx
 * const { isDark, toggleTheme } = useTheme();
 *
 * <Button onClick={toggleTheme}>
 *   {isDark ? <Sun /> : <Moon />}
 * </Button>
 * ```
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

export default ThemeProvider;
