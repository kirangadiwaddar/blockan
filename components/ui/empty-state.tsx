"use client";

import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";

interface Action {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "default" | "outline" | "ghost";
}

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
  actions?: Action[];
  className?: string;
  iconColor?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actions,
  className,
  iconColor = "text-muted-foreground/40",
}: Props) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-5 py-16 px-4 text-center", className)}>
      <div className="size-16 rounded-2xl bg-muted/50 border border-border/40 flex items-center justify-center">
        <Icon size={28} className={iconColor} strokeWidth={1.5} />
      </div>
      <div className="flex flex-col gap-1.5 max-w-xs">
        <p className="text-sm font-medium">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>
      {actions && actions.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {actions.map((action) =>
            action.href ? (
              <Link
                key={action.label}
                href={action.href}
                className={buttonVariants({ variant: action.variant ?? "default", size: "sm", className: "cursor-pointer" })}
              >
                {action.label}
              </Link>
            ) : (
              <button
                key={action.label}
                onClick={action.onClick}
                className={buttonVariants({ variant: action.variant ?? "default", size: "sm", className: "cursor-pointer" })}
              >
                {action.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
