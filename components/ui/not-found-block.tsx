"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft, SearchX } from "lucide-react";

interface Props {
  title?: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
}

export function NotFoundBlock({
  title = "Project not found",
  description = "This project doesn't exist or you don't have access to it.",
  backHref = "/projects",
  backLabel = "All projects",
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-8 py-24 px-4 text-center w-full">
      {/* Illustration */}
      <div className="relative">
        <div className="size-28 rounded-3xl bg-muted/60 flex items-center justify-center ring-1 ring-border/40">
          <SearchX size={44} className="text-muted-foreground/50" strokeWidth={1.5} />
        </div>
        <div className="absolute -top-2 -right-2 size-8 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
          <span className="text-xs font-bold text-destructive">404</span>
        </div>
      </div>

      {/* Text */}
      <div className="flex flex-col gap-2 max-w-sm">
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap justify-center">
        <Link
          href={backHref}
          className={buttonVariants({ className: "cursor-pointer gap-2" })}
        >
          <ArrowLeft size={14} />
          {backLabel}
        </Link>
        <Link
          href="/dashboard"
          className={buttonVariants({ variant: "outline", className: "cursor-pointer" })}
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
