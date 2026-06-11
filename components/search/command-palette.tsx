"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useProjects } from "@/lib/projects-context";
import { useIssues } from "@/lib/issues-context";
import {
  Bug, BookOpen, CheckSquare, Zap,
  FolderRoot, Search, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Command } from "cmdk";

const typeIcon: Record<string, React.ElementType> = {
  Bug: Bug, Story: BookOpen, Task: CheckSquare, Epic: Zap,
};
const typeColor: Record<string, string> = {
  Bug: "text-red-500", Story: "text-blue-500", Task: "text-green-500", Epic: "text-purple-500",
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { issues } = useIssues();
  const { projects } = useProjects();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const navigate = useCallback((href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  }, [router]);

  const filteredIssues = query.trim()
    ? issues.filter((i) =>
        i.title.toLowerCase().includes(query.toLowerCase()) ||
        i.code.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 6)
    : issues.slice(0, 5);

  const filteredProjects = query.trim()
    ? projects.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.key.toLowerCase().includes(query.toLowerCase())
      )
    : projects.slice(0, 4);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative z-10 w-full max-w-xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <Command
          className="rounded-2xl border bg-background shadow-2xl overflow-hidden"
          shouldFilter={false}
        >
          {/* Search input */}
          <div className="flex items-center gap-3 border-b px-4 py-3">
            <Search size={16} className="text-muted-foreground shrink-0" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search issues, projects…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[360px] overflow-y-auto p-2">
            <Command.Empty className="flex flex-col items-center gap-2 py-10 text-center">
              <span className="size-9 rounded-xl bg-muted/60 flex items-center justify-center mx-auto">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/50"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6M8 11h6"/></svg>
              </span>
              <span className="text-sm font-medium">No results</span>
              <span className="text-xs text-muted-foreground">No matches for &ldquo;{query}&rdquo;</span>
            </Command.Empty>

            {/* Projects */}
            {filteredProjects.length > 0 && (
              <Command.Group>
                <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Projects
                </div>
                {filteredProjects.map((project) => (
                  <Command.Item
                    key={project.id}
                    value={`project-${project.id}`}
                    onSelect={() => navigate(`/projects/${project.id}/board`)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer hover:bg-accent data-[selected=true]:bg-accent transition-colors"
                  >
                    <div className={cn("avatar-orb size-6 rounded-full shrink-0", project.color)} />
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium truncate">{project.name}</span>
                      <span className="text-xs text-muted-foreground truncate">{project.description}</span>
                    </div>
                    <ArrowRight size={13} className="text-muted-foreground shrink-0 ml-auto" />
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Issues */}
            {filteredIssues.length > 0 && (
              <Command.Group>
                <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Issues
                </div>
                {filteredIssues.map((issue) => {
                  const TypeIcon = typeIcon[issue.type] ?? CheckSquare;
                  return (
                    <Command.Item
                      key={issue.id}
                      value={`issue-${issue.id}`}
                      onSelect={() => navigate(`/projects/${issue.projectId}/board`)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer hover:bg-accent data-[selected=true]:bg-accent transition-colors"
                    >
                      <TypeIcon size={14} className={cn("shrink-0", typeColor[issue.type])} />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-medium truncate">{issue.title}</span>
                        <span className="text-xs text-muted-foreground">{issue.code} · {issue.status}</span>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{issue.priority}</span>
                    </Command.Item>
                  );
                })}
              </Command.Group>
            )}

            {/* Quick nav */}
            {!query && (
              <Command.Group>
                <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Quick Navigate
                </div>
                {[
                  { label: "All Projects", href: "/projects", icon: FolderRoot },
                  ...(projects[0] ? [
                    { label: `${projects[0].name} — Board`,   href: `/projects/${projects[0].id}/board`,   icon: CheckSquare },
                    { label: `${projects[0].name} — Sprints`, href: `/projects/${projects[0].id}/sprints`, icon: CheckSquare },
                    { label: `${projects[0].name} — Reports`, href: `/projects/${projects[0].id}/reports`, icon: CheckSquare },
                  ] : []),
                ].map((item) => (
                  <Command.Item
                    key={item.href}
                    value={`nav-${item.href}`}
                    onSelect={() => navigate(item.href)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm cursor-pointer hover:bg-accent data-[selected=true]:bg-accent transition-colors"
                  >
                    <item.icon size={14} className="text-muted-foreground shrink-0" />
                    <span>{item.label}</span>
                    <ArrowRight size={12} className="text-muted-foreground shrink-0 ml-auto" />
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>

          {/* Footer */}
          <div className="border-t px-4 py-2 flex items-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><kbd className="rounded border bg-muted px-1 py-0.5">↑↓</kbd> navigate</span>
            <span className="flex items-center gap-1"><kbd className="rounded border bg-muted px-1 py-0.5">↵</kbd> open</span>
            <span className="flex items-center gap-1"><kbd className="rounded border bg-muted px-1 py-0.5">ESC</kbd> close</span>
          </div>
        </Command>
      </div>
    </div>
  );
}
