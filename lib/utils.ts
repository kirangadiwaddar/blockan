import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function progressColor(value: number): string {
  if (value <= 25) return "bg-red-500";
  if (value <= 50) return "bg-orange-500";
  if (value <= 75) return "bg-violet-500";
  return "bg-emerald-500";
}

/** A column "dot" is either a Tailwind `bg-*` class or a raw CSS color like "#f43f5e".
 *  Custom colors (from the color input) can't be Tailwind classes, so render them inline. */
export function isCustomColor(dot: string): boolean {
  return !!dot && (dot.startsWith("#") || dot.startsWith("rgb") || dot.startsWith("hsl"));
}

/** Always returns a 2-character uppercase avatar initial.
 *  "Ratan G" → "RG", "Ratan" → "RA", "ratan.g@x.com" → "RG". */
export function getInitials(nameOrEmail?: string | null): string {
  if (!nameOrEmail) return "?";
  let s = nameOrEmail.trim();
  if (!s) return "?";
  if (s.includes("@")) s = s.split("@")[0];            // use the part before @ for emails
  const words = s.split(/[\s._-]+/).filter(Boolean);   // split on space, dot, underscore, hyphen
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return (words[0] ?? s).slice(0, 2).toUpperCase();     // single token → first two letters
}
