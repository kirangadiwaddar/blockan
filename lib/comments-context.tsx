"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { getInitials } from "@/lib/utils";

export type Comment = {
  id: string;
  issueId: string;
  authorId: string;
  authorName: string;
  authorInitials: string;
  authorAvatar?: string;
  body: string;
  createdAt: string;
};

type CommentsCtx = {
  getComments: (issueId: string) => Comment[];
  loadComments: (issueId: string) => Promise<void>;
  addComment: (comment: Omit<Comment, "id" | "createdAt">) => Promise<void>;
  deleteComment: (id: string) => Promise<void>;
};

const Ctx = createContext<CommentsCtx>({
  getComments: () => [],
  loadComments: async () => {},
  addComment: async () => {},
  deleteComment: async () => {},
});

function rowToComment(row: any, profile: any): Comment {
  const authorName = profile?.full_name ?? "Unknown";
  const authorInitials = getInitials(authorName);
  return {
    id: row.id,
    issueId: row.issue_id,
    authorId: row.author_id,
    authorName,
    authorInitials,
    authorAvatar: profile?.avatar_url ?? undefined,
    body: row.body,
    createdAt: row.created_at,
  };
}

export function CommentsProvider({ children }: { children: ReactNode }) {
  const [comments, setComments] = useState<Comment[]>([]);
  // Track which issue IDs have been fetched so we don't double-load
  const loadedRef = useRef<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url || url.includes("placeholder")) return;

    const supabase = createClient();

    const channel = supabase
      .channel("comments-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments" },
        async (payload) => {
          const row = payload.new as any;
          if (!loadedRef.current.has(row.issue_id)) return;

          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", row.author_id)
            .single();

          const comment = rowToComment(row, profile);
          setComments((prev) => {
            if (prev.some((c) => c.id === comment.id)) return prev;
            return [...prev, comment];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "comments" },
        (payload) => {
          const id = (payload.old as any)?.id;
          if (id) setComments((prev) => prev.filter((c) => c.id !== id));
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, []);

  const loadComments = useCallback(async (issueId: string) => {
    if (loadedRef.current.has(issueId)) return; // already fetched

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url || url.includes("placeholder")) return;

    loadedRef.current.add(issueId);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("comments")
      .select(`*, author:profiles!comments_author_id_fkey(id, full_name, avatar_url)`)
      .eq("issue_id", issueId)
      .order("created_at", { ascending: true });

    if (error || !data) return;

    const fetched = data.map((row: any) => rowToComment(row, row.author));
    // Replace all comments for this issue with the fresh DB fetch
    setComments((prev) => [
      ...prev.filter((c) => c.issueId !== issueId),
      ...fetched,
    ]);
  }, []);

  const getComments = useCallback(
    (issueId: string) => comments.filter((c) => c.issueId === issueId),
    [comments]
  );

  const addComment = useCallback(
    async (comment: Omit<Comment, "id" | "createdAt">) => {
      const optimistic: Comment = {
        ...comment,
        id: `c-local-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      setComments((prev) => [...prev, optimistic]);

      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!url || url.includes("placeholder")) return;

      const supabase = createClient();
      const { data, error } = await supabase
        .from("comments")
        .insert({
          issue_id: comment.issueId,
          author_id: comment.authorId,
          body: comment.body,
        })
        .select("id, created_at")
        .single();

      if (!error && data) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === optimistic.id ? { ...c, id: data.id, createdAt: data.created_at } : c
          )
        );
      }
    },
    []
  );

  const deleteComment = useCallback(async (id: string) => {
    setComments((prev) => prev.filter((c) => c.id !== id));

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url || url.includes("placeholder")) return;

    const supabase = createClient();
    await supabase.from("comments").delete().eq("id", id);
  }, []);

  return <Ctx.Provider value={{ getComments, loadComments, addComment, deleteComment }}>{children}</Ctx.Provider>;
}

export function useComments() {
  return useContext(Ctx);
}
