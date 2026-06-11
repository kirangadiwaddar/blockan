"use client";

import { useState, useEffect } from "react";
import { useComments } from "@/lib/comments-context";
import { useProjects } from "@/lib/projects-context";
import { useUser } from "@/lib/supabase/user-context";
import { Issue, IssuePriority, IssueType, Member } from "@/lib/types";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Avatar, AvatarFallback, AvatarImage, AvatarGroup, AvatarGroupCount,
} from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Textarea } from "@/components/ui/textarea";
import { MemberPicker } from "@/components/ui/member-picker";
import {
  Bug, BookOpen, CheckSquare, Zap,
  ChevronDown, CalendarDays, User, Tag, Layers, Play,
  MessageSquare, Clock, X, Pencil, Check, Trash2,
} from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { EmptyState } from "@/components/ui/empty-state";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Lightbox } from "@/components/ui/lightbox";
import { cn } from "@/lib/utils";

/* ─── Config ─────────────────────────────────────────────── */

const STATUSES = [
  { value: "Todo",        dot: "bg-muted-foreground" },
  { value: "In Progress", dot: "bg-blue-500"         },
  { value: "Reviewing",   dot: "bg-purple-500"       },
  { value: "Completed",   dot: "bg-green-500"        },
  { value: "Cancelled",   dot: "bg-red-400"          },
];

const PRIORITIES: IssuePriority[] = ["Critical", "High", "Medium", "Low"];

const TYPES: { value: IssueType; icon: React.ElementType; color: string }[] = [
  { value: "Bug",   icon: Bug,         color: "text-red-500"    },
  { value: "Story", icon: BookOpen,    color: "text-blue-500"   },
  { value: "Task",  icon: CheckSquare, color: "text-green-500"  },
  { value: "Epic",  icon: Zap,         color: "text-purple-500" },
];

const priorityCfg: Record<IssuePriority, { variant?: "destructive" | "secondary"; cls?: string }> = {
  Critical: { variant: "destructive" },
  High:     { cls: "bg-orange-50 text-orange-500 dark:bg-orange-950 dark:text-orange-400" },
  Medium:   { cls: "bg-yellow-50 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400" },
  Low:      { variant: "secondary" },
};

/* ─── Small helpers ───────────────────────────────────────── */

function PriorityBadge({ priority }: { priority: IssuePriority }) {
  const cfg = priorityCfg[priority];
  return cfg.variant
    ? <Badge variant={cfg.variant} className="font-normal h-5 text-xs">{priority}</Badge>
    : <Badge className={cn("font-normal h-5 text-xs", cfg.cls)}>{priority}</Badge>;
}

/* Table row — label cell + value cell */
function DetailRow({ icon: Icon, label, children }: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <tr>
      {/* Label cell — muted bg, fixed width */}
      <td className="w-[38%] px-3.5 py-2.5 align-middle bg-muted/40 border-r border-b border-border [tr:last-child_&]:border-b-0">
        <div className="flex items-center gap-2">
          <Icon size={12} className="text-muted-foreground shrink-0" />
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap select-none">{label}</span>
        </div>
      </td>
      {/* Value cell */}
      <td className="px-2 py-1.5 align-middle border-b border-border [tr:last-child_&]:border-b-0">{children}</td>
    </tr>
  );
}

function InlineSelect({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      "flex items-center gap-1.5 px-1.5 py-1 rounded-md hover:bg-muted cursor-pointer text-sm transition-colors w-full group/sel",
      className
    )}>
      {children}
      <ChevronDown size={11} className="text-muted-foreground/50 ml-auto shrink-0 group-hover/sel:text-muted-foreground transition-colors" />
    </div>
  );
}

/* ─── Main ────────────────────────────────────────────────── */

interface Props {
  issue: Issue | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: (updated: Issue) => void;
}

