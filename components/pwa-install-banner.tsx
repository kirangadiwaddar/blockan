"use client";

import { useEffect, useState } from "react";
import { X, Download, Share } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PWAInstallBanner() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Already installed — never show
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    // Dismissed this session
    if (sessionStorage.getItem("pwa-banner-dismissed")) return;

    // iOS / iPadOS Safari (including Mac Safari with touch)
    const ua = navigator.userAgent;
    const ios =
      /iphone|ipad|ipod/i.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (ios) {
      const isSafari =
        /safari/i.test(ua) && !/crios|fxios|opios|chrome/i.test(ua);
      if (isSafari) {
        setIsIOS(true);
        setShow(true);
      }
      return;
    }

    // Chrome / Edge / Samsung Browser — capture install prompt
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
    <>
      {/* ── Mobile / Tablet — full-width bottom bar ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[9999] md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-3 mb-3 bg-popover border border-border rounded-2xl shadow-2xl px-4 py-3.5 flex items-center gap-3">
          <div className="size-10 rounded-xl bg-white border border-border flex items-center justify-center shrink-0 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon-192.png" alt="Blockan" className="size-8 object-contain" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight">Install Blockan</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-tight">
              {isIOS ? 'Tap Share → "Add to Home Screen"' : "Install for the best experience"}
            </p>
          </div>

          {isIOS ? (
            <Share size={18} className="shrink-0 text-muted-foreground" />
          ) : (
            <button
              onClick={install}
              className="shrink-0 flex items-center gap-1.5 bg-foreground text-background text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer"
            >
              <Download size={12} />
              Install
            </button>
          )}

          <button
            onClick={dismiss}
            className="shrink-0 size-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* ── Desktop — bottom-right toast ── */}
      <div className="fixed bottom-6 right-6 z-[9999] hidden md:block w-80">
        <div className="bg-popover border border-border rounded-2xl shadow-2xl p-4 flex items-start gap-3">
          <div className="size-12 rounded-xl bg-white border border-border flex items-center justify-center shrink-0 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon-192.png" alt="Blockan" className="size-10 object-contain" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight">Install Blockan</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
              {isIOS
                ? 'In Safari: File → "Add to Dock" to install'
                : "Get the full app experience — works offline, opens instantly"}
            </p>
            {!isIOS && (
              <button
                onClick={install}
                className="mt-2.5 w-full flex items-center justify-center gap-1.5 bg-foreground text-background text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
              >
                <Download size={13} />
                Install app
              </button>
            )}
          </div>

          <button
            onClick={dismiss}
            className="shrink-0 size-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-pointer mt-0.5"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </>
  );
}
