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
