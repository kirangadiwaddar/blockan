/**
 * Supabase CRUD helpers — all operations go through here.
 * The app types (Issue, Project, Sprint, Member) stay stable;
 * mapping to/from DB column names is handled here.
 */
import { createClient } from "@/lib/supabase/client";
import { sendAssignedNotifications } from "@/lib/supabase/notification-actions";
import type { Issue, Project, Sprint, Member } from "@/lib/types";

/* ─── Type helpers ─────────────────────────────────────── */

// DB status ↔ app status
const DB_TO_APP_STATUS: Record<string, string> = {
  "In Review": "Reviewing",
};
const APP_TO_DB_STATUS: Record<string, string> = {
  Reviewing: "In Review",
};

function toAppStatus(s: string) { return DB_TO_APP_STATUS[s] ?? s; }
function toDbStatus(s: string)  { return APP_TO_DB_STATUS[s] ?? s; }

// Maps legacy/unknown color values → avatar-orb variant class
const COLOR_MAP: Record<string, string> = {
  "bg-blue-500": "avatar-orb-blue", "bg-blue-600": "avatar-orb-blue",
  "bg-violet-500": "avatar-orb-violet", "bg-purple-500": "avatar-orb-violet",
  "bg-pink-500": "avatar-orb-pink", "bg-fuchsia-500": "avatar-orb-pink",
  "bg-amber-500": "avatar-orb-amber", "bg-yellow-500": "avatar-orb-amber",
  "bg-emerald-500": "avatar-orb-emerald", "bg-green-500": "avatar-orb-emerald",
  "bg-cyan-500": "avatar-orb-cyan", "bg-teal-500": "avatar-orb-cyan",
  "bg-rose-500": "avatar-orb-rose", "bg-red-500": "avatar-orb-rose",
};
const ORB_VARIANTS = new Set(["avatar-orb-blue","avatar-orb-violet","avatar-orb-pink","avatar-orb-amber","avatar-orb-emerald","avatar-orb-cyan","avatar-orb-rose"]);

function normalizeProjectColor(raw: string | null | undefined): string {
  if (!raw) return "avatar-orb-blue";
  // Already a valid variant
  if (ORB_VARIANTS.has(raw)) return raw;
  // Strip "avatar-orb " prefix if stored with both classes
  const stripped = raw.replace("avatar-orb ", "").trim();
  if (ORB_VARIANTS.has(stripped)) return stripped;
  // Map legacy Tailwind class
  return COLOR_MAP[raw] ?? "avatar-orb-blue";
}

function profileToMember(p: {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email?: string | null;
} | null | undefined, fallbackRole = "member"): Member | null {
  if (!p) return null;
  const name = p.full_name?.trim() || p.email?.trim() || "Unknown";
  const initials = name.includes("@")
    ? name[0].toUpperCase()
    : name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
  return {
    id: p.id,
    name,
    initials,
    avatar: p.avatar_url ?? undefined,
    role: fallbackRole,
    email: p.email ?? undefined,
  };
}

/* ─── All workspace members (global) ───────────────────── */

export async function fetchAllMembers(): Promise<Member[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, email, is_pending")
    .order("full_name", { ascending: true });
  if (error || !data) return [];
  // Include pending users so admin can assign tasks before they register
  return data
    .map((p: any) => ({ ...profileToMember(p), isPending: !!p.is_pending }))
    .filter(Boolean) as Member[];
}

/* ─── Pending invites ───────────────────────────────────── */

export type PendingInvite = {
  id: string;
  email: string;
  role: string;
  invitedAt: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  token: string;
};


export async function fetchPendingInvites(): Promise<PendingInvite[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pending_invites")
    .select("id, email, role, invited_at, token, project_id, projects(name, color)")
    .order("invited_at", { ascending: false });
  if (error || !data) return [];
  return data.map((row: any) => ({
    id: row.id,
    email: row.email,
    role: row.role,
    invitedAt: row.invited_at,
    projectId: row.project_id,
    projectName: row.projects?.name ?? "Unknown project",
    projectColor: row.projects?.color ?? "",
    token: row.token,
  }));
}


