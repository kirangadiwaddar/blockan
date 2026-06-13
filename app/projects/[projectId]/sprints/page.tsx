"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useProjects, useProjectRole, canEditProject, canManageSprints } from "@/lib/projects-context";
import { useIssues } from "@/lib/issues-context";
import { Issue, Sprint } from "@/lib/types";
import AppSidebar from "@/components/shadcn-space/blocks/dashboard/app-sidebar";
import { IssueDetailSheet } from "@/components/issue/issue-detail-sheet";
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  AvatarGroup, AvatarGroupCount,
} from "@/components/ui/avatar";
import {
  Bug, BookOpen, CheckSquare, Zap,
  ChevronRight, Plus, CalendarDays, MoreHorizontal,
  Play, CheckCheck, Archive, Grid3x2, Flag,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { NotFoundBlock } from "@/components/ui/not-found-block";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, progressColor } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";

/* ─── helpers ───────────────────────────────────────────────── */

const typeIcon: Record<string, React.ElementType> = {
  Bug: Bug, Story: BookOpen, Task: CheckSquare, Epic: Zap,
};
const typeColor: Record<string, string> = {
  Bug: "text-red-500", Story: "text-blue-500", Task: "text-green-500", Epic: "text-purple-500",
};
const statusDot: Record<string, string> = {
  "Todo": "bg-muted-foreground", "In Progress": "bg-blue-500",
  "Reviewing": "bg-purple-500", "Completed": "bg-green-500",
};

const LABEL_COLORS = [
  "#6366f1","#3b82f6","#22c55e","#f59e0b",
  "#ef4444","#a855f7","#ec4899","#14b8a6","#f97316","#64748b",
];
function labelColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return LABEL_COLORS[h % LABEL_COLORS.length];
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function sprintStatusBadge(status: Sprint["status"]) {
  if (status === "active")
    return <Badge className="bg-blue-500/10 text-blue-500 font-normal">Active</Badge>;
  if (status === "planned")
    return <Badge variant="outline" className="font-normal">Planned</Badge>;
  return <Badge variant="secondary" className="font-normal">Completed</Badge>;
}

/* ─── Sprint card ───────────────────────────────────────────── */

