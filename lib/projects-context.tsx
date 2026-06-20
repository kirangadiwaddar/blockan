"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { Project, Sprint, Member } from "@/lib/types";
import { projects as mockProjects, sprints as mockSprints } from "@/lib/mock-data";
import {
  fetchProjects,
  fetchSprints,
  fetchAllMembers,
  createProject as dbCreateProject,
  createSprint as dbCreateSprint,
  updateSprintStatus as dbUpdateSprintStatus,
  updateSprint as dbUpdateSprint,
  deleteSprint as dbDeleteSprint,
  deleteProject as dbDeleteProject,
  updateProject as dbUpdateProject,
  removeMemberFromProject as dbRemoveMember,
  updateMemberRole as dbUpdateMemberRole,
} from "@/lib/supabase/db";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/supabase/user-context";

type ProjectsCtx = {
  projects: Project[];
  sprints: Sprint[];
  allMembers: Member[];
  loading: boolean;
  addProject: (p: Project) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  updateProject: (slug: string, data: { name?: string; description?: string; color?: string }) => Promise<void>;
  addSprint: (s: Sprint, projectSlug: string) => Promise<void>;
  updateSprintStatus: (id: string, status: Sprint["status"]) => void;
  editSprint: (id: string, data: { name?: string; goal?: string; startDate?: string; endDate?: string }) => void;
  deleteSprint: (id: string) => void;
  sprintsForProject: (projectId: string) => Sprint[];
  projectBySlug: (slug: string) => Project | undefined;
  uuidForSlug: (slug: string) => string | undefined;
  removeMember: (projectSlug: string, userId: string) => Promise<void>;
  updateMemberRole: (projectSlug: string, userId: string, role: string) => Promise<void>;
  refreshProjects: () => Promise<void>;
};

const Ctx = createContext<ProjectsCtx>({
  projects: mockProjects,
  sprints: mockSprints,
  allMembers: [],
  loading: false,
  addProject: async () => {},
  deleteProject: async () => {},
  updateProject: async () => {},
  addSprint: async () => {},
  updateSprintStatus: () => {},
  editSprint: () => {},
  deleteSprint: () => {},
  sprintsForProject: (id) => mockSprints.filter((s) => s.projectId === id),
  projectBySlug: (slug) => mockProjects.find((p) => p.id === slug),
  uuidForSlug: () => undefined,
  removeMember: async () => {},
  updateMemberRole: async () => {},
  refreshProjects: async () => {},
});

