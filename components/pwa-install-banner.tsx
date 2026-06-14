"use client";

import { useEffect, useState } from "react";
import { X, Download } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PWAInstallBanner() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Don't show if already dismissed this session
    if (sessionStorage.getItem("pwa-banner-dismissed")) return;

    // Don't show if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // iOS detection
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
    if (ios) {
      // Only show on mobile Safari (not in-app browser)
      const isSafari = /safari/i.test(navigator.userAgent) && !/crios|fxios|opios/i.test(navigator.userAgent);
      if (isSafari) {
        setIsIOS(true);
        setShow(true);
      }
      return;
    }

    // Android / Chrome — listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem("pwa-banner-dismissed", "1");
    setShow(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      sessionStorage.setItem("pwa-banner-dismissed", "1");
      setShow(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] sm:hidden">
      <div className="mx-3 mb-3 bg-popover border border-border rounded-2xl shadow-2xl px-4 py-3.5 flex items-center gap-3">
        {/* App icon */}
        <div className="size-10 rounded-xl bg-foreground flex items-center justify-center shrink-0">
          <span className="text-background font-bold text-lg leading-none">B</span>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">Add Blockan to Home Screen</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-tight">
            {isIOS
              ? 'Tap Share → "Add to Home Screen"'
              : "Install for a better experience"}
          </p>
        </div>

        {/* Install button (Android only) */}
        {!isIOS && (
          <button
            onClick={install}
            className="shrink-0 flex items-center gap-1.5 bg-foreground text-background text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer"
          >
            <Download size={12} />
            Install
          </button>
        )}

        {/* Dismiss */}
        <button
          onClick={dismiss}
          className="shrink-0 size-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
