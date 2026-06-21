"use client";

import React, { useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { createIssue as dbCreateIssue } from "@/lib/supabase/db";
import { useProjects } from "@/lib/projects-context";
import { useIssues } from "@/lib/issues-context";
import { useUser } from "@/lib/supabase/user-context";
import { type IssueStatus, type IssuePriority, type IssueType, type Issue } from "@/lib/types";
import {
  FileSpreadsheet, GitBranch, Download, Upload, RefreshCw, CheckCircle2, AlertCircle, Loader2,
} from "lucide-react";

/* ─── Types ──────────────────────────────────────────────── */

type Tab = "excel" | "github" | "jira";

interface ImportRow {
  title: string;
  description?: string;
  type: IssueType;
  status: IssueStatus;
  priority: IssuePriority;
  storyPoints?: number;
  dueDate?: string;
}

/* ─── Helpers ────────────────────────────────────────────── */

const VALID_TYPES = new Set<IssueType>(["Bug", "Story", "Task", "Epic"]);
const VALID_STATUSES = new Set<IssueStatus>(["Todo", "In Progress", "Reviewing", "Completed", "Cancelled"]);
const VALID_PRIORITIES = new Set<IssuePriority>(["Critical", "High", "Medium", "Low"]);

function toType(raw: string): IssueType {
  const v = (raw ?? "").trim();
  const cap = v.charAt(0).toUpperCase() + v.slice(1).toLowerCase() as IssueType;
  if (VALID_TYPES.has(cap)) return cap;
  if (v.toLowerCase() === "story") return "Story";
  if (v.toLowerCase() === "bug") return "Bug";
  if (v.toLowerCase() === "epic") return "Epic";
  return "Task";
}

function toStatus(raw: string): IssueStatus {
  const lower = (raw ?? "").toLowerCase().trim();
  if (lower === "todo" || lower === "open" || lower === "new") return "Todo";
  if (lower === "in progress" || lower === "in_progress" || lower === "inprogress") return "In Progress";
  if (lower === "reviewing" || lower === "review" || lower === "in review") return "Reviewing";
  if (lower === "done" || lower === "closed" || lower === "completed" || lower === "complete") return "Completed";
  if (lower === "cancelled" || lower === "canceled" || lower === "wont fix" || lower === "won't fix") return "Cancelled";
  return "Todo";
}

function toPriority(raw: string): IssuePriority {
  const lower = (raw ?? "").toLowerCase().trim();
  if (lower === "critical" || lower === "blocker") return "Critical";
  if (lower === "high" || lower === "major") return "High";
  if (lower === "low" || lower === "minor" || lower === "trivial") return "Low";
  return "Medium";
}

function makeCode(prefix: string): string {
  return `${prefix}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

/* ─── Excel sample download ──────────────────────────────── */

function downloadSample() {
  const headers = ["Title", "Description", "Type", "Status", "Priority", "Story Points", "Due Date"];
  const rows = [
    ["Fix login redirect bug", "Users are redirected to 404 after login", "Bug", "Todo", "High", "3", "2025-08-01"],
    ["User profile page", "Build the profile page with avatar and bio", "Story", "In Progress", "Medium", "5", "2025-08-15"],
    ["Update dependencies", "Upgrade all npm packages to latest", "Task", "Todo", "Low", "2", ""],
    ["Performance epic", "Improve app load time by 50%", "Epic", "Todo", "Critical", "13", "2025-09-01"],
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws["!cols"] = headers.map(() => ({ wch: 24 }));
  XLSX.utils.book_append_sheet(wb, ws, "Issues");
  XLSX.writeFile(wb, "blockan-import-sample.xlsx");
}

/* ─── Excel parser ───────────────────────────────────────── */

function parseExcel(file: File): Promise<ImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        if (rows.length < 2) return resolve([]);

        const header = rows[0].map((h) => String(h).toLowerCase().trim());
        const titleIdx = header.findIndex((h) => h === "title");
        if (titleIdx === -1) return reject(new Error('Missing required "Title" column'));

        const descIdx     = header.findIndex((h) => h === "description");
        const typeIdx     = header.findIndex((h) => h === "type");
        const statusIdx   = header.findIndex((h) => h === "status");
        const priorityIdx = header.findIndex((h) => h === "priority");
        const pointsIdx   = header.findIndex((h) => h.includes("story") || h.includes("point") || h === "sp");
        const dueDateIdx  = header.findIndex((h) => h.includes("due"));

        const result: ImportRow[] = rows.slice(1)
          .filter((r) => String(r[titleIdx] ?? "").trim())
          .map((r) => ({
            title:       String(r[titleIdx]).trim(),
            description: descIdx >= 0 && r[descIdx] ? String(r[descIdx]).trim() : undefined,
            type:        typeIdx >= 0 ? toType(String(r[typeIdx])) : "Task",
            status:      statusIdx >= 0 ? toStatus(String(r[statusIdx])) : "Todo",
            priority:    priorityIdx >= 0 ? toPriority(String(r[priorityIdx])) : "Medium",
            storyPoints: pointsIdx >= 0 && r[pointsIdx] ? parseInt(String(r[pointsIdx])) || undefined : undefined,
            dueDate:     dueDateIdx >= 0 && r[dueDateIdx] ? String(r[dueDateIdx]).trim() : undefined,
          }));

        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

/* ─── GitHub fetcher ─────────────────────────────────────── */

async function fetchGitHubIssues(repo: string, token: string): Promise<ImportRow[]> {
  const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
  if (token.trim()) headers["Authorization"] = `Bearer ${token.trim()}`;

  const rows: ImportRow[] = [];
  let page = 1;
  while (rows.length < 500) {
    const url = `https://api.github.com/repos/${repo.trim()}/issues?state=all&per_page=100&page=${page}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message ?? `GitHub API error ${res.status}`);
    }
    const data: any[] = await res.json();
    if (!data.length) break;
    for (const issue of data) {
      if (issue.pull_request) continue; // skip PRs
      const labelNames: string[] = (issue.labels ?? []).map((l: any) => l.name.toLowerCase());
      rows.push({
        title:       issue.title,
        description: issue.body?.trim() || undefined,
        type:        labelNames.some((l) => l.includes("bug")) ? "Bug"
                   : labelNames.some((l) => l.includes("epic")) ? "Epic"
                   : labelNames.some((l) => l.includes("story") || l.includes("feature")) ? "Story"
                   : "Task",
        status:      issue.state === "closed" ? "Completed" : "Todo",
        priority:    labelNames.some((l) => l.includes("critical") || l.includes("blocker")) ? "Critical"
                   : labelNames.some((l) => l.includes("high") || l.includes("major")) ? "High"
                   : labelNames.some((l) => l.includes("low") || l.includes("minor")) ? "Low"
                   : "Medium",
        dueDate:     undefined,
      });
    }
    if (data.length < 100) break;
    page++;
  }
  return rows;
}