/* ─── Projects ─────────────────────────────────────────── */

export async function fetchProjects(): Promise<Project[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Fetch projects where the current user is a member (covers owners + invited members)
  const { data: memberRows } = await supabase
    .from("project_members")
    .select("project_id")
    .eq("user_id", user.id);

  const projectIds = (memberRows ?? []).map((r: any) => r.project_id);
  if (projectIds.length === 0) return [];

  const { data, error } = await supabase
    .from("projects")
    .select(`
      *,
      project_members(
        role,
        user_id,
        profiles!project_members_user_id_fkey(id, full_name, avatar_url, email, is_pending)
      ),
      issues(id, status)
    `)
    .in("id", projectIds)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => {
    const members: Member[] = (row.project_members ?? [])
      .filter((pm: any) => !pm.profiles?.is_pending)
      .map((pm: any) => profileToMember(pm.profiles, pm.role))
      .filter(Boolean) as Member[];

    const allIssues = row.issues ?? [];
    const openIssues = allIssues.filter(
      (i: any) => i.status !== "Completed" && i.status !== "Cancelled"
    ).length;

    return {
      id: row.key.toLowerCase(),   // URL slug
      _uuid: row.id,               // Real DB uuid (stored for mutations)
      key: row.key,
      code: row.code ?? row.key,
      name: row.name,
      description: row.description ?? "",
      color: normalizeProjectColor(row.color),
      members,
      openIssues,
      totalIssues: allIssues.length,
      progress: allIssues.length
        ? Math.round(
            (allIssues.filter((i: any) => i.status === "Completed").length /
              allIssues.length) *
              100
          )
        : 0,
      updatedAt: row.updated_at?.slice(0, 10) ?? row.created_at?.slice(0, 10),
      status: row.status as Project["status"],
    } as Project & { _uuid: string };
  });
}

export async function createProject(data: {
  name: string;
  key: string;
  description: string;
  color: string;
  ownerId: string;
}): Promise<{ id: string; slug: string } | null> {
  const supabase = createClient();
  const { data: row, error } = await supabase
    .from("projects")
    .insert({
      name: data.name,
      key: data.key.toUpperCase(),
      code: data.key.toUpperCase(),
      description: data.description,
      color: data.color,
      owner_id: data.ownerId,
      status: "active",
    })
    .select("id, key")
    .single();

  if (error || !row) {
    console.error("[createProject] insert failed:", error?.message);
    return null;
  }

  // Auto-add owner as project member so RLS lets them read their own project
  const { error: memberError } = await supabase.from("project_members").insert({
    project_id: row.id,
    user_id: data.ownerId,
    role: "owner",
  });

  if (memberError) {
    console.error("[createProject] project_members insert failed:", memberError.message);
    // Still return the project — member insert failing shouldn't silently swallow the whole operation.
    // The project exists in DB; RLS permitting it will still be visible to the owner.
  }

  return { id: row.id, slug: row.key.toLowerCase() };
}

export async function deleteProject(uuid: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from("projects").delete().eq("id", uuid);
  return !error;
}

/* ─── Sprints ───────────────────────────────────────────── */

export async function fetchSprints(projectUuid: string): Promise<Sprint[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sprints")
    .select("*")
    .eq("project_id", projectUuid)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    goal: row.goal ?? undefined,
    startDate: row.start_date ?? "",
    endDate: row.end_date ?? "",
    status: row.status as Sprint["status"],
  }));
}

export async function createSprint(data: {
  projectUuid: string;
  name: string;
  goal?: string;
  startDate: string;
  endDate: string;
}): Promise<Sprint | null> {
  const supabase = createClient();
  const { data: row, error } = await supabase
    .from("sprints")
    .insert({
      project_id: data.projectUuid,
      name: data.name,
      goal: data.goal,
      start_date: data.startDate,
      end_date: data.endDate,
      status: "planned",
    })
    .select()
    .single();

  if (error || !row) return null;

  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    goal: row.goal ?? undefined,
    startDate: row.start_date ?? "",
    endDate: row.end_date ?? "",
    status: row.status as Sprint["status"],
  };
}

