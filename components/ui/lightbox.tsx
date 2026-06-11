"use client";

import * as React from "react";
import { X, ZoomIn, ZoomOut, RotateCw, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface LightboxProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

export function Lightbox({ src, alt, onClose }: LightboxProps) {
  const [scale, setScale] = React.useState(1);
  const [rotation, setRotation] = React.useState(0);

  // Close on Escape
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") setScale((s) => Math.min(s + 0.25, 4));
      if (e.key === "-") setScale((s) => Math.max(s - 0.25, 0.25));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent body scroll
  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = src;
    a.download = alt || "image";
    a.click();
  };

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/85 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Toolbar */}
      <div
        className="absolute top-4 right-4 flex items-center gap-1 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <ToolbarBtn title="Zoom in" onClick={() => setScale((s) => Math.min(s + 0.25, 4))}>
          <ZoomIn size={16} />
        </ToolbarBtn>
        <ToolbarBtn title="Zoom out" onClick={() => setScale((s) => Math.max(s - 0.25, 0.25))}>
          <ZoomOut size={16} />
        </ToolbarBtn>
        <ToolbarBtn title="Rotate" onClick={() => setRotation((r) => r + 90)}>
          <RotateCw size={16} />
        </ToolbarBtn>
        <ToolbarBtn title="Download" onClick={handleDownload}>
          <Download size={16} />
        </ToolbarBtn>
        <div className="w-px h-5 bg-white/20 mx-1" />
        <ToolbarBtn title="Close (Esc)" onClick={onClose}>
          <X size={16} />
        </ToolbarBtn>
      </div>

      {/* Scale indicator */}
      {scale !== 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 text-white text-xs font-mono">
          {Math.round(scale * 100)}%
        </div>
      )}

      {/* Image */}
      <div
        className="max-w-[90vw] max-h-[90vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt ?? "image"}
          draggable={false}
          className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl select-none transition-transform duration-200"
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg)`,
            cursor: scale > 1 ? "grab" : "default",
          }}
        />
      </div>

      {/* Alt text caption */}
      {alt && alt !== "image" && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-black/60 text-white/80 text-xs max-w-sm truncate">
          {alt}
        </div>
      )}
    </div>
  );
}

function ToolbarBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title?: string }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="size-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
    >
      {children}
    </button>
  );
}

/* ─── Hook: wire lightbox to any img elements in a container ── */
export function useLightbox(containerRef: React.RefObject<HTMLElement | null>) {
  const [lightbox, setLightbox] = React.useState<{ src: string; alt?: string } | null>(null);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "IMG") {
        const img = target as HTMLImageElement;
        setLightbox({ src: img.src, alt: img.alt });
      }
    };
    el.addEventListener("click", handler);
    return () => el.removeEventListener("click", handler);
  }, [containerRef]);

  const close = () => setLightbox(null);

  return { lightbox, close };
}
