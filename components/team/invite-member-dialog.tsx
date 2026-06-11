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
import { sendMagicLinkInvite } from "@/lib/supabase/invite-actions";
import { useProjects } from "@/lib/projects-context";
import { cn } from "@/lib/utils";
import {
  X, UserPlus, ChevronDown, Loader2, CheckCircle2, AlertCircle,
  ShieldCheck, Users, Eye, UserCog, Crown,
} from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Pre-select a project by its UUID */
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
  const { projects, uuidForSlug } = useProjects();

  const defaultSlug =
    projectId
      ? (projects.find((p) => p.id === projectId)?.id ?? projects[0]?.id ?? "")
      : (projects[0]?.id ?? "");

  // When projectId is provided the picker is locked to that project
  const lockedProject = projectId ? projects.find((p) => p.id === projectId) : null;

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("member");
  const [selectedProjectSlug, setSelectedProjectSlug] = useState<string>(defaultSlug);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [roleOpen, setRoleOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);

  if (!open) return null;

  const selectedProject = projects.find((p) => p.id === selectedProjectSlug);
  const selectedRole = ROLES.find((r) => r.value === role) ?? ROLES[1];

  const handleInvite = async () => {
    if (!email.trim() || !selectedProjectSlug) return;
    const uuid = uuidForSlug(selectedProjectSlug) ?? selectedProjectSlug;
    setLoading(true);
    setResult(null);

    const res = await inviteMemberByEmail({ projectUuid: uuid, email: email.trim(), role });

    if (!res.success && res.error?.includes("No Blockan account")) {
      // User doesn't exist — send a magic link invite email
      const inviteRes = await sendMagicLinkInvite(email.trim());
      setLoading(false);
      setResult({
        success: inviteRes.success,
        message: inviteRes.success
          ? `No account found. A sign-up link has been sent to ${email.trim()}.`
          : inviteRes.error ?? "Failed to send invite email",
      });
      if (inviteRes.success) setEmail("");
      return;
    }

    setLoading(false);
    setResult({
      success: res.success,
      message: res.success
        ? `${email.trim()} has been added to the project!`
        : res.error ?? "Something went wrong",
    });
    if (res.success) {
      setEmail("");
      setTimeout(onClose, 1800);
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
              <p className="text-xs text-muted-foreground">Add someone to your project</p>
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

          {/* Project — locked when inviting from a project page */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Project
            </Label>
            {lockedProject ? (
              <div className="flex h-9 w-full items-center gap-2 rounded-lg border border-input bg-muted/40 px-3 text-sm text-muted-foreground select-none">
                <span className={`avatar-orb ${lockedProject.color} size-5 rounded-full shrink-0`} />
                <span className="truncate text-foreground font-medium">{lockedProject.name}</span>
              </div>
            ) : (
              <DropdownMenu open={projectOpen} onOpenChange={setProjectOpen}>
                <DropdownMenuTrigger
                  render={
                    <button className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 text-sm cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        {selectedProject && (
                          <span className={`avatar-orb ${selectedProject.color} size-5 rounded-full shrink-0`} />
                        )}
                        <span className="truncate">{selectedProject?.name ?? "Select project"}</span>
                      </div>
                      <ChevronDown size={13} className="text-muted-foreground shrink-0" />
                    </button>
                  }
                />
                <DropdownMenuContent className="p-1 w-56">
                  {projects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedProjectSlug(p.id); setProjectOpen(false); }}
                      className={cn(
                        "flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-md hover:bg-muted cursor-pointer transition-colors",
                        selectedProjectSlug === p.id && "bg-muted"
                      )}
                    >
                      <span className={`avatar-orb ${p.color} size-5 rounded-full shrink-0`} />
                      {p.name}
                      {selectedProjectSlug === p.id && (
                        <span className="ml-auto text-primary text-xs">✓</span>
                      )}
                    </button>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
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

                {/* Role comparison hint */}
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
        </div>

        {/* Footer */}
        <div className="flex gap-2 justify-end px-6 py-4 border-t bg-muted/30">
          <Button variant="outline" onClick={onClose} className="cursor-pointer h-8 text-sm">
            Cancel
          </Button>
          <Button
            onClick={handleInvite}
            disabled={!email.trim() || !selectedProjectSlug || loading}
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
