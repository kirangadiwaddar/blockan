"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useProjects } from "@/lib/projects-context";
import { useIssues } from "@/lib/issues-context";
import { Issue } from "@/lib/types";
import AppSidebar from "@/components/shadcn-space/blocks/dashboard/app-sidebar";
import { IssueDetailSheet } from "@/components/issue/issue-detail-sheet";
import { Card, CardHeader, CardTitle, CardAction, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tooltip } from "@/components/ui/tooltip";
import { Bug, BookOpen, CheckSquare, Zap, ChevronLeft, ChevronRight, SquareStack } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { NotFoundBlock } from "@/components/ui/not-found-block";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

/* ─── helpers ───────────────────────────────────────────────── */

const typeIcon: Record<string, React.ElementType> = {
  Bug: Bug, Story: BookOpen, Task: CheckSquare, Epic: Zap,
};
const typeColor: Record<string, string> = {
  Bug: "text-red-500", Story: "text-blue-500", Task: "text-green-500", Epic: "text-purple-500",
};
const statusColor: Record<string, string> = {
  "Todo":        "bg-muted-foreground/30 border-muted-foreground/40",
  "In Progress": "bg-blue-500/20 border-blue-500/40",
  "Reviewing":   "bg-purple-500/20 border-purple-500/40",
  "Completed":   "bg-green-500/20 border-green-500/40",
};
const statusBar: Record<string, string> = {
  "Todo":        "bg-muted-foreground/50",
  "In Progress": "bg-blue-500",
  "Reviewing":   "bg-purple-500",
  "Completed":   "bg-green-500",
};

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
function fmtDay(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function fmtMonth(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

const COL_W = 36; // px per day

/* ─── Page ────────────────────────────────────────────────── */

export default function TimelinePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = React.use(params);
  const { projects, sprintsForProject, projectBySlug, loading: projectsLoading } = useProjects();
  const { issues: allCtxIssues, updateIssue: ctxUpdateIssue, loading: issuesLoading } = useIssues();

  const project   = projectBySlug(projectId) ?? projects[0];
  const sprints   = sprintsForProject(project?.id ?? projectId);
  const issueList = allCtxIssues.filter((i) => i.projectId === project?.id);

  // Keep local state only for the detail sheet (no local issue copy)
  const [, forceRender] = useState(0); // unused but keeps hook count stable
  const [detailIssue, setDetailIssue] = useState<Issue | null>(null);
  const [detailOpen, setDetailOpen]   = useState(false);
  const [viewOffset, setViewOffset]   = useState(0); // week offset

  const updateIssue = ctxUpdateIssue;
  const openDetail = (issue: Issue) => { setDetailIssue(issue); setDetailOpen(true); };

  if (!project && (projectsLoading || issuesLoading)) {
    return (
      <AppSidebar>
        <div className="flex flex-col gap-4 p-6 w-full">
          <div className="flex items-center gap-3">
            <Skeleton className="size-7 rounded-lg" />
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="rounded-2xl border overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b">
              <Skeleton className="h-5 w-32" />
              <div className="ml-auto flex gap-2">
                <Skeleton className="size-8 rounded-md" />
                <Skeleton className="size-8 rounded-md" />
              </div>
            </div>
            <div className="p-4 flex flex-col gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-2">
                  <Skeleton className="h-4 w-28" />
                  <div className="flex-1">
                    <Skeleton
                      className="h-7 rounded-lg"
                      style={{ width: `${30 + Math.random() * 40}%`, marginLeft: `${Math.random() * 30}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AppSidebar>
    );
  }

  if (!project) {
    return (
      <AppSidebar>
        <NotFoundBlock />
      </AppSidebar>
    );
  }

  // Determine date range: earliest createdAt to latest dueDate or endDate
  const allDates = [
    ...issueList.map((i) => i.createdAt),
    ...issueList.map((i) => i.dueDate).filter(Boolean) as string[],
    ...sprints.map((s) => s.startDate),
    ...sprints.map((s) => s.endDate),
  ].map((d) => new Date(d));

  const minDate = allDates.length
    ? new Date(Math.min(...allDates.map((d) => d.getTime())))
    : new Date();
  const maxDate = allDates.length
    ? new Date(Math.max(...allDates.map((d) => d.getTime())))
    : addDays(new Date(), 14);

  // View window: 28 days
  const VIEW_DAYS = 28;
  const viewStart = addDays(minDate, viewOffset * 7);
  const viewEnd   = addDays(viewStart, VIEW_DAYS);
  const totalDays = VIEW_DAYS;

  // Generate day headers
  const days: Date[] = [];
  for (let i = 0; i < totalDays; i++) days.push(addDays(viewStart, i));

  // Group days into weeks for month labels
  const monthGroups: { label: string; days: number }[] = [];
  let lastMonth = "";
  let count = 0;
  days.forEach((d) => {
    const m = fmtMonth(d);
    if (m !== lastMonth) {
      if (count > 0) monthGroups.push({ label: lastMonth, days: count });
      lastMonth = m; count = 1;
    } else { count++; }
  });
  if (count > 0) monthGroups.push({ label: lastMonth, days: count });

  const today = new Date();
  const todayOffset = daysBetween(viewStart, today);

  function barStyle(start: Date, end: Date) {
    const s = Math.max(0, daysBetween(viewStart, start));
    const e = Math.min(totalDays, daysBetween(viewStart, end) + 1);
    if (e <= s) return null;
    return { left: s * COL_W, width: (e - s) * COL_W - 4 };
  }

  return (
    <AppSidebar>
      <div className="flex flex-col gap-5 p-6 overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={`avatar-orb ${project.color} size-7 rounded-full`} />
            <h1 className="text-xl font-semibold">{project.name} — Timeline</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setViewOffset((v) => v - 1)} className="cursor-pointer">
              <ChevronLeft size={14} />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[160px] text-center">
              {fmtDay(viewStart)} – {fmtDay(addDays(viewEnd, -1))}
            </span>
            <Button variant="outline" size="sm" onClick={() => setViewOffset((v) => v + 1)} className="cursor-pointer">
              <ChevronRight size={14} />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setViewOffset(0)} className="cursor-pointer text-xs">
              Today
            </Button>
            <Link
              href={`/projects/${project.id}/board`}
              className={buttonVariants({ variant: "outline", size: "sm", className: "cursor-pointer" })}
            >
              <SquareStack size={14} /> Board
            </Link>
          </div>
        </div>

        {/* ── Gantt ── */}
        <Card className="rounded-2xl overflow-hidden">
          <ScrollArea className="w-full group/timeline">
            <div className="min-w-max">
              {/* Month row */}
              <div className="flex border-b bg-muted/30">
                <div className="w-56 shrink-0 border-r px-4 py-2 text-xs font-medium text-muted-foreground">Issue</div>
                <div className="flex">
                  {monthGroups.map((mg, i) => (
                    <div
                      key={i}
                      className="border-r last:border-r-0 px-2 py-2 text-xs font-medium text-muted-foreground"
                      style={{ width: mg.days * COL_W }}
                    >
                      {mg.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Day headers */}
              <div className="flex border-b bg-muted/20">
                <div className="w-56 shrink-0 border-r" />
                <div className="flex">
                  {days.map((d, i) => {
                    const isToday = daysBetween(d, today) === 0;
                    return (
                      <div
                        key={i}
                        className={cn(
                          "border-r last:border-r-0 flex flex-col items-center justify-center py-1 text-xs",
                          isToday ? "bg-blue-500/10 text-blue-500 font-semibold" : "text-muted-foreground"
                        )}
                        style={{ width: COL_W }}
                      >
                        {i === 0 || d.getDate() === 1 || i % 7 === 0 ? d.getDate() : ""}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sprint rows */}
              {sprints.map((sprint) => {
                const start = new Date(sprint.startDate);
                const end   = new Date(sprint.endDate);
                const style = barStyle(start, end);
                return (
                  <div key={sprint.id} className="flex border-b bg-muted/10 hover:bg-muted/20 transition-colors">
                    <div className="w-56 shrink-0 border-r px-4 py-2.5 flex items-center gap-2">
                      <Badge variant="outline" className="text-xs font-normal py-0">Sprint</Badge>
                      <span className="text-xs font-medium truncate">{sprint.name}</span>
                    </div>
                    <div className="relative flex-1" style={{ height: 36 }}>
                      {style && (
                        <div
                          className="absolute top-1/2 -translate-y-1/2 h-5 rounded-md bg-blue-500/20 border border-blue-500/40 flex items-center px-2"
                          style={{ left: style.left, width: style.width }}
                        >
                          <span className="text-xs text-blue-600 font-medium truncate">{sprint.name}</span>
                        </div>
                      )}
                      {/* Today line */}
                      {todayOffset >= 0 && todayOffset < totalDays && (
                        <div
                          className="absolute top-0 bottom-0 w-px bg-blue-500/50"
                          style={{ left: todayOffset * COL_W }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Issue rows */}
              {issueList.map((issue) => {
                const TypeIcon = typeIcon[issue.type] ?? CheckSquare;
                const start = new Date(issue.createdAt);
                const end   = issue.dueDate ? new Date(issue.dueDate) : addDays(start, 3);
                const style = barStyle(start, end);
                const barCls = statusBar[issue.status] ?? "bg-muted-foreground/50";

                return (
                  <div
                    key={issue.id}
                    className="flex border-b last:border-b-0 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => openDetail(issue)}
                  >
                    <div className="w-56 shrink-0 border-r px-4 py-2.5 flex items-center gap-2">
                      <TypeIcon size={12} className={cn("shrink-0", typeColor[issue.type])} />
                      <span className="text-xs font-mono text-muted-foreground shrink-0">{issue.code}</span>
                      <span className="text-xs truncate">{issue.title}</span>
                    </div>
                    <div className="relative flex-1" style={{ height: 36 }}>
                      {style && (
                        <div
                          className={cn("absolute top-1/2 -translate-y-1/2 h-4 rounded-full opacity-80", barCls)}
                          style={{ left: style.left, width: style.width }}
                        />
                      )}
                      {todayOffset >= 0 && todayOffset < totalDays && (
                        <div
                          className="absolute top-0 bottom-0 w-px bg-blue-500/50"
                          style={{ left: todayOffset * COL_W }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" className="opacity-0 group-hover/timeline:opacity-100 transition-opacity duration-200" />
          </ScrollArea>
        </Card>

        {/* ── Empty state ── */}
        {issueList.length === 0 && sprints.length === 0 && (
          <EmptyState
            icon={SquareStack}
            title="Nothing to show yet"
            description="Create issues and sprints to see them on the timeline."
            actions={[{ label: "Go to backlog", href: `/projects/${project.id}/backlog`, variant: "outline" }]}
          />
        )}

        {/* ── Legend ── */}
        <div className="flex items-center gap-4 flex-wrap">
          {Object.entries(statusBar).map(([label, cls]) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={cn("inline-block size-2.5 rounded-full", cls)} />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-px h-3 bg-blue-500/50" />
            <span className="text-xs text-muted-foreground">Today</span>
          </div>
        </div>
      </div>

      <IssueDetailSheet
        issue={detailIssue}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdate={updateIssue}
      />
    </AppSidebar>
  );
}
