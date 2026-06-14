"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/components/providers";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { ShortcutsDialog } from "@/components/shortcuts-dialog";
import { SearchIcon, Moon, Sun, Download } from "lucide-react";
import { CommandPalette } from "@/components/search/command-palette";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window { __pwaPrompt?: BeforeInstallPromptEvent; }
}

function useInstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (window.__pwaPrompt) { setPrompt(window.__pwaPrompt); return; }
    const handler = (e: Event) => {
      e.preventDefault();
      const p = e as BeforeInstallPromptEvent;
      window.__pwaPrompt = p;
      setPrompt(p);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  return prompt;
}

function InstallModal({ onClose }: { onClose: () => void }) {
  const prompt = useInstallPrompt();

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="bg-popover rounded-3xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden border border-border/50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border/50">
          <div className="size-10 rounded-xl overflow-hidden shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon-192.png" alt="Blockan" className="size-full object-contain" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold leading-tight">Install Blockan</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Fast, focused desktop app</p>
          </div>
        </div>

        {/* Features */}
        <div className="px-4 py-3 flex flex-col gap-1.5">
          {[
            { icon: "⚡", label: "Launches instantly from your taskbar" },
            { icon: "📶", label: "Works offline" },
            { icon: "🖥️", label: "No browser tabs or URL bar" },
          ].map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-xs leading-none">{icon}</span>
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="px-4 pb-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 h-8 rounded-lg text-xs text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer border border-border"
          >
            Not now
          </button>
          <button
            onClick={install}
            className="flex-1 flex items-center justify-center gap-1.5 h-8 bg-foreground text-background rounded-lg text-xs font-semibold hover:opacity-85 transition-opacity cursor-pointer"
          >
            <Download size={12} />
            Install
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const prompt = useInstallPrompt();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <CommandPalette />
      <ShortcutsDialog />
      {modalOpen && <InstallModal onClose={() => setModalOpen(false)} />}

      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="hidden md:flex -ml-1 h-8 w-8 cursor-pointer" />

          {/* Search bar with optional Install chip */}
          <div className="flex items-center gap-2">
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

            {/* Install chip — only shows on desktop when prompt is available */}
            {prompt && (
              <button
                onClick={() => setModalOpen(true)}
                className="hidden md:flex items-center gap-1.5 h-9 px-3 rounded-md border border-input bg-background text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer shrink-0"
              >
                <Download size={13} />
                Install
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <NotificationBell />
        </div>
      </div>
    </>
  );
}
