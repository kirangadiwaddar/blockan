"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export const SHORTCUTS = [
  { key: "c",   label: "Create issue",       description: "Open create issue sheet" },
  { key: "b",   label: "Board",              description: "Go to current project board" },
  { key: "k",   label: "Backlog",            description: "Go to project backlog" },
  { key: "s",   label: "Sprints",            description: "Go to project sprints" },
  { key: "t",   label: "Timeline",           description: "Go to project timeline" },
  { key: "r",   label: "Reports",            description: "Go to project reports" },
  { key: "d",   label: "Dashboard",          description: "Go to dashboard" },
  { key: "p",   label: "Projects",           description: "Go to projects list" },
  { key: "/",   label: "Search",             description: "Open command palette" },
  { key: "?",   label: "Shortcuts",          description: "Show keyboard shortcuts" },
];

export function useKeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();

  // Extract current project slug from URL e.g. /projects/my-project/board → my-project
  const projectSlug = pathname.match(/\/projects\/([^\/]+)/)?.[1] ?? null;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable;
      if (isInput || e.metaKey || e.ctrlKey || e.altKey) return;

      const slug = projectSlug;

      switch (e.key) {
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
        case "d":
          e.preventDefault();
          router.push("/dashboard");
          break;
        case "p":
          e.preventDefault();
          router.push("/projects");
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
    return () => window.removeEventListener("keydown", handler);
  }, [router, projectSlug]);
}
