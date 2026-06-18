"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

export const SHORTCUTS = [
  { keys: ["C"],      label: "Create issue",         description: "Open create issue sheet" },
  { keys: ["⌘", "K"], label: "Command palette",      description: "Open command palette" },
  { keys: ["?"],      label: "Shortcuts",             description: "Show keyboard shortcuts" },
  { keys: ["Esc"],    label: "Close",                 description: "Close sheet / dialog" },
  { keys: ["G", "D"], label: "Dashboard",             description: "Go to dashboard" },
  { keys: ["G", "P"], label: "Projects",              description: "Go to projects list" },
  { keys: ["G", "T"], label: "Team",                  description: "Go to team" },
  { keys: ["G", "S"], label: "Settings",              description: "Go to settings" },
  { keys: ["B"],      label: "Board",                 description: "Go to current project board" },
  { keys: ["K"],      label: "Backlog",               description: "Go to project backlog" },
  { keys: ["S"],      label: "Sprints",               description: "Go to project sprints" },
  { keys: ["T"],      label: "Timeline",              description: "Go to project timeline" },
  { keys: ["R"],      label: "Reports",               description: "Go to project reports" },
];

export function useKeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();
  const gPendingRef = useRef(false);
  const gTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const projectSlug = pathname.match(/\/projects\/([^/]+)/)?.[1] ?? null;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable;

      // ⌘K / Ctrl+K — command palette (allowed even with modifier)
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("blockan:open-palette"));
        return;
      }

      if (isInput || e.metaKey || e.ctrlKey || e.altKey) return;

      // G-chord: wait for second key after G
      if (gPendingRef.current) {
        gPendingRef.current = false;
        if (gTimerRef.current) clearTimeout(gTimerRef.current);

        switch (e.key.toLowerCase()) {
          case "d": e.preventDefault(); router.push("/dashboard"); return;
          case "p": e.preventDefault(); router.push("/projects");  return;
          case "t": e.preventDefault(); router.push("/team");      return;
          case "s": e.preventDefault(); router.push("/settings");  return;
        }
        // unrecognised second key — fall through to normal handling
      }

      const slug = projectSlug;

      switch (e.key) {
        case "g":
        case "G":
          // Start G-chord, cancel after 1s if no second key
          gPendingRef.current = true;
          gTimerRef.current = setTimeout(() => { gPendingRef.current = false; }, 1000);
          break;
        case "b":
          if (!slug) break;
          e.preventDefault();
          router.push(`/projects/${slug}/board`);
          break;
        case "k":
          if (!slug) break;
          e.preventDefault();
          router.push(`/projects/${slug}/backlog`);
          break;
        case "s":
          if (!slug) break;
          e.preventDefault();
          router.push(`/projects/${slug}/sprints`);
          break;
        case "t":
          if (!slug) break;
          e.preventDefault();
          router.push(`/projects/${slug}/timeline`);
          break;
        case "r":
          if (!slug) break;
          e.preventDefault();
          router.push(`/projects/${slug}/reports`);
          break;
        case "/":
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("blockan:open-palette"));
          break;
        case "?":
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("blockan:show-shortcuts"));
          break;
        case "c":
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("blockan:create-issue"));
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      if (gTimerRef.current) clearTimeout(gTimerRef.current);
    };
  }, [router, projectSlug]);
}
