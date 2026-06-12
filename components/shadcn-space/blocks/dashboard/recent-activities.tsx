"use client";

import React, { useRef, useEffect, useState } from "react";
import { motion, useInView } from "motion/react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { fetchRecentActivities, type Activity } from "@/lib/supabase/db";
import { Zap } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const FALLBACK_COLORS = [
  "bg-blue-500", "bg-purple-500", "bg-green-500",
  "bg-orange-500", "bg-pink-500", "bg-yellow-500",
];

export default function RecentActivities() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  // Fallback: force-show after data loads even if intersection never fires
  const [forceVisible, setForceVisible] = useState(false);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url || url.includes("placeholder")) {
      setLoading(false);
      return;
    }
    fetchRecentActivities(12)
      .then((data) => {
        setActivities(data);
        // Give IntersectionObserver 300ms to fire; if not, force visible
        setTimeout(() => setForceVisible(true), 300);
      })
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, []);

  const visible = isInView || forceVisible;

  return (
    <Card ref={ref} className="h-full overflow-hidden rounded-2xl py-0 gap-0">
      <CardHeader className="px-4 py-5 border-b">
        <CardTitle className="text-sm font-semibold">Recent Activities</CardTitle>
      </CardHeader>

      <CardContent className="p-0 overflow-y-auto max-h-[420px]">
        {loading ? (
          <div className="flex flex-col gap-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                <div className="size-7 rounded-full bg-muted animate-pulse shrink-0" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="h-2.5 bg-muted animate-pulse rounded w-3/4" />
                  <div className="h-2 bg-muted animate-pulse rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : fetchError ? (
          <EmptyState
            icon={Zap}
            title="Couldn't load activity"
            description="There was a problem fetching recent activity. Try refreshing the page."
            className="py-10"
          />
        ) : activities.length === 0 ? (
          <EmptyState
            icon={Zap}
            title="No activity yet"
            description="Comments, status changes, and new issues will appear here."
            className="py-10"
          />
        ) : (
          <motion.div
            initial="hidden"
            animate={visible ? "visible" : "hidden"}
            variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
          >
            {activities.map((activity, index) => (
              <React.Fragment key={activity.id}>
                <motion.div
                  variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }}
                  transition={{ duration: 0.18 }}
                  className="flex items-start gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors cursor-pointer"
                >
                  <div className="relative shrink-0">
                    <Avatar className="size-7">
                      <AvatarImage src={activity.authorAvatar} alt={activity.authorName} />
                      <AvatarFallback
                        className={`text-white text-xs font-medium ${FALLBACK_COLORS[index % FALLBACK_COLORS.length]}`}
                      >
                        {activity.authorInitials}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-foreground leading-snug">
                      <span className="font-semibold">{activity.authorName}</span>{" "}
                      <span className="text-muted-foreground">{activity.detail}</span>
                      {activity.issueTitle && (
                        <span className="text-foreground"> · {activity.issueTitle}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(activity.createdAt)}</p>
                  </div>
                </motion.div>
                {index !== activities.length - 1 && <Separator />}
              </React.Fragment>
            ))}
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