export function ProjectsProvider({ children }: { children: ReactNode }) {
  // Detect at module init whether we have a real Supabase URL
  const hasSupabase = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")
  );

  const [projects, setProjects]     = useState<Project[]>(hasSupabase ? [] : mockProjects);
  const [sprints, setSprints]       = useState<Sprint[]>(hasSupabase ? [] : mockSprints);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [loading, setLoading]       = useState(hasSupabase);
  const [uuidMap, setUuidMap]       = useState<Record<string, string>>({}); // slug → uuid
  const reloadTimerRef              = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Shared fetch-and-sync — called on mount and after mutations to keep state
  // perfectly in sync with the DB. Always updates state regardless of row count.
  const loadAll = useCallback(async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url || url.includes("placeholder")) return;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [dbProjects, members] = await Promise.all([
      fetchProjects(),
      fetchAllMembers(),
    ]);

    // Always sync — even if empty (handles deletions, fresh accounts, etc.)
    setProjects(dbProjects);
    setAllMembers(members);

    // Rebuild slug → uuid map
    const map: Record<string, string> = {};
    dbProjects.forEach((p: any) => { if (p._uuid) map[p.id] = p._uuid; });
    setUuidMap(map);

    // Fetch sprints for all projects in parallel
    const allSprints: Sprint[] = [];
    await Promise.all(
      dbProjects.map(async (p: any) => {
        const uuid = p._uuid ?? p.id;
        const s = await fetchSprints(uuid);
        allSprints.push(...s);
      })
    );
    setSprints(allSprints);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const supabase = createClient();
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "SIGNED_IN") {
        if (session?.user) {
          setLoading(true);
          loadAll()
            .catch(() => {})
            .finally(() => { if (!cancelled) setLoading(false); });
        }
      } else if (event === "SIGNED_OUT") {
        setProjects(hasSupabase ? [] : mockProjects);
        setSprints(hasSupabase ? [] : mockSprints);
        setLoading(false);
      }
    });

    // Also fire immediately in case the session is already available
    setLoading(true);
    loadAll()
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    // Realtime: reload when projects or members change (debounced to avoid thundering herd)
    const scheduleReload = () => {
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
      reloadTimerRef.current = setTimeout(() => {
        loadAll().catch(() => {});
      }, 200);
    };

    const realtimeChannel = supabase
      .channel("projects-members-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () => {
        if (!cancelled) scheduleReload();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "project_members" }, () => {
        if (!cancelled) scheduleReload();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "issues" }, () => {
        if (!cancelled) scheduleReload();
      })
      .subscribe();

    return () => {
      cancelled = true;
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
      listener.subscription.unsubscribe();
      realtimeChannel.unsubscribe();
    };
  }, [loadAll, hasSupabase]);

  const addProject = useCallback(async (p: Project) => {
    // Optimistic insert so the UI responds instantly
    setProjects((prev) => [p, ...prev]);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url || url.includes("placeholder")) return;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const result = await dbCreateProject({
      name: p.name,
      key: p.key,
      description: p.description,
      color: p.color,
      ownerId: user.id,
    });

    if (!result) {
      // Insert failed — revert the optimistic project so the UI stays honest
      setProjects((prev) => prev.filter((x) => x.id !== p.id));
      return;
    }

    // Re-fetch from DB: replaces the optimistic entry with the real row
    // (correct _uuid, member list, issue counts, etc.) and keeps uuidMap in sync.
    await loadAll().catch(() => {});
  }, [loadAll]);

  const deleteProject = useCallback(async (slug: string) => {
    // Optimistic remove
    setProjects((prev) => prev.filter((p) => p.id !== slug));
    const uuid = uuidMap[slug];
    if (!uuid) return;
    const ok = await dbDeleteProject(uuid).catch(() => false);
    if (!ok) {
      // Revert on failure by re-fetching
      await loadAll().catch(() => {});
    }
  }, [uuidMap, loadAll]);

  const updateProject = useCallback(async (slug: string, data: { name?: string; description?: string; color?: string }) => {
    setProjects((prev) => prev.map((p) => p.id === slug ? { ...p, ...data } : p));
    const uuid = uuidMap[slug];
    if (!uuid) return;
    const ok = await dbUpdateProject(uuid, data).catch(() => false);
    if (!ok) await loadAll().catch(() => {});
  }, [uuidMap, loadAll]);

  const addSprint = useCallback(async (s: Sprint, projectSlug: string) => {
    setSprints((prev) => [...prev, s]);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url || url.includes("placeholder")) return;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const projectUuid = uuidMap[projectSlug] ?? projectSlug;
    const result = await dbCreateSprint({
      projectUuid,
      name: s.name,
      goal: s.goal,
      startDate: s.startDate,
      endDate: s.endDate,
    });
    if (result) {
      setSprints((prev) => prev.map((sp) => sp.id === s.id ? result : sp));
    }
  }, [uuidMap]);

  const updateSprintStatus = useCallback((id: string, status: Sprint["status"]) => {
    setSprints((prev) => prev.map((s) => s.id === id ? { ...s, status } : s));
    dbUpdateSprintStatus(id, status).catch(() => {});
  }, []);

  const editSprint = useCallback((id: string, data: { name?: string; goal?: string; startDate?: string; endDate?: string }) => {
    setSprints((prev) => prev.map((s) => s.id === id ? {
      ...s,
      ...(data.name !== undefined && { name: data.name }),
      ...(data.goal !== undefined && { goal: data.goal }),
      ...(data.startDate !== undefined && { startDate: data.startDate }),
      ...(data.endDate !== undefined && { endDate: data.endDate }),
    } : s));
    dbUpdateSprint(id, data).catch(() => {});
  }, []);

  const deleteSprint = useCallback((id: string) => {
    setSprints((prev) => prev.filter((s) => s.id !== id));
    dbDeleteSprint(id).catch(() => {});
  }, []);

  const sprintsForProject = useCallback(
    (projectId: string) => sprints.filter((s) => s.projectId === projectId || s.projectId === uuidMap[projectId]),
    [sprints, uuidMap]
  );

  const projectBySlug = useCallback(
    (slug: string) => projects.find((p) => p.id === slug),
    [projects]
  );

  const uuidForSlug = useCallback(
    (slug: string) => uuidMap[slug],
    [uuidMap]
  );

  const removeMember = useCallback(async (projectSlug: string, userId: string) => {
    // Optimistic update
    setProjects((prev) => prev.map((p) =>
      p.id === projectSlug ? { ...p, members: p.members.filter((m) => m.id !== userId) } : p
    ));
    const projectUuid = uuidMap[projectSlug] ?? projectSlug;
    const result = await dbRemoveMember(projectUuid, userId);
    if (!result.success) await loadAll().catch(() => {});
  }, [uuidMap, loadAll]);

  const updateMemberRole = useCallback(async (projectSlug: string, userId: string, role: string) => {
    setProjects((prev) => prev.map((p) =>
      p.id === projectSlug
        ? { ...p, members: p.members.map((m) => m.id === userId ? { ...m, role } : m) }
        : p
    ));
    const projectUuid = uuidMap[projectSlug] ?? projectSlug;
    const result = await dbUpdateMemberRole(projectUuid, userId, role);
    if (!result.success) await loadAll().catch(() => {});
  }, [uuidMap, loadAll]);

  return (
    <Ctx.Provider value={{
      projects,
      sprints,
      allMembers,
      loading,
      addProject,
      deleteProject,
      updateProject,
      addSprint,
      updateSprintStatus,
      editSprint,
      deleteSprint,
      sprintsForProject,
      projectBySlug,
      uuidForSlug,
      removeMember,
      updateMemberRole,
      refreshProjects: loadAll,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useProjects() {
  return useContext(Ctx);
}

export type ProjectRole = "owner" | "admin" | "member" | "viewer" | "guest" | null;

/** Returns the current user's role in a given project (by slug or uuid). */
export function useProjectRole(projectId: string | undefined): ProjectRole {
  const { projects } = useProjects();
  const { user } = useUser();
  const userId = user?.id ?? null;

  if (!projectId || !userId) return null;

  const project = projects.find((p) => p.id === projectId || (p as any)._uuid === projectId);
  if (!project) return null;

  const member = project.members.find((m) => m.id === userId);
  if (!member) return null;

  const raw = (member.role ?? "member").toLowerCase();
  if (raw === "owner") return "owner";
  if (raw === "admin") return "admin";
  if (raw === "viewer") return "viewer";
  if (raw === "guest") return "guest";
  return "member";
}

/** Returns true if the role can create/edit/delete issues and drag cards. */
export function canEditProject(role: ProjectRole): boolean {
  return role === "owner" || role === "admin" || role === "member";
}

/** Returns true if the role can create/start/complete/delete sprints (owner & admin only). */
export function canManageSprints(role: ProjectRole): boolean {
  return role === "owner" || role === "admin";
}
