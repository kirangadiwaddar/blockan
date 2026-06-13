"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || url.includes("placeholder") || !serviceKey) return null;
  return createAdminClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Invite a new user — stores in pending_invites only, NO auth user created.
 * Returns an invite link: /register?token=UUID
 */
export async function inviteNewUser(data: {
  email: string;
  projectIds: string[];
  role: string;
  invitedBy: string;
}): Promise<{ success: boolean; inviteLink?: string; error?: string }> {
  const admin = getAdminClient();
  if (!admin) return { success: false, error: "Invite not configured (missing service role key)" };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Generate one shared token for all projects (same invitee, same invite)
  const token = crypto.randomUUID();

  // Insert a pending_invites row per project
  for (const projectId of data.projectIds) {
    const { error } = await admin.from("pending_invites").insert({
      email: data.email,
      project_id: projectId,
      role: data.role,
      invited_by: data.invitedBy,
      token,
    });
    if (error) return { success: false, error: error.message };
  }

  const inviteLink = `${appUrl}/register?token=${token}`;
  return { success: true, inviteLink };
}

/**
 * Fetches invite details by token using admin client (bypasses RLS).
 * Called from register page where user is not yet authenticated.
 */
export async function fetchInviteByToken(
  token: string,
): Promise<{ email: string; role: string; projectNames: string[] } | null> {
  const admin = getAdminClient();
  if (!admin) return null;

  const { data, error } = await admin
    .from("pending_invites")
    .select("email, role, project_id, projects(name)")
    .eq("token", token);

  if (error || !data || data.length === 0) return null;

  return {
    email: data[0].email,
    role: data[0].role,
    projectNames: data.map((r: any) => r.projects?.name ?? "").filter(Boolean),
  };
}

/**
 * Returns a fresh invite link from an existing pending_invites token.
 */
export async function generateInviteLink(
  token: string,
): Promise<{ success: boolean; link?: string; error?: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return { success: true, link: `${appUrl}/register?token=${token}` };
}

/**
 * Called from register page after invitee fills in name + password.
 * Creates their account, adds them to projects, cleans up pending_invites.
 */
export async function completeInviteRegistration(formData: FormData): Promise<{ error?: string }> {
  try {
    const token = formData.get("token") as string;
    const name = formData.get("name") as string;
    const password = formData.get("password") as string;
    const email = formData.get("email") as string;

    const admin = getAdminClient();
    if (!admin) return { error: "Server configuration error" };

    // Fetch all pending invites for this token
    const { data: invites, error: fetchError } = await admin
      .from("pending_invites")
      .select("project_id, role")
      .eq("token", token);

    if (fetchError || !invites || invites.length === 0) {
      return { error: "Invite link is invalid or has already been used" };
    }

    // Create the auth user (email_confirm: true since invite is pre-verified)
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });

    if (createError) return { error: createError.message };
    const userId = created.user.id;

    // Create profile
    await admin.from("profiles").upsert(
      { id: userId, full_name: name, email, avatar_url: null, is_pending: false },
      { onConflict: "id", ignoreDuplicates: false }
    );

    // Add to all invited projects
    const role = invites[0].role;
    for (const inv of invites) {
      const { data: existing } = await admin
        .from("project_members")
        .select("id")
        .eq("project_id", inv.project_id)
        .eq("user_id", userId)
        .maybeSingle();

      if (!existing) {
        await admin.from("project_members").insert({
          project_id: inv.project_id,
          user_id: userId,
          role,
        });
      }
    }

    // Delete all pending_invites rows for this token
    await admin.from("pending_invites").delete().eq("token", token);

    // Sign them in
    const supabase = await createClient();
    await supabase.auth.signInWithPassword({ email, password });

    redirect("/dashboard");
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return { error: "Something went wrong. Please try again." };
  }
}

/**
 * Cancels a pending invite — removes all rows for this token.
 */
export async function cancelPendingInviteAction(
  email: string,
): Promise<{ success: boolean; error?: string }> {
  const admin = getAdminClient();
  if (!admin) return { success: false, error: "Missing service role key" };

  // Delete ALL pending_invites rows for this email — covers any token/project combination
  await admin.from("pending_invites").delete().ilike("email", email);

  return { success: true };
}

/**
 * Re-sends invite — just returns the same link (token is permanent until cancelled).
 */
export async function resendInvite(
  token: string,
): Promise<{ success: boolean; link?: string; error?: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return { success: true, link: `${appUrl}/register?token=${token}` };
}
