"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";

/**
 * Sends a magic-link invite email via the Supabase Admin API (service role).
 * Falls back gracefully if SUPABASE_SERVICE_ROLE_KEY is not set.
 */
export async function sendMagicLinkInvite(
  email: string,
  redirectTo?: string,
): Promise<{ success: boolean; error?: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || url.includes("placeholder") || !serviceKey) {
    return { success: false, error: "Invite email not configured (missing service role key)" };
  }

  const admin = createAdminClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: redirectTo ?? `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/register`,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}
