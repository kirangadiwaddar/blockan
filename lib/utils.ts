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