export async function updateSprintStatus(
  id: string,
  status: Sprint["status"]
): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("sprints")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  return !error;
}

/* ─── Issues ────────────────────────────────────────────── */

export async function fetchIssues(
  projectUuid: string,
  /** If provided, issues get this as projectId (slug) instead of the raw UUID */
  projectSlug?: string,
): Promise<Issue[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("issues")
    .select(`
      *,
      assignee:profiles!issues_assignee_id_fkey(id, full_name, avatar_url),
      reporter:profiles!issues_reporter_id_fkey(id, full_name, avatar_url),
      issue_assignees(user_id, profiles(id, full_name, avatar_url))
    `)
    .eq("project_id", projectUuid)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => {
    const reporterMember = profileToMember(row.reporter) ?? {
      id: "unknown", name: "Unknown", initials: "?", role: "member",
    };

    // Prefer issue_assignees junction table; fall back to legacy assignee_id
    const assignees: Member[] = row.issue_assignees?.length
      ? row.issue_assignees
          .map((ia: any) => profileToMember(ia.profiles))
          .filter(Boolean) as Member[]
      : profileToMember(row.assignee) ? [profileToMember(row.assignee) as Member] : [];

    return {
      id: row.id,
      code: row.code ?? `ISSUE-${row.id.slice(-4)}`,
      title: row.title,
      description: row.description ?? undefined,
      type: (row.type as Issue["type"]) ?? "Task",
      status: toAppStatus(row.status),
      priority: (row.priority as Issue["priority"]) ?? "Medium",
      assignees,
      reporter: reporterMember,
      projectId: projectSlug ?? row.project_id,
      sprintId: row.sprint_id ?? undefined,
      storyPoints: row.points || undefined,
      dueDate: row.due_date ?? undefined,
      labels: (row.labels as string[]) ?? [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    } satisfies Issue;
  });
}

