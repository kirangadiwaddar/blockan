"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  fetchNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
  type AppNotification,
} from "@/lib/supabase/notification-actions";
import { useIssues } from "@/lib/issues-context";
import AppSidebar from "@/components/shadcn-space/blocks/dashboard/app-sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Bell, MessageSquare, UserCheck, AtSign, UserPlus,
  CheckCheck, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

const typeIcon: Record<AppNotification["type"], React.ElementType> = {
  comment:   MessageSquare,
  assigned:  UserCheck,
  mentioned: AtSign,
  invite:    UserPlus,
};
const typeColor: Record<AppNotification["type"], string> = {
  comment:   "text-blue-500",
  assigned:  "text-green-500",
  mentioned: "text-purple-500",
  invite:    "text-amber-500",
};
const typeBg: Record<AppNotification["type"], string> = {
  comment:   "bg-blue-500/10",
  assigned:  "bg-green-500/10",
  mentioned: "bg-purple-500/10",
  invite:    "bg-amber-500/10",
};

function relTime(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function NotificationsPage() {
  const router = useRouter();
  const { issues } = useIssues();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      const id = data.user?.id ?? null;
      setUserId(id);
      if (id) {
        fetchNotificationsAction(id)
          .then(setNotifications)
          .catch(() => {})
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });
  }, []);

  const hrefFor = (n: AppNotification) => {
    if (!n.issueId) return "/dashboard";
    const issue = issues.find((i) => i.id === n.issueId);
    if (issue?.projectId) return `/projects/${issue.projectId}/issues/${n.issueId}`;
    return "/dashboard";
  };

  const handleRead = async (n: AppNotification) => {
    if (!n.read) {
      setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x));
      await markNotificationReadAction(n.id);
    }
    router.push(hrefFor(n));
  };

  const handleMarkAll = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (userId) await markAllNotificationsReadAction(userId);
  };

  const unread = notifications.filter((n) => !n.read).length;
  const grouped = {
    unread: notifications.filter((n) => !n.read),
    read:   notifications.filter((n) => n.read),
  };

  return (
    <AppSidebar>
      <div className="flex flex-col gap-6 p-6 w-full max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell size={20} className="text-foreground" />
            <h1 className="text-xl font-semibold">Notifications</h1>
            {unread > 0 && (
              <span className="inline-flex items-center justify-center min-w-[22px] h-5 rounded-full bg-destructive/10 text-destructive text-xs font-semibold px-1.5">
                {unread}
              </span>
            )}
          </div>
          {unread > 0 && (
            <Button variant="outline" size="sm" className="gap-1.5 cursor-pointer" onClick={handleMarkAll}>
              <CheckCheck size={13} /> Mark all read
            </Button>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3 p-4 rounded-xl border">
                <Skeleton className="size-9 rounded-full shrink-0" />
                <div className="flex-1 flex flex-col gap-2 pt-0.5">
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && notifications.length === 0 && (
          <EmptyState
            icon={Bell}
            title="All caught up"
            description="You have no notifications yet. They'll appear here when teammates mention you, assign issues, or leave comments."
          />
        )}

        {/* Unread */}
        {!loading && grouped.unread.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Unread</p>
            <div className="flex flex-col gap-1">
              {grouped.unread.map((n) => {
                const Icon = typeIcon[n.type];
                return (
                  <button
                    key={n.id}
                    onClick={() => handleRead(n)}
                    className="flex items-start gap-3 p-4 rounded-xl border bg-muted/30 hover:bg-muted/60 transition-colors text-left cursor-pointer w-full group"
                  >
                    <div className="relative shrink-0">
                      <Avatar className="size-9">
                        <AvatarImage src={n.actorAvatar} alt={n.actorName} />
                        <AvatarFallback className="text-xs">
                          {n.actorName?.[0]?.toUpperCase() ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className={cn("absolute -bottom-0.5 -right-0.5 size-4 rounded-full flex items-center justify-center", typeBg[n.type])}>
                        <Icon size={9} className={typeColor[n.type]} />
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                      {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                      <p className="text-[11px] text-muted-foreground mt-1">{relTime(n.createdAt)}</p>
                    </div>
                    <span className="size-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Read */}
        {!loading && grouped.read.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              {grouped.unread.length > 0 ? "Earlier" : "All notifications"}
            </p>
            <div className="flex flex-col gap-1">
              {grouped.read.map((n) => {
                const Icon = typeIcon[n.type];
                return (
                  <button
                    key={n.id}
                    onClick={() => handleRead(n)}
                    className="flex items-start gap-3 p-4 rounded-xl border hover:bg-muted/40 transition-colors text-left cursor-pointer w-full"
                  >
                    <div className="relative shrink-0">
                      <Avatar className="size-9">
                        <AvatarImage src={n.actorAvatar} alt={n.actorName} />
                        <AvatarFallback className="text-xs">
                          {n.actorName?.[0]?.toUpperCase() ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className={cn("absolute -bottom-0.5 -right-0.5 size-4 rounded-full flex items-center justify-center", typeBg[n.type])}>
                        <Icon size={9} className={typeColor[n.type]} />
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground truncate">{n.title}</p>
                      {n.body && <p className="text-xs text-muted-foreground/70 mt-0.5 line-clamp-2">{n.body}</p>}
                      <p className="text-[11px] text-muted-foreground/60 mt-1">{relTime(n.createdAt)}</p>
                    </div>
                    <Check size={13} className="text-muted-foreground/40 shrink-0 mt-1" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppSidebar>
  );
}