function SprintCard({
  sprint,
  issues,
  onIssueClick,
  onStatusChange,
  sprintAdmin,
}: {
  sprint: Sprint;
  issues: Issue[];
  onIssueClick: (issue: Issue) => void;
  onStatusChange: (id: string, status: Sprint["status"]) => void;
  sprintAdmin?: boolean;
}) {
  const [open, setOpen] = useState(sprint.status === "active");
  const done = issues.filter((i) => i.status === "Completed").length;
  const pts  = issues.reduce((s, i) => s + (i.storyPoints ?? 0), 0);
  const progress = issues.length > 0 ? Math.round((done / issues.length) * 100) : 0;

  return (
    <Card className="rounded-2xl overflow-hidden">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader className="border-b">
          <CollapsibleTrigger className="w-full text-left cursor-pointer">
            <div className="flex items-center gap-2 flex-wrap">
              <ChevronRight
                size={14}
                className={cn("text-muted-foreground transition-transform duration-150 shrink-0", open && "rotate-90")}
              />
              <CardTitle>{sprint.name}</CardTitle>
              {sprintStatusBadge(sprint.status)}
              <Badge variant="outline" className="font-normal">{issues.length} issues</Badge>
              {sprint.goal && (
                <span className="text-xs text-muted-foreground hidden sm:inline">{sprint.goal}</span>
              )}
            </div>
          </CollapsibleTrigger>
          <CardAction>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarDays size={11} />
                <span>{fmt(sprint.startDate)} – {fmt(sprint.endDate)}</span>
              </div>
              {pts > 0 && (
                <span className="text-xs text-muted-foreground">{pts} pts</span>
              )}
              {sprintAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="flex items-center justify-center size-7 rounded-md hover:bg-accent transition-colors cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal size={14} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {sprint.status === "planned" && (
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => onStatusChange(sprint.id, "active")}
                      >
                        <Play size={13} /> Start sprint
                      </DropdownMenuItem>
                    )}
                    {sprint.status === "active" && (
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => onStatusChange(sprint.id, "completed")}
                      >
                        <CheckCheck size={13} /> Complete sprint
                      </DropdownMenuItem>
                    )}
                    {sprint.status === "completed" && (
                      <DropdownMenuItem className="text-muted-foreground opacity-60" disabled>
                        <Archive size={13} /> Sprint completed
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </CardAction>
        </CardHeader>

        <CollapsibleContent>
          {issues.length > 0 && (
            <div className="px-6 py-3 border-b flex items-center gap-3">
              <Progress value={progress} className="flex-1 h-1.5" indicatorClassName={progressColor(progress)} />
              <span className="text-xs text-muted-foreground shrink-0">{done}/{issues.length} done · {progress}%</span>
            </div>
          )}

          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-8 ps-4" />
                  <TableHead className="w-24">Code</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-28 hidden md:table-cell">Priority</TableHead>
                  <TableHead className="w-28 hidden md:table-cell">Due</TableHead>
                  <TableHead className="w-14">Pts</TableHead>
                  <TableHead className="w-24">Assignees</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="p-0">
                      <EmptyState
                        icon={CheckSquare}
                        title="No issues in this sprint"
                        description="Assign issues from the backlog to this sprint to get started."
                        className="py-10"
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  issues.map((issue) => {
                    const TypeIcon = typeIcon[issue.type] ?? CheckSquare;
                    return (
                      <TableRow
                        key={issue.id}
                        className="cursor-pointer"
                        onClick={() => onIssueClick(issue)}
                      >
                        <TableCell className="ps-4">
                          <TypeIcon size={13} className={typeColor[issue.type]} />
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-mono text-muted-foreground">{issue.code}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">{issue.title}</span>
                            {(issue.labels ?? []).map((l) => (
                              <span
                                key={l}
                                className="inline-flex items-center text-[10px] font-medium rounded-full px-1.5 py-0.5 text-white shrink-0"
                                style={{ backgroundColor: labelColor(l) }}
                              >
                                {l}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-start gap-1.5">
                            <span className={cn("inline-block size-2 rounded-full", statusDot[issue.status] ?? "bg-muted-foreground")} />
                            <span className="text-xs text-muted-foreground hidden lg:inline">{issue.status}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-xs text-muted-foreground">{issue.priority}</span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {issue.dueDate ? (
                            <div className="flex items-center gap-1">
                              <CalendarDays size={11} className="text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{fmt(issue.dueDate)}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="">
                          <span className="text-xs text-muted-foreground">
                            {issue.storyPoints ? `${issue.storyPoints}pt` : "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <AvatarGroup>
                            {issue.assignees.slice(0, 3).map((a) => (
                              <Avatar key={a.id} className="size-7 ring-2 ring-background dark:ring-muted">
                                <AvatarImage src={a.avatar} alt={a.name} />
                                <AvatarFallback colorSeed={a.id}>{a.initials}</AvatarFallback>
                              </Avatar>
                            ))}
                            {issue.assignees.length > 3 && (
                              <AvatarGroupCount className="text-xs">+{issue.assignees.length - 3}</AvatarGroupCount>
                            )}
                          </AvatarGroup>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

/* ─── Create sprint dialog ───────────────────────────────────── */

function CreateSprintCard({ projectId, onCreated }: { projectId: string; onCreated: (s: Sprint) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const submit = () => {
    if (!name.trim() || !start || !end) return;
    onCreated({
      id: `s-${Date.now()}`,
      projectId,
      name: name.trim(),
      goal: goal.trim() || undefined,
      startDate: start,
      endDate: end,
      status: "planned",
    });
    setName(""); setGoal(""); setStart(""); setEnd("");
    setOpen(false);
  };

  return (
    <>
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5 cursor-pointer"
      >
        <Plus size={14} /> Create sprint
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="sm:max-w-lg"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>New Sprint</DialogTitle>
            <DialogDescription>Plan a new sprint for your team.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Sprint name <span className="text-destructive">*</span></label>
              <Input placeholder="e.g. Sprint 9" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Goal</label>
              <Input placeholder="What will this sprint deliver?" value={goal} onChange={(e) => setGoal(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Start date <span className="text-destructive">*</span></label>
              <DatePicker value={start} onChange={setStart} onClear={() => setStart("")} placeholder="Pick start date" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">End date <span className="text-destructive">*</span></label>
              <DatePicker value={end} onChange={setEnd} onClear={() => setEnd("")} placeholder="Pick end date" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="cursor-pointer">Cancel</Button>
            <Button onClick={submit} disabled={!name.trim() || !start || !end} className="cursor-pointer">
              Create sprint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ─── Page ────────────────────────────────────────────────── */

export default function SprintsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = React.use(params);
  const { projects, sprintsForProject, addSprint: ctxAddSprint, updateSprintStatus: ctxUpdateSprintStatus, projectBySlug, loading: projectsLoading } = useProjects();
  const { issues: allCtxIssues, updateIssue: ctxUpdateIssue, loading: issuesLoading } = useIssues();

  const project   = projectBySlug(projectId);
  const sprintList = sprintsForProject(project?.id ?? projectId);
  const issueList  = allCtxIssues.filter((i) => i.projectId === project?.id);
  const role        = useProjectRole(projectId);
  const readOnly    = !canEditProject(role);
  const sprintAdmin = canManageSprints(role);

  const [detailIssue, setDetailIssue] = useState<Issue | null>(null);
  const [detailOpen, setDetailOpen]   = useState(false);

  const addSprint = (s: Sprint) => ctxAddSprint(s, project?.id ?? projectId);
  const updateSprintStatus = (id: string, status: Sprint["status"]) => ctxUpdateSprintStatus(id, status);
  const updateIssue = (updated: Issue) => ctxUpdateIssue(updated);
  const openDetail = (issue: Issue) => { setDetailIssue(issue); setDetailOpen(true); };

  if (!project && (projectsLoading || issuesLoading)) {
    return (
      <AppSidebar>
        <div className="flex flex-col gap-5 p-6 w-full">
          <div className="flex items-center gap-3">
            <Skeleton className="size-7 rounded-lg" />
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border p-4">
                <Skeleton className="h-3 w-20 mb-2" />
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-2xl border overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="px-6 py-3">
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
            </div>
          ))}
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

  const activeSprint    = sprintList.find((s) => s.status === "active");
  const plannedSprints  = sprintList.filter((s) => s.status === "planned");
  const completedSprints = sprintList.filter((s) => s.status === "completed");

  const totalPts   = issueList.reduce((s, i) => s + (i.storyPoints ?? 0), 0);
  const donePts    = issueList.filter((i) => i.status === "Completed").reduce((s, i) => s + (i.storyPoints ?? 0), 0);
  const doneCount  = issueList.filter((i) => i.status === "Completed").length;

  return (
    <AppSidebar>
      <div className="flex flex-col gap-5 p-6 w-full">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={`avatar-orb ${project.color} size-7 rounded-full`} />
            <h1 className="text-xl font-semibold">{project.name} — Sprints</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/projects/${project.id}/board`}
              className={buttonVariants({ variant: "outline", className: "cursor-pointer" })}
            >
              <Grid3x2 size={14} /> Board view
            </Link>
            {sprintAdmin && <CreateSprintCard projectId={project.id} onCreated={addSprint} />}
          </div>
        </div>

        {/* ── Stats strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total sprints", value: sprintList.length },
            { label: "Active sprint", value: activeSprint?.name ?? "—" },
            { label: "Issues done", value: `${doneCount} / ${issueList.length}` },
            { label: "Points done", value: `${donePts} / ${totalPts} pts` },
          ].map((stat) => (
            <Card key={stat.label} className="rounded-xl">
              <CardContent className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">{stat.label}</span>
                <span className="text-lg font-semibold">{stat.value}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Active sprint ── */}
        {activeSprint && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-muted-foreground capitalize tracking-wide flex items-center gap-1.5">
               Active Sprint
            </p>
            <SprintCard
              sprint={activeSprint}
              issues={issueList.filter((i) => i.sprintId === activeSprint.id)}
              onIssueClick={openDetail}
              onStatusChange={updateSprintStatus}
              sprintAdmin={sprintAdmin}
            />
          </div>
        )}

        {/* ── Planned sprints ── */}
        {plannedSprints.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Planned</p>
            {plannedSprints.map((s) => (
              <SprintCard
                key={s.id}
                sprint={s}
                issues={issueList.filter((i) => i.sprintId === s.id)}
                onIssueClick={openDetail}
                onStatusChange={updateSprintStatus}
                sprintAdmin={sprintAdmin}
              />
            ))}
          </div>
        )}

        {/* ── Empty state when no sprints exist ── */}
        {sprintList.length === 0 && (
          <EmptyState
            icon={Flag}
            title="No sprints yet"
            description="Create your first sprint to start planning and tracking your team's work."
          />
        )}


        {/* ── Completed sprints ── */}
        {completedSprints.length > 0 && (
          <div className="flex flex-col gap-2">
            <Separator />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Completed</p>
            {completedSprints.map((s) => (
              <SprintCard
                key={s.id}
                sprint={s}
                issues={issueList.filter((i) => i.sprintId === s.id)}
                onIssueClick={openDetail}
                onStatusChange={updateSprintStatus}
                sprintAdmin={sprintAdmin}
              />
            ))}
          </div>
        )}
      </div>

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