export async function createIssue(data: {
  projectUuid: string;
  sprintId?: string;
  title: string;
  description?: string;
  type?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
  reporterId?: string;
  points?: number;
  dueDate?: string;
  code?: string;
  labels?: string[];
}): Promise<Issue | null> {
  const supabase = createClient();
  const { data: row, error } = await supabase
    .from("issues")
    .insert({
      project_id: data.projectUuid,
      sprint_id: data.sprintId ?? null,
      title: data.title,
      description: data.description ?? null,
      type: data.type ?? "Task",
      status: toDbStatus(data.status ?? "Todo"),
      priority: data.priority ?? "Medium",
      assignee_id: data.assigneeId ?? null,
      reporter_id: data.reporterId ?? null,
      points: data.points ?? 0,
      due_date: data.dueDate ?? null,
      code: data.code ?? null,
      labels: data.labels ?? [],
    })
    .select(`
      *,
      assignee:profiles!issues_assignee_id_fkey(id, full_name, avatar_url),
      reporter:profiles!issues_reporter_id_fkey(id, full_name, avatar_url)
    `)
    .single();

  if (error || !row) return null;

  // Auto-add the assignee as a project member if not already one
  if (data.assigneeId) {
    const { data: existing } = await supabase
      .from("project_members")
      .select("user_id")
      .eq("project_id", data.projectUuid)
      .eq("user_id", data.assigneeId)
      .maybeSingle();
    if (!existing) {
      await supabase.from("project_members").insert({
        project_id: data.projectUuid,
        user_id: data.assigneeId,
        role: "member",
      });
    }
  }

  const assigneeMember = profileToMember(row.assignee);
  const reporterMember = profileToMember(row.reporter) ?? {
    id: "unknown", name: "Unknown", initials: "?", role: "member",
  };

  return {
    id: row.id,
    code: row.code ?? `ISSUE-${row.id.slice(-4)}`,
    title: row.title,
    description: row.description ?? undefined,
    type: (row.type as Issue["type"]) ?? "Task",
    status: toAppStatus(row.status),
    priority: (row.priority as Issue["priority"]) ?? "Medium",
    assignees: assigneeMember ? [assigneeMember] : [],
    reporter: reporterMember,
    projectId: row.project_id,
    sprintId: row.sprint_id ?? undefined,
    storyPoints: row.points || undefined,
    dueDate: row.due_date ?? undefined,
    labels: (row.labels as string[]) ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function updateIssue(
  id: string,
  patch: Partial<{
    title: string;
    description: string;
    status: string;
    priority: string;
    type: string;
    sprintId: string | null;
    assigneeId: string | null;
    assigneeIds: string[];
    points: number;
    dueDate: string | null;
    labels: string[];
  }>
): Promise<boolean> {
  const supabase = createClient();
  const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined)       dbPatch.title = patch.title;
  if (patch.description !== undefined) dbPatch.description = patch.description;
  if (patch.status !== undefined)      dbPatch.status = toDbStatus(patch.status);
  if (patch.priority !== undefined)    dbPatch.priority = patch.priority;
  if (patch.type !== undefined)        dbPatch.type = patch.type;
  if (patch.sprintId !== undefined)    dbPatch.sprint_id = patch.sprintId;
  if (patch.assigneeId !== undefined)  dbPatch.assignee_id = patch.assigneeId;
  if (patch.points !== undefined)      dbPatch.points = patch.points;
  if (patch.dueDate !== undefined)     dbPatch.due_date = patch.dueDate;
  if (patch.labels !== undefined)      dbPatch.labels = patch.labels;

  // Fetch current assignees + issue info BEFORE updating (needed for diff + project membership)
  const [prevAssigneesRes, issueRes, actorRes] = await Promise.all([
    patch.assigneeIds !== undefined
      ? supabase.from("issue_assignees").select("user_id").eq("issue_id", id)
      : Promise.resolve({ data: [] }),
    supabase.from("issues").select("title, code, project_id").eq("id", id).single(),
    supabase.auth.getUser(),
  ]);

  const { error } = await supabase.from("issues").update(dbPatch).eq("id", id);
  if (error) return false;

  // Sync issue_assignees junction table when assigneeIds provided
  if (patch.assigneeIds !== undefined) {
    const prevIds    = new Set((prevAssigneesRes.data ?? []).map((r: any) => r.user_id as string));
    const actor      = actorRes.data.user;
    const issueTitle = issueRes.data?.title      ?? "an issue";
    const issueCode  = issueRes.data?.code       ?? "";
    const projectId  = issueRes.data?.project_id ?? null;

    await supabase.from("issue_assignees").delete().eq("issue_id", id);
    if (patch.assigneeIds.length > 0) {
      await supabase.from("issue_assignees").insert(
        patch.assigneeIds.map((uid) => ({ issue_id: id, user_id: uid }))
      );
    }

    // Auto-add newly assigned users as project members (role: member) so they
    // can see the project in their sidebar. Skip if already a member.
    const newlyAdded = patch.assigneeIds.filter(
      (uid) => !prevIds.has(uid) && uid !== actor?.id
    );
    if (newlyAdded.length > 0 && projectId) {
      const { data: existingMembers } = await supabase
        .from("project_members")
        .select("user_id")
        .eq("project_id", projectId)
        .in("user_id", newlyAdded);

      const alreadyMembers = new Set((existingMembers ?? []).map((r: any) => r.user_id));
      const toAdd = newlyAdded.filter((uid) => !alreadyMembers.has(uid));
      if (toAdd.length > 0) {
        await supabase.from("project_members").insert(
          toAdd.map((uid) => ({ project_id: projectId, user_id: uid, role: "member" }))
        );
      }

      // Notify newly added assignees via server action (bypasses RLS)
      await sendAssignedNotifications(
        newlyAdded.map((uid) => ({
          user_id:  uid,
          type:     "assigned",
          title:    `You were assigned to ${issueCode ? `${issueCode}: ` : ""}${issueTitle}`,
          body:     actor?.user_metadata?.full_name
                      ? `Assigned by ${actor.user_metadata.full_name}`
                      : "You have a new assignment.",
          issue_id: id,
          actor_id: actor?.id ?? null,
        }))
      );
    }
  }

  return true;
}

export async function deleteIssue(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from("issues").delete().eq("id", id);
  return !error;
}

/* ─── Comments ──────────────────────────────────────────── */

export async function fetchComments(issueId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("comments")
    .select(`
      *,
      author:profiles!comments_author_id_fkey(id, full_name, avatar_url)
    `)
    .eq("issue_id", issueId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    issueId: row.issue_id,
    body: row.body,
    author: profileToMember(row.author) ?? { id: "?", name: "Unknown", initials: "?", role: "" },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/* ─── Project members ───────────────────────────────────── */

export async function inviteMemberByEmail(data: {
  projectUuid: string;
  email: string;
  role?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  // Look up user by email — first try profiles.email, then fall back to RPC
  let userId: string | null = null;

  const { data: profileRows } = await supabase
    .from("profiles")
    .select("id")
    .ilike("email", data.email.trim())
    .limit(1);

  if (profileRows && profileRows.length > 0) {
    userId = profileRows[0].id;
  } else {
    // Fallback: use the security-definer RPC that can read auth.users
    const { data: rpcId, error: rpcError } = await supabase.rpc(
      "find_user_id_by_email",
      { lookup_email: data.email.trim() }
    );
    if (rpcError) return { success: false, error: "Failed to search for user" };
    userId = rpcId ?? null;
  }

  if (!userId) {
    return { success: false, error: "No Blockan account found with that email address" };
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", data.projectUuid)
    .eq("user_id", userId)
    .single();

  if (existing) return { success: false, error: "User is already a member of this project" };

  const { error } = await supabase.from("project_members").insert({
    project_id: data.projectUuid,
    user_id: userId,
    role: data.role ?? "member",
  });

  if (error) return { success: false, error: error.message };

  // Notify the invited user
  const { data: { user: actor } } = await supabase.auth.getUser();
  const { data: projectRow } = await supabase
    .from("projects")
    .select("name")
    .eq("id", data.projectUuid)
    .single();
  try {
    await supabase.from("notifications").insert({
      user_id: userId,
      type: "invite",
      title: `You were added to ${projectRow?.name ?? "a project"}`,
      body: `You now have ${data.role ?? "member"} access.`,
      actor_id: actor?.id ?? null,
    });
  } catch (_) { /* non-fatal */ }

  return { success: true };
}

export async function removeMemberFromProject(projectUuid: string, userId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("project_id", projectUuid)
    .eq("user_id", userId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function updateMemberRole(projectUuid: string, userId: string, role: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("project_members")
    .update({ role })
    .eq("project_id", projectUuid)
    .eq("user_id", userId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Compress an image file client-side using Canvas, then store the resulting
 * data-URL directly in profiles.avatar_url.
 * No Supabase Storage bucket is required.
 */
export async function uploadAvatar(
  userId: string,
  file: File,
): Promise<{ url: string | null; error?: string }> {
  // 1. Compress / resize with Canvas (browser-only, safe to call here)
  const dataUrl = await compressImage(file, 400, 0.82);
  if (!dataUrl) return { url: null, error: "Could not process image" };

  // 2. Persist to profiles table
  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .upsert({
      id: userId,
      avatar_url: dataUrl,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error("[uploadAvatar] profile upsert error:", error.message);
    return { url: null, error: error.message };
  }

  return { url: dataUrl };
}

/** Resize & JPEG-compress an image to maxPx × maxPx, returns a data-URL. */
function compressImage(file: File, maxPx = 400, quality = 0.82): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const w = Math.round(img.width  * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width  = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => resolve(null);
      img.src = ev.target?.result as string;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

/* ─── Activity feed ─────────────────────────────────────── */

export type Activity = {
  id: string;
  type: "comment" | "issue_created" | "status_changed";
  authorId: string;
  authorName: string;
  authorInitials: string;
  authorAvatar?: string;
  issueCode?: string;
  issueTitle?: string;
  detail: string;
  createdAt: string;
};

export async function fetchRecentActivities(limit = 15): Promise<Activity[]> {
  const supabase = createClient();

  // Fetch recent comments with author and issue info
  const { data: comments } = await supabase
    .from("comments")
    .select(`
      id, body, created_at, issue_id,
      author:profiles!comments_author_id_fkey(id, full_name, avatar_url),
      issue:issues!comments_issue_id_fkey(id, code, title, status)
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  // Fetch recently updated issues (status changes)
  const { data: recentIssues } = await supabase
    .from("issues")
    .select(`
      id, code, title, status, updated_at, created_at,
      reporter:profiles!issues_reporter_id_fkey(id, full_name, avatar_url)
    `)
    .order("updated_at", { ascending: false })
    .limit(limit);

  const activities: Activity[] = [];

  (comments ?? []).forEach((c: any) => {
    const name = c.author?.full_name ?? "Someone";
    const initials = name.split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase();
    activities.push({
      id: `comment-${c.id}`,
      type: "comment",
      authorId: c.author?.id ?? "",
      authorName: name,
      authorInitials: initials,
      authorAvatar: c.author?.avatar_url ?? undefined,
      issueCode: c.issue?.code ?? undefined,
      issueTitle: c.issue?.title ?? undefined,
      detail: `commented on ${c.issue?.code ?? "an issue"}`,
      createdAt: c.created_at,
    });
  });

  (recentIssues ?? []).forEach((i: any) => {
    const name = i.reporter?.full_name ?? "Someone";
    const initials = name.split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase();
    // Treat as "created" if updated_at ≈ created_at, else "status changed"
    const isNew = Math.abs(
      new Date(i.updated_at).getTime() - new Date(i.created_at).getTime()
    ) < 5000;
    activities.push({
      id: `issue-${i.id}`,
      type: isNew ? "issue_created" : "status_changed",
      authorId: i.reporter?.id ?? "",
      authorName: name,
      authorInitials: initials,
      authorAvatar: i.reporter?.avatar_url ?? undefined,
      issueCode: i.code ?? undefined,
      issueTitle: i.title,
      detail: isNew
        ? `created ${i.code ?? "issue"}`
        : `moved ${i.code ?? "issue"} to ${toAppStatus(i.status)}`,
      createdAt: i.updated_at,
    });
  });

  // Sort by time descending, deduplicate, take top N
  return activities
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

/* ─── Issue activity ─────────────────────────────────────── */

export type IssueActivity = {
  id: string;
  issueId: string;
  actorId: string | null;
  actorName: string;
  actorInitials: string;
  actorAvatar?: string;
  eventType: "created" | "status_changed" | "priority_changed" | "assignee_changed" | "title_changed" | "sprint_changed";
  fromValue: string | null;
  toValue: string | null;
  createdAt: string;
};

export async function fetchIssueActivities(issueId: string): Promise<IssueActivity[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("issue_activity")
    .select(`*, actor:profiles!issue_activity_actor_id_fkey(id, full_name, avatar_url)`)
    .eq("issue_id", issueId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return data.map((row: any) => {
    const name = row.actor?.full_name ?? "Someone";
    return {
      id: row.id,
      issueId: row.issue_id,
      actorId: row.actor_id,
      actorName: name,
      actorInitials: name.split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase(),
      actorAvatar: row.actor?.avatar_url ?? undefined,
      eventType: row.event_type,
      fromValue: row.from_value,
      toValue: row.to_value,
      createdAt: row.created_at,
    };
  });
}

export async function logIssueActivity(data: {
  issueId: string;
  actorId: string;
  eventType: IssueActivity["eventType"];
  fromValue?: string | null;
  toValue?: string | null;
}): Promise<void> {
  const supabase = createClient();
  await supabase.from("issue_activity").insert({
    issue_id: data.issueId,
    actor_id: data.actorId,
    event_type: data.eventType,
    from_value: data.fromValue ?? null,
    to_value: data.toValue ?? null,
  });
}

export async function createComment(data: {
  issueId: string;
  authorId: string;
  body: string;
}) {
  const supabase = createClient();
  const { data: row, error } = await supabase
    .from("comments")
    .insert({ issue_id: data.issueId, author_id: data.authorId, body: data.body })
    .select(`*, author:profiles!comments_author_id_fkey(id, full_name, avatar_url)`)
    .single();

  if (error || !row) return null;

  // Notify reporter + assignees about new comment (skip the comment author)
  try {
    const { data: issue } = await supabase
      .from("issues")
      .select(`
        title, code, reporter_id,
        issue_assignees(user_id)
      `)
      .eq("id", data.issueId)
      .single();

    if (issue) {
      const authorName = row.author?.full_name ?? "Someone";
      const issueRef   = issue.code ? `${issue.code}: ${issue.title}` : issue.title;

      // Collect unique recipients: reporter + all assignees, minus the author
      const recipients = new Set<string>();
      if (issue.reporter_id && issue.reporter_id !== data.authorId)
        recipients.add(issue.reporter_id);
      (issue.issue_assignees ?? []).forEach((a: any) => {
        if (a.user_id && a.user_id !== data.authorId) recipients.add(a.user_id);
      });

      if (recipients.size > 0) {
        await sendAssignedNotifications(
          Array.from(recipients).map((uid) => ({
            user_id:  uid,
            type:     "comment",
            title:    `${authorName} commented on ${issueRef}`,
            body:     row.body?.replace(/<[^>]+>/g, "").slice(0, 120) ?? "",
            issue_id: data.issueId,
            actor_id: data.authorId,
          }))
        );
      }
    }
  } catch (_) { /* non-fatal */ }

  return {
    id: row.id,
    issueId: row.issue_id,
    body: row.body,
    author: profileToMember(row.author) ?? { id: "?", name: "Unknown", initials: "?", role: "" },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/* ─── Notifications ──────────────────────────────────────── */

export type AppNotification = {
  id: string;
  userId: string;
  type: "comment" | "assigned" | "mentioned" | "invite";
  title: string;
  body?: string;
  issueId?: string;
  actorId?: string;
  actorName?: string;
  actorAvatar?: string;
  read: boolean;
  createdAt: string;
};

export async function fetchNotifications(): Promise<AppNotification[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("notifications")
    .select(`*, actor:profiles!actor_id(id, full_name, avatar_url)`)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error || !data) return [];
  return data.map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body ?? undefined,
    issueId: row.issue_id ?? undefined,
    actorId: row.actor_id ?? undefined,
    actorName: row.actor?.full_name ?? undefined,
    actorAvatar: row.actor?.avatar_url ?? undefined,
    read: row.read,
    createdAt: row.created_at,
  }));
}

export async function markNotificationRead(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("notifications").update({ read: true }).eq("id", id);
}

export async function markAllNotificationsRead(): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("notifications").update({ read: true }).eq("user_id", user.id);
}

export async function createNotification(data: {
  userId: string;
  type: AppNotification["type"];
  title: string;
  body?: string;
  issueId?: string;
  actorId?: string;
}): Promise<void> {
  const supabase = createClient();
  await supabase.from("notifications").insert({
    user_id: data.userId,
    type: data.type,
    title: data.title,
    body: data.body ?? null,
    issue_id: data.issueId ?? null,
    actor_id: data.actorId ?? null,
  });
}

/* ─── Labels ─────────────────────────────────────────────── */

export type ProjectLabel = {
  id: string;
  projectId: string;
  name: string;
  color: string;
};

export async function fetchProjectLabels(projectId: string): Promise<ProjectLabel[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("project_labels")
    .select("*")
    .eq("project_id", projectId)
    .order("name");
  if (error || !data) return [];
  return data.map((row: any) => ({
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    color: row.color,
  }));
}

export async function upsertProjectLabel(data: {
  projectId: string;
  name: string;
  color: string;
  id?: string;
}): Promise<ProjectLabel | null> {
  const supabase = createClient();
  const payload: Record<string, string> = {
    project_id: data.projectId,
    name: data.name,
    color: data.color,
  };
  if (data.id) payload.id = data.id;
  const { data: row, error } = await supabase
    .from("project_labels")
    .upsert(payload, { onConflict: "project_id,name" })
    .select()
    .single();
  if (error || !row) return null;
  return { id: row.id, projectId: row.project_id, name: row.name, color: row.color };
}

export async function deleteProjectLabel(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("project_labels").delete().eq("id", id);
}

export async function updateIssueLabels(issueId: string, labels: string[]): Promise<void> {
  const supabase = createClient();
  await supabase.from("issues").update({ labels }).eq("id", issueId);
}
