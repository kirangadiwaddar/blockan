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
import { issues as mockIssues } from "@/lib/mock-data";
import { Issue } from "@/lib/types";
import {
  fetchIssues,
  updateIssue as dbUpdateIssue,
  deleteIssue as dbDeleteIssue,
  logIssueActivity,
} from "@/lib/supabase/db";
import { createNotificationAction } from "@/lib/supabase/notification-actions";
import { createClient } from "@/lib/supabase/client";

type IssuesCtx = {
  issues: Issue[];
  loading: boolean;
  updateIssue: (updated: Issue) => void;
  addIssue: (issue: Issue) => void;
  replaceIssue: (tempId: string, real: Issue) => void;
  deleteIssue: (id: string) => void;
  refreshIssues: () => Promise<void>;
};

const Ctx = createContext<IssuesCtx>({
  issues: mockIssues,
  loading: false,
  updateIssue: () => {},
  addIssue: () => {},
  replaceIssue: () => {},
  deleteIssue: () => {},
  refreshIssues: async () => {},
});

export function IssuesProvider({ children }: { children: ReactNode }) {
  const hasSupabase = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")
  );
  const [issues, setIssues] = useState<Issue[]>(hasSupabase ? [] : mockIssues);
  const [loading, setLoading] = useState(hasSupabase);
  const realtimeChannelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  // UUID → slug map so realtime updates can remap projectId correctly
  const uuidToSlugRef = useRef<Record<string, string>>({});
  // Track issues updated locally so realtime doesn't overwrite our optimistic state
  const locallyUpdatedRef = useRef<Set<string>>(new Set());

  const loadIssues = useCallback(async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url || url.includes("placeholder")) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setLoading(true);
    const { data: projectRows } = await supabase.from("projects").select("id, key");
    const uuidToSlug: Record<string, string> = {};
    (projectRows ?? []).forEach((p: any) => { uuidToSlug[p.id] = (p.key as string).toLowerCase(); });
    uuidToSlugRef.current = uuidToSlug;
    const { data: projectMemberships } = await supabase
      .from("project_members").select("project_id").eq("user_id", user.id);
    if (!projectMemberships) { setLoading(false); return; }
    const projectUuids = projectMemberships.map((pm: any) => pm.project_id as string);
    if (projectUuids.length === 0) { setLoading(false); return; }
    const allIssues: Issue[] = [];
    await Promise.all(projectUuids.map(async (uuid) => {
      const slug = uuidToSlug[uuid];
      const iss = await fetchIssues(uuid, slug);
      allIssues.push(...iss);
    }));
    setIssues(allIssues);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!url || url.includes("placeholder")) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      setLoading(true);

      // Fetch projects to build UUID → slug map
      const { data: projectRows } = await supabase
        .from("projects")
        .select("id, key");

      const uuidToSlug: Record<string, string> = {};
      (projectRows ?? []).forEach((p: any) => {
        uuidToSlug[p.id] = (p.key as string).toLowerCase();
      });
      uuidToSlugRef.current = uuidToSlug;

      // Fetch all projects the user has access to
      const { data: projectMemberships } = await supabase
        .from("project_members")
        .select("project_id")
        .eq("user_id", user.id);

      if (!projectMemberships || cancelled) { setLoading(false); return; }

      const projectUuids = projectMemberships.map((pm: any) => pm.project_id as string);
      if (projectUuids.length === 0) { setLoading(false); return; }

      const allIssues: Issue[] = [];
      await Promise.all(
        projectUuids.map(async (uuid) => {
          const slug = uuidToSlug[uuid];
          const iss = await fetchIssues(uuid, slug);
          allIssues.push(...iss);
        })
      );

      if (!cancelled) {
        setIssues(allIssues);
        setLoading(false);
      }

      // Realtime subscription — tear down any existing channel first
      if (!cancelled) {
        if (realtimeChannelRef.current) {
          realtimeChannelRef.current.unsubscribe();
          realtimeChannelRef.current = null;
        }
        const refreshIssue = async (issueId: string, projectUuid: string) => {
          const slug = uuidToSlugRef.current[projectUuid];
          const updatedIssues = await fetchIssues(projectUuid, slug);
          const updated = updatedIssues.find((i) => i.id === issueId);
          if (updated) {
            setIssues((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
          }
        };

        const channel = supabase
          .channel("issues-realtime")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "issues" },
            async (payload) => {
              if (payload.eventType === "DELETE") {
                setIssues((prev) => prev.filter((i) => i.id !== payload.old.id));
              } else if (payload.eventType === "INSERT") {
                const projectUuid = payload.new.project_id as string;
                const slug = uuidToSlugRef.current[projectUuid];
                const newIssues = await fetchIssues(projectUuid, slug);
                const newIssue = newIssues.find((i) => i.id === payload.new.id);
                if (newIssue) {
                  setIssues((prev) => {
                    const exists = prev.some((i) => i.id === newIssue.id);
                    if (exists) return prev;
                    return [newIssue, ...prev];
                  });
                }
              } else if (payload.eventType === "UPDATE") {
                const issueId = payload.new.id as string;
                if (locallyUpdatedRef.current.has(issueId)) {
                  locallyUpdatedRef.current.delete(issueId);
                  return;
                }
                await refreshIssue(issueId, payload.new.project_id as string);
              }
            }
          )
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "issue_assignees" },
            (payload) => {
              const issueId = (payload.new as any)?.issue_id ?? (payload.old as any)?.issue_id;
              if (!issueId) return;
              setIssues((prev) => {
                const found = prev.find((i) => i.id === issueId);
                if (found) {
                  const projectUuid = Object.entries(uuidToSlugRef.current).find(([, slug]) => slug === found.projectId)?.[0];
                  if (projectUuid) refreshIssue(issueId, projectUuid);
                }
                return prev;
              });
            }
          )
          .subscribe();

        realtimeChannelRef.current = channel;
      }
    }
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "SIGNED_IN") {
        if (session?.user) load().catch(() => {});
      } else if (event === "SIGNED_OUT") {
        setIssues(hasSupabase ? [] : mockIssues);
        setLoading(false);
      }
    });

    load().catch(() => {});

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
      if (realtimeChannelRef.current) {
        realtimeChannelRef.current.unsubscribe();
        realtimeChannelRef.current = null;
      }
    };
  }, [hasSupabase]);

  const updateIssue = useCallback((updated: Issue) => {
    setIssues((prev) => {
      const prev_ = prev.find((i) => i.id === updated.id);
      if (prev_) {
        createClient().auth.getUser().then(({ data }) => {
          const actorId = data.user?.id;
          if (!actorId) return;

          // Log field changes as activity events
          if (prev_.status !== updated.status)
            logIssueActivity({ issueId: updated.id, actorId, eventType: "status_changed", fromValue: prev_.status, toValue: updated.status }).catch(() => {});
          if (prev_.priority !== updated.priority)
            logIssueActivity({ issueId: updated.id, actorId, eventType: "priority_changed", fromValue: prev_.priority, toValue: updated.priority }).catch(() => {});
          if (prev_.title !== updated.title)
            logIssueActivity({ issueId: updated.id, actorId, eventType: "title_changed", fromValue: prev_.title, toValue: updated.title }).catch(() => {});
          if ((prev_.sprintId ?? null) !== (updated.sprintId ?? null))
            logIssueActivity({ issueId: updated.id, actorId, eventType: "sprint_changed", fromValue: prev_.sprintId ?? null, toValue: updated.sprintId ?? null }).catch(() => {});

          const prevAssigneeIds = prev_.assignees.map((a) => a.id).sort().join(",");
          const nextAssigneeIds = updated.assignees.map((a) => a.id).sort().join(",");
          if (prevAssigneeIds !== nextAssigneeIds) {
            logIssueActivity({ issueId: updated.id, actorId, eventType: "assignee_changed", fromValue: prev_.assignees.map((a) => a.name).join(", ") || null, toValue: updated.assignees.map((a) => a.name).join(", ") || null }).catch(() => {});
            // Notify newly added assignees
            const prevIds = new Set(prev_.assignees.map((a) => a.id));
            updated.assignees.forEach((a) => {
              if (!prevIds.has(a.id) && a.id !== actorId) {
                createNotificationAction({
                  userId: a.id,
                  type: "assigned",
                  title: `You were assigned to ${updated.code ?? updated.title}`,
                  issueId: updated.id,
                  actorId,
                }).catch(() => {});
              }
            });
          }
        });
      }
      return prev.map((i) => i.id === updated.id ? updated : i);
    });
    // Mark as locally updated so the realtime echo doesn't clobber our state
    locallyUpdatedRef.current.add(updated.id);
    dbUpdateIssue(updated.id, {
      title: updated.title,
      description: updated.description,
      status: updated.status,
      priority: updated.priority,
      type: updated.type,
      sprintId: updated.sprintId ?? null,
      assigneeId: updated.assignees[0]?.id ?? null,
      assigneeIds: updated.assignees.map((a) => a.id),
      points: updated.storyPoints,
      dueDate: updated.dueDate ?? null,
      parentId: updated.parentId ?? null,
    }).catch(() => {});
  }, []);

  const addIssue = useCallback((issue: Issue) => {
    setIssues((prev) => [issue, ...prev]);
  }, []);

  const replaceIssue = useCallback((tempId: string, real: Issue) => {
    setIssues((prev) => prev.map((i) => (i.id === tempId ? real : i)));
  }, []);

  const deleteIssue = useCallback((id: string) => {
    setIssues((prev) => prev.filter((i) => i.id !== id));
    dbDeleteIssue(id).catch(() => {});
  }, []);

  return (
    <Ctx.Provider value={{ issues, loading, updateIssue, addIssue, replaceIssue, deleteIssue, refreshIssues: loadIssues }}>
      {children}
    </Ctx.Provider>
  );
}

export function useIssues() {
  return useContext(Ctx);
}
