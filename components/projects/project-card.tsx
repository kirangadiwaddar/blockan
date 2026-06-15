"use client";

import { Project } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";
import { Trash2, Pencil, MoreHorizontal, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function ProjectCard({ project, onDelete, onEdit }: { project: Project; onDelete?: () => void; onEdit?: () => void }) {
  const base = `/projects/${project.id}`;
  const router = useRouter();

  return (
    <div
      className="group flex flex-col rounded-2xl border border-border bg-card shadow-xs hover:border-primary/30 transition-colors duration-200 overflow-hidden cursor-pointer"
      onClick={() => router.push(`${base}/board`)}
    >
      {/* Body */}
      <div className="flex flex-col gap-4 p-5">

        {/* Row 1: icon left, key + menu right */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <div className="relative shrink-0" style={{ width: 44, height: 44 }}>
              <svg className="absolute inset-0 rotate-0" width="44" height="44" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="19" fill="none" stroke="currentColor" strokeWidth="3" className="text-border" />
                <circle
                  cx="22" cy="22" r="19" fill="none"
                  stroke="currentColor" strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 19}`}
                  strokeDashoffset={`${2 * Math.PI * 19 * (1 - project.progress / 100)}`}
                  className="text-emerald-500 transition-all duration-500"
                />
              </svg>
              <div className={`avatar-orb ${project.color} rounded-full absolute`} style={{ inset: 7 }} />
            </div>
            <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">{project.progress}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-[10px] font-mono font-medium text-muted-foreground">
              {project.code}
            </span>
            {onDelete && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      className="p-1.5 rounded-md hover:bg-muted cursor-pointer transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal size={16} className="text-muted-foreground" />
                    </button>
                  }
                />
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="cursor-pointer gap-2 text-xs"
                    onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
                  >
                    <Pencil size={13} /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    className="cursor-pointer gap-2 text-xs"
                    onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
                  >
                    <Trash2 size={13} /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Name + description */}
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold leading-snug truncate">{project.name}</p>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {project.description || "No description"}
          </p>
        </div>

      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-border/60 bg-muted/20">
        <div className="flex items-center gap-2">
          {(() => {
            const assignees = (project as any).assignedMembers ?? [];
            return assignees.length > 0 ? (
              <AvatarGroup>
                {assignees.slice(0, 4).map((m: any) => (
                  <Avatar key={m.id} className="size-6 ring-2 ring-background dark:ring-card">
                    <AvatarImage src={m.avatar} alt={m.name} />
                    <AvatarFallback className="text-[9px]" colorSeed={m.id}>{m.initials}</AvatarFallback>
                  </Avatar>
                ))}
                {assignees.length > 4 && (
                  <AvatarGroupCount className="size-6 text-[9px]">+{assignees.length - 4}</AvatarGroupCount>
                )}
              </AvatarGroup>
            ) : null;
          })()}
          <span className="text-[11px] font-medium text-foreground">{project.openIssues} open</span>
        </div>

        <Link
          href={`${base}/board`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border bg-background text-[11px] font-medium text-foreground hover:bg-muted transition-colors"
        >
          Board <ArrowRight size={11} />
        </Link>
      </div>
    </div>
  );
}
