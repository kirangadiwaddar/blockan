"use client";

import AppSidebar from "@/components/shadcn-space/blocks/dashboard/app-sidebar";
import { useProjects } from "@/lib/projects-context";
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
  Eye, Users, ShieldCheck, UserCog, Crown, Trash2, UserCheck,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useMemo, useState } from "react";
import { InviteMemberDialog } from "@/components/team/invite-member-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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

export default function TeamPage() {
  const [query, setQuery] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [profileMember, setProfileMember] = useState<TeamMember | null>(null);
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null);
  const { projects, removeMember, updateMemberRole } = useProjects();
  const { issues } = useIssues();

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
          email: `${m.name.split(" ")[0].toLowerCase()}@blockan.io`,
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
  };

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
          <Button size="sm" className="cursor-pointer gap-1.5" onClick={() => setInviteOpen(true)}>
            <UserPlus size={13} /> Invite Member
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

        {/* Table */}
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
                          <AvatarFallback className="text-xs">{member.initials}</AvatarFallback>
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
                          {/* View profile */}
                          <DropdownMenuItem
                            className="cursor-pointer gap-2 text-xs"
                            onClick={() => setProfileMember(member)}
                          >
                            <Eye size={12} /> View profile
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          {/* Change role — one item per role */}
                          <div className="px-2 py-1 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                            Change role
                          </div>
                          {ROLES.map((role) => {
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

                          {/* Remove */}
                          <DropdownMenuItem
                            variant="destructive"
                            className="cursor-pointer gap-2 text-xs"
                            onClick={() => setRemoveTarget(member)}
                          >
                            <Trash2 size={12} /> Remove from team
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <InviteMemberDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />

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
                  <AvatarFallback className="text-lg">{profileMember.initials}</AvatarFallback>
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

      {/* Remove confirm */}
      <ConfirmDialog
        open={!!removeTarget}
        title="Remove member?"
        description={`${removeTarget?.name} will be removed from all ${removeTarget?.projectCount} project(s) they belong to.`}
        confirmLabel="Remove"
        destructive
        onConfirm={() => removeTarget && handleRemove(removeTarget)}
        onCancel={() => setRemoveTarget(null)}
      />
    </AppSidebar>
  );
}