export function IssueDetailSheet({ issue, open, onOpenChange, onUpdate }: Props) {
  const { getComments, addComment, loadComments, deleteComment } = useComments();
  const { projects, projectBySlug, sprintsForProject } = useProjects();
  const { user, displayName, avatarUrl, initials } = useUser();

  const comments = issue ? getComments(issue.id) : [];
  const [draft, setDraft] = useState("");
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(issue?.title ?? "");
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState(issue?.description ?? "");

  // Load existing comments from DB whenever a new issue is opened
  useEffect(() => {
    if (issue && open) {
      loadComments(issue.id);
      setTitleValue(issue.title);
      setDescValue(issue.description ?? "");
      setEditingTitle(false);
      setEditingDesc(false);
    }
  }, [issue?.id, open, loadComments]);

  if (!issue) return null;

  // Get project members + sprints for pickers
  const project = projectBySlug(issue.projectId) ?? projects.find((p) => p.id === issue.projectId);
  const availableMembers: Member[] = project?.members ?? [];
  const availableSprints = project ? sprintsForProject(project.id) : [];
  const currentSprint = availableSprints.find((s) => s.id === issue.sprintId);

  const typeInfo = TYPES.find((t) => t.value === issue.type) ?? TYPES[2];
  const TypeIcon = typeInfo.icon;
  const statusInfo = STATUSES.find((s) => s.value === issue.status) ?? STATUSES[0];

  const update = (patch: Partial<Issue>) => onUpdate?.({ ...issue, ...patch, updatedAt: new Date().toISOString() });

  const relativeTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const submitComment = (html: string) => {
    if (!html || html === "<p></p>") return;
    addComment({
      issueId: issue.id,
      authorId: user?.id ?? "local",
      authorName: displayName || "You",
      authorInitials: initials || "?",
      authorAvatar: avatarUrl || undefined,
      body: html,
    });
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="flex flex-col gap-0 p-0 overflow-hidden [&[data-side=right]]:w-[50vw] [&[data-side=right]]:max-w-none"
        showCloseButton={false}
      >

        {/* ── Header ── */}
        <SheetHeader className="px-5 pt-4 pb-3 border-b gap-2 shrink-0">
          {/* Top row: type icon + code + type badge + close */}
          <div className="flex items-center gap-2">
            <TypeIcon size={13} className={typeInfo.color} />
            <span className="text-xs font-mono text-muted-foreground">{issue.code}</span>
            <div className="ml-auto flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-normal capitalize">{issue.type}</Badge>
              <button
                onClick={() => onOpenChange(false)}
                className="p-1 rounded-md hover:bg-muted transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Editable title */}
          {editingTitle ? (
            <Textarea
              autoFocus
              rows={2}
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={() => {
                setEditingTitle(false);
                if (titleValue.trim() && titleValue !== issue.title) update({ title: titleValue.trim() });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  setEditingTitle(false);
                  if (titleValue.trim()) update({ title: titleValue.trim() });
                }
                if (e.key === "Escape") { setEditingTitle(false); setTitleValue(issue.title); }
              }}
              className="text-sm font-semibold resize-none"
            />
          ) : (
            <SheetTitle
              className="text-sm font-semibold leading-snug cursor-text hover:bg-muted/50 rounded-md px-1 -mx-1 py-0.5 transition-colors text-left group flex items-start gap-1"
              onClick={() => { setEditingTitle(true); setTitleValue(issue.title); }}
            >
              <span className="flex-1">{issue.title}</span>
              <Pencil size={11} className="shrink-0 mt-1 opacity-0 group-hover:opacity-50 transition-opacity" />
            </SheetTitle>
          )}
        </SheetHeader>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-5 px-5 py-5">

            {/* Description */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</p>
                {!editingDesc && (
                  <button
                    onClick={() => setEditingDesc(true)}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                  >
                    <Pencil size={11} /> Edit
                  </button>
                )}
              </div>
              {editingDesc ? (
                <div className="flex flex-col gap-2">
                  <Textarea
                    autoFocus
                    rows={5}
                    value={descValue}
                    onChange={(e) => setDescValue(e.target.value)}
                    placeholder="Add a description…"
                    className="resize-none text-sm"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="cursor-pointer h-7 text-xs" onClick={() => {
                      setEditingDesc(false);
                      update({ description: descValue.trim() || undefined });
                    }}>
                      <Check size={11} /> Save
                    </Button>
                    <Button size="sm" variant="ghost" className="cursor-pointer h-7 text-xs" onClick={() => {
                      setEditingDesc(false);
                      setDescValue(issue.description ?? "");
                    }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setEditingDesc(true)}
                  className="text-sm text-muted-foreground leading-relaxed cursor-text hover:bg-muted/30 rounded-md px-2 py-1.5 -mx-2 min-h-[36px] transition-colors"
                >
                  {issue.description || <span className="italic opacity-50">Click to add a description…</span>}
                </div>
              )}
            </div>

            <Separator />

            {/* Details — table layout */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Details</p>
              <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm border-separate border-spacing-0">
                <tbody>
                  {/* Status */}
                  <DetailRow icon={Layers} label="Status">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="w-full">
                        <InlineSelect>
                          <span className={cn("size-2 rounded-full shrink-0", statusInfo.dot)} />
                          <span className="text-sm">{issue.status}</span>
                        </InlineSelect>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="p-1 w-44">
                        {STATUSES.map(({ value, dot }) => (
                          <DropdownMenuItem key={value} onClick={() => update({ status: value })} className={cn("gap-2 cursor-pointer", issue.status === value && "bg-muted font-medium")}>
                            <span className={cn("size-2 rounded-full shrink-0", dot)} />{value}
                            {issue.status === value && <Check size={12} className="ml-auto text-primary" />}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </DetailRow>

                  {/* Priority */}
                  <DetailRow icon={Tag} label="Priority">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="w-full">
                        <InlineSelect><PriorityBadge priority={issue.priority} /></InlineSelect>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="p-1 w-40">
                        {PRIORITIES.map((p) => (
                          <DropdownMenuItem key={p} onClick={() => update({ priority: p })} className={cn("gap-2 cursor-pointer", issue.priority === p && "bg-muted")}>
                            <PriorityBadge priority={p} />
                            {issue.priority === p && <Check size={12} className="ml-auto text-primary" />}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </DetailRow>

                  {/* Type */}
                  <DetailRow icon={TypeIcon} label="Type">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="w-full">
                        <InlineSelect>
                          <TypeIcon size={13} className={typeInfo.color} />
                          <span className="text-sm">{issue.type}</span>
                        </InlineSelect>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="p-1 w-36">
                        {TYPES.map(({ value, icon: TIcon, color }) => (
                          <DropdownMenuItem key={value} onClick={() => update({ type: value })} className={cn("gap-2 cursor-pointer", issue.type === value && "bg-muted")}>
                            <TIcon size={13} className={color} />{value}
                            {issue.type === value && <Check size={12} className="ml-auto text-primary" />}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </DetailRow>

                  {/* Assignees — uses Radix Popover (not Base UI Menu) so clicks inside don't close it */}
                  <DetailRow icon={User} label="Assignees">
                    <PopoverPrimitive.Root>
                      <PopoverPrimitive.Trigger asChild>
                        <button className="w-full">
                          <InlineSelect>
                            {issue.assignees.length > 0 ? (
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <AvatarGroup>
                                  {issue.assignees.slice(0, 3).map((a) => (
                                    <Avatar key={a.id} size="sm"><AvatarImage src={a.avatar} alt={a.name} /><AvatarFallback>{a.initials}</AvatarFallback></Avatar>
                                  ))}
                                  {issue.assignees.length > 3 && <AvatarGroupCount className="text-xs">+{issue.assignees.length - 3}</AvatarGroupCount>}
                                </AvatarGroup>
                                <span className="text-sm truncate">{issue.assignees.length === 1 ? issue.assignees[0].name : `${issue.assignees.length} members`}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">Unassigned</span>
                            )}
                          </InlineSelect>
                        </button>
                      </PopoverPrimitive.Trigger>
                      <PopoverPrimitive.Portal>
                        <PopoverPrimitive.Content
                          align="start"
                          sideOffset={4}
                          style={{ zIndex: 9999 }}
                          className="w-64 rounded-xl border bg-popover text-popover-foreground shadow-lg outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
                        >
                          <MemberPicker
                            members={availableMembers}
                            selected={issue.assignees}
                            onChange={(members) => update({ assignees: members })}
                            placeholder="Search assignees…"
                          />
                        </PopoverPrimitive.Content>
                      </PopoverPrimitive.Portal>
                    </PopoverPrimitive.Root>
                  </DetailRow>

                  {/* Reporter */}
                  <DetailRow icon={User} label="Reporter">
                    <div className="flex items-center gap-2 px-1.5 py-1">
                      <Avatar size="sm"><AvatarImage src={issue.reporter.avatar} alt={issue.reporter.name} /><AvatarFallback>{issue.reporter.initials}</AvatarFallback></Avatar>
                      <span className="text-sm font-medium">{issue.reporter.name}</span>
                    </div>
                  </DetailRow>

                  {/* Story Points */}
                  <DetailRow icon={Layers} label="Points">
                    <div className="px-1.5 py-2 text-sm">
                      {issue.storyPoints
                        ? <span className="inline-flex items-center gap-1 font-medium">{issue.storyPoints} <span className="text-xs text-muted-foreground font-normal">pts</span></span>
                        : <span className="text-muted-foreground">—</span>}
                    </div>
                  </DetailRow>

                  {/* Due date */}
                  <DetailRow icon={CalendarDays} label="Due date">
                    <DatePicker
                      value={issue.dueDate}
                      onChange={(v) => update({ dueDate: v || undefined })}
                      onClear={() => update({ dueDate: undefined })}
                      placeholder="No due date"
                      className="h-8 border-0 shadow-none px-1.5"
                    />
                  </DetailRow>

                  {/* Sprint */}
                  <DetailRow icon={Play} label="Sprint">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="w-full">
                        <InlineSelect>
                          {currentSprint ? (
                            <>
                              <span className={cn(
                                "size-2 rounded-full shrink-0",
                                currentSprint.status === "active" ? "bg-blue-500" :
                                currentSprint.status === "completed" ? "bg-green-500" : "bg-muted-foreground"
                              )} />
                              <span className="text-sm truncate">{currentSprint.name}</span>
                              {currentSprint.status === "active" && (
                                <span className="text-xs text-blue-500 shrink-0">Active</span>
                              )}
                            </>
                          ) : (
                            <span className="text-sm text-muted-foreground">No sprint</span>
                          )}
                        </InlineSelect>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="p-1 w-56">
                        <DropdownMenuItem
                          onClick={() => update({ sprintId: undefined })}
                          className={cn("gap-2 cursor-pointer", !issue.sprintId && "bg-muted")}
                        >
                          <span className="size-2 rounded-full bg-muted-foreground shrink-0" />
                          <span className="flex-1">No sprint</span>
                          {!issue.sprintId && <Check size={12} className="text-primary" />}
                        </DropdownMenuItem>
                        {availableSprints.length > 0 && (
                          <div className="h-px bg-border my-1" />
                        )}
                        {availableSprints.map((s) => (
                          <DropdownMenuItem
                            key={s.id}
                            onClick={() => update({ sprintId: s.id })}
                            className={cn("gap-2 cursor-pointer", issue.sprintId === s.id && "bg-muted")}
                          >
                            <span className={cn(
                              "size-2 rounded-full shrink-0",
                              s.status === "active" ? "bg-blue-500" :
                              s.status === "completed" ? "bg-green-500" : "bg-muted-foreground"
                            )} />
                            <span className="flex-1 truncate">{s.name}</span>
                            {s.status === "active" && <span className="text-xs text-blue-500">Active</span>}
                            {s.status === "completed" && <span className="text-xs text-muted-foreground">Done</span>}
                            {issue.sprintId === s.id && <Check size={12} className="text-primary ml-1" />}
                          </DropdownMenuItem>
                        ))}
                        {availableSprints.length === 0 && (
                          <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                            No sprints yet — create one in the Sprints page
                          </div>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </DetailRow>
                </tbody>
              </table>
              </div>

              {/* Timestamps */}
              <div className="flex gap-4 mt-2.5 px-1">
                <p className="text-[11px] text-muted-foreground">Created {new Date(issue.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                <p className="text-[11px] text-muted-foreground">Updated {new Date(issue.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
              </div>
            </div>

            <Separator />

            {/* Discussions */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  Discussions {comments.length > 0 && <span className="ml-1 text-xs font-normal text-muted-foreground">({comments.length})</span>}
                </h3>
              </div>

              {comments.length === 0 && (
                <EmptyState
                  icon={MessageSquare}
                  title="No comments yet"
                  description="Be the first to leave a comment on this issue."
                  className="py-8"
                />
              )}

              {/* Lightbox for comment images */}
              {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

              {/* Discussion comments */}
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3 group/comment">
                  <Avatar size="sm" className="shrink-0 mt-1">
                    <AvatarImage src={c.authorAvatar} alt={c.authorName} />
                    <AvatarFallback className="text-xs">{c.authorInitials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-semibold">{c.authorName}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        <Clock size={9} /> {relativeTime(c.createdAt)}
                      </span>
                      {(c.authorId === user?.id || c.id.startsWith("c-local-")) && (
                        <PopoverPrimitive.Root
                          open={confirmDeleteId === c.id}
                          onOpenChange={(open) => setConfirmDeleteId(open ? c.id : null)}
                        >
                          <PopoverPrimitive.Trigger
                            className="ml-auto opacity-0 group-hover/comment:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive cursor-pointer"
                            title="Delete comment"
                          >
                            <Trash2 size={11} />
                          </PopoverPrimitive.Trigger>
                          <PopoverPrimitive.Portal>
                            <PopoverPrimitive.Content
                              side="top"
                              align="end"
                              sideOffset={6}
                              className="z-50 rounded-xl border bg-popover p-3.5 shadow-md w-52 flex flex-col gap-2.5"
                            >
                              <p className="text-xs font-medium">Delete this comment?</p>
                              <p className="text-xs text-muted-foreground">This cannot be undone.</p>
                              <div className="flex items-center gap-2 pt-0.5">
                                <button
                                  onClick={() => { deleteComment(c.id); setConfirmDeleteId(null); }}
                                  className="flex-1 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors text-xs font-medium py-1.5 cursor-pointer"
                                >
                                  Delete
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="flex-1 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-xs font-medium py-1.5 cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </PopoverPrimitive.Content>
                          </PopoverPrimitive.Portal>
                        </PopoverPrimitive.Root>
                      )}
                    </div>
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed
                        prose-p:my-0.5 prose-headings:my-1 prose-ul:my-1 prose-ol:my-1
                        prose-code:bg-muted prose-code:px-1 prose-code:rounded prose-code:text-xs prose-code:font-mono
                        prose-blockquote:border-l-2 prose-blockquote:border-primary prose-blockquote:pl-3 prose-blockquote:text-muted-foreground prose-blockquote:not-italic
                        prose-a:text-primary prose-a:underline
                        [&_img]:rounded-xl [&_img]:max-h-64 [&_img]:max-w-full [&_img]:object-contain [&_img]:cursor-zoom-in [&_img]:hover:opacity-80 [&_img]:transition-opacity [&_img]:shadow-sm [&_img]:border [&_img]:border-border
                        [&_.task-list-item]:flex [&_.task-list-item]:items-start [&_.task-list-item]:gap-2
                        [&_.task-list-item_input]:mt-1"
                      dangerouslySetInnerHTML={{ __html: c.body }}
                      onClick={(e) => {
                        const t = e.target as HTMLElement;
                        if (t.tagName === "IMG") setLightboxSrc((t as HTMLImageElement).src);
                      }}
                    />
                  </div>
                </div>
              ))}

              {/* Rich text composer */}
              <div className="flex gap-3">
                <Avatar size="sm" className="shrink-0 mt-1">
                  <AvatarImage src={avatarUrl} alt={displayName} />
                  <AvatarFallback className="text-xs">{initials || "?"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <RichTextEditor
                    placeholder="Add a comment… supports **markdown**, images, lists, and more"
                    onSubmit={submitComment}
                    submitLabel="Comment"
                    minHeight={100}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
