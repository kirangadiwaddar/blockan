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
