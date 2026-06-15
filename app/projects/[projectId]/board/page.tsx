"use client";

import React from "react";
import AppSidebar from "@/components/shadcn-space/blocks/dashboard/app-sidebar";
import { KanbanBoard } from "@/components/board/kanban-board";
import { useProjects } from "@/lib/projects-context";
import { useIssues } from "@/lib/issues-context";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, FileDown, UserPlus, Settings2 } from "lucide-react";
import { NotFoundBlock } from "@/components/ui/not-found-block";
import { InviteMemberDialog } from "@/components/team/invite-member-dialog";
import { ProjectSettingsSheet } from "@/components/projects/project-settings-sheet";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type Issue } from "@/lib/types";
import { useProjectRole, canEditProject, canManageSprints } from "@/lib/projects-context";
import * as XLSX from "xlsx";

/* ─── Export helpers (outside component) ─────────────────── */

const COL_MAP: Record<string, (i: Issue) => string | number> = {
  code:        (i) => i.code ?? "",
  title:       (i) => i.title,
  type:        (i) => i.type ?? "",
  status:      (i) => i.status,
  priority:    (i) => i.priority,
  storyPoints: (i) => i.storyPoints ?? "",
  assignees:   (i) => (i.assignees ?? []).map((a) => a.name).join(", "),
  reporter:    (i) => i.reporter?.name ?? "",
  dueDate:     (i) => i.dueDate ?? "",
  createdAt:   (i) => new Date(i.createdAt).toLocaleDateString("en-US"),
};

const COL_LABELS: Record<string, string> = {
  code: "Code", title: "Title", type: "Type", status: "Status",
  priority: "Priority", storyPoints: "Story Points", assignees: "Assignees",
  reporter: "Reporter", dueDate: "Due Date", createdAt: "Created",
};

function buildRows(issues: Issue[], colKeys: string[]): (string | number)[][] {
  return issues.map((issue) => colKeys.map((k) => COL_MAP[k]?.(issue) ?? ""));
}

function downloadXlsx(issues: Issue[], filename: string, colKeys: string[]) {
  const headers = colKeys.map((k) => COL_LABELS[k] ?? k);
  const rows = buildRows(issues, colKeys);
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const colWidths = headers.map((h, ci) => ({
    wch: Math.min(Math.max(h.length, ...rows.map((r) => String(r[ci] ?? "").length)) + 2, 40),
  }));
  ws["!cols"] = colWidths;
  XLSX.utils.book_append_sheet(wb, ws, "Issues");
  XLSX.writeFile(wb, filename);
}

function BoardPageContent({ projectId }: { projectId: string }) {
  const searchParams = useSearchParams();
  const defaultOpenIssueId = searchParams.get("issue") ?? undefined;
  const { projects, allMembers, sprintsForProject, projectBySlug, loading: projectsLoading } = useProjects();
  const { issues: allIssues, loading: issuesLoading } = useIssues();
  const role = useProjectRole(projectId);
  const readOnly = !canEditProject(role);

  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const canManage = canManageSprints(role);

  const project = projectBySlug(projectId);
  const sprints = sprintsForProject(project?.id ?? projectId);
  const sprint  = sprints.find((s) => s.status === "active");
  const projectIssues = allIssues.filter((i) => i.projectId === (project?.id ?? projectId));

  const isLoading = projectsLoading || issuesLoading;

  if (!project && !isLoading) {
    return (
      <AppSidebar>
        <NotFoundBlock />
      </AppSidebar>
    );
  }

  if (isLoading && !project) {
    return (
      <AppSidebar>
        <div className="flex flex-col gap-4 p-6 w-full">
          <div className="flex items-center gap-3">
            <Skeleton className="size-7 rounded-lg" />
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="flex gap-4 mt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3 w-72 shrink-0">
                <Skeleton className="h-8 w-full rounded-xl" />
                {Array.from({ length: 3 }).map((_, j) => (
                  <Skeleton key={j} className="h-24 w-full rounded-xl" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </AppSidebar>
    );
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const key = project?.key ?? "issues";
  const projectName = project?.name ?? "Issues";

  const handleExport = (filename: string, statuses: string[]) => {
    const filtered = projectIssues.filter((i) => statuses.includes(i.status));
    const allColKeys = Object.keys(COL_MAP);
    downloadXlsx(filtered, `${filename}.xlsx`, allColKeys);
  };

  return (
    <AppSidebar>
      <InviteMemberDialog open={inviteOpen} onClose={() => setInviteOpen(false)} projectId={project?.id ?? ""} />
      {project && <ProjectSettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} project={project} />}
      <div className="flex flex-col gap-4 p-4 sm:p-6 overflow-hidden w-full">

        {/* Title + actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`avatar-orb ${project?.color} size-7 rounded-full shrink-0`} />
            <h1 className="text-xl font-semibold truncate">{project?.name}</h1>
          </div>

          {/* Invite + Export + Settings buttons */}
          <div className="flex items-center gap-2">
            {canManage && (
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="flex items-center justify-center size-9 rounded-lg border border-input bg-background hover:bg-muted/50 transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
                title="Project settings"
              >
                <Settings2 size={15} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="flex flex-1 sm:flex-none items-center justify-center gap-2 h-9 px-3.5 rounded-lg border border-input bg-background text-sm hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <UserPlus size={14} />
              Invite
            </button>
            {projectIssues.length > 0 && (
              <button
                type="button"
                onClick={() => handleExport(`${projectName} - Issues`, ["Todo","In Progress","Reviewing","Completed","Cancelled"])}
                className="flex flex-1 sm:flex-none items-center justify-center gap-2 h-9 px-3.5 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-80 transition-opacity cursor-pointer"
              >
                <FileDown size={14} />
                Export XLSX
              </button>
            )}
          </div>
        </div>

        {/* Board */}
        <KanbanBoard
          initialIssues={projectIssues}
          members={allMembers}
          projectId={project?.id}
          activeSprintId={sprint?.id}
          defaultOpenIssueId={defaultOpenIssueId}
          readOnly={readOnly}
          toolbarSlot={sprint ? (
            <div className="flex items-center gap-3 px-2 pr-4 py-2 rounded-full bg-muted/40 border min-w-0">
              <Badge className="bg-blue-500/10 text-blue-500 font-normal text-xs shrink-0">
                Active Sprint
              </Badge>
              <span className="text-sm font-medium shrink-0">{sprint.name}</span>
              {sprint.goal && (
                <>
                  <Separator orientation="vertical" />
                  <span className="text-xs text-muted-foreground truncate">{sprint.goal}</span>
                </>
              )}
              <div className="ml-auto flex items-center gap-1.5 shrink-0">
                <CalendarDays size={12} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {formatDate(sprint.startDate)} – {formatDate(sprint.endDate)}
                </span>
              </div>
            </div>
          ) : undefined}
        />
      </div>
    </AppSidebar>
  );
}

export default function BoardPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = React.use(params);
  return (
    <React.Suspense>
      <BoardPageContent projectId={projectId} />
    </React.Suspense>
  );
}
