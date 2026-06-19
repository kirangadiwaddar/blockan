"use client";

import AppSidebar from "@/components/shadcn-space/blocks/dashboard/app-sidebar";
import { useProjects } from "@/lib/projects-context";
import { useUser } from "@/lib/supabase/user-context";
import { useIssues } from "@/lib/issues-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  UserPlus, Search, Mail, MoreHorizontal,
  Eye, Users, ShieldCheck, UserCog, Crown, Trash2,
  Clock, RefreshCw, X, Copy, Check,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useMemo, useState, useEffect, useCallback } from "react";
import { InviteMemberDialog } from "@/components/team/invite-member-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { resendInvite, cancelPendingInviteAction, generateInviteLink, fetchPendingInvitesAdmin } from "@/lib/supabase/invite-actions";

const ROLES = ["Owner", "Admin", "Member", "Viewer", "Guest"] as const;
type Role = (typeof ROLES)[number];

const roleColors: Record<Role, string> = {
  Owner:  "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  Admin:  "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  Member: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  Viewer: "bg-muted text-muted-foreground",
  Guest:  "bg-muted text-muted-foreground",
};

const roleIcon: Record<Role, React.ElementType> = {
  Owner:  Crown,
  Admin:  ShieldCheck,
  Member: Users,
  Viewer: Eye,
  Guest:  UserCog,
};

