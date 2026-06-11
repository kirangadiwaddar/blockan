"use client";

import React from "react";
import AppSidebar from "@/components/shadcn-space/blocks/dashboard/app-sidebar";
import { KanbanBoard } from "@/components/board/kanban-board";
import { useProjects } from "@/lib/projects-context";
import { useIssues } from "@/lib/issues-context";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, Download, FileSpreadsheet, FileDown, Loader2, UserPlus } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotFoundBlock } from "@/components/ui/not-found-block";
import { InviteMemberDialog } from "@/components/team/invite-member-dialog";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type Issue } from "@/lib/types";
import * as XLSX from "xlsx";
import { createGoogleSpreadsheet } from "@/lib/google-sheets";
import { ExportModal } from "@/components/board/export-modal";

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
  const { projects, sprintsForProject, projectBySlug, loading: projectsLoading } = useProjects();
  const { issues: allIssues, loading: issuesLoading } = useIssues();

  const [exportModal, setExportModal] = React.useState<{ open: boolean; mode: "xlsx" | "sheets" }>({ open: false, mode: "xlsx" });
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [sheetsLoading, setSheetsLoading] = React.useState(false);
  const [sheetsError, setSheetsError] = React.useState<string | null>(null);

  const project = projectBySlug(projectId) ?? projects[0];
  const sprints = sprintsForProject(project?.id ?? projectId);
  const sprint  = sprints.find((s) => s.status === "active");
  const projectIssues = allIssues.filter((i) => i.projectId === project?.id);

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

  const handleExport = async (filename: string, statuses: string[]) => {
    const filtered = projectIssues.filter((i) => statuses.includes(i.status));
    const allColKeys = Object.keys(COL_MAP);
    if (exportModal.mode === "xlsx") {
      downloadXlsx(filtered, `${filename}.xlsx`, allColKeys);
      setExportModal({ open: false, mode: "xlsx" });
    } else {
      setSheetsError(null);
      setSheetsLoading(true);
      try {
        const headers = allColKeys.map((k) => COL_LABELS[k] ?? k);
        const rows = buildRows(filtered, allColKeys);
        const url = await createGoogleSpreadsheet(filename, headers, rows);
        window.open(url, "_blank");
        setExportModal({ open: false, mode: "sheets" });
      } catch (err: any) {
        setSheetsError(err?.message ?? "Failed to create spreadsheet");
      } finally {
        setSheetsLoading(false);
      }
    }
  };

  return (
    <AppSidebar>
      <InviteMemberDialog open={inviteOpen} onClose={() => setInviteOpen(false)} projectId={project?.id ?? ""} />
      <ExportModal
        open={exportModal.open}
        mode={exportModal.mode}
        defaultName={`${projectName} - Issues`}
        issueCount={projectIssues.length}
        loading={sheetsLoading}
        error={sheetsError}
        onClose={() => setExportModal((s) => ({ ...s, open: false }))}
        onExport={handleExport}
      />
      <div className="flex flex-col gap-4 p-6 overflow-hidden w-full">

        {/* Title */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={`avatar-orb ${project.color} size-7 rounded-full`} />
            <h1 className="text-xl font-semibold">{project.name}</h1>
          </div>

          {/* Invite + Export buttons */}
          <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="flex items-center gap-2 h-9 px-3.5 rounded-lg border border-input bg-background text-sm hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <UserPlus size={14} />
            Invite
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="flex items-center gap-2 h-9 px-3.5 rounded-lg border border-input bg-background text-sm hover:bg-muted/50 transition-colors cursor-pointer shrink-0"
                >
                  <Download size={14} />
                  Export
                </button>
              }
            />
            <DropdownMenuContent align="end" className="w-64 p-1">
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                {projectIssues.length} issue{projectIssues.length !== 1 ? "s" : ""} · {projectName}
              </div>
              <DropdownMenuSeparator />

              {/* Download XLSX */}
              <DropdownMenuItem
                onClick={() => setExportModal({ open: true, mode: "xlsx" })}
                className="gap-3 cursor-pointer py-2.5"
              >
                <span className="size-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center shrink-0">
                  <FileDown size={15} className="text-emerald-600 dark:text-emerald-400" />
                </span>
                <div>
                  <div className="text-sm font-medium">Download XLSX</div>
                  <div className="text-[11px] text-muted-foreground">Excel spreadsheet with all issues</div>
                </div>
              </DropdownMenuItem>

              {/* Google Sheets */}
              <DropdownMenuItem
                onClick={() => { setSheetsError(null); setExportModal({ open: true, mode: "sheets" }); }}
                disabled={sheetsLoading}
                className="gap-3 cursor-pointer py-2.5"
              >
                <span className="size-8 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center shrink-0">
                  {sheetsLoading
                    ? <Loader2 size={15} className="text-blue-600 dark:text-blue-400 animate-spin" />
                    : <FileSpreadsheet size={15} className="text-blue-600 dark:text-blue-400" />
                  }
                </span>
                <div>
                  <div className="text-sm font-medium">
                    {sheetsLoading ? "Saving to Sheets…" : "Add to Google Sheets"}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {sheetsLoading ? "Please wait" : "Creates a new spreadsheet in your Drive"}
                  </div>
                </div>
              </DropdownMenuItem>

            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>

        {/* Board */}
        <KanbanBoard
          initialIssues={projectIssues}
          members={project?.members ?? []}
          projectId={project?.id}
          activeSprintId={sprint?.id}
          defaultOpenIssueId={defaultOpenIssueId}
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
