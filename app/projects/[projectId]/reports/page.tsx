"use client";

import React from "react";
import { useProjects } from "@/lib/projects-context";
import { useIssues } from "@/lib/issues-context";
import { IssuePriority, IssueType } from "@/lib/types";
import AppSidebar from "@/components/shadcn-space/blocks/dashboard/app-sidebar";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import {
  Bug, BookOpen, CheckSquare, Zap, Users, Target,
  AlertTriangle, CheckCircle2, Flame, Activity, BarChart2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { NotFoundBlock } from "@/components/ui/not-found-block";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, progressColor } from "@/lib/utils";

/* ─── recharts tooltip style (dark-mode aware) ─────────────── */
const chartTooltipStyle = {
  borderRadius: 10,
  fontSize: 12,
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  color: "var(--popover-foreground)",
};

/* ─── colours ───────────────────────────────────────────────── */

const STATUS_COLORS: Record<string, string> = {
  "Todo":        "#94a3b8",
  "In Progress": "#3b82f6",
  "Reviewing":   "#a855f7",
  "Completed":   "#22c55e",
};

const PRIORITY_COLORS: Record<IssuePriority, string> = {
  Critical: "#ef4444",
  High:     "#f97316",
  Medium:   "#eab308",
  Low:      "#22c55e",
};

const TYPE_COLORS: Record<IssueType, string> = {
  Bug:   "#ef4444",
  Story: "#3b82f6",
  Task:  "#22c55e",
  Epic:  "#a855f7",
};

const TYPE_ICONS: Record<IssueType, React.ElementType> = {
  Bug: Bug, Story: BookOpen, Task: CheckSquare, Epic: Zap,
};

/* ─── mini ring chart ────────────────────────────────────────── */
function RingChart({ value, color, size = 72 }: { value: number; color: string; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={7} className="text-muted/50" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={7}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
    </svg>
  );
}

