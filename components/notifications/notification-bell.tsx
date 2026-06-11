"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type AppNotification,
} from "@/lib/supabase/db";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, MessageSquare, UserCheck, AtSign, Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

function relTime(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const typeIcon: Record<AppNotification["type"], React.ElementType> = {
  comment:  MessageSquare,
  assigned: UserCheck,
  mentioned: AtSign,
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const unread = notifications.filter((n) => !n.read).length;

  const load = () => {
    fetchNotifications().then(setNotifications).catch(() => {});
  };

  useEffect(() => {
    load();
    // Real-time subscription
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        () => load(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    await markNotificationRead(id);
  };

  const handleMarkAll = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await markAllNotificationsRead();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((p) => !p)}
        className={cn(
          "relative size-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer",
          open ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
        title="Notifications"
      >
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-destructive text-destructive-foreground text-[10px] font-semibold rounded-full flex items-center justify-center px-1 leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 bg-popover border rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && (
              <button
                onClick={handleMarkAll}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <CheckCheck size={12} /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y">
            {notifications.length === 0 ? (
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
                    { icon: AtSign,      label: "Mentions",       desc: "When someone @mentions you in a comment" },
                    { icon: UserCheck,   label: "Assignments",    desc: "When an issue is assigned to you" },
                    { icon: MessageSquare, label: "Comments",     desc: "On issues you reported or are assigned to" },
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
              notifications.map((n) => {
                const Icon = typeIcon[n.type];
                const href = n.issueId
                  ? `/projects/${n.issueId}/issues/${n.issueId}`
                  : "/dashboard";
                return (
                  <div
                    key={n.id}
                    className={cn(
                      "flex gap-3 px-4 py-3 hover:bg-muted/50 transition-colors",
                      !n.read && "bg-primary/5"
                    )}
                  >
                    <div className="relative shrink-0">
                      <Avatar className="size-8">
                        <AvatarImage src={n.actorAvatar} alt={n.actorName} />
                        <AvatarFallback className="text-xs">
                          {n.actorName?.split(" ").map((w) => w[0]).join("").slice(0, 2) ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-0.5 -right-0.5 size-4 rounded-full bg-background flex items-center justify-center border">
                        <Icon size={9} className="text-muted-foreground" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium leading-snug">{n.title}</p>
                      {n.body && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.body}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">{relTime(n.createdAt)}</p>
                    </div>
                    {!n.read && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        className="shrink-0 size-5 flex items-center justify-center rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors cursor-pointer mt-1"
                        title="Mark as read"
                      >
                        <Check size={11} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
