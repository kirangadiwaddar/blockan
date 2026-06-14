"use client";

// Server SSR renders type="text/javascript" (script executes during HTML parsing).
// Client hydration renders type="text/plain" (React skips the script-tag warning).
// suppressHydrationWarning handles the type mismatch between the two.
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
