"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { IssuesProvider } from "@/lib/issues-context";
import { CommentsProvider } from "@/lib/comments-context";
import { UserProvider } from "@/lib/supabase/user-context";
import { ProjectsProvider } from "@/lib/projects-context";
import { RefreshNeededProvider } from "@/lib/refresh-context";

type Theme = "light" | "dark";

export type AccentColor = {
  id: string;
  label: string;
  swatch: string;             // Tailwind bg class for the swatch preview
  primary: string;            // oklch value for --primary in light mode
  primaryFg: string;          // oklch value for --primary-foreground
  ring: string;               // oklch value for --ring
};

export const ACCENT_COLORS: AccentColor[] = [
  { id: "zinc",   label: "Default",  swatch: "bg-zinc-900 dark:bg-zinc-100", primary: "oklch(0.205 0 0)",      primaryFg: "oklch(0.985 0 0)", ring: "oklch(0.205 0 0)" },
  { id: "blue",   label: "Blue",     swatch: "bg-blue-600",  primary: "oklch(0.546 0.245 262.881)", primaryFg: "oklch(0.985 0 0)", ring: "oklch(0.546 0.245 262.881)" },
  { id: "violet", label: "Violet",   swatch: "bg-violet-600",primary: "oklch(0.558 0.288 302.3)",   primaryFg: "oklch(0.985 0 0)", ring: "oklch(0.558 0.288 302.3)" },
  { id: "rose",   label: "Rose",     swatch: "bg-rose-600",  primary: "oklch(0.596 0.232 16.053)",  primaryFg: "oklch(0.985 0 0)", ring: "oklch(0.596 0.232 16.053)" },
  { id: "orange", label: "Orange",   swatch: "bg-orange-500",primary: "oklch(0.646 0.222 41.116)",  primaryFg: "oklch(0.985 0 0)", ring: "oklch(0.646 0.222 41.116)" },
  { id: "green",  label: "Green",    swatch: "bg-emerald-600",primary:"oklch(0.527 0.154 162.487)", primaryFg: "oklch(0.985 0 0)", ring: "oklch(0.527 0.154 162.487)" },
  { id: "indigo", label: "Indigo",   swatch: "bg-indigo-600",primary: "oklch(0.511 0.262 276.966)", primaryFg: "oklch(0.985 0 0)", ring: "oklch(0.511 0.262 276.966)" },
  { id: "teal",   label: "Teal",     swatch: "bg-teal-600",  primary: "oklch(0.533 0.126 185.842)", primaryFg: "oklch(0.985 0 0)", ring: "oklch(0.533 0.126 185.842)" },
];

function applyAccent(color: AccentColor) {
  const r = document.documentElement;
  r.style.setProperty("--primary", color.primary);
  r.style.setProperty("--primary-foreground", color.primaryFg);
  r.style.setProperty("--ring", color.ring);
}

const ThemeCtx = createContext<{
  theme: Theme;
  toggle: () => void;
  accentId: string;
  setAccent: (id: string) => void;
}>({
  theme: "light",
  toggle: () => {},
  accentId: "zinc",
  setAccent: () => {},
});

export function useTheme() {
  return useContext(ThemeCtx);
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [accentId, setAccentId] = useState("zinc");

  useEffect(() => {
    // The layout's inline <script> already applied dark class + CSS vars before
    // hydration, so we only need to sync React state here — no DOM writes needed.
    const stored = localStorage.getItem("theme") as Theme | null;
    const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    setTheme(stored ?? preferred);

    const storedAccent = localStorage.getItem("accentColor") ?? "zinc";
    setAccentId(ACCENT_COLORS.find((c) => c.id === storedAccent)?.id ?? "zinc");
  }, []);

  const toggle = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("theme", next);
      document.documentElement.classList.toggle("dark", next === "dark");
      return next;
    });
  };

  const setAccent = useCallback((id: string) => {
    const accent = ACCENT_COLORS.find((c) => c.id === id) ?? ACCENT_COLORS[0];
    setAccentId(accent.id);
    applyAccent(accent);
    localStorage.setItem("accentColor", accent.id);
  }, []);

  return (
    <ThemeCtx.Provider value={{ theme, toggle, accentId, setAccent }}>
      <RefreshNeededProvider>
        <UserProvider>
          <ProjectsProvider>
            <IssuesProvider>
              <CommentsProvider>{children}</CommentsProvider>
            </IssuesProvider>
          </ProjectsProvider>
        </UserProvider>
      </RefreshNeededProvider>
    </ThemeCtx.Provider>
  );
}
