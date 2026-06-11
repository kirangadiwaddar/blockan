"use client";

import { useState, useEffect } from "react";
import { Issue, IssueStatus, IssuePriority, IssueType, Member } from "@/lib/types";
import { useUser } from "@/lib/supabase/user-context";
import { useProjects } from "@/lib/projects-context";
import { createIssue as dbCreateIssue } from "@/lib/supabase/db";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { MemberPicker } from "@/components/ui/member-picker";
import {
  Bug, BookOpen, CheckSquare, Zap,
  ChevronDown, Users, X, Play,
} from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";

/* ─── Constants ─────────────────────────────────────────── */

const STATUSES: { value: IssueStatus; label: string; dot: string }[] = [
  { value: "Todo",        label: "Todo",        dot: "bg-muted-foreground" },
  { value: "In Progress", label: "In Progress", dot: "bg-blue-500"         },
  { value: "Reviewing",   label: "Reviewing",   dot: "bg-purple-500"       },
  { value: "Completed",   label: "Completed",   dot: "bg-green-500"        },
];

const PRIORITIES: { value: IssuePriority; label: string; className: string }[] = [
  { value: "Critical", label: "Critical", className: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"          },
  { value: "High",     label: "High",     className: "bg-orange-50 text-orange-500 dark:bg-orange-950 dark:text-orange-400" },
  { value: "Medium",   label: "Medium",   className: "bg-yellow-50 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400" },
  { value: "Low",      label: "Low",      className: "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400"    },
];

const TYPES: { value: IssueType; icon: React.ElementType; color: string }[] = [
  { value: "Bug",   icon: Bug,         color: "text-red-500"    },
  { value: "Story", icon: BookOpen,    color: "text-blue-500"   },
  { value: "Task",  icon: CheckSquare, color: "text-green-500"  },
  { value: "Epic",  icon: Zap,         color: "text-purple-500" },
];

/* ─── Props ─────────────────────────────────────────────── */

interface Props {
  open: boolean;
  defaultStatus: string;
  projectId?: string;                // slug, e.g. "ph"
  defaultSprintId?: string;          // pre-select active sprint
  onOpenChange: (open: boolean) => void;
  onCreated: (issue: Issue) => void;
}

/* ─── FieldSection helper ───────────────────────────────── */

function FieldSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground uppercase tracking-wide">{label}</Label>
      {children}
    </div>
  );
}

function SelectTrigger({ children, className, ...props }: { children: React.ReactNode; className?: string; [key: string]: any }) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm cursor-pointer hover:bg-muted/50 transition-colors select-none",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown size={13} className="text-muted-foreground shrink-0" />
    </button>
  );
}

/* ─── Component ─────────────────────────────────────────── */

