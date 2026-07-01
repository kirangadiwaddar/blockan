"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  fetchNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
  type AppNotification,
} from "@/lib/supabase/notification-actions";
import { useIssues } from "@/lib/issues-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, MessageSquare, UserCheck, AtSign, Check, CheckCheck, UserPlus } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import Link from "next/link";

function relTime(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}


export function NotificationBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const { issues } = useIssues();

  const unread = notifications.filter((n) => !n.read).length;

  const load = (uid?: string | null) => {
    const id = uid ?? userId;
    if (!id) return;
    fetchNotificationsAction(id).then(setNotifications).catch(() => {}).finally(() => setLoading(false));
  };

  // Get current user id, then immediately load notifications
  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      const id = data.user?.id ?? null;
      setUserId(id);
      if (id) load(id);
      else setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime subscription — filtered to current user only
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => load(userId),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleMarkRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    await markNotificationReadAction(id);
  };

  const handleMarkAll = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (userId) await markAllNotificationsReadAction(userId);
  };

  // Build correct href for a notification. Prefer the project slug resolved
  // server-side (works even if the recipient hasn't loaded that issue); fall
  // back to the local issues context.
  const hrefFor = (n: AppNotification): string => {
    if (!n.issueId) return "/dashboard";
    if (n.projectSlug) return `/projects/${n.projectSlug}/issues/${n.issueId}`;
    const issue = issues.find((i) => i.id === n.issueId);
    if (issue?.projectId) return `/projects/${issue.projectId}/issues/${n.issueId}`;
    return "/dashboard";
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((p) => !p)}
        data-notification-bell
        className={cn(
          "relative size-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer",
          open ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
        title="Notifications"
      >
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-semibold rounded-full flex items-center justify-center px-1 leading-none ring-2 ring-background">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-[10000] w-80 bg-popover border rounded-2xl shadow-xl overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Notifications</span>
              {unread > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-destructive/10 text-destructive text-[10px] font-semibold px-1.5">
                  {unread}
                </span>
              )}
            </div>
            <button
              onClick={handleMarkAll}
              disabled={unread === 0}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckCheck size={12} /> Mark all read
            </button>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="flex flex-col gap-0">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex gap-3 px-4 py-3 border-b last:border-0">
                    <div className="size-8 rounded-full bg-muted animate-pulse shrink-0" />
                    <div className="flex-1 flex flex-col gap-1.5 pt-0.5">
                      <div className="h-2.5 bg-muted animate-pulse rounded w-3/4" />
                      <div className="h-2 bg-muted animate-pulse rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 px-5 text-center">
                <span className="size-12 rounded-2xl bg-muted/60 border border-border/40 flex items-center justify-center">
                  <Bell size={20} className="text-muted-foreground/40" strokeWidth={1.5} />
                </span>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">All caught up</p>
                  <p className="text-xs text-muted-foreground">You'll be notified here for:</p>
                </div>
                <div className="flex flex-col gap-2 w-full mt-1">
                  {[
                    { icon: UserPlus,      label: "Invites",      desc: "When you're added to a project" },
                    { icon: UserCheck,     label: "Assignments",  desc: "When an issue is assigned to you" },
                    { icon: MessageSquare, label: "Comments",     desc: "On issues you reported or are assigned to" },
                    { icon: AtSign,        label: "Mentions",     desc: "When someone @mentions you" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-muted/40 text-left">
                      <item.icon size={14} className="text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-xs font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((n) => {
                  const href = hrefFor(n);
                  const content = (
                    <div
                      className={cn(
                        "flex gap-3 px-4 py-3 transition-colors group",
                        !n.read ? "bg-primary/5 hover:bg-primary/8" : "hover:bg-muted/50"
                      )}
                    >
                      {/* Actor avatar */}
                      <div className="shrink-0">
                        <Avatar className="size-8">
                          <AvatarImage src={n.actorAvatar} alt={n.actorName} />
                          <AvatarFallback className="text-xs" colorSeed={n.actorId}>
                            {getInitials(n.actorName)}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium leading-snug">{n.title}</p>
                        {n.body && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {!n.read && (
                            <span className="size-1.5 rounded-full bg-primary shrink-0" />
                          )}
                          <p className="text-[10px] text-muted-foreground">{relTime(n.createdAt)}</p>
                        </div>
                      </div>

                      {/* Mark-read button */}
                      {!n.read && (
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleMarkRead(n.id); }}
                          className="shrink-0 size-6 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all cursor-pointer mt-0.5"
                          title="Mark as read"
                        >
                          <Check size={11} />
                        </button>
                      )}
                    </div>
                  );

                  // Wrap in a link only if we have a destination
                  return href !== "/dashboard" ? (
                    <Link
                      key={n.id}
                      href={href}
                      onClick={() => { handleMarkRead(n.id); setOpen(false); }}
                      className="block"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div key={n.id}>{content}</div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t p-3">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center w-full gap-2 h-8 rounded-lg bg-muted hover:bg-muted/70 text-xs font-medium text-foreground transition-colors cursor-pointer"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
