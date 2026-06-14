"use client";

import { useTheme } from "@/components/providers";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { ShortcutsDialog } from "@/components/shortcuts-dialog";
import { SearchIcon, Moon, Sun } from "lucide-react";
import { CommandPalette } from "@/components/search/command-palette";

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="rounded-full p-2 hover:bg-accent transition-colors cursor-pointer"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

export function SiteHeader() {
  return (
    <>
      <CommandPalette />
      <ShortcutsDialog />

      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="hidden md:flex -ml-1 h-8 w-8 cursor-pointer" />

          <button
            onClick={() => {
              const event = new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true });
              document.dispatchEvent(event);
            }}
            className="flex items-center gap-2 h-9 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer w-48 sm:w-64"
          >
            <SearchIcon size={14} />
            <span className="flex-1 text-left">Search…</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 text-xs">
              ⌘K
            </kbd>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <NotificationBell />
        </div>
      </div>
    </>
  );
}
