"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useProjects } from "@/lib/projects-context";
import { useIssues } from "@/lib/issues-context";
import { Issue } from "@/lib/types";
import AppSidebar from "@/components/shadcn-space/blocks/dashboard/app-sidebar";
import { IssueDetailSheet } from "@/components/issue/issue-detail-sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NotFoundBlock } from "@/components/ui/not-found-block";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Bug, BookOpen, CheckSquare, Zap,
  ChevronLeft, ChevronRight, ChevronDown,
  SquareStack, Flag, CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── constants ─────────────────────────────────────────────── */

const TYPE_ICON: Record<string, React.ElementType> = {
  Bug: Bug, Story: BookOpen, Task: CheckSquare, Epic: Zap,
};
const TYPE_COLOR: Record<string, string> = {
  Bug: "text-red-500", Story: "text-blue-500", Task: "text-green-500", Epic: "text-purple-500",
};
const STATUS_BAR: Record<string, string> = {
  "Todo":        "bg-slate-400",
  "In Progress": "bg-blue-500",
  "Reviewing":   "bg-violet-500",
  "Completed":   "bg-emerald-500",
};
const STATUS_BG: Record<string, string> = {
  "Todo":        "bg-slate-400/10 border-slate-400/30",
  "In Progress": "bg-blue-500/10 border-blue-500/30",
  "Reviewing":   "bg-violet-500/10 border-violet-500/30",
  "Completed":   "bg-emerald-500/10 border-emerald-500/30",
};
const SPRINT_COLOR: Record<string, { bg: string; border: string; text: string }> = {
  planned:   { bg: "bg-slate-400/10",   border: "border-slate-400/30",   text: "text-slate-500" },
  active:    { bg: "bg-blue-500/15",    border: "border-blue-500/40",    text: "text-blue-600 dark:text-blue-400" },
  completed: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-600 dark:text-emerald-400" },
};

const ZOOM_LEVELS = [
  { label: "2W", days: 14, colW: 52 },
  { label: "1M", days: 31, colW: 36 },
  { label: "3M", days: 91, colW: 14 },
];

const LEFT_W  = 248; // px — label column width
const ROW_H   = 40;  // px per row
const HEAD_H1 = 32;  // month header row height
const HEAD_H2 = 28;  // day header row height

/* ── helpers ───────────────────────────────────────────────── */