type TeamMember = {
  id: string;
  name: string;
  initials: string;
  avatar?: string;
  role: string;
  email: string;
  teamRole: Role;
  issueCount: number;
  projectCount: number;
  projectSlugs: string[];
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function TeamPage() {
  const [query, setQuery] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [profileMember, setProfileMember] = useState<TeamMember | null>(null);
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null);
  const { projects, removeMember, updateMemberRole, refreshProjects } = useProjects();
  const { issues } = useIssues();
  const { user } = useUser();

  // Pending invites state
  type PendingInvite = Awaited<ReturnType<typeof fetchPendingInvitesAdmin>>[number];
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<PendingInvite | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  const loadPending = useCallback(async () => {
    setPendingLoading(true);
    const data = await fetchPendingInvitesAdmin();
    setPendingInvites(data);
    setPendingLoading(false);
  }, []);

  useEffect(() => { loadPending(); }, [loadPending]);

  // Current user's highest role across all projects
  const currentUserRole: Role = useMemo(() => {
    if (!user) return "Member";
    for (const project of projects) {
      const m = project.members.find((m) => m.id === user.id);
      if (!m) continue;
      const r = (m.role ?? "member").toLowerCase();
      if (r === "owner") return "Owner";
      if (r === "admin") return "Admin";
    }
    return "Member";
  }, [projects, user]);

  const canManageRoles = currentUserRole === "Owner" || currentUserRole === "Admin";

  const teamData: TeamMember[] = useMemo(() => {
    const seen = new Map<string, TeamMember>();
    projects.forEach((project) => {
      project.members.forEach((m) => {
        if (seen.has(m.id)) {
          const existing = seen.get(m.id)!;
          existing.projectCount += 1;
          existing.projectSlugs.push(project.id);
          return;
        }
        const raw = (m.role ?? "member");
        const normalized = (raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()) as Role;
        const teamRole: Role = ROLES.includes(normalized) ? normalized : "Member";
        seen.set(m.id, {
          id: m.id,
          name: m.name,
          initials: m.initials,
          avatar: m.avatar,
          role: m.role,
          email: m.email ?? "",
          teamRole,
          issueCount: issues.filter((i) => i.assignees.some((a) => a.id === m.id)).length,
          projectCount: 1,
          projectSlugs: [project.id],
        });
      });
    });
    return Array.from(seen.values());
  }, [projects, issues]);

  const filtered = teamData.filter(
    (m) =>
      m.name.toLowerCase().includes(query.toLowerCase()) ||
      m.email.toLowerCase().includes(query.toLowerCase()) ||
      m.role.toLowerCase().includes(query.toLowerCase()),
  );

  const adminCount = teamData.filter((m) => m.teamRole === "Admin" || m.teamRole === "Owner").length;
  const activeProjects = projects.filter((p) => p.status === "active").length;
  const openIssues = issues.filter((i) => i.status !== "Completed").length;

  const handleChangeRole = (member: TeamMember, role: Role) => {
    member.projectSlugs.forEach((slug) => updateMemberRole(slug, member.id, role.toLowerCase()));
  };

  const handleRemove = async (member: TeamMember) => {
    await Promise.all(member.projectSlugs.map((slug) => removeMember(slug, member.id)));
    setRemoveTarget(null);
    refreshProjects();
  };

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  };

  const fallbackCopy = (text: string) => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  };

  const handleResend = async (invite: PendingInvite) => {
    setResendingId(invite.id);
    const res = await resendInvite(invite.token);
    if (res.success && res.link) {
      copyToClipboard(res.link);
      setCopiedLinkId(invite.id);
      setTimeout(() => setCopiedLinkId(null), 2000);
    }
    setResendingId(null);
  };

  const handleCopyLink = async (invite: PendingInvite) => {
    const res = await generateInviteLink(invite.token);
    if (res.success && res.link) {
      copyToClipboard(res.link);
      setCopiedLinkId(invite.id);
      setTimeout(() => setCopiedLinkId(null), 2000);
    }
  };

  const handleCancelInvite = async (invite: PendingInvite) => {
    await cancelPendingInviteAction(invite.email);
    setCancelTarget(null);
    loadPending();
    refreshProjects();
  };

  // Group pending invites by email so we show one row per person
  const pendingByEmail = useMemo(() => {
    const map = new Map<string, { invite: PendingInvite; projects: { name: string; color: string }[] }>();
    pendingInvites.forEach((inv) => {
      if (map.has(inv.email)) {
        map.get(inv.email)!.projects.push({ name: inv.projectName, color: inv.projectColor });
      } else {
        map.set(inv.email, { invite: inv, projects: [{ name: inv.projectName, color: inv.projectColor }] });
      }
    });
    return Array.from(map.values());
  }, [pendingInvites]);

  return (
    <AppSidebar>
      <div className="flex flex-col gap-4 p-5 w-full">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-lg font-semibold">Team</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {teamData.length} members across {projects.length} projects
            </p>
          </div>
          <Button className="cursor-pointer gap-1.5" onClick={() => setInviteOpen(true)}>
            <UserPlus size={14} /> Invite Member
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Members",   value: teamData.length  },
            { label: "Admins",          value: adminCount       },
            { label: "Active Projects", value: activeProjects   },
            { label: "Open Issues",     value: openIssues       },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border bg-card px-4 py-3">
              <p className="text-xl font-bold leading-tight">{s.value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Members Table */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b">
            <p className="text-sm font-medium">Members</p>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search members…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-7 h-7 w-48 text-xs"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="ps-4">Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden sm:table-cell">Access</TableHead>
                <TableHead className="hidden md:table-cell text-center">Issues</TableHead>
                <TableHead className="hidden md:table-cell text-center">Projects</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && teamData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="p-0">
                    <EmptyState
                      icon={Users}
                      title="No team members yet"
                      description="Invite your first member to start collaborating."
                      actions={[{ label: "Invite Member", onClick: () => setInviteOpen(true) }]}
                    />
                  </TableCell>
                </TableRow>
              )}
              {filtered.length === 0 && teamData.length > 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="p-0">
                    <EmptyState icon={Search} title="No members match" description="Try a different name, email, or role." />
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((member) => {
                const RoleIcon = roleIcon[member.teamRole];
                return (
                  <TableRow key={member.id}>
                    <TableCell className="ps-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="size-7 shrink-0">
                          <AvatarImage src={member.avatar} alt={member.name} />
                          <AvatarFallback className="text-xs" colorSeed={member.id}>{member.initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium leading-tight">{member.name}</p>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Mail size={9} /> {member.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <span className="text-xs text-muted-foreground capitalize">{member.role}</span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell py-2.5">
                      <Badge className={`gap-1 font-normal text-[11px] ${roleColors[member.teamRole]}`}>
                        <RoleIcon size={9} /> {member.teamRole}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell py-2.5 text-center">
                      <span className="text-xs">{member.issueCount}</span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell py-2.5 text-center">
                      <span className="text-xs">{member.projectCount}</span>
                    </TableCell>
                    <TableCell className="py-2.5 pr-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon-sm" className="cursor-pointer size-6">
                              <MoreHorizontal size={13} />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            className="cursor-pointer gap-2 text-xs"
                            onClick={() => setProfileMember(member)}
                          >
                            <Eye size={12} /> View profile
                          </DropdownMenuItem>

                          {canManageRoles && member.id !== user?.id && (
                            <>
                              <DropdownMenuSeparator />
                              <div className="px-2 py-1 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                                Change role
                              </div>
                              {ROLES.filter((r) => r !== "Owner").map((role) => {
                                const Icon = roleIcon[role];
                                const active = member.teamRole === role;
                                return (
                                  <DropdownMenuItem
                                    key={role}
                                    className={`cursor-pointer gap-2 text-xs ${active ? "font-semibold" : ""}`}
                                    onClick={() => handleChangeRole(member, role)}
                                  >
                                    <Icon size={11} className={active ? "text-primary" : ""} />
                                    {role}
                                    {active && <span className="ml-auto text-xs text-primary">current</span>}
                                  </DropdownMenuItem>
                                );
                              })}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                className="cursor-pointer gap-2 text-xs"
                                onClick={() => setRemoveTarget(member)}
                              >
                                <Trash2 size={12} /> Remove from team
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Pending Invites Table */}
        {(pendingByEmail.length > 0 || pendingLoading) && (
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b">
              <Clock size={13} className="text-amber-500" />
              <p className="text-sm font-medium">Pending Invites</p>
              <span className="ml-auto text-[11px] text-muted-foreground">
                Waiting for sign-up
              </span>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="ps-4">Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden md:table-cell">Invited</TableHead>
                  {canManageRoles && <TableHead className="w-24 text-right pr-4">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingLoading && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-6">
                      Loading…
                    </TableCell>
                  </TableRow>
                )}
                {!pendingLoading && pendingByEmail.map(({ invite }) => (
                  <TableRow key={invite.id}>
                    <TableCell className="ps-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="size-7 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                          <Mail size={12} className="text-amber-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium leading-tight">{invite.email}</p>
                          <p className="text-[11px] text-amber-600 dark:text-amber-400">Invite pending</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <span className="text-xs text-muted-foreground capitalize">{invite.role}</span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell py-2.5">
                      <span className="text-xs text-muted-foreground">{formatDate(invite.invitedAt)}</span>
                    </TableCell>
                    {canManageRoles && (
                      <TableCell className="py-2.5 pr-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="size-6 cursor-pointer"
                            title="Copy invite link"
                            onClick={() => handleCopyLink(invite)}
                          >
                            {copiedLinkId === invite.id
                              ? <Check size={12} className="text-green-500" />
                              : <Copy size={12} />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="size-6 cursor-pointer"
                            title="Resend invite email"
                            disabled={resendingId === invite.id}
                            onClick={() => handleResend(invite)}
                          >
                            <RefreshCw size={12} className={resendingId === invite.id ? "animate-spin" : ""} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="size-6 cursor-pointer text-destructive hover:text-destructive"
                            title="Cancel invite"
                            onClick={() => setCancelTarget(invite)}
                          >
                            <X size={12} />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

      </div>

      <InviteMemberDialog
        open={inviteOpen}
        onClose={() => { setInviteOpen(false); loadPending(); }}
      />

      {/* Profile dialog */}
      <Dialog open={!!profileMember} onOpenChange={(o) => !o && setProfileMember(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Member profile</DialogTitle>
          </DialogHeader>
          {profileMember && (() => {
            const RoleIcon = roleIcon[profileMember.teamRole];
            return (
              <div className="flex flex-col items-center gap-4 py-2">
                <Avatar className="size-16">
                  <AvatarImage src={profileMember.avatar} alt={profileMember.name} />
                  <AvatarFallback className="text-lg" colorSeed={profileMember.id}>{profileMember.initials}</AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <p className="text-base font-semibold">{profileMember.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
                    <Mail size={11} /> {profileMember.email}
                  </p>
                </div>
                <Badge className={`gap-1.5 ${roleColors[profileMember.teamRole]}`}>
                  <RoleIcon size={11} /> {profileMember.teamRole}
                </Badge>
                <div className="grid grid-cols-2 gap-3 w-full mt-1">
                  <div className="rounded-lg border bg-muted/30 px-3 py-2.5 text-center">
                    <p className="text-xl font-bold">{profileMember.issueCount}</p>
                    <p className="text-[11px] text-muted-foreground">Assigned issues</p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 px-3 py-2.5 text-center">
                    <p className="text-xl font-bold">{profileMember.projectCount}</p>
                    <p className="text-[11px] text-muted-foreground">Projects</p>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Remove member confirm */}
      <ConfirmDialog
        open={!!removeTarget}
        title="Remove member?"
        description={`${removeTarget?.name} will be removed from all ${removeTarget?.projectCount} project(s) they belong to.`}
        confirmLabel="Remove"
        destructive
        onConfirm={() => removeTarget && handleRemove(removeTarget)}
        onCancel={() => setRemoveTarget(null)}
      />

      {/* Cancel invite confirm */}
      <ConfirmDialog
        open={!!cancelTarget}
        title="Cancel invite?"
        description={`The invite for ${cancelTarget?.email} will be revoked. They won't be able to use the sign-up link.`}
        confirmLabel="Cancel invite"
        destructive
        onConfirm={() => cancelTarget && handleCancelInvite(cancelTarget)}
        onCancel={() => setCancelTarget(null)}
      />
    </AppSidebar>
  );
}