/* ─── Jira fetcher ───────────────────────────────────────── */

async function fetchJiraIssues(baseUrl: string, email: string, token: string, projectKey: string): Promise<ImportRow[]> {
  const clean = baseUrl.trim().replace(/\/$/, "");
  const auth = Buffer.from(`${email.trim()}:${token.trim()}`).toString("base64");
  const headers = {
    Authorization: `Basic ${auth}`,
    Accept: "application/json",
  };

  const rows: ImportRow[] = [];
  let startAt = 0;
  const maxResults = 100;

  while (rows.length < 500) {
    const jql = encodeURIComponent(`project=${projectKey.trim().toUpperCase()} ORDER BY created DESC`);
    const url = `${clean}/rest/api/3/search?jql=${jql}&startAt=${startAt}&maxResults=${maxResults}&fields=summary,description,issuetype,status,priority,customfield_10016,duedate`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.errorMessages?.[0] ?? body.message ?? `Jira API error ${res.status}`);
    }
    const data = await res.json();
    const issues: any[] = data.issues ?? [];
    if (!issues.length) break;

    for (const issue of issues) {
      const f = issue.fields;
      rows.push({
        title:       f.summary?.trim() ?? "(no title)",
        description: extractJiraText(f.description),
        type:        toType(f.issuetype?.name ?? "Task"),
        status:      toStatus(f.status?.name ?? "Todo"),
        priority:    toPriority(f.priority?.name ?? "Medium"),
        storyPoints: f.customfield_10016 ?? undefined,
        dueDate:     f.duedate ?? undefined,
      });
    }

    if (issues.length < maxResults) break;
    startAt += maxResults;
  }
  return rows;
}