function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
function fmtShort(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function alignMonday(d: Date) {
  const r = new Date(d);
  const day = r.getDay();
  r.setDate(r.getDate() - (day === 0 ? 6 : day - 1));
  return r;
}
function isWeekend(d: Date) { return d.getDay() === 0 || d.getDay() === 6; }

/* ── page ───────────────────────────────────────────────────── */

export default function TimelinePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = React.use(params);
  const { sprintsForProject, projectBySlug, loading: projectsLoading } = useProjects();
  const { issues: allCtxIssues, updateIssue: ctxUpdateIssue, loading: issuesLoading } = useIssues();

  const project   = projectBySlug(projectId);
  const sprints   = sprintsForProject(project?.id ?? projectId);
  const issueList = allCtxIssues.filter((i) => i.projectId === project?.id);

  const [detailIssue, setDetailIssue] = useState<Issue | null>(null);
  const [detailOpen, setDetailOpen]   = useState(false);
  const [viewOffset, setViewOffset]   = useState(0);
  const [zoomIdx, setZoomIdx]         = useState(1);
  const [collapsed, setCollapsed]     = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  const { days: VIEW_DAYS, colW: COL_W } = ZOOM_LEVELS[zoomIdx];

  const today = new Date(); today.setHours(0, 0, 0, 0);

  /* Compute view start */
  const allDates = [
    ...issueList.map((i) => i.createdAt),
    ...sprints.map((s) => s.startDate),
  ].map((s) => new Date(s)).filter((d) => !isNaN(d.getTime()));

  const dataStart = allDates.length
    ? new Date(Math.min(...allDates.map((d) => d.getTime())))
    : today;

  const baseStart = alignMonday(dataStart < today ? dataStart : today);
  const viewStart = addDays(baseStart, viewOffset * Math.floor(VIEW_DAYS / 2));
  const viewEnd   = addDays(viewStart, VIEW_DAYS);

  const days: Date[] = Array.from({ length: VIEW_DAYS }, (_, i) => addDays(viewStart, i));
  const todayOffset  = daysBetween(viewStart, today);
  const totalWidth   = VIEW_DAYS * COL_W;

  /* Month groups for header */
  const monthGroups: { label: string; count: number }[] = [];
  days.forEach((d) => {
    const label = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    if (!monthGroups.length || monthGroups.at(-1)!.label !== label)
      monthGroups.push({ label, count: 1 });
    else monthGroups.at(-1)!.count++;
  });

  /* Bar positioning */
  function barStyle(start: Date, end: Date) {
    const s = Math.max(0, daysBetween(viewStart, start));
    const e = Math.min(VIEW_DAYS, daysBetween(viewStart, end) + 1);
    if (e <= s) return null;
    return { left: s * COL_W, width: Math.max((e - s) * COL_W - 2, COL_W * 0.6) };
  }

  /* Group issues by sprint */
  const sprintIssueMap = new Map<string, Issue[]>();
  sprints.forEach((s) => sprintIssueMap.set(s.id, []));
  const unassigned: Issue[] = [];
  issueList.forEach((issue) => {
    if (issue.sprintId && sprintIssueMap.has(issue.sprintId))
      sprintIssueMap.get(issue.sprintId)!.push(issue);
    else unassigned.push(issue);
  });

  const toggleCollapse = (id: string) =>
    setCollapsed((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  /* Scroll to today on mount */
  useEffect(() => {
    if (!scrollRef.current || todayOffset < 0) return;
    scrollRef.current.scrollLeft = Math.max(0, todayOffset * COL_W - 180);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Loading ── */
  if (!project && (projectsLoading || issuesLoading)) {
    return (
      <AppSidebar>
        <div className="flex flex-col gap-4 p-6">
          <Skeleton className="h-8 w-60" />
          <div className="rounded-2xl border overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 border-b" style={{ height: ROW_H }}>
                <Skeleton className="h-3 w-36" />
                <Skeleton className="h-5 rounded-md" style={{ width: `${20 + (i * 7) % 40}%`, marginLeft: `${(i * 11) % 20}%` }} />
              </div>
            ))}
          </div>
        </div>
      </AppSidebar>
    );
  }
  if (!project) return <AppSidebar><NotFoundBlock /></AppSidebar>;

  /* ── Render ── */
  return (
    <AppSidebar>
      <div className="flex flex-col h-full">

        {/* ── Page header ── */}
        <div className="shrink-0 flex items-center justify-between gap-4 px-6 py-3.5 border-b bg-background flex-wrap gap-y-2">
          <div className="flex items-center gap-2.5">
            <div className={`avatar-orb ${project.color} size-6 rounded-full shrink-0`} />
            <span className="text-sm font-semibold">{project.name}</span>
            <span className="text-sm text-muted-foreground">/</span>
            <span className="text-sm text-muted-foreground">Timeline</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Zoom toggle */}
            <div className="flex items-center rounded-lg border overflow-hidden bg-muted/30 h-8">
              {ZOOM_LEVELS.map((z, i) => (
                <button
                  key={z.label}
                  onClick={() => setZoomIdx(i)}
                  className={cn(
                    "px-3 h-full text-xs font-medium transition-colors cursor-pointer",
                    i === zoomIdx
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                >
                  {z.label}
                </button>
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline" size="icon" className="size-8 cursor-pointer"
                onClick={() => setViewOffset((v) => v - 1)}
              >
                <ChevronLeft size={14} />
              </Button>
              <span className="text-xs text-muted-foreground min-w-[130px] text-center">
                {fmtShort(viewStart)} – {fmtShort(addDays(viewEnd, -1))}
              </span>
              <Button
                variant="outline" size="icon" className="size-8 cursor-pointer"
                onClick={() => setViewOffset((v) => v + 1)}
              >
                <ChevronRight size={14} />
              </Button>
            </div>

            <Button
              variant="outline" size="sm" className="h-8 cursor-pointer gap-1.5 text-xs"
              onClick={() => { setViewOffset(0); if (scrollRef.current) scrollRef.current.scrollLeft = Math.max(0, todayOffset * COL_W - 180); }}
            >
              <CalendarDays size={13} /> Today
            </Button>

            <Link
              href={`/projects/${project.id}/board`}
              className={buttonVariants({ variant: "outline", size: "sm", className: "h-8 cursor-pointer gap-1.5 text-xs" })}
            >
              <SquareStack size={13} /> Board
            </Link>
          </div>
        </div>

        {/* ── Gantt ── */}
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-auto"
        >
          <div style={{ width: Math.max(totalWidth + LEFT_W, 0), minHeight: "100%", position: "relative" }}>

            {/* ── Sticky month header ── */}
            <div
              className="flex sticky top-0 z-30 border-b"
              style={{ height: HEAD_H1 }}
            >
              {/* Corner cell */}
              <div
                className="sticky left-0 z-40 shrink-0 border-r bg-background flex items-center px-4"
                style={{ width: LEFT_W }}
              >
                <span className="text-xs font-semibold text-muted-foreground">Issue</span>
              </div>
              {/* Month labels */}
              <div className="flex bg-muted/40">
                {monthGroups.map((mg, i) => (
                  <div
                    key={i}
                    className="shrink-0 border-r last:border-0 flex items-center px-2"
                    style={{ width: mg.count * COL_W }}
                  >
                    <span className="text-xs font-semibold text-foreground/70 truncate">{mg.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Sticky day header ── */}
            <div
              className="flex sticky z-30 border-b"
              style={{ top: HEAD_H1, height: HEAD_H2 }}
            >
              {/* Corner cell */}
              <div
                className="sticky left-0 z-40 shrink-0 border-r bg-background"
                style={{ width: LEFT_W }}
              />
              {/* Day cells */}
              <div className="flex bg-muted/20">
                {days.map((d, i) => {
                  const isToday = daysBetween(d, today) === 0;
                  const weekend = isWeekend(d);
                  const isMonday = d.getDay() === 1;
                  const showNum  = COL_W >= 30 || isMonday || i === 0 || d.getDate() === 1;
                  return (
                    <div
                      key={i}
                      className={cn(
                        "shrink-0 border-r last:border-0 flex items-center justify-center text-[10px] select-none",
                        isToday
                          ? "bg-primary/15 text-primary font-bold"
                          : weekend
                            ? "bg-muted/40 text-muted-foreground/40"
                            : "text-muted-foreground/70"
                      )}
                      style={{ width: COL_W }}
                    >
                      {showNum ? d.getDate() : ""}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Weekend shading (behind all rows) ── */}
            <div className="absolute inset-0 pointer-events-none" style={{ top: HEAD_H1 + HEAD_H2, left: LEFT_W }}>
              {days.map((d, i) => isWeekend(d) && (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 bg-muted/20"
                  style={{ left: i * COL_W, width: COL_W }}
                />
              ))}
            </div>

            {/* ── Today line ── */}
            {todayOffset >= 0 && todayOffset < VIEW_DAYS && (
              <div
                className="absolute z-[10] pointer-events-none"
                style={{ left: LEFT_W + todayOffset * COL_W + COL_W / 2, top: 0, bottom: 0 }}
              >
                <div className="w-[1.5px] h-full bg-primary/50" />
                <div className="absolute top-[60px] -translate-x-1/2 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap shadow-sm">
                  Today
                </div>
              </div>
            )}

            {/* ── Sprint groups ── */}
            {sprints.map((sprint) => {
              const sprintIssues = sprintIssueMap.get(sprint.id) ?? [];
              const isCollapsed  = collapsed.has(sprint.id);
              const sc           = SPRINT_COLOR[sprint.status] ?? SPRINT_COLOR.planned;
              const sprintStart  = new Date(sprint.startDate);
              const sprintEnd    = new Date(sprint.endDate);
              const sprintStyle  = barStyle(sprintStart, sprintEnd);

              return (
                <React.Fragment key={sprint.id}>
                  {/* Sprint header row */}
                  <div
                    className="flex border-b bg-muted/25 hover:bg-muted/40 transition-colors cursor-pointer select-none"
                    style={{ height: ROW_H }}
                    onClick={() => toggleCollapse(sprint.id)}
                  >
                    {/* Label */}
                    <div
                      className="sticky left-0 z-20 shrink-0 border-r bg-background flex items-center gap-2 px-3"
                      style={{ width: LEFT_W }}
                    >
                      <ChevronDown
                        size={12}
                        className={cn("text-muted-foreground transition-transform duration-150 shrink-0", isCollapsed && "-rotate-90")}
                      />
                      <Flag size={11} className={cn("shrink-0", sc.text)} />
                      <span className="text-xs font-semibold truncate flex-1">{sprint.name}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">{sprintIssues.length}</span>
                    </div>
                    {/* Sprint bar */}
                    <div className="relative" style={{ width: totalWidth, height: ROW_H }}>
                      {sprintStyle && (
                        <div
                          className={cn("absolute top-1/2 -translate-y-1/2 rounded-lg border flex items-center px-2 gap-1.5", sc.bg, sc.border)}
                          style={{ left: sprintStyle.left, width: sprintStyle.width, height: 26 }}
                        >
                          <Flag size={10} className={cn("shrink-0", sc.text)} />
                          {sprintStyle.width > 80 && (
                            <span className={cn("text-[11px] font-semibold truncate", sc.text)}>{sprint.name}</span>
                          )}
                          {sprintStyle.width > 160 && (
                            <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                              {fmtShort(sprintStart)} – {fmtShort(sprintEnd)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Issue rows */}
                  {!isCollapsed && sprintIssues.map((issue) => (
                    <IssueRow
                      key={issue.id}
                      issue={issue}
                      leftW={LEFT_W}
                      totalWidth={totalWidth}
                      rowH={ROW_H}
                      barStyle={barStyle}
                      onClick={() => { setDetailIssue(issue); setDetailOpen(true); }}
                      sprintBand={sprintStyle}
                      sprintBg={sc.bg}
                    />
                  ))}

                  {/* Empty sprint hint */}
                  {!isCollapsed && sprintIssues.length === 0 && (
                    <div className="flex border-b" style={{ height: ROW_H }}>
                      <div
                        className="sticky left-0 z-20 shrink-0 border-r bg-background flex items-center px-6"
                        style={{ width: LEFT_W }}
                      >
                        <span className="text-[11px] text-muted-foreground/50 italic">No issues in this sprint</span>
                      </div>
                      <div className="relative" style={{ width: totalWidth }} />
                    </div>
                  )}
                </React.Fragment>
              );
            })}

            {/* ── Unassigned issues ── */}
            {unassigned.length > 0 && (
              <>
                {/* Group header */}
                <div
                  className="flex border-b bg-muted/15 hover:bg-muted/30 transition-colors cursor-pointer select-none"
                  style={{ height: ROW_H }}
                  onClick={() => toggleCollapse("__unassigned")}
                >
                  <div
                    className="sticky left-0 z-20 shrink-0 border-r bg-background flex items-center gap-2 px-3"
                    style={{ width: LEFT_W }}
                  >
                    <ChevronDown
                      size={12}
                      className={cn("text-muted-foreground transition-transform duration-150 shrink-0", collapsed.has("__unassigned") && "-rotate-90")}
                    />
                    <span className="text-xs font-semibold text-muted-foreground truncate flex-1">No Sprint</span>
                    <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">{unassigned.length}</span>
                  </div>
                  <div className="relative" style={{ width: totalWidth }} />
                </div>

                {!collapsed.has("__unassigned") && unassigned.map((issue) => (
                  <IssueRow
                    key={issue.id}
                    issue={issue}
                    leftW={LEFT_W}
                    totalWidth={totalWidth}
                    rowH={ROW_H}
                    barStyle={barStyle}
                    onClick={() => { setDetailIssue(issue); setDetailOpen(true); }}
                  />
                ))}
              </>
            )}

            {/* ── Empty state ── */}
            {issueList.length === 0 && sprints.length === 0 && (
              <div className="flex items-center justify-center py-24">
                <EmptyState
                  icon={SquareStack}
                  title="Nothing to show yet"
                  description="Create issues and sprints to see them on the timeline."
                  actions={[{ label: "Go to backlog", href: `/projects/${project.id}/backlog`, variant: "outline" }]}
                />
              </div>
            )}
          </div>
        </div>

        {/* ── Legend ── */}
        <div className="shrink-0 flex items-center gap-5 px-6 py-4 border-t bg-background flex-wrap min-h-[52px]">
          {Object.entries(STATUS_BAR).map(([label, cls]) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={cn("inline-block size-2 rounded-full", cls)} />
              <span className="text-[11px] text-muted-foreground">{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-[1.5px] h-3 bg-primary/50 rounded-full" />
            <span className="text-[11px] text-muted-foreground">Today</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block size-2 bg-muted/60 rounded-sm" />
            <span className="text-[11px] text-muted-foreground">Weekend</span>
          </div>
        </div>
      </div>

      <IssueDetailSheet
        issue={detailIssue}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdate={ctxUpdateIssue}
      />
    </AppSidebar>
  );
}

/* ── Issue row sub-component ─────────────────────────────────── */

function IssueRow({
  issue,
  leftW,
  totalWidth,
  rowH,
  barStyle,
  onClick,
  sprintBand,
  sprintBg,
}: {
  issue: Issue;
  leftW: number;
  totalWidth: number;
  rowH: number;
  barStyle: (s: Date, e: Date) => { left: number; width: number } | null;
  onClick: () => void;
  sprintBand?: { left: number; width: number } | null;
  sprintBg?: string;
}) {
  const TypeIcon = TYPE_ICON[issue.type] ?? CheckSquare;
  const start    = new Date(issue.createdAt);
  const end      = issue.dueDate ? new Date(issue.dueDate) : addDays(start, 5);
  const style    = barStyle(start, end);
  const hasDue   = !!issue.dueDate;
  const barCls   = STATUS_BAR[issue.status] ?? "bg-slate-400";
  const bgCls    = STATUS_BG[issue.status]  ?? "bg-slate-400/10 border-slate-400/30";

  return (
    <div
      className="flex border-b hover:bg-primary/[0.03] transition-colors cursor-pointer group/row"
      style={{ height: rowH }}
      onClick={onClick}
    >
      {/* Label */}
      <div
        className="sticky left-0 z-20 shrink-0 border-r bg-background group-hover/row:bg-primary/[0.03] flex items-center gap-2 px-4 transition-colors"
        style={{ width: leftW }}
      >
        <TypeIcon size={11} className={cn("shrink-0", TYPE_COLOR[issue.type])} />
        <div className="flex flex-col min-w-0 flex-1 gap-0.5">
          <span className="text-[10px] font-mono text-muted-foreground/60 leading-none">{issue.code}</span>
          <span className="text-xs font-medium truncate leading-snug">{issue.title}</span>
        </div>
      </div>

      {/* Bar area */}
      <div className="relative" style={{ width: totalWidth, height: rowH }}>
        {/* Sprint band continuation */}
        {sprintBand && sprintBg && (
          <div
            className={cn("absolute top-0 bottom-0 opacity-[0.07] pointer-events-none", sprintBg)}
            style={{ left: sprintBand.left, width: sprintBand.width }}
          />
        )}

        {/* Issue bar */}
        {style && (
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 rounded-md border overflow-hidden shadow-xs group-hover/row:shadow-md transition-shadow",
              bgCls
            )}
            style={{ left: style.left, width: style.width, height: 26 }}
          >
            {/* Left accent */}
            <div className={cn("absolute left-0 top-0 bottom-0 w-[3px]", barCls)} />
            {/* Title */}
            <div className="pl-3 pr-1.5 h-full flex items-center min-w-0">
              {style.width > 55 && (
                <span className="text-[10px] font-medium truncate leading-none">{issue.title}</span>
              )}
            </div>
            {/* No-due-date diamond */}
            {!hasDue && (
              <div
                className="absolute -right-1.5 top-1/2 -translate-y-1/2 size-2.5 rotate-45 border border-current bg-background"
                style={{ borderColor: "inherit" }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
