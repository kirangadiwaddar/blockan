"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useProjects } from "@/lib/projects-context";
import { useIssues } from "@/lib/issues-context";
import { Issue, Member } from "@/lib/types";
import AppSidebar from "@/components/shadcn-space/blocks/dashboard/app-sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NotFoundBlock } from "@/components/ui/not-found-block";
import { EmptyState } from "@/components/ui/empty-state";
import { IssueDetailSheet } from "@/components/issue/issue-detail-sheet";
import { buttonVariants } from "@/components/ui/button";
import {
  Bug, BookOpen, CheckSquare, Zap, CalendarDays,
  Users, SquareStack, Search, BarChart2, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjectRole, canEditProject } from "@/lib/projects-context";

/* ─── helpers ─────────────────────────────────────────────── */

const TYPE_ICON: Record<string, React.ElementType> = {
  Bug: Bug, Story: BookOpen, Task: CheckSquare, Epic: Zap,
};
const TYPE_COLOR: Record<string, string> = {
  Bug: "text-red-500", Story: "text-blue-500", Task: "text-green-500", Epic: "text-purple-500",
};
const STATUS_DOT: Record<string, string> = {
  "Todo": "bg-muted-foreground",
  "In Progress": "bg-blue-500",
  "Reviewing": "bg-purple-500",
  "Completed": "bg-green-500",
  "Cancelled": "bg-red-400",
};
const PRIORITY_COLOR: Record<string, string> = {
  Critical: "text-destructive",
  High: "text-orange-500",
  Medium: "text-yellow-500",
  Low: "text-muted-foreground",
};

function progressColor(pct: number) {
  if (pct >= 75) return "bg-green-500";
  if (pct >= 40) return "bg-yellow-500";
  if (pct > 0)   return "bg-orange-500";
  return "bg-muted-foreground/40";
}

/* ─── Entry types ──────────────────────────────────────────── */

interface MemberEntry {
  kind: "member";
  member: Member;
  issues: Issue[];
}
interface UnassignedEntry {
  kind: "unassigned";
  issues: Issue[];
}
type Entry = MemberEntry | UnassignedEntry;

/* ─── Issue row inside modal ───────────────────────────────── */

