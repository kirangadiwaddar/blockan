"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || url.includes("placeholder") || !serviceKey) return null;
  return createAdminClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  const { Resend } = await import("resend");
  return new Resend(key);
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "Blockan <onboarding@resend.dev>";

/* ─── Insert notifications (used by server-side DB helpers) ─ */

export async function sendAssignedNotifications(notifications: {
  user_id: string;
  type: string;
  title: string;
  body: string;
  issue_id: string;
  actor_id: string | null;
}[]) {
  if (!notifications.length) return;
  const admin = getAdminClient();
  if (!admin) return;
  await admin.from("notifications").insert(notifications);
}

/* ─── Create a single notification (server action) ──────── */

export async function createNotificationAction(data: {
  userId: string;
  type: "comment" | "assigned" | "mentioned" | "invite";
  title: string;
  body?: string;
  issueId?: string;
  actorId?: string;
}): Promise<void> {
  const admin = getAdminClient();
  if (!admin) return;
  await admin.from("notifications").insert({
    user_id:  data.userId,
    type:     data.type,
    title:    data.title,
    body:     data.body ?? null,
    issue_id: data.issueId ?? null,
    actor_id: data.actorId ?? null,
  });
}

/* ─── Send assignment email ──────────────────────────────── */

export async function sendAssignmentEmail(data: {
  toEmail: string;
  toName: string;
  assignerName: string;
  issueCode: string;
  issueTitle: string;
  issueId: string;
  projectSlug: string;
}): Promise<void> {
  const resend = await getResend();
  if (!resend) return;

  const issueUrl = `${APP_URL}/projects/${data.projectSlug}/issues/${data.issueId}`;
  const issueName = data.issueCode ? `${data.issueCode}: ${data.issueTitle}` : data.issueTitle;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: data.toEmail,
    subject: `You were assigned to ${issueName}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 32px 16px;">
  <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
    <div style="background: #0f172a; padding: 24px 32px;">
      <p style="color: #ffffff; font-size: 18px; font-weight: 700; margin: 0;">Blockan</p>
    </div>
    <div style="padding: 32px;">
      <p style="font-size: 16px; color: #111827; font-weight: 600; margin: 0 0 8px;">You were assigned to an issue</p>
      <p style="font-size: 14px; color: #6b7280; margin: 0 0 24px;">
        <strong style="color: #374151;">${data.assignerName}</strong> assigned you to:
      </p>
      <div style="background: #f3f4f6; border-radius: 8px; padding: 16px 20px; margin: 0 0 24px; border-left: 3px solid #6366f1;">
        <p style="font-size: 14px; font-weight: 600; color: #111827; margin: 0;">${issueName}</p>
      </div>
      <a href="${issueUrl}"
         style="display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600;">
        View issue →
      </a>
    </div>
    <div style="padding: 16px 32px; border-top: 1px solid #e5e7eb;">
      <p style="font-size: 12px; color: #9ca3af; margin: 0;">You're receiving this because you were assigned to an issue in Blockan.</p>
    </div>
  </div>
</body>
</html>`,
  }).catch(() => {});
}

/* ─── Fetch notifications (admin — bypasses RLS) ────────── */

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

export async function fetchNotificationsAction(userId: string): Promise<AppNotification[]> {
  const admin = getAdminClient();
  if (!admin) return [];
  const { data, error } = await admin
    .from("notifications")
    .select("*, actor:profiles!actor_id(id, full_name, avatar_url)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error || !data) return [];
  return data.map((row: any) => ({
    id:          row.id,
    userId:      row.user_id,
    type:        row.type,
    title:       row.title,
    body:        row.body ?? undefined,
    issueId:     row.issue_id ?? undefined,
    actorId:     row.actor_id ?? undefined,
    actorName:   row.actor?.full_name ?? undefined,
    actorAvatar: row.actor?.avatar_url ?? undefined,
    read:        row.read,
    createdAt:   row.created_at,
  }));
}

/* ─── Mark notification read (admin) ────────────────────── */

export async function markNotificationReadAction(id: string): Promise<void> {
  const admin = getAdminClient();
  if (!admin) return;
  await admin.from("notifications").update({ read: true }).eq("id", id);
}

/* ─── Mark all notifications read (admin) ───────────────── */

export async function markAllNotificationsReadAction(userId: string): Promise<void> {
  const admin = getAdminClient();
  if (!admin) return;
  await admin.from("notifications").update({ read: true }).eq("user_id", userId);
}