export function CreateIssueSheet({ open, defaultStatus, projectId, defaultSprintId, onOpenChange, onCreated }: Props) {
  const { displayName, email, avatarUrl, initials, user } = useUser();
  const { projects, projectBySlug, uuidForSlug, sprintsForProject } = useProjects();

  // Determine project + members + sprints
  const project = projectId ? projectBySlug(projectId) : projects[0];
  const availableMembers: Member[] = project?.members ?? [];
  const availableSprints = project ? sprintsForProject(project.id).filter((s) => s.status === "active" || s.status === "planned") : [];

  // Form state
  const [title, setTitle]           = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus]         = useState<IssueStatus>(defaultStatus as IssueStatus || "Todo");
  const [priority, setPriority]     = useState<IssuePriority>("Medium");
  const [type, setType]             = useState<IssueType>("Task");
  const [points, setPoints]         = useState("");
  const [dueDate, setDueDate]       = useState("");
  const [sprintId, setSprintId]     = useState<string | undefined>(defaultSprintId);
  const [assignees, setAssignees]   = useState<Member[]>([]);

  // Reset form when opened
  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setStatus((defaultStatus as IssueStatus) || "Todo");
      setPriority("Medium");
      setType("Task");
      setPoints("");
      setDueDate("");
      setSprintId(defaultSprintId);
      setAssignees([]);
    }
  }, [open, defaultStatus]);

  // Reporter (current user)
  const reporter: Member = {
    id: user?.id ?? "local",
    name: displayName || "You",
    initials: initials || "?",
    avatar: avatarUrl || undefined,
    role: "member",
  };

  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!title.trim() || creating) return;

    const key = project?.key ?? "ISSUE";
    const code = `${key}-${Math.floor(Math.random() * 9000 + 1000)}`;
    const slug = projectId ?? project?.id ?? "ph";
    const uuid = uuidForSlug(slug);

    // Optimistic issue (shown immediately)
    const optimistic: Issue = {
      id: `local-${Date.now()}`,
      code,
      title: title.trim(),
      description: description.trim() || undefined,
      type,
      status,
      priority,
      assignees,
      reporter,
      projectId: uuid ?? slug,
      sprintId: sprintId || undefined,
      storyPoints: points ? parseInt(points) : undefined,
      dueDate: dueDate || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onCreated(optimistic);
    onOpenChange(false);

    // Persist to Supabase in background (only if UUID available)
    if (uuid && user) {
      setCreating(true);
      dbCreateIssue({
        projectUuid: uuid,
        sprintId: sprintId || undefined,
        title: optimistic.title,
        description: optimistic.description,
        type,
        status,
        priority,
        assigneeId: assignees[0]?.id,
        reporterId: user.id,
        points: points ? parseInt(points) : undefined,
        dueDate: dueDate || undefined,
        code,
      }).catch(console.error).finally(() => setCreating(false));
    }
  };

  const selectedStatus = STATUSES.find((s) => s.value === status) ?? STATUSES[0];
  const selectedPriority = PRIORITIES.find((p) => p.value === priority) ?? PRIORITIES[2];
  const selectedType = TYPES.find((t) => t.value === type) ?? TYPES[2];
  const TypeIcon = selectedType.icon;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <TypeIcon size={15} className={selectedType.color} />
            <SheetTitle className="text-base">Create Issue</SheetTitle>
            {project && (
              <Badge variant="outline" className="font-mono text-xs">{project.key}</Badge>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 flex flex-col gap-5 px-6 py-5 overflow-y-auto">

          {/* Title — prominent, like Jira */}
          <div className="flex flex-col gap-1.5">
            <Input
              placeholder="Issue title *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 text-base font-medium border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary bg-transparent placeholder:text-muted-foreground/50"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter" && title.trim()) handleCreate(); }}
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <Textarea
              placeholder="Add a description — what needs to be done, acceptance criteria, context…"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none text-sm"
            />
          </div>

          <Separator />

          {/* Fields grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-4">

            {/* Type */}
            <FieldSection label="Type">
              <DropdownMenu>
                <DropdownMenuTrigger render={<SelectTrigger><TypeIcon size={13} className={selectedType.color} /><span className="flex-1 text-left">{selectedType.value}</span></SelectTrigger>} />
                <DropdownMenuContent className="p-1 w-40">
                  {TYPES.map(({ value, icon: Icon, color }) => (
                    <DropdownMenuItem
                      key={value}
                      onClick={() => setType(value)}
                      className={cn("gap-2 cursor-pointer", type === value && "bg-muted")}
                    >
                      <Icon size={13} className={color} />
                      {value}
                      {type === value && <span className="ml-auto text-primary text-xs">✓</span>}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </FieldSection>

            {/* Priority */}
            <FieldSection label="Priority">
              <DropdownMenu>
                <DropdownMenuTrigger render={<SelectTrigger><Badge className={cn("text-xs font-normal h-5", selectedPriority.className)}>{selectedPriority.label}</Badge><span className="flex-1" /></SelectTrigger>} />
                <DropdownMenuContent className="p-1 w-40">
                  {PRIORITIES.map(({ value, label, className: cls }) => (
                    <DropdownMenuItem
                      key={value}
                      onClick={() => setPriority(value)}
                      className={cn("gap-2 cursor-pointer", priority === value && "bg-muted")}
                    >
                      <Badge className={cn("text-xs font-normal h-5", cls)}>{label}</Badge>
                      {priority === value && <span className="ml-auto text-primary text-xs">✓</span>}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </FieldSection>

            {/* Status */}
            <FieldSection label="Status">
              <DropdownMenu>
                <DropdownMenuTrigger render={<SelectTrigger><span className={cn("size-2 rounded-full shrink-0", selectedStatus.dot)} /><span className="flex-1 text-left">{selectedStatus.label}</span></SelectTrigger>} />
                <DropdownMenuContent className="p-1 w-44">
                  {STATUSES.map(({ value, label, dot }) => (
                    <DropdownMenuItem
                      key={value}
                      onClick={() => setStatus(value)}
                      className={cn("gap-2 cursor-pointer", status === value && "bg-muted")}
                    >
                      <span className={cn("size-2 rounded-full shrink-0", dot)} />
                      {label}
                      {status === value && <span className="ml-auto text-primary text-xs">✓</span>}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </FieldSection>

            {/* Story points */}
            <FieldSection label="Story Points">
              <Input
                type="number"
                placeholder="e.g. 3"
                min={0}
                max={100}
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                className="h-9"
              />
            </FieldSection>

            {/* Sprint */}
            {availableSprints.length > 0 && (
              <FieldSection label="Sprint">
                <DropdownMenu>
                  <DropdownMenuTrigger render={
                    <SelectTrigger>
                      <Play size={12} className="text-blue-500 shrink-0" />
                      <span className="flex-1 text-left truncate">
                        {availableSprints.find((s) => s.id === sprintId)?.name ?? "No sprint"}
                      </span>
                    </SelectTrigger>
                  } />
                  <DropdownMenuContent className="p-1 w-52">
                    <DropdownMenuItem
                      onClick={() => setSprintId(undefined)}
                      className={cn("gap-2 cursor-pointer", !sprintId && "bg-muted")}
                    >
                      <span className="size-2 rounded-full bg-muted-foreground shrink-0" />
                      No sprint
                      {!sprintId && <span className="ml-auto text-primary text-xs">✓</span>}
                    </DropdownMenuItem>
                    {availableSprints.map((s) => (
                      <DropdownMenuItem
                        key={s.id}
                        onClick={() => setSprintId(s.id)}
                        className={cn("gap-2 cursor-pointer", sprintId === s.id && "bg-muted")}
                      >
                        <span className={cn("size-2 rounded-full shrink-0", s.status === "active" ? "bg-blue-500" : "bg-muted-foreground")} />
                        <span className="flex-1 truncate">{s.name}</span>
                        {s.status === "active" && <span className="text-xs text-blue-500">Active</span>}
                        {sprintId === s.id && <span className="ml-auto text-primary text-xs">✓</span>}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </FieldSection>
            )}

            {/* Due date */}
            <FieldSection label="Due Date">
              <div>
                <DatePicker
                  value={dueDate}
                  onChange={setDueDate}
                  onClear={() => setDueDate("")}
                  placeholder="No due date"
                />
              </div>
            </FieldSection>

            {/* Reporter (read-only) */}
            <FieldSection label="Reporter">
              <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-input bg-muted/30 text-sm">
                <Avatar className="size-5 shrink-0">
                  <AvatarImage src={avatarUrl} alt={displayName} />
                  <AvatarFallback className="text-[9px]">{initials || "?"}</AvatarFallback>
                </Avatar>
                <span className="truncate text-sm">{displayName || "You"}</span>
              </div>
            </FieldSection>
          </div>

          {/* Assignees — full width, searchable */}
          <FieldSection label={`Assignees ${assignees.length > 0 ? `(${assignees.length})` : ""}`}>
            {assignees.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {assignees.map((a) => (
                  <div key={a.id} className="flex items-center gap-1.5 bg-muted rounded-full pl-1 pr-2 py-0.5">
                    <Avatar className="size-5">
                      <AvatarImage src={a.avatar} alt={a.name} />
                      <AvatarFallback className="text-[9px]">{a.initials}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs">{a.name.split(" ")[0]}</span>
                    <button
                      onClick={() => setAssignees((prev) => prev.filter((m) => m.id !== a.id))}
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {availableMembers.length > 0 ? (
              <div className="rounded-lg border border-input overflow-hidden">
                <MemberPicker
                  members={availableMembers}
                  selected={assignees}
                  onChange={setAssignees}
                  placeholder="Search team members…"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 py-5 text-center">
                <span className="size-8 rounded-lg bg-muted/60 flex items-center justify-center mx-auto">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/50"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </span>
                <p className="text-xs font-medium">No team members yet</p>
                <p className="text-xs text-muted-foreground">Invite members from the Team page</p>
              </div>
            )}
          </FieldSection>
        </div>

        <SheetFooter className="px-6 py-4 border-t gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!title.trim()} className="cursor-pointer">
            Create Issue
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