function IssueRow({ issue, onOpen }: { issue: Issue; onOpen: (i: Issue) => void }) {
  const TypeIcon = TYPE_ICON[issue.type] ?? CheckSquare;

  const dueBit = issue.dueDate ? (() => {
    const due = new Date(issue.dueDate);
    due.setHours(0, 0, 0, 0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const overdue = due < today && issue.status !== "Completed";
    return (
      <TableCell className={cn("hidden sm:table-cell", overdue ? "text-red-500" : "text-muted-foreground")}>
        <div className="flex items-center gap-1 text-xs">
          <CalendarDays size={10} />
          {due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </div>
      </TableCell>
    );
  })() : <TableCell className="hidden sm:table-cell" />;

  return (
    <TableRow className="cursor-pointer" onClick={() => onOpen(issue)}>
      <TableCell>
        <div className="flex items-center gap-2.5">
          <TypeIcon size={13} className={cn("shrink-0", TYPE_COLOR[issue.type])} />
          <span className="text-xs font-mono text-muted-foreground shrink-0 w-14 truncate">{issue.code}</span>
          <span className="text-sm truncate max-w-[260px]">{issue.title}</span>
        </div>
      </TableCell>
      {dueBit}
      <TableCell className={cn("hidden sm:table-cell text-xs", PRIORITY_COLOR[issue.priority])}>
        {issue.priority}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          <span className={cn("size-2 rounded-full shrink-0", STATUS_DOT[issue.status] ?? "bg-muted-foreground")} />
          <span className="text-xs text-muted-foreground">{issue.status}</span>
        </div>
      </TableCell>
    </TableRow>
  );
}

/* ─── Member modal ─────────────────────────────────────────── */

const STATUSES = ["Todo", "In Progress", "Reviewing", "Completed"];
const PRIORITIES = ["Critical", "High", "Medium", "Low", "No Priority"];

function MemberModal({
  entry,
  open,
  onClose,
  onOpenIssue,
}: {
  entry: Entry | null;
  open: boolean;
  onClose: () => void;
  onOpenIssue: (i: Issue) => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!entry) return [];
    let issues = entry.issues;
    const q = search.trim().toLowerCase();
    if (q) issues = issues.filter((i) => i.title.toLowerCase().includes(q) || i.code.toLowerCase().includes(q));
    if (statusFilter) issues = issues.filter((i) => i.status === statusFilter);
    if (priorityFilter) issues = issues.filter((i) => i.priority === priorityFilter);
    return issues;
  }, [entry, search, statusFilter, priorityFilter]);

  const done = entry ? entry.issues.filter((i) => i.status === "Completed").length : 0;
  const name = entry?.kind === "member" ? entry.member.name : "Unassigned";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); setSearch(""); setStatusFilter(null); setPriorityFilter(null); } }}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden rounded-2xl">
        <DialogHeader className="border-b px-5 py-4">
          <div className="flex items-center gap-3">
            {entry?.kind === "member" ? (
              <Avatar className="size-10 shrink-0">
                <AvatarImage src={entry.member.avatar} alt={entry.member.name} />
                <AvatarFallback className="text-sm font-semibold" colorSeed={entry.member.id}>
                  {entry.member.initials}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="size-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Users size={16} className="text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base font-semibold truncate">{name}</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {entry?.issues.length ?? 0} issue{entry?.issues.length !== 1 ? "s" : ""} · {done} completed
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="px-4 py-3 border-b bg-muted/20 flex items-center gap-3">
          {/* Search — left */}
          <div className="relative flex-1 min-w-0">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search issues…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm bg-background"
              autoFocus
            />
          </div>

          {/* Filters — right */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Status filter */}
            <select
              value={statusFilter ?? ""}
              onChange={(e) => setStatusFilter(e.target.value || null)}
              className={cn(
                "h-8 rounded-md border px-2 text-xs bg-background cursor-pointer outline-none focus:ring-1 focus:ring-ring",
                statusFilter ? "border-primary text-primary font-medium" : "text-muted-foreground"
              )}
            >
              <option value="">Status</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>

            {/* Priority filter */}
            <select
              value={priorityFilter ?? ""}
              onChange={(e) => setPriorityFilter(e.target.value || null)}
              className={cn(
                "h-8 rounded-md border px-2 text-xs bg-background cursor-pointer outline-none focus:ring-1 focus:ring-ring",
                priorityFilter ? "border-primary text-primary font-medium" : "text-muted-foreground"
              )}
            >
              <option value="">Priority</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>

            {/* Clear filters */}
            {(statusFilter || priorityFilter) && (
              <button
                onClick={() => { setStatusFilter(null); setPriorityFilter(null); }}
                className="h-8 w-8 flex items-center justify-center rounded-md border bg-background hover:bg-muted transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
                title="Clear filters"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-y-auto max-h-[420px]">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Search size={20} className="text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {search ? `No issues matching "${search}"` : "No issues assigned"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Issue</TableHead>
                  <TableHead className="hidden sm:table-cell">Due</TableHead>
                  <TableHead className="hidden sm:table-cell">Priority</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((issue) => (
                  <IssueRow
                    key={issue.id}
                    issue={issue}
                    onOpen={(i) => { onClose(); setSearch(""); onOpenIssue(i); }}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Page ─────────────────────────────────────────────────── */

function WorkloadPageInner({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = React.use(params);
  const { projectBySlug, loading: projectsLoading } = useProjects();
  const { issues: allIssues, updateIssue, loading: issuesLoading, refreshIssues } = useIssues();
  const role = useProjectRole(projectId);
  const readOnly = !canEditProject(role);

  React.useEffect(() => {
    const p = projectBySlug(projectId);
    if (!p) return;
    const hasIssues = allIssues.some((i) => i.projectId === p.id);
    if (!hasIssues && !issuesLoading) refreshIssues().catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const [memberSearch, setMemberSearch] = useState("");
  const [modalEntry, setModalEntry] = useState<Entry | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailIssue, setDetailIssue] = useState<Issue | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const project = projectBySlug(projectId);
  const isLoading = projectsLoading || issuesLoading;

  const projectIssues = useMemo(
    () => allIssues.filter((i) => i.projectId === (project?.id ?? projectId) && !i.parentId),
    [allIssues, project?.id, projectId],
  );

  const memberMap = useMemo(() => {
    const map = new Map<string, MemberEntry>();
    for (const issue of projectIssues) {
      for (const assignee of issue.assignees) {
        if (!map.has(assignee.id)) {
          map.set(assignee.id, { kind: "member", member: assignee, issues: [] });
        }
        map.get(assignee.id)!.issues.push(issue);
      }
    }
    return [...map.values()].sort((a, b) => b.issues.length - a.issues.length);
  }, [projectIssues]);

  const unassigned = useMemo(
    () => projectIssues.filter((i) => i.assignees.length === 0),
    [projectIssues],
  );

  /* Filter members by search */
  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return memberMap;
    return memberMap.filter((e) => e.member.name.toLowerCase().includes(q));
  }, [memberMap, memberSearch]);

  const showUnassigned = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    return unassigned.length > 0 && (!q || "unassigned".includes(q));
  }, [unassigned, memberSearch]);

  const openModal = (entry: Entry) => { setModalEntry(entry); setModalOpen(true); };

  if (isLoading && !project) {
    return (
      <AppSidebar>
        <div className="flex flex-col gap-5 p-6 w-full">
          <Skeleton className="h-7 w-56" />
          <div className="rounded-xl border overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b last:border-0">
                <Skeleton className="size-8 rounded-full shrink-0" />
                <Skeleton className="h-3.5 w-28" />
                <div className="flex-1" />
                <Skeleton className="h-3 w-6" />
                <Skeleton className="h-3 w-6" />
                <Skeleton className="h-3 w-6" />
                <Skeleton className="h-2 w-28 rounded-full" />
                <Skeleton className="h-7 w-24 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </AppSidebar>
    );
  }

  if (!project) return <AppSidebar><NotFoundBlock /></AppSidebar>;

  const totalEntries = memberMap.length + (unassigned.length > 0 ? 1 : 0);

  return (
    <AppSidebar>
      <div className="flex flex-col gap-5 p-6 w-full">

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`avatar-orb ${project.color} size-7 rounded-full shrink-0`} />
            <h1 className="text-xl font-semibold truncate">{project.name} — Workload</h1>
          </div>
          <Link
            href={`/projects/${project.id}/board`}
            className={buttonVariants({ variant: "outline", className: "cursor-pointer w-full sm:w-auto justify-center" })}
          >
            <SquareStack size={14} /> Board view
          </Link>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total issues",  value: projectIssues.length,                                               icon: CheckSquare, color: "text-blue-500",   bg: "bg-blue-500/10"   },
            { label: "Assigned",      value: projectIssues.filter((i) => i.assignees.length > 0).length,          icon: Users,       color: "text-violet-500", bg: "bg-violet-500/10" },
            { label: "Completed",     value: projectIssues.filter((i) => i.status === "Completed").length,         icon: Zap,         color: "text-green-500",  bg: "bg-green-500/10"  },
            { label: "Contributors",  value: memberMap.length,                                                     icon: BarChart2,   color: "text-orange-500", bg: "bg-orange-500/10" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
              <div className={cn("size-8 rounded-lg flex items-center justify-center shrink-0", bg)}>
                <Icon size={15} className={color} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground leading-none mb-1">{label}</p>
                <p className="text-xl font-bold leading-none">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {totalEntries === 0 && (
          <EmptyState icon={Users} title="No issues yet" description="Create issues and assign them to team members." />
        )}

        {/* Members table */}
        {totalEntries > 0 && (
          <div className="flex flex-col gap-3">
            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search members…"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
              {memberSearch && (
                <button
                  onClick={() => setMemberSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="ps-4">Member</TableHead>
                    <TableHead className="text-center w-20">Total</TableHead>
                    <TableHead className="text-center w-20">Active</TableHead>
                    <TableHead className="text-center w-20">Done</TableHead>
                    <TableHead className="w-52">Progress</TableHead>
                    <TableHead className="text-right w-32">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.length === 0 && !showUnassigned ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                        No members match &ldquo;{memberSearch}&rdquo;
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {filteredMembers.map(({ member, issues }) => {
                        const done   = issues.filter((i) => i.status === "Completed").length;
                        const active = issues.filter((i) => i.status === "In Progress" || i.status === "Reviewing").length;
                        const pct    = issues.length === 0 ? 0 : Math.round((done / issues.length) * 100);
                        const entry: MemberEntry = { kind: "member", member, issues };
                        return (
                          <TableRow
                            key={member.id}
                            className="cursor-pointer group"
                            onClick={() => openModal(entry)}
                          >
                            <TableCell className="ps-4">
                              <div className="flex items-center gap-3">
                                <Avatar className="size-8 shrink-0">
                                  <AvatarImage src={member.avatar} alt={member.name} />
                                  <AvatarFallback className="text-xs font-semibold" colorSeed={member.id}>
                                    {member.initials}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium group-hover:text-primary transition-colors">
                                  {member.name}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center tabular-nums">{issues.length}</TableCell>
                            <TableCell className="text-center">
                              <span className={cn("tabular-nums font-medium", active > 0 ? "text-blue-500" : "text-muted-foreground")}>{active}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={cn("tabular-nums font-medium", done > 0 ? "text-green-500" : "text-muted-foreground")}>{done}</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={pct} className="flex-1 h-1.5" indicatorClassName={progressColor(pct)} />
                                <span className="text-xs text-muted-foreground tabular-nums w-8 text-right shrink-0">{pct}%</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="cursor-pointer text-xs h-7 gap-1.5"
                                onClick={() => openModal(entry)}
                              >
                                <BarChart2 size={12} />
                                View Workload
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}

                      {/* Unassigned row */}
                      {showUnassigned && (() => {
                        const done   = unassigned.filter((i) => i.status === "Completed").length;
                        const active = unassigned.filter((i) => i.status === "In Progress" || i.status === "Reviewing").length;
                        const pct    = Math.round((done / unassigned.length) * 100);
                        const entry: UnassignedEntry = { kind: "unassigned", issues: unassigned };
                        return (
                          <TableRow
                            className="cursor-pointer group"
                            onClick={() => openModal(entry)}
                          >
                            <TableCell className="ps-4">
                              <div className="flex items-center gap-3">
                                <div className="size-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                                  <Users size={13} className="text-muted-foreground" />
                                </div>
                                <span className="text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">
                                  Unassigned
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center tabular-nums">{unassigned.length}</TableCell>
                            <TableCell className="text-center">
                              <span className={cn("tabular-nums font-medium", active > 0 ? "text-blue-500" : "text-muted-foreground")}>{active}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={cn("tabular-nums font-medium", done > 0 ? "text-green-500" : "text-muted-foreground")}>{done}</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={pct} className="flex-1 h-1.5" indicatorClassName={progressColor(pct)} />
                                <span className="text-xs text-muted-foreground tabular-nums w-8 text-right shrink-0">{pct}%</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="cursor-pointer text-xs h-7 gap-1.5"
                                onClick={() => openModal(entry)}
                              >
                                <BarChart2 size={12} />
                                View Workload
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })()}
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      <MemberModal
        entry={modalEntry}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onOpenIssue={(issue) => { setDetailIssue(issue); setDetailOpen(true); }}
      />

      <IssueDetailSheet
        issue={detailIssue}
        open={detailOpen}
        readOnly={readOnly}
        onOpenChange={setDetailOpen}
        onUpdate={updateIssue}
      />
    </AppSidebar>
  );
}

export default function WorkloadPage({ params }: { params: Promise<{ projectId: string }> }) {
  return (
    <React.Suspense>
      <WorkloadPageInner params={params} />
    </React.Suspense>
  );
}
