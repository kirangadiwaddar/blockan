"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { inviteMemberByEmail } from "@/lib/supabase/db";
import { inviteNewUser } from "@/lib/supabase/invite-actions";
import { useProjects, canManageSprints } from "@/lib/projects-context";
import { useUser } from "@/lib/supabase/user-context";
import { cn } from "@/lib/utils";
import {
  X, UserPlus, ChevronDown, Loader2, CheckCircle2, AlertCircle,
  ShieldCheck, Users, Eye, UserCog, Crown, Globe, Copy, Check,
} from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  /** If provided, invite is scoped to this specific project (slug or uuid) */
  projectId?: string;
}

export type MemberRole = "admin" | "member" | "viewer" | "guest";

interface RoleDef {
  value: MemberRole;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const ROLES: RoleDef[] = [
  {
    value: "admin",
    label: "Admin",
    description: "Manage members, sprints & settings",
    icon: <ShieldCheck size={14} />,
    color: "text-violet-500",
  },
  {
    value: "member",
    label: "Member",
    description: "Create & edit issues, comment",
    icon: <Users size={14} />,
    color: "text-blue-500",
  },
  {
    value: "viewer",
    label: "Viewer",
    description: "Read-only access to all content",
    icon: <Eye size={14} />,
    color: "text-amber-500",
  },
  {
    value: "guest",
    label: "Guest",
    description: "Limited access, specific issues only",
    icon: <UserCog size={14} />,
    color: "text-muted-foreground",
  },
];

export function InviteMemberDialog({ open, onClose, projectId }: Props) {
  const { projects, uuidForSlug, refreshProjects } = useProjects();
  const { user } = useUser();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("member");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [roleOpen, setRoleOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  // Project(s) to add the invitee to:
  // - If opened from a specific project page → only that project
  // - If opened globally (dashboard/team) → all projects the current user manages
  const targetProjects = projectId
    ? projects.filter((p) => p.id === projectId || (p as any)._uuid === projectId)
    : projects.filter((p) => {
        const me = p.members.find((m) => m.id === user?.id);
        return me && canManageSprints(me.role as any);
      });

  const selectedRole = ROLES.find((r) => r.value === role) ?? ROLES[1];

  const handleInvite = async () => {
    if (!email.trim() || targetProjects.length === 0) return;
    setLoading(true);
    setResult(null);

    // Invite to each target project in sequence
    let anySuccess = false;
    let lastError: string | undefined;

    for (const project of targetProjects) {
      const uuid = uuidForSlug(project.id) ?? (project as any)._uuid ?? project.id;
      const res = await inviteMemberByEmail({ projectUuid: uuid, email: email.trim(), role });

      if (res.success) {
        anySuccess = true;
      } else if (res.error?.includes("No Blockan account")) {
        // User doesn't exist — create placeholder + send invite email + get link
        const inviteRes = await inviteNewUser({
          email: email.trim(),
          projectIds: targetProjects.map((p) => uuidForSlug(p.id) ?? (p as any)._uuid ?? p.id),
          role,
          invitedBy: user?.id ?? "",
        });
        setLoading(false);
        if (inviteRes.success) {
          setInviteLink(inviteRes.inviteLink ?? null);
          setResult({ success: true, message: `Invite created for ${email.trim()}.` });
          setEmail("");
          refreshProjects();
        } else {
          setResult({ success: false, message: inviteRes.error ?? "Failed to create invite" });
        }
        return;
      } else if (res.error && res.error !== "User is already a member of this project") {
        lastError = res.error;
      } else {
        // already a member — count as success
        anySuccess = true;
      }
    }

    setLoading(false);
    await refreshProjects();

    if (anySuccess) {
      setResult({
        success: true,
        message: `${email.trim()} has been added to the workspace!`,
      });
      setEmail("");
      setTimeout(onClose, 1800);
    } else {
      setResult({ success: false, message: lastError ?? "Something went wrong" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-md mx-4 bg-background rounded-2xl border shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <UserPlus size={15} className="text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold leading-tight">Invite team member</h2>
              <p className="text-xs text-muted-foreground">
                {projectId
                  ? `Adding to ${targetProjects[0]?.name ?? "this project"}`
                  : "Adding to your workspace"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="size-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Scope indicator */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border">
            {projectId ? (
              <>
                <span className={`avatar-orb ${targetProjects[0]?.color ?? "avatar-orb-blue"} size-5 rounded-full shrink-0`} />
                <span className="text-xs text-muted-foreground">
                  Invite to <span className="font-medium text-foreground">{targetProjects[0]?.name ?? "project"}</span>
                </span>
              </>
            ) : (
              <>
                <Globe size={13} className="text-primary shrink-0" />
                <span className="text-xs text-muted-foreground">
                  Invite to <span className="font-medium text-foreground">all your projects</span>
                  {targetProjects.length > 0 && (
                    <span className="text-muted-foreground"> ({targetProjects.length} project{targetProjects.length !== 1 ? "s" : ""})</span>
                  )}
                </span>
              </>
            )}
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-email" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Email address
            </Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleInvite(); }}
              autoFocus
              className="h-9"
            />
          </div>

          {/* Role */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Role
            </Label>
            <DropdownMenu open={roleOpen} onOpenChange={setRoleOpen}>
              <DropdownMenuTrigger
                render={
                  <button className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 text-sm cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className={cn("flex items-center gap-2", selectedRole.color)}>
                      {selectedRole.icon}
                      <span className="text-foreground font-medium">{selectedRole.label}</span>
                      <span className="text-muted-foreground text-xs">— {selectedRole.description}</span>
                    </div>
                    <ChevronDown size={13} className="text-muted-foreground shrink-0" />
                  </button>
                }
              />
              <DropdownMenuContent className="p-1.5 w-72">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => { setRole(r.value); setRoleOpen(false); }}
                    className={cn(
                      "flex items-start gap-3 w-full px-2.5 py-2 rounded-lg text-sm cursor-pointer transition-colors text-left",
                      role === r.value ? "bg-muted" : "hover:bg-muted/60"
                    )}
                  >
                    <span className={cn("mt-0.5 shrink-0", r.color)}>{r.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{r.label}</span>
                        {role === r.value && (
                          <span className="ml-auto text-primary text-xs">✓</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
                    </div>
                  </button>
                ))}

                <div className="mt-1 pt-2 border-t mx-1">
                  <div className="flex items-center gap-1.5 px-1 pb-0.5">
                    <Crown size={11} className="text-amber-500 shrink-0" />
                    <span className="text-xs text-muted-foreground">Owner role is assigned automatically to the project creator</span>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Result feedback */}
          {result && (
            <div className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm",
              result.success
                ? "bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400"
                : "bg-destructive/10 border border-destructive/20 text-destructive"
            )}>
              {result.success
                ? <CheckCircle2 size={14} className="shrink-0" />
                : <AlertCircle size={14} className="shrink-0" />}
              {result.message}
            </div>
          )}

          {/* Invite link copy box — shown when new user invited */}
          {inviteLink && (
            <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 px-3 py-3">
              <p className="text-xs font-medium text-foreground">Share this invite link</p>
              <p className="text-[11px] text-muted-foreground">
                Email delivery may be limited. Copy and share this link directly via WhatsApp, Slack, or any other channel.
              </p>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 text-[11px] bg-background border rounded-md px-2 py-1.5 truncate text-muted-foreground">
                  {inviteLink}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(inviteLink);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer"
                >
                  {copied ? <Check size={11} /> : <Copy size={11} />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 justify-end px-6 py-4 border-t bg-muted/30">
          <Button variant="outline" onClick={onClose} className="cursor-pointer h-8 text-sm">
            Cancel
          </Button>
          <Button
            onClick={handleInvite}
            disabled={!email.trim() || loading || targetProjects.length === 0}
            className="cursor-pointer gap-2 h-8 text-sm"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
            Send invite
          </Button>
        </div>
      </div>
    </div>
  );
}
