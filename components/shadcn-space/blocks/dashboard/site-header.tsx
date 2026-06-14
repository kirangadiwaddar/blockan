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
        {/* Header band */}
        <div className="bg-gradient-to-br from-muted/60 to-muted/20 flex flex-col items-center pt-8 pb-6 px-8 gap-3">
          <div className="size-[72px] rounded-2xl shadow-lg overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon-192.png" alt="Blockan" className="size-full object-contain" />
          </div>
          <div className="text-center">
            <h2 className="text-base font-semibold tracking-tight">Install Blockan</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Project management, offline-ready</p>
          </div>
        </div>

        {/* Features */}
        <div className="px-6 py-4 flex flex-col gap-2.5">
          {[
            { icon: "⚡", label: "Launches instantly from your taskbar" },
            { icon: "📶", label: "Works offline — no internet needed" },
            { icon: "🖥️", label: "Dedicated window, no browser tabs" },
          ].map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-base leading-none">{icon}</span>
              <span className="text-sm text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex flex-col gap-2">
          <button
            onClick={install}
            className="w-full flex items-center justify-center gap-2 h-10 bg-foreground text-background rounded-xl text-sm font-semibold hover:opacity-85 transition-opacity cursor-pointer"
          >
            <Download size={14} />
            Install app
          </button>
          <button
            onClick={onClose}
            className="w-full h-9 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
          >
            Not now
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
