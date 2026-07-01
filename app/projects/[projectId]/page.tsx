"use client";

import React from "react";
import { useProjects, useProjectRole, canManageSprints } from "@/lib/projects-context";
import { useIssues } from "@/lib/issues-context";
import AppSidebar from "@/components/shadcn-space/blocks/dashboard/app-sidebar";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Avatar, AvatarFallback, AvatarImage, AvatarGroup, AvatarGroupCount,
} from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Bug, BookOpen, CheckSquare, Zap,
  Grid3x2, ListTree, SquareStack, BookText,
  CalendarDays, ArrowRight, ArrowLeft, Target, TrendingUp, UserPlus, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { NotFoundBlock } from "@/components/ui/not-found-block";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, progressColor } from "@/lib/utils";
import Link from "next/link";
import { InviteMemberDialog } from "@/components/team/invite-member-dialog";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

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
const statusFill: Record<string, string> = {
  "Todo": "#94a3b8", "In Progress": "#3b82f6", "Reviewing": "#a855f7", "Completed": "#22c55e",
};
const priorityClass: Record<string, string> = {
  Critical: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
  High:     "bg-orange-50 text-orange-500 dark:bg-orange-950 dark:text-orange-400",
  Medium:   "bg-yellow-50 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400",
  Low:      "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400",
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ─── Page ────────────────────────────────────────────────── */

export default function ProjectDetailPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = React.use(params);
  const { sprintsForProject, projectBySlug, loading: projectsLoading, refreshProjects } = useProjects();
  const { issues: allCtxIssues, loading: issuesLoading, refreshIssues } = useIssues();

  const project = projectBySlug(projectId);
  const issues  = allCtxIssues.filter((i) => i.projectId === project?.id);
  const sprints = sprintsForProject(project?.id ?? projectId);
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([refreshProjects(), refreshIssues()]);
      toast.success("Project refreshed");
    } catch {
      toast.error("Couldn't refresh — try again.");
    } finally {
      setRefreshing(false);
    }
  };
  const role       = useProjectRole(projectId);
  const isAdmin    = canManageSprints(role); // owner/admin only

  if (!project && (projectsLoading || issuesLoading)) {
    return (
      <AppSidebar>
        <div className="flex flex-col gap-6 p-6 w-full">
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-lg" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-64" />
            </div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border p-5">
                <Skeleton className="h-3 w-20 mb-3" />
                <Skeleton className="h-8 w-12" />
              </div>
            ))}
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

  const activeSprint = sprints.find((s) => s.status === "active");
  const sprintIssues = activeSprint ? issues.filter((i) => i.sprintId === activeSprint.id) : [];
  const sprintDone   = sprintIssues.filter((i) => i.status === "Completed").length;

  const statusCounts = Object.entries(
    issues.reduce<Record<string, number>>((acc, i) => {
      acc[i.status] = (acc[i.status] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value, fill: statusFill[name] ?? "#94a3b8" }));

  const recentIssues = [...issues].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  ).slice(0, 6);

  const nav = [
    { label: "Board",     href: `/projects/${project.id}/board`,    icon: Grid3x2 },
    { label: "Backlog",   href: `/projects/${project.id}/backlog`,   icon: ListTree },
    { label: "Sprints",   href: `/projects/${project.id}/sprints`,   icon: SquareStack },
    { label: "Timeline",  href: `/projects/${project.id}/timeline`,  icon: CalendarDays },
    { label: "Reports",   href: `/projects/${project.id}/reports`,   icon: BookText },
  ];

  return (
    <AppSidebar>
      <div className="flex flex-col gap-4 p-5 w-full">

        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/projects"
              aria-label="Back to projects"
              className={buttonVariants({ variant: "ghost", size: "icon-sm", className: "shrink-0 cursor-pointer text-muted-foreground hover:text-foreground" })}
            >
              <ArrowLeft size={16} />
            </Link>
            <div className={cn("avatar-orb size-9 rounded-full shrink-0", project.color)} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold leading-tight">{project.name}</h1>
                <Badge className="bg-green-500/10 text-green-600 font-normal capitalize text-[11px]">{project.status}</Badge>
              </div>
              {project.description && (
                <p className="text-xs text-muted-foreground truncate">{project.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <AvatarGroup>
              {project.members.slice(0, 5).map((m) => (
                <Avatar key={m.id} className="size-7 ring-1 ring-background dark:ring-muted">
                  <AvatarImage src={m.avatar} alt={m.name} />
                  <AvatarFallback className="text-xs" colorSeed={m.id}>{m.initials}</AvatarFallback>
                </Avatar>
              ))}
              {project.members.length > 5 && (
                <AvatarGroupCount className="size-7 text-xs">+{project.members.length - 5}</AvatarGroupCount>
              )}
            </AvatarGroup>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="cursor-pointer"
              title="Refresh project"
              aria-label="Refresh project"
            >
              <RefreshCw size={14} className={cn(refreshing && "animate-spin")} />
            </Button>
            {isAdmin && (
              <Button variant="outline" className="gap-1.5 cursor-pointer" onClick={() => setInviteOpen(true)}>
                <UserPlus size={14} /> Invite
              </Button>
            )}
          </div>
          {isAdmin && <InviteMemberDialog open={inviteOpen} onClose={() => setInviteOpen(false)} projectId={project.id} />}
        </div>

        {/* Nav links */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={buttonVariants({ variant: "outline", size: "sm", className: "cursor-pointer gap-1.5 h-7 text-xs" })}
            >
              <item.icon size={12} />
              {item.label}
            </Link>
          ))}
        </div>

        <Separator />

        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Total Issues",  value: issues.length,                                                      icon: Target,      color: "text-blue-500"   },
            { label: "Completed",     value: issues.filter((i) => i.status === "Completed").length,              icon: CheckSquare, color: "text-green-500"  },
            { label: "In Progress",   value: issues.filter((i) => i.status === "In Progress").length,            icon: TrendingUp,  color: "text-blue-400"   },
            { label: "Story Points",  value: `${issues.reduce((s, i) => s + (i.storyPoints ?? 0), 0)} pts`,     icon: SquareStack, color: "text-purple-500" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border bg-card px-4 py-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                <p className="text-xl font-bold mt-0.5 leading-tight">{stat.value}</p>
              </div>
              <stat.icon size={16} className={cn("shrink-0", stat.color)} />
            </div>
          ))}
        </div>

        {/* ── Progress + sprint + chart ── */}
        <div className="grid grid-cols-12 gap-3">

          {/* Overall progress */}
          <div className="col-span-12 md:col-span-4">
            <div className="rounded-xl border bg-card px-4 py-3.5 flex flex-col gap-2.5 h-full">
              <div>
                <p className="text-xs font-medium">Overall Progress</p>
                <p className="text-[11px] text-muted-foreground">
                  {issues.filter((i) => i.status === "Completed").length} of {issues.length} done · updated {fmt(project.updatedAt)}
                </p>
              </div>
              <div className="flex items-center gap-2.5 mt-auto">
                <Progress value={project.progress} className="h-2 flex-1" indicatorClassName={progressColor(project.progress)} />
                <span className="text-sm font-bold shrink-0">{project.progress}%</span>
              </div>
            </div>
          </div>

          {/* Active sprint */}
          <div className="col-span-12 md:col-span-4">
            <div className="rounded-xl border bg-card px-4 py-3.5 flex flex-col gap-2.5 h-full">
              <div>
                <p className="text-xs font-medium">{activeSprint?.name ?? "No active sprint"}</p>
                {activeSprint && (
                  <p className="text-[11px] text-muted-foreground line-clamp-1">{activeSprint.goal}</p>
                )}
              </div>
              {activeSprint ? (
                <div className="flex flex-col gap-1.5 mt-auto">
                  <div className="flex items-center gap-2">
                    <Progress value={sprintIssues.length > 0 ? (sprintDone / sprintIssues.length) * 100 : 0} className="h-1.5 flex-1" indicatorClassName={progressColor(sprintIssues.length > 0 ? Math.round((sprintDone / sprintIssues.length) * 100) : 0)} />
                    <span className="text-[11px] text-muted-foreground shrink-0">{sprintDone}/{sprintIssues.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">{fmt(activeSprint.startDate)} – {fmt(activeSprint.endDate)}</span>
                    <Link href={`/projects/${project.id}/sprints`} className="text-[11px] text-primary hover:underline flex items-center gap-0.5">
                      Manage <ArrowRight size={10} />
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground mt-auto">Start a sprint from the Sprints page.</p>
              )}
            </div>
          </div>

          {/* Status breakdown */}
          <div className="col-span-12 md:col-span-4">
            <div className="rounded-xl border bg-card px-4 py-3.5 h-full">
              <p className="text-xs font-medium mb-2">Status Breakdown</p>
              {statusCounts.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">No issues yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={110}>
                  <PieChart>
                    <Pie data={statusCounts} cx="50%" cy="50%" innerRadius={28} outerRadius={44} paddingAngle={3} dataKey="value">
                      {statusCounts.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                    <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* ── Recent issues ── */}
        <Card className="rounded-xl">
          <CardHeader className="border-b px-5 py-3">
            <div>
              <CardTitle className="text-sm">Recent Issues</CardTitle>
              <CardDescription className="text-[11px]">Latest updates in {project.name}</CardDescription>
            </div>
            <CardAction>
              <Link href={`/projects/${project.id}/backlog`} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                Full backlog <ArrowRight size={11} />
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-8 ps-4" />
                  <TableHead className="w-20">Code</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-28">Status</TableHead>
                  <TableHead className="w-24 hidden md:table-cell">Priority</TableHead>
                  <TableHead className="w-28 hidden md:table-cell">Due</TableHead>
                  <TableHead className="w-20">Assignees</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentIssues.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState
                        icon={CheckSquare}
                        title="No issues yet"
                        description="Add issues to this project from the backlog."
                        actions={[{ label: "Go to backlog", href: `/projects/${project.id}/backlog`, variant: "outline" }]}
                      />
                    </td>
                  </tr>
                )}
                {recentIssues.map((issue) => {
                  const TypeIcon = typeIcon[issue.type] ?? CheckSquare;
                  return (
                    <TableRow key={issue.id} className="cursor-pointer">
                      <TableCell className="ps-4 py-2">
                        <TypeIcon size={13} className={typeColor[issue.type]} />
                      </TableCell>
                      <TableCell className="py-2">
                        <span className="text-xs font-mono text-muted-foreground">{issue.code}</span>
                      </TableCell>
                      <TableCell className="py-2">
                        <span className="text-xs font-medium">{issue.title}</span>
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-1.5">
                          <span className={cn("inline-block size-1.5 rounded-full", statusDot[issue.status] ?? "bg-muted-foreground")} />
                          <span className="text-xs text-muted-foreground hidden lg:inline">{issue.status}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell py-2">
                        <Badge className={cn("text-xs font-normal px-1.5 py-0", priorityClass[issue.priority])}>
                          {issue.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell py-2">
                        {issue.dueDate ? (
                          <div className="flex items-center gap-1">
                            <CalendarDays size={11} className="text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{fmt(issue.dueDate)}</span>
                          </div>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="py-2">
                        <AvatarGroup>
                          {issue.assignees.slice(0, 3).map((a) => (
                            <Avatar key={a.id} className="size-5 ring-1 ring-background dark:ring-muted">
                              <AvatarImage src={a.avatar} alt={a.name} />
                              <AvatarFallback className="text-[8px]" colorSeed={a.id}>{a.initials}</AvatarFallback>
                            </Avatar>
                          ))}
                          {issue.assignees.length > 3 && (
                            <AvatarGroupCount className="size-5 text-[8px]">+{issue.assignees.length - 3}</AvatarGroupCount>
                          )}
                        </AvatarGroup>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* ── Team ── */}
        <div className="rounded-xl border bg-card px-4 py-3.5">
          <p className="text-xs font-medium mb-3">Team ({project.members.length})</p>
          <div className="flex flex-wrap gap-2">
            {project.members.map((m) => (
              <div key={m.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border hover:bg-accent transition-colors">
                <Avatar className="size-6 shrink-0">
                  <AvatarImage src={m.avatar} alt={m.name} />
                  <AvatarFallback className="text-[9px]" colorSeed={m.id}>{m.initials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs font-medium leading-tight">{m.name.split(" ")[0]}</p>
                  <p className="text-xs text-muted-foreground capitalize leading-tight">{m.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </AppSidebar>
  );
}
