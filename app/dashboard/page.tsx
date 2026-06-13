"use client";

import { useProjects, canManageSprints } from "@/lib/projects-context";
import { useIssues } from "@/lib/issues-context";
import { useUser } from "@/lib/supabase/user-context";
import { Skeleton } from "@/components/ui/skeleton";
import AppSidebar from "@/components/shadcn-space/blocks/dashboard/app-sidebar";
import RecentActivities from "@/components/shadcn-space/blocks/dashboard/recent-activities";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Bug, BookOpen, CheckSquare, Zap,
  Target, Users, ArrowRight, FolderOpen, Inbox,
  FolderPlus, UserPlus, SquarePen, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateProjectSheet } from "@/components/projects/create-project-sheet";
import { InviteMemberDialog } from "@/components/team/invite-member-dialog";
import { OnboardingScreen } from "@/components/onboarding/onboarding-screen";
import { useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, progressColor } from "@/lib/utils";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
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
const priorityClass: Record<string, string> = {
  Critical: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
  High: "bg-orange-50 text-orange-500 dark:bg-orange-950 dark:text-orange-400",
  Medium: "bg-yellow-50 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400",
  Low: "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400",
};

/* ─── CSS Donut chart ───────────────────────────────────────── */

const PRIORITY_META: Record<string, { color: string; bg: string; light: string }> = {
  Critical: { color: "#ef4444", bg: "bg-red-500", light: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400" },
  High: { color: "#f97316", bg: "bg-orange-500", light: "bg-orange-50 text-orange-500 dark:bg-orange-950 dark:text-orange-400" },
  Medium: { color: "#eab308", bg: "bg-yellow-400", light: "bg-yellow-50 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400" },
  Low: { color: "#22c55e", bg: "bg-green-500", light: "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400" },
};

function DonutChart({ data, total }: { data: { name: string; count: number; fill: string }[]; total: number }) {
  const size = 160;
  const stroke = 28;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const gap = 3; // gap in degrees between segments

  let angle = -90; // start at top
  const segments = data
    .filter((d) => d.count > 0)
    .map((d) => {
      const pct = d.count / total;
      const deg = pct * 360 - gap;
      const startAngle = angle + gap / 2;
      const endAngle = startAngle + deg;

      const toRad = (a: number) => (a * Math.PI) / 180;
      const x1 = cx + r * Math.cos(toRad(startAngle));
      const y1 = cy + r * Math.sin(toRad(startAngle));
      const x2 = cx + r * Math.cos(toRad(endAngle));
      const y2 = cy + r * Math.sin(toRad(endAngle));
      const largeArc = deg > 180 ? 1 : 0;

      const d_path = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
      angle += pct * 360;
      return { ...d, path: d_path, pct };
    });

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="drop-shadow-sm">
        {segments.map((seg) => (
          <path
            key={seg.name}
            d={seg.path}
            fill="none"
            stroke={seg.fill}
            strokeWidth={stroke}
            strokeLinecap="round"
            opacity={0.9}
          />
        ))}
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold leading-none">{total}</span>
        <span className="text-[11px] text-muted-foreground mt-0.5">issues</span>
      </div>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────── */

export default function DashboardPage() {
  const { projects, sprints, loading: projectsLoading, addProject } = useProjects();
  const { issues, loading: issuesLoading } = useIssues();
  const { displayName, user } = useUser();
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  // ── Role check: owner/admin of ANY project sees full workspace data ──
  const isOrgAdmin = projects.some((p) => {
    const me = p.members.find((m) => m.id === user?.id);
    return me && canManageSprints(me.role as any);
  });

  // Owner/admin → all issues; member/viewer/guest → only assigned to them
  const myIssues = issues.filter((i) =>
    user?.id && i.assignees.some((a) => a.id === user.id)
  );
  const scopedIssues = isOrgAdmin ? issues : myIssues;

  const totalIssues = scopedIssues.length;
  const doneIssues  = scopedIssues.filter((i) => i.status === "Completed").length;
  const inProgress  = scopedIssues.filter((i) => i.status === "In Progress").length;
  const activeSprint = sprints.find((s) => s.status === "active");
  const activeSprintProject = activeSprint ? projects.find((p) => p.id === activeSprint.projectId || (p as any)._uuid === activeSprint.projectId) : null;
  const sprintIssues = activeSprint ? scopedIssues.filter((i) => i.sprintId === activeSprint.id) : [];
  const sprintDone = sprintIssues.filter((i) => i.status === "Completed").length;
  const overdue = scopedIssues.filter((i) => i.dueDate && new Date(i.dueDate) < new Date() && i.status !== "Completed").length;

  const priorityChart = ["Critical", "High", "Medium", "Low"].map((p) => ({
    name: p,
    count: scopedIssues.filter((i) => i.priority === p).length,
    fill: ({ Critical: "#ef4444", High: "#f97316", Medium: "#eab308", Low: "#22c55e" } as Record<string, string>)[p],
  }));

  // Recent issues — all for admin, assigned-only for members
  const recentIssues = [...scopedIssues].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  ).slice(0, 8);

  // Compute per-project stats dynamically from live issues (not cached project.progress)
  const projectStats = (p: typeof projects[0]) => {
    const pi = issues.filter((i) => i.projectId === p.id);
    const done = pi.filter((i) => i.status === "Completed").length;
    const open = pi.filter((i) => i.status !== "Completed" && i.status !== "Cancelled").length;
    const progress = pi.length ? Math.round((done / pi.length) * 100) : 0;
    return { progress, openIssues: open, totalIssues: pi.length };
  };

  const loading = projectsLoading || issuesLoading;

  if (loading && projects.length === 0) {
    return (
      <AppSidebar>
        <div className="flex flex-col gap-6 p-6 w-full">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 xl:col-span-6">
              <div className="rounded-2xl border p-6 flex flex-col gap-6 h-40">
                <Skeleton className="h-5 w-52" />
                <div className="flex items-center gap-8">
                  <Skeleton className="h-10 w-20" />
                  <Skeleton className="h-10 w-20" />
                  <Skeleton className="h-10 w-20" />
                </div>
              </div>
            </div>
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="col-span-12 sm:col-span-6 xl:col-span-3 rounded-2xl border p-5 flex items-center gap-4">
                <Skeleton className="size-12 rounded-xl" />
                <div className="flex-1 flex flex-col gap-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-12" />
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 xl:col-span-8 rounded-2xl border p-6 flex flex-col gap-4">
              <Skeleton className="h-5 w-32" />
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="size-4 rounded" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-16 hidden md:block" />
                </div>
              ))}
            </div>
            <div className="col-span-12 xl:col-span-4 rounded-2xl border p-4 flex flex-col gap-3">
              <Skeleton className="h-5 w-32" />
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-7 rounded-full" />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <Skeleton className="h-2.5 w-3/4" />
                    <Skeleton className="h-2 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AppSidebar>
    );
  }

  /* ── Onboarding — shown for brand new users with no projects ── */
  if (!loading && projects.length === 0) {
    return (
      <AppSidebar>
        <CreateProjectSheet open={createProjectOpen} onOpenChange={setCreateProjectOpen} onCreated={async (p) => { await addProject(p); window.location.href = `/projects/${p.key.toLowerCase()}/board`; }} />
        <OnboardingScreen
          displayName={displayName}
          onCreateProject={() => setCreateProjectOpen(true)}
        />
      </AppSidebar>
    );
  }

  return (
    <AppSidebar>
      <div className="flex flex-col gap-6 p-6 mx-auto w-full">

        {/* ── 3-column top row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Welcome block */}
          <Card className="rounded-xl relative overflow-hidden">
            <CardContent className="flex flex-col gap-3 h-full justify-between">
              <div
                className="absolute inset-0 z-0"
                style={{
                  background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(249, 115, 22, 0.25), transparent 70%)",
                }}
              />
              <div className="mb-4">
                <p className="text-base font-semibold">Welcome back,<br /></p>
                <h1 className="text-xl font-bold mb-2">{displayName} 👋</h1>
                <p className="text-xs text-muted-foreground mt-0.5">{isOrgAdmin ? "Here's what's happening across all projects today." : "Here's your assigned work across projects today."}</p>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <p className="text-lg font-bold leading-none">{totalIssues - doneIssues}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{isOrgAdmin ? "Open" : "My Open"}</p>
                </div>
                <Separator orientation="vertical" className="h-7" />
                <div>
                  <p className="text-lg font-bold leading-none">{inProgress}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">In Progress</p>
                </div>
                <Separator orientation="vertical" className="h-7" />
                <div>
                  <p className="text-lg font-bold leading-none">{doneIssues}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Done</p>
                </div>
                <Separator orientation="vertical" className="h-7" />
                <div>
                  <p className="text-lg font-bold leading-none text-red-500">{overdue}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Overdue</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sprint card */}
          <Card className="rounded-xl relative">
            <CardContent className="flex flex-col gap-2.5 h-full justify-between">

              <div
                className="absolute inset-0 z-0"
                style={{
                  background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(139, 92, 246, 0.25), transparent 70%)",
                }}
              />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-medium">{activeSprint?.name ?? "No active sprint"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{activeSprint?.goal ?? "—"}</p>
                </div>
                <div className="p-1.5 rounded-full border shrink-0"><Target size={16} /></div>
              </div>
              <Progress value={sprintIssues.length > 0 ? (sprintDone / sprintIssues.length) * 100 : 0} className="h-1.5" indicatorClassName={progressColor(sprintIssues.length > 0 ? Math.round((sprintDone / sprintIssues.length) * 100) : 0)} />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{sprintDone}/{sprintIssues.length} done</span>
                <Link href={activeSprintProject ? `/projects/${activeSprintProject.id}/sprints` : "/projects"} className={buttonVariants({ variant: "secondary", size: "sm", className: "h-6 text-[11px] px-2 cursor-pointer" })}>
                  View <ArrowRight size={11} />
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Team card */}
          <Card className="rounded-xl relative">
            <CardContent className="flex flex-col gap-2.5 h-full justify-between">
              <div
                className="absolute inset-0 z-0"
                style={{
                  background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(6, 182, 212, 0.25), transparent 70%)",
                }}
              />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-medium">Team Members</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Across {projects.length} project{projects.length !== 1 ? "s" : ""}</p>
                </div>
                <div className="p-1.5 rounded-full border shrink-0"><Users size={16} /></div>
              </div>
              <div className="avatar-stack">
              <div className="bg-background inline-flex items-center justify-start rounded-full border p-1">
                <AvatarGroup>
                  {Array.from(new Map(projects.flatMap((p) => p.members).map((m) => [m.id, m])).values()).slice(0, 5).map((m) => (
                    <Avatar key={m.id} className="size-7 ring-2 ring-background dark:ring-muted">
                      <AvatarImage src={m.avatar} alt={m.name} />
                      <AvatarFallback className="text-xs" colorSeed={m.id}>{m.initials}</AvatarFallback>
                    </Avatar>
                  ))}
                </AvatarGroup>

                <p className="text-muted-foreground px-2 text-xs">
                  Full Access Control to <strong className="text-foreground font-medium">Developers</strong>.
                </p>
              </div>
              </div>
              <Link href="/projects" className={buttonVariants({ variant: "secondary", size: "sm", className: "h-6 text-[11px] px-2 w-fit cursor-pointer" })}>
                All Projects <ArrowRight size={11} />
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* ── Projects table + Priority donut side by side ── */}
        <div className="grid grid-cols-12 gap-4">
          
          <div className="col-span-12 xl:col-span-8">
            <Card className="rounded-2xl h-full">
              <CardHeader className="border-b px-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{isOrgAdmin ? "Recent Issues" : "My Recent Issues"}</CardTitle>
                  <CardDescription>Latest activity across all projects</CardDescription>
                </div>
                <CardAction>
                </CardAction>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-y-auto max-h-[360px]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-8 ps-4" />
                        <TableHead className="w-20">Code</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead className="w-28">Status</TableHead>
                        <TableHead className="w-24 hidden md:table-cell">Priority</TableHead>
                        <TableHead className="w-20 hidden sm:table-cell">Assignees</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentIssues.length === 0 && (
                        <tr>
                          <td colSpan={6}>
                            <EmptyState
                              icon={Inbox}
                              title={isOrgAdmin ? "No issues yet" : "No issues assigned to you"}
                              description={isOrgAdmin ? "Create issues across your projects to track work here." : "Issues assigned to you across projects will appear here."}
                              actions={[{ label: "View projects", href: "/projects", variant: "outline" }]}
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
                              <span className="text-sm font-medium">{issue.title}</span>
                            </TableCell>
                            <TableCell className="py-2">
                              <div className="flex items-center justify-start gap-1.5">
                                <span className={cn("inline-block size-2 rounded-full", statusDot[issue.status] ?? "bg-muted-foreground")} />
                                <span className="text-xs text-muted-foreground">{issue.status}</span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell py-2">
                              <Badge className={cn("text-xs font-normal", priorityClass[issue.priority])}>
                                {issue.priority}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell py-2">
                              <AvatarGroup>
                                {issue.assignees.slice(0, 3).map((a) => (
                                  <Avatar key={a.id} className="size-7 ring-2 ring-background dark:ring-muted">
                                    <AvatarImage src={a.avatar} alt={a.name} />
                                    <AvatarFallback className="text-xs" colorSeed={a.id}>{a.initials}</AvatarFallback>
                                  </Avatar>
                                ))}
                                {issue.assignees.length > 3 && (
                                  <AvatarGroupCount className="size-7 text-xs">+{issue.assignees.length - 3}</AvatarGroupCount>
                                )}
                              </AvatarGroup>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Priority donut */}
          <div className="col-span-12 lg:col-span-4">
            <Card className="rounded-2xl h-full">
              <CardHeader className="border-b px-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Issues by Priority</CardTitle>
                  <CardDescription>{isOrgAdmin ? `${scopedIssues.length} total` : `${myIssues.length} assigned to me`}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-5 py-6 px-5">
                <DonutChart data={priorityChart} total={myIssues.length} />

                {/* Legend rows */}
                <div className="flex flex-col gap-2.5 w-full">
                  {priorityChart.map((entry) => {
                    const pct = myIssues.length > 0 ? Math.round((entry.count / myIssues.length) * 100) : 0;
                    const meta = PRIORITY_META[entry.name];
                    return (
                      <div key={entry.name} className="flex items-center gap-3">
                        <span className={cn("inline-flex items-center justify-center text-xs font-semibold px-2 py-0.5 rounded-full shrink-0", meta.light)}>
                          {entry.name}
                        </span>
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, background: entry.fill }}
                          />
                        </div>
                        <span className="text-xs font-semibold tabular-nums w-4">{entry.count}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── Recent Issues + Activity ── */}
        <div className="grid grid-cols-12 gap-4">
          

          {/* Projects table */}
          <div className="col-span-12 lg:col-span-8">
            <Card className="rounded-2xl h-full">
              <CardHeader className="border-b px-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Projects</CardTitle>
                  <CardDescription>Progress across all active projects</CardDescription>
                </div>
                <CardAction>
                </CardAction>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="ps-4 w-8" />
                      <TableHead>Project</TableHead>
                      <TableHead className="w-32 hidden sm:table-cell">Progress</TableHead>
                      <TableHead className="w-16 hidden sm:table-cell">%</TableHead>
                      <TableHead className="w-20">Open</TableHead>
                      <TableHead className="w-24 hidden lg:table-cell">Team</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.length === 0 && (
                      <tr>
                        <td colSpan={8}>
                          <EmptyState
                            icon={FolderOpen}
                            title="No projects yet"
                            description="Create a project to start tracking work here."
                            actions={[{ label: "New project", href: "/projects" }]}
                          />
                        </td>
                      </tr>
                    )}
                    {projects.map((project) => {
                      const { progress, openIssues, totalIssues } = projectStats(project);
                      return (
                      <TableRow key={project.id} className="cursor-pointer" onClick={() => { }}>
                        <TableCell className="ps-4 py-2">
                          <div className={cn("avatar-orb size-5 rounded-full", project.color)} />
                        </TableCell>
                        <TableCell className="py-2">
                          <Link href={`/projects/${project.id}`} className="text-sm font-medium hover:underline">
                            {project.name}
                          </Link>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px] hidden md:block">{project.description}</p>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell py-2">
                          <Progress value={progress} className="h-1 w-24" indicatorClassName={progressColor(progress)} />
                        </TableCell>
                        <TableCell className="hidden sm:table-cell py-2">
                          <span className="text-xs text-muted-foreground">{progress}%</span>
                        </TableCell>
                        <TableCell className="py-2">
                          <span className="text-sm font-medium">{openIssues}</span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell py-2">
                          <AvatarGroup>
                            {project.members.slice(0, 3).map((m) => (
                              <Avatar key={m.id} className="size-7 ring-2 ring-background dark:ring-muted">
                                <AvatarImage src={m.avatar} alt={m.name} />
                                <AvatarFallback className="text-xs" colorSeed={m.id}>{m.initials}</AvatarFallback>
                              </Avatar>
                            ))}
                            {project.members.length > 3 && (
                              <AvatarGroupCount className="size-7 text-xs">+{project.members.length - 3}</AvatarGroupCount>
                            )}
                          </AvatarGroup>
                        </TableCell>
                      </TableRow>
                    )})}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div className="col-span-12 xl:col-span-4">
            <RecentActivities />
          </div>
        </div>

      </div>
    </AppSidebar>
  );
}