function extractJiraText(doc: any): string | undefined {
  if (!doc) return undefined;
  if (typeof doc === "string") return doc.trim() || undefined;
  const parts: string[] = [];
  function walk(node: any) {
    if (!node) return;
    if (node.type === "text") { parts.push(node.text ?? ""); return; }
    for (const child of node.content ?? []) walk(child);
    if (["paragraph", "heading", "listItem"].includes(node.type)) parts.push("\n");
  }
  walk(doc);
  return parts.join("").trim() || undefined;
}

/* ─── Preview table ──────────────────────────────────────── */

function PreviewTable({ rows }: { rows: ImportRow[] }) {
  const shown = rows.slice(0, 10);
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50 border-b">
              {["Title", "Type", "Status", "Priority", "Points"].map((h) => (
                <th key={h} className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((row, i) => (
              <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2 max-w-[200px] truncate font-medium">{row.title}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <Badge variant="outline" className="text-[10px] py-0">{row.type}</Badge>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{row.status}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className={cn("text-[10px] font-medium",
                    row.priority === "Critical" && "text-red-500",
                    row.priority === "High" && "text-orange-500",
                    row.priority === "Medium" && "text-yellow-600",
                    row.priority === "Low" && "text-green-600",
                  )}>{row.priority}</span>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{row.storyPoints ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 10 && (
        <div className="px-3 py-2 bg-muted/30 text-xs text-muted-foreground border-t">
          + {rows.length - 10} more issues
        </div>
      )}
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────── */

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function ImportIssuesDialog({ open, onOpenChange, projectId }: Props) {
  const { projectBySlug, uuidForSlug } = useProjects();
  const { addIssue } = useIssues();
  const { user } = useUser();

  const [tab, setTab] = useState<Tab>("excel");

  // Excel state
  const fileRef = useRef<HTMLInputElement>(null);
  const [excelRows, setExcelRows] = useState<ImportRow[]>([]);
  const [excelError, setExcelError] = useState("");
  const [excelParsing, setExcelParsing] = useState(false);

  // GitHub state
  const [ghRepo, setGhRepo] = useState("");
  const [ghToken, setGhToken] = useState("");
  const [ghRows, setGhRows] = useState<ImportRow[]>([]);
  const [ghError, setGhError] = useState("");
  const [ghFetching, setGhFetching] = useState(false);

  // Jira state
  const [jiraUrl, setJiraUrl] = useState("");
  const [jiraEmail, setJiraEmail] = useState("");
  const [jiraToken, setJiraToken] = useState("");
  const [jiraProject, setJiraProject] = useState("");
  const [jiraRows, setJiraRows] = useState<ImportRow[]>([]);
  const [jiraError, setJiraError] = useState("");
  const [jiraFetching, setJiraFetching] = useState(false);

  // Import state
  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState(0);

  const project = projectBySlug(projectId);
  const prefix = (project?.key ?? project?.name ?? "ISS").replace(/\s+/g, "").slice(0, 4).toUpperCase();
  const uuid = uuidForSlug(projectId) ?? (project as any)?._uuid;

  function reset() {
    setExcelRows([]); setExcelError(""); setExcelParsing(false);
    setGhRepo(""); setGhToken(""); setGhRows([]); setGhError(""); setGhFetching(false);
    setJiraUrl(""); setJiraEmail(""); setJiraToken(""); setJiraProject("");
    setJiraRows([]); setJiraError(""); setJiraFetching(false);
    setImporting(false); setImportDone(0);
  }

  async function handleImport(rows: ImportRow[]) {
    if (!uuid || !user || !rows.length) return;
    setImporting(true);
    let done = 0;
    for (const row of rows) {
      const code = makeCode(prefix);
      const real = await dbCreateIssue({
        projectUuid: uuid,
        title: row.title,
        description: row.description,
        type: row.type,
        status: row.status,
        priority: row.priority,
        points: row.storyPoints,
        dueDate: row.dueDate,
        reporterId: user.id,
        code,
      });
      if (real) {
        addIssue({ ...real, projectId });
        done++;
      }
    }
    setImporting(false);
    setImportDone(done);
  }

  async function handleExcelFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelError(""); setExcelRows([]); setExcelParsing(true);
    try {
      const rows = await parseExcel(file);
      setExcelRows(rows);
    } catch (err: any) {
      setExcelError(err.message ?? "Failed to parse file");
    } finally {
      setExcelParsing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleGhFetch() {
    if (!ghRepo.trim()) return;
    setGhError(""); setGhRows([]); setGhFetching(true);
    try {
      const rows = await fetchGitHubIssues(ghRepo, ghToken);
      setGhRows(rows);
    } catch (err: any) {
      setGhError(err.message ?? "Failed to fetch issues");
    } finally {
      setGhFetching(false);
    }
  }

  async function handleJiraFetch() {
    if (!jiraUrl.trim() || !jiraEmail.trim() || !jiraToken.trim() || !jiraProject.trim()) return;
    setJiraError(""); setJiraRows([]); setJiraFetching(true);
    try {
      const rows = await fetchJiraIssues(jiraUrl, jiraEmail, jiraToken, jiraProject);
      setJiraRows(rows);
    } catch (err: any) {
      setJiraError(err.message ?? "Failed to fetch issues");
    } finally {
      setJiraFetching(false);
    }
  }

  const activeRows = tab === "excel" ? excelRows : tab === "github" ? ghRows : jiraRows;

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "excel",  label: "Excel / CSV", icon: FileSpreadsheet },
    { id: "github", label: "GitHub",      icon: GitBranch },
    { id: "jira",   label: "Jira",        icon: () => (
        <svg viewBox="0 0 32 32" className="size-3.5 shrink-0" fill="currentColor">
          <path d="M15.9 2L2 15.9l6.3 6.3 7.6-7.6 7.6 7.6L29.8 16z" />
          <path d="M15.9 10.6L10.5 16l5.4 5.4 5.4-5.4z" />
        </svg>
      ),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-2xl gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-0">
          <DialogTitle className="text-base">Import Issues</DialogTitle>
          <DialogDescription className="text-sm">
            Import issues into <span className="font-medium">{project?.name ?? projectId}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-0 px-6 mt-4 border-b">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => { setTab(id); setImportDone(0); }}
              className={cn(
                "flex items-center gap-2 px-3 py-2.5 text-sm border-b-2 -mb-px transition-colors cursor-pointer",
                tab === id
                  ? "border-primary text-foreground font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">

          {/* ── Excel tab ── */}
          {tab === "excel" && (
            <>
              <div className="flex items-start gap-3 p-3.5 rounded-lg bg-muted/40 border">
                <FileSpreadsheet size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Upload an Excel or CSV file</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Required column: <span className="font-mono">Title</span>. Optional: Description, Type, Status, Priority, Story Points, Due Date.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 cursor-pointer"
                  onClick={downloadSample}
                >
                  <Download size={13} className="mr-1.5" />
                  Sample
                </Button>
              </div>

              <div
                className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-input p-8 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                {excelParsing ? (
                  <Loader2 size={20} className="animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <Upload size={20} className="text-muted-foreground" />
                    <div className="text-center">
                      <p className="text-sm font-medium">Click to upload</p>
                      <p className="text-xs text-muted-foreground">.xlsx, .xls, .csv supported</p>
                    </div>
                  </>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleExcelFile}
              />

              {excelError && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle size={14} />
                  {excelError}
                </div>
              )}
            </>
          )}

          {/* ── GitHub tab ── */}
          {tab === "github" && (
            <>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Repository</Label>
                  <Input
                    placeholder="owner/repo — e.g. vercel/next.js"
                    value={ghRepo}
                    onChange={(e) => setGhRepo(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleGhFetch()}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Personal Access Token <span className="normal-case font-normal">(optional, for private repos)</span>
                  </Label>
                  <Input
                    type="password"
                    placeholder="ghp_xxxxxxxxxxxx"
                    value={ghToken}
                    onChange={(e) => setGhToken(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleGhFetch}
                  disabled={!ghRepo.trim() || ghFetching}
                  className="self-start cursor-pointer"
                >
                  {ghFetching ? <Loader2 size={14} className="mr-2 animate-spin" /> : <RefreshCw size={14} className="mr-2" />}
                  Fetch Issues
                </Button>
              </div>
              {ghError && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle size={14} />
                  {ghError}
                </div>
              )}
            </>
          )}

          {/* ── Jira tab ── */}
          {tab === "jira" && (
            <>
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Jira Base URL</Label>
                    <Input
                      placeholder="https://yourcompany.atlassian.net"
                      value={jiraUrl}
                      onChange={(e) => setJiraUrl(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Email</Label>
                    <Input
                      type="email"
                      placeholder="you@company.com"
                      value={jiraEmail}
                      onChange={(e) => setJiraEmail(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">API Token</Label>
                    <Input
                      type="password"
                      placeholder="Jira API token"
                      value={jiraToken}
                      onChange={(e) => setJiraToken(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Project Key</Label>
                    <Input
                      placeholder="e.g. PROJ"
                      value={jiraProject}
                      onChange={(e) => setJiraProject(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === "Enter" && handleJiraFetch()}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Generate an API token at <span className="font-mono">id.atlassian.com → Security → API tokens</span>
                </p>
                <Button
                  onClick={handleJiraFetch}
                  disabled={!jiraUrl.trim() || !jiraEmail.trim() || !jiraToken.trim() || !jiraProject.trim() || jiraFetching}
                  className="self-start cursor-pointer"
                >
                  {jiraFetching ? <Loader2 size={14} className="mr-2 animate-spin" /> : <RefreshCw size={14} className="mr-2" />}
                  Fetch Issues
                </Button>
              </div>
              {jiraError && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle size={14} />
                  {jiraError}
                </div>
              )}
            </>
          )}

          {/* ── Preview ── */}
          {activeRows.length > 0 && !importDone && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{activeRows.length} issue{activeRows.length !== 1 ? "s" : ""} ready to import</p>
              </div>
              <PreviewTable rows={activeRows} />
              <Button
                onClick={() => handleImport(activeRows)}
                disabled={importing || !uuid}
                className="self-start cursor-pointer"
              >
                {importing ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Upload size={14} className="mr-2" />}
                {importing ? "Importing…" : `Import ${activeRows.length} Issue${activeRows.length !== 1 ? "s" : ""}`}
              </Button>
            </div>
          )}

          {/* ── Success ── */}
          {importDone > 0 && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
              <CheckCircle2 size={18} className="text-green-600 dark:text-green-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                  {importDone} issue{importDone !== 1 ? "s" : ""} imported successfully
                </p>
                <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                  They're now visible on your board
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="ml-auto cursor-pointer"
                onClick={() => onOpenChange(false)}
              >
                Done
              </Button>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
