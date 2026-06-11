"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function useKeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable;
      if (isInput || e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case "b":
          e.preventDefault();
          router.push("/projects/ph/board");
          break;
        case "k":
          e.preventDefault();
          router.push("/projects/ph/backlog");
          break;
        case "s":
          e.preventDefault();
          router.push("/projects/ph/sprints");
          break;
        case "t":
          e.preventDefault();
          router.push("/projects/ph/timeline");
          break;
        case "r":
          e.preventDefault();
          router.push("/projects/ph/reports");
          break;
        case "d":
          e.preventDefault();
          router.push("/dashboard");
          break;
        case "p":
          e.preventDefault();
          router.push("/projects");
          break;
        case "c":
          e.preventDefault();
          // Dispatch event for command palette to open CreateIssueSheet
          window.dispatchEvent(new CustomEvent("blockan:create-issue"));
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router]);
}
