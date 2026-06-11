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
  createNotification,
} from "@/lib/supabase/db";
import { createClient } from "@/lib/supabase/client";

type IssuesCtx = {
  issues: Issue[];
  loading: boolean;
  updateIssue: (updated: Issue) => void;
  addIssue: (issue: Issue) => void;
  deleteIssue: (id: string) => void;
};

const Ctx = createContext<IssuesCtx>({
  issues: mockIssues,
  loading: false,
  updateIssue: () => {},
  addIssue: () => {},
  deleteIssue: () => {},
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

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!url || url.includes("placeholder")) return;

      const supabase = createClient();
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

      // Realtime subscription
      if (!cancelled) {
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
                    // Don't duplicate if it's already in the list (optimistic)
                    const exists = prev.some((i) => i.id === newIssue.id);
                    if (exists) return prev;
                    return [newIssue, ...prev];
                  });
                }
              } else if (payload.eventType === "UPDATE") {
                const issueId = payload.new.id as string;
                // Skip overwrite if we just updated this issue locally — our
                // in-memory state (with all assignees) is more accurate than
                // what the DB echo returns (DB only stores one assignee_id).
                if (locallyUpdatedRef.current.has(issueId)) {
                  locallyUpdatedRef.current.delete(issueId);
                  return;
                }
                const projectUuid = payload.new.project_id as string;
                const slug = uuidToSlugRef.current[projectUuid];
                const updatedIssues = await fetchIssues(projectUuid, slug);
                const updated = updatedIssues.find((i) => i.id === issueId);
                if (updated) {
                  setIssues((prev) => prev.map((i) => {
                    if (i.id !== updated.id) return i;
                    // Preserve local assignees if we have more than DB returned
                    // (DB only stores assignee_id = first assignee)
                    const assignees = i.assignees.length > updated.assignees.length
                      ? i.assignees
                      : updated.assignees;
                    return { ...updated, assignees };
                  }));
                }
              }
            }
          )
          .subscribe();

        realtimeChannelRef.current = channel;
      }
    }
    load().catch(console.error);
    return () => {
      cancelled = true;
      if (realtimeChannelRef.current) {
        realtimeChannelRef.current.unsubscribe();
        realtimeChannelRef.current = null;
      }
    };
  }, []);

  const updateIssue = useCallback((updated: Issue) => {
    setIssues((prev) => {
      const prev_ = prev.find((i) => i.id === updated.id);
      if (prev_) {
        // Log activity for meaningful field changes
        createClient().auth.getUser().then(({ data }) => {
          const actorId = data.user?.id;
          if (!actorId) return;
          if (prev_.status !== updated.status) {
            logIssueActivity({ issueId: updated.id, actorId, eventType: "status_changed", fromValue: prev_.status, toValue: updated.status }).catch(() => {});
          }
          if (prev_.priority !== updated.priority) {
            logIssueActivity({ issueId: updated.id, actorId, eventType: "priority_changed", fromValue: prev_.priority, toValue: updated.priority }).catch(() => {});
          }
          const prevAssigneeIds = prev_.assignees.map((a) => a.id).sort().join(",");
          const newAssigneeIds = updated.assignees.map((a) => a.id).sort().join(",");
          if (prevAssigneeIds !== newAssigneeIds) {
            const fromNames = prev_.assignees.map((a) => a.name).join(", ") || "Unassigned";
            const toNames = updated.assignees.map((a) => a.name).join(", ") || "Unassigned";
            logIssueActivity({ issueId: updated.id, actorId, eventType: "assignee_changed", fromValue: fromNames, toValue: toNames }).catch(() => {});
            // Notify newly added assignees
            const prevIds = new Set(prev_.assignees.map((a) => a.id));
            updated.assignees.forEach((a) => {
              if (!prevIds.has(a.id) && a.id !== actorId) {
                createNotification({
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
      labels: updated.labels ?? [],
    }).catch(console.error);
  }, []);

  const addIssue = useCallback((issue: Issue) => {
    setIssues((prev) => [issue, ...prev]);
  }, []);

  const deleteIssue = useCallback((id: string) => {
    setIssues((prev) => prev.filter((i) => i.id !== id));
    dbDeleteIssue(id).catch(console.error);
  }, []);

  return (
    <Ctx.Provider value={{ issues, loading, updateIssue, addIssue, deleteIssue }}>
      {children}
    </Ctx.Provider>
  );
}

export function useIssues() {
  return useContext(Ctx);
}
