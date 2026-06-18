"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useProjects } from "@/lib/projects-context";
import { useIssues } from "@/lib/issues-context";
import {
  Bug, BookOpen, CheckSquare, Zap,
  FolderRoot, Search, ArrowRight,
  LayoutDashboard, Users, Settings, BookText, BarChart2, Grid3x2,
  ListTree, SquareStack, CalendarDays, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Command } from "cmdk";

const typeIcon: Record<string, React.ElementType> = {
  Bug: Bug, Story: BookOpen, Task: CheckSquare, Epic: Zap,
};
const typeColor: Record<string, string> = {
  Bug: "text-red-500", Story: "text-blue-500", Task: "text-green-500", Epic: "text-purple-500",
};

const GLOBAL_NAV = [
  { label: "Dashboard",    href: "/dashboard",      icon: LayoutDashboard },
  { label: "Projects",     href: "/projects",       icon: FolderRoot      },
  { label: "Team",         href: "/team",           icon: Users           },
  { label: "Settings",     href: "/settings",       icon: Settings        },
  { label: "Documentation",href: "/docs",           icon: FileText        },
];

const PROJECT_VIEWS = [
  { label: "Board",     icon: Grid3x2,     slug: "board"    },
  { label: "Backlog",   icon: ListTree,    slug: "backlog"  },
  { label: "Sprints",   icon: SquareStack, slug: "sprints"  },
  { label: "Timeline",  icon: CalendarDays,slug: "timeline" },
  { label: "Workload",  icon: BarChart2,   slug: "workload" },
  { label: "Reports",   icon: BookText,    slug: "reports"  },
];

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
    const openFromShortcut = () => setOpen(true);
    document.addEventListener("keydown", down);
    window.addEventListener("blockan:open-palette", openFromShortcut);
    return () => {
      document.removeEventListener("keydown", down);
      window.removeEventListener("blockan:open-palette", openFromShortcut);
    };
  }, []);

  const navigate = useCallback((href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  }, [router]);

  const q = query.trim().toLowerCase();

  const filteredIssues = q
    ? issues.filter((i) =>
        i.title.toLowerCase().includes(q) || i.code.toLowerCase().includes(q)
      ).slice(0, 6)
    : [];

  const filteredProjects = q
    ? projects.filter((p) =>
        p.name.toLowerCase().includes(q) || p.key.toLowerCase().includes(q)
      )
    : projects;

  const filteredNav = GLOBAL_NAV.filter((n) =>
    !q || n.label.toLowerCase().includes(q)
  );

  // For each project, generate view links when query matches project or view name
  const projectViews = q
    ? projects.flatMap((p) =>
        PROJECT_VIEWS
          .filter((v) =>
            p.name.toLowerCase().includes(q) ||
            v.label.toLowerCase().includes(q) ||
            `${p.name} ${v.label}`.toLowerCase().includes(q)
          )
          .map((v) => ({ project: p, view: v }))
      ).slice(0, 8)
    : [];

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
              placeholder="Search issues, projects, navigate…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            <Command.Empty className="flex flex-col items-center gap-2 py-10 text-center">
              <span className="size-9 rounded-xl bg-muted/60 flex items-center justify-center mx-auto">
                <Search size={16} className="text-muted-foreground/50" />
              </span>
              <span className="text-sm font-medium">No results</span>
              <span className="text-xs text-muted-foreground">No matches for &ldquo;{query}&rdquo;</span>
            </Command.Empty>

            {/* ── No query: show global nav + all projects ── */}
            {!q && (
              <>
                <Command.Group>
                  <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Navigate
                  </div>
                  {filteredNav.map((item) => (
                    <Command.Item
                      key={item.href}
                      value={`nav-${item.href}`}
                      onSelect={() => navigate(item.href)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm cursor-pointer hover:bg-accent data-[selected=true]:bg-accent transition-colors"
                    >
                      <item.icon size={14} className="text-muted-foreground shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      <ArrowRight size={12} className="text-muted-foreground shrink-0" />
                    </Command.Item>
                  ))}
                </Command.Group>

                {projects.length > 0 && (
                  <Command.Group>
                    <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Projects
                    </div>
                    {projects.map((project) => (
                      <Command.Item
                        key={project.id}
                        value={`project-${project.id}`}
                        onSelect={() => navigate(`/projects/${project.id}/board`)}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer hover:bg-accent data-[selected=true]:bg-accent transition-colors"
                      >
                        <div className={cn("avatar-orb size-6 rounded-full shrink-0", project.color)} />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-medium truncate">{project.name}</span>
                          <span className="text-xs text-muted-foreground truncate">{project.key}</span>
                        </div>
                        <ArrowRight size={13} className="text-muted-foreground shrink-0" />
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
              </>
            )}

            {/* ── With query: show nav, projects, project views, issues ── */}
            {q && (
              <>
                {filteredNav.length > 0 && (
                  <Command.Group>
                    <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Navigate
                    </div>
                    {filteredNav.map((item) => (
                      <Command.Item
                        key={item.href}
                        value={`nav-${item.href}`}
                        onSelect={() => navigate(item.href)}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm cursor-pointer hover:bg-accent data-[selected=true]:bg-accent transition-colors"
                      >
                        <item.icon size={14} className="text-muted-foreground shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        <ArrowRight size={12} className="text-muted-foreground shrink-0" />
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

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
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-medium truncate">{project.name}</span>
                          <span className="text-xs text-muted-foreground truncate">{project.key}</span>
                        </div>
                        <ArrowRight size={13} className="text-muted-foreground shrink-0" />
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {projectViews.length > 0 && (
                  <Command.Group>
                    <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Project views
                    </div>
                    {projectViews.map(({ project, view }) => (
                      <Command.Item
                        key={`${project.id}-${view.slug}`}
                        value={`view-${project.id}-${view.slug}`}
                        onSelect={() => navigate(`/projects/${project.id}/${view.slug}`)}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm cursor-pointer hover:bg-accent data-[selected=true]:bg-accent transition-colors"
                      >
                        <view.icon size={14} className="text-muted-foreground shrink-0" />
                        <span className="flex-1 truncate">
                          <span className="text-muted-foreground">{project.name} — </span>
                          {view.label}
                        </span>
                        <ArrowRight size={12} className="text-muted-foreground shrink-0" />
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

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
                          onSelect={() => navigate(`/projects/${issue.projectId}/board?issue=${issue.id}`)}
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
              </>
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