/* ─── stat card ─────────────────────────────────────────────── */
function StatCard({
  label, value, sub, icon: Icon, accent, ring, ringColor,
}: {
  label: string; value: string | number; sub: string;
  icon: React.ElementType; accent: string;
  ring?: number; ringColor?: string;
}) {
  return (
    <Card className="rounded-2xl overflow-hidden">
      <CardContent className="p-4 flex items-start gap-3">
        <div className={cn("size-8 rounded-lg flex items-center justify-center shrink-0", accent)}>
          <Icon size={15} />
        </div>
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className="text-xl font-bold leading-tight">{value}</span>
          <span className="text-xs text-muted-foreground">{sub}</span>
        </div>
        {ring !== undefined && ringColor && (
          <div className="relative shrink-0">
            <RingChart value={ring} color={ringColor} size={56} />
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold">{ring}%</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Page ────────────────────────────────────────────────── */

export default function ReportsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = React.use(params);
  const { sprintsForProject, projectBySlug, loading: projectsLoading } = useProjects();
  const { issues: allCtxIssues, loading: issuesLoading } = useIssues();

  const project = projectBySlug(projectId);
  const sprints = sprintsForProject(project?.id ?? projectId);
  const issues  = allCtxIssues.filter((i) => i.projectId === project?.id);

  if (!project && (projectsLoading || issuesLoading)) {
    return (
      <AppSidebar>
        <div className="flex flex-col gap-4 p-4 sm:p-5 w-full">
          <div className="flex items-center gap-3">
            <Skeleton className="size-7 rounded-lg" />
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border p-5">
                <Skeleton className="h-3 w-20 mb-3" />
                <Skeleton className="h-8 w-12" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border p-5 flex flex-col gap-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-48 w-full rounded-xl" />
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

  /* ── aggregate stats ── */
  const totalIssues   = issues.length;
  const done          = issues.filter((i) => i.status === "Completed").length;
  const inProgress    = issues.filter((i) => i.status === "In Progress").length;
  const reviewing     = issues.filter((i) => i.status === "Reviewing").length;
  const todo          = issues.filter((i) => i.status === "Todo").length;
  const totalPts      = issues.reduce((s, i) => s + (i.storyPoints ?? 0), 0);
  const donePts       = issues.filter((i) => i.status === "Completed").reduce((s, i) => s + (i.storyPoints ?? 0), 0);
  const completionPct = totalIssues > 0 ? Math.round((done / totalIssues) * 100) : 0;
  const ptsPct        = totalPts > 0 ? Math.round((donePts / totalPts) * 100) : 0;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const overdue = issues.filter((i) => {
    if (!i.dueDate || i.status === "Completed" || i.status === "Cancelled") return false;
    const d = new Date(i.dueDate); d.setHours(0, 0, 0, 0);
    return d < today;
  });

  const activeSprint  = sprints.find((s) => s.status === "active");
  const sprintIssues  = activeSprint ? issues.filter((i) => i.sprintId === activeSprint.id) : [];
  const sprintDone    = sprintIssues.filter((i) => i.status === "Completed").length;
  const sprintPct     = sprintIssues.length > 0 ? Math.round((sprintDone / sprintIssues.length) * 100) : 0;

  /* ── chart data ── */
  const statusData = Object.entries(
    issues.reduce<Record<string, number>>((acc, i) => {
      acc[i.status] = (acc[i.status] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value, fill: STATUS_COLORS[name] ?? "#94a3b8" }));

  const priorityData = (["Critical", "High", "Medium", "Low"] as IssuePriority[]).map((p) => ({
    name: p,
    count: issues.filter((i) => i.priority === p).length,
    fill: PRIORITY_COLORS[p],
  }));


  /* ── member workload ── */
  const workload = project.members.map((m) => {
    const assigned  = issues.filter((i) => i.assignees.some((a) => a.id === m.id));
    const completed = assigned.filter((i) => i.status === "Completed").length;
    const active    = assigned.filter((i) => i.status === "In Progress" || i.status === "Reviewing").length;
    const open      = assigned.filter((i) => i.status === "Todo").length;
    return { member: m, total: assigned.length, completed, active, open };
  }).sort((a, b) => b.total - a.total);

  /* ── sprint velocity ── */
  const velocityData = sprints.map((s) => ({
    name: s.name.length > 12 ? s.name.slice(0, 12) + "…" : s.name,
    planned:   issues.filter((i) => i.sprintId === s.id).reduce((sum, i) => sum + (i.storyPoints ?? 0), 0),
    completed: issues.filter((i) => i.sprintId === s.id && i.status === "Completed").reduce((sum, i) => sum + (i.storyPoints ?? 0), 0),
  }));

  /* ── issue creation timeline (by month) ── */
  const timelineMap: Record<string, { month: string; total: number; completed: number }> = {};
  issues.forEach((i) => {
    const d = new Date(i.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    if (!timelineMap[key]) timelineMap[key] = { month: label, total: 0, completed: 0 };
    timelineMap[key].total++;
    if (i.status === "Completed") timelineMap[key].completed++;
  });
  const timelineData = Object.values(timelineMap).sort((a, b) => a.month.localeCompare(b.month));

  return (
    <AppSidebar>
      <div className="flex flex-col gap-4 p-4 sm:p-5 w-full">

        {/* ── Header ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`avatar-orb ${project.color} size-7 rounded-full shrink-0`} />
            <h1 className="text-xl font-semibold truncate">{project.name} — Reports</h1>
          </div>
          {overdue.length > 0 && (
            <Badge className="gap-1.5 bg-red-500/10 text-red-500 font-normal border-red-200 dark:border-red-900 self-start sm:self-auto">
              <AlertTriangle size={11} /> {overdue.length} overdue issue{overdue.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {/* ── Empty state ── */}
        {issues.length === 0 && (
          <EmptyState
            icon={BarChart2}
            title="No data to report yet"
            description="Add issues to your project to see charts and stats here."
            actions={[{ label: "Go to backlog", href: `/projects/${project.id}/backlog`, variant: "outline" }]}
          />
        )}

        {/* ── KPI cards ── */}
        {issues.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Completion Rate"
              value={`${done}/${totalIssues}`}
              sub="issues completed"
              icon={CheckCircle2}
              accent="bg-emerald-500/10 text-emerald-600"
              ring={completionPct}
              ringColor="#22c55e"
            />
            <StatCard
              label="In Progress"
              value={inProgress}
              sub={`${reviewing} reviewing · ${todo} todo`}
              icon={Activity}
              accent="bg-blue-500/10 text-blue-600"
              ring={totalIssues > 0 ? Math.round((inProgress / totalIssues) * 100) : 0}
              ringColor="#3b82f6"
            />
            <StatCard
              label="Story Points"
              value={`${donePts} / ${totalPts}`}
              sub={`${ptsPct}% delivered`}
              icon={Target}
              accent="bg-violet-500/10 text-violet-600"
              ring={ptsPct}
              ringColor="#a855f7"
            />
            <StatCard
              label="Overdue Issues"
              value={overdue.length}
              sub={`${project.members.length} members · ${sprints.length} sprints`}
              icon={overdue.length > 0 ? Flame : Users}
              accent={overdue.length > 0 ? "bg-red-500/10 text-red-600" : "bg-amber-500/10 text-amber-600"}
            />
          </div>
        )}

        {/* ── Active sprint health ── */}
        {activeSprint && (
          <Card className="rounded-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Active Sprint</CardTitle>
                  <CardDescription className="text-xs mt-0.5">{activeSprint.name}{activeSprint.goal ? ` · ${activeSprint.goal}` : ""}</CardDescription>
                </div>
                <Badge className="bg-blue-500/10 text-blue-500 font-normal text-xs">{sprintPct}% complete</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pb-4">
              <Progress value={sprintPct} className="h-2" indicatorClassName={progressColor(sprintPct)} />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(["Todo", "In Progress", "Reviewing", "Completed"] as const).map((s) => {
                  const count = sprintIssues.filter((i) => i.status === s).length;
                  return (
                    <div key={s} className="flex flex-col gap-0.5 px-3 py-2 rounded-xl bg-muted/40">
                      <span className="flex items-center gap-1.5">
                        <span className="size-2 rounded-full shrink-0" style={{ background: STATUS_COLORS[s] }} />
                        <span className="text-xs text-muted-foreground">{s}</span>
                      </span>
                      <span className="text-lg font-bold">{count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Charts row 1: status pie + issue timeline ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          <Card className="rounded-2xl">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Issues by Status</CardTitle>
              <span className="text-xs text-muted-foreground">{totalIssues} total</span>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="relative">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%" cy="50%"
                      innerRadius={62} outerRadius={76}
                      paddingAngle={4} dataKey="value"
                      startAngle={90} endAngle={-270}
                      cornerRadius={6}
                      stroke="none"
                    >
                      {statusData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} contentStyle={chartTooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold leading-none">{totalIssues}</span>
                  <span className="text-[11px] text-muted-foreground mt-0.5">issues</span>
                </div>
              </div>
              {/* status legend pills */}
              <div className="flex flex-wrap gap-2 mt-2">
                {statusData.map((s) => (
                  <div key={s.name} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 text-xs">
                    <span className="size-2 rounded-full shrink-0" style={{ background: s.fill }} />
                    {s.name} <strong className="ml-0.5">{s.value}</strong>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Issue Activity Over Time</CardTitle>
              <CardDescription className="text-xs">Created vs completed by month</CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
              {timelineData.length < 2 ? (
                <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                  Not enough data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={190}>
                  <AreaChart data={timelineData}>
                    <defs>
                      <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="doneGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} allowDecimals={false} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Area type="monotone" dataKey="total" name="Created" stroke="#3b82f6" fill="url(#totalGrad)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="completed" name="Completed" stroke="#22c55e" fill="url(#doneGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Charts row 2: priority + sprint velocity ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          <Card className="rounded-2xl">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Issues by Priority</CardTitle>
              <span className="text-xs text-muted-foreground">{totalIssues} total</span>
            </CardHeader>
            <CardContent className="pb-4 flex flex-col gap-3">
              {/* Thin donut chart */}
              <div className="relative">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={priorityData.filter((p) => p.count > 0)}
                      cx="50%" cy="50%"
                      innerRadius={62} outerRadius={76}
                      paddingAngle={4} dataKey="count"
                      startAngle={90} endAngle={-270}
                      cornerRadius={6}
                      stroke="none"
                    >
                      {priorityData.filter((p) => p.count > 0).map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} contentStyle={chartTooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold leading-none">{totalIssues}</span>
                  <span className="text-[11px] text-muted-foreground mt-0.5">issues</span>
                </div>
              </div>
              {priorityData.map((p) => (
                <div key={p.name} className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 w-20 shrink-0">
                    <span className="size-2 rounded-full shrink-0" style={{ background: p.fill }} />
                    <span className="text-xs text-muted-foreground">{p.name}</span>
                  </div>
                  <div className="flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${totalIssues > 0 ? (p.count / totalIssues) * 100 : 0}%`,
                        background: p.fill,
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold w-6 text-right shrink-0">{p.count}</span>
                </div>
              ))}
              {/* type breakdown pills */}
              <div className="flex flex-wrap gap-2 pt-2 border-t mt-1">
                {(["Bug", "Story", "Task", "Epic"] as IssueType[]).map((t) => {
                  const Icon = TYPE_ICONS[t];
                  const count = issues.filter((i) => i.type === t).length;
                  return (
                    <div key={t} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-muted/50 text-xs">
                      <Icon size={11} style={{ color: TYPE_COLORS[t] }} />
                      {t} <strong className="ml-0.5">{count}</strong>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Sprint Velocity</CardTitle>
              <CardDescription className="text-xs">Planned vs completed story points</CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
              {velocityData.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                  No sprint data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={190}>
                  <BarChart data={velocityData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Bar dataKey="planned" name="Planned" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="completed" name="Completed" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Team workload ── */}
        {workload.length > 0 && (
          <Card className="rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Team Workload</CardTitle>
              <CardDescription className="text-xs">Issue assignment and completion per member</CardDescription>
            </CardHeader>
            <CardContent className="pb-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {workload.map(({ member, total, completed, active, open }) => {
                  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                  return (
                    <div key={member.id} className="flex flex-col gap-2 p-3 rounded-xl border bg-card">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-7 shrink-0">
                          <AvatarImage src={member.avatar} alt={member.name} />
                          <AvatarFallback colorSeed={member.id}>{member.initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="text-sm font-medium truncate">{member.name}</span>
                          <Badge variant="outline" className="text-xs font-normal w-fit mt-0.5 capitalize">{member.role}</Badge>
                        </div>
                        <div className="relative shrink-0">
                          <RingChart value={pct} color={pct >= 75 ? "#22c55e" : pct >= 40 ? "#3b82f6" : "#94a3b8"} size={52} />
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">{pct}%</span>
                        </div>
                      </div>
                      <Progress value={pct} className="h-1.5" indicatorClassName={progressColor(pct)} />
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <span className="size-1.5 rounded-full bg-muted-foreground" /> {open} todo
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="size-1.5 rounded-full bg-blue-500" /> {active} active
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="size-1.5 rounded-full bg-emerald-500" /> {completed} done
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Overdue issues table ── */}
        {overdue.length > 0 && (
          <Card className="rounded-2xl border-red-200 dark:border-red-900/50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-500" />
                <CardTitle className="text-sm text-red-500">Overdue Issues ({overdue.length})</CardTitle>
              </div>
              <CardDescription className="text-xs">These issues passed their due date and are not completed</CardDescription>
            </CardHeader>
            <CardContent className="pb-4 flex flex-col gap-2">
              {overdue.slice(0, 8).map((issue) => {
                const due = new Date(issue.dueDate!);
                const daysLate = Math.round((today.getTime() - due.getTime()) / 86400000);
                return (
                  <div key={issue.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-red-500/5 border border-red-200/50 dark:border-red-900/30">
                    <span className="size-2 rounded-full bg-red-500 shrink-0" />
                    <span className="text-xs font-mono text-muted-foreground shrink-0">{issue.code}</span>
                    <span className="text-sm flex-1 truncate">{issue.title}</span>
                    <Badge variant="outline" className="text-xs font-normal shrink-0 text-red-500 border-red-200 dark:border-red-900">
                      {daysLate}d late
                    </Badge>
                    <Badge variant="outline" className="text-xs font-normal shrink-0 hidden sm:inline-flex">
                      {issue.assignees[0]?.name ?? "Unassigned"}
                    </Badge>
                  </div>
                );
              })}
              {overdue.length > 8 && (
                <p className="text-xs text-muted-foreground text-center pt-1">+{overdue.length - 8} more overdue issues</p>
              )}
            </CardContent>
          </Card>
        )}

      </div>
    </AppSidebar>
  );
}
