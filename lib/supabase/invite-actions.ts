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
 * Invite a new user:
 * - Creates a placeholder profile row (no auth user) with a generated UUID
 * - Admin can pre-assign tasks to this UUID before the invitee registers
 * - On registration, task assignments are migrated to the real auth user UUID
 * - If projectIds provided (project-scoped invite): adds to project_members
 * - If no projectIds (global/workspace invite): no project membership yet
 * Returns an invite link: /register?token=UUID
 */
export async function inviteNewUser(data: {
  email: string;
  projectIds: string[];
  allAdminProjectIds?: string[];
  role: string;
  invitedBy: string;
}): Promise<{ success: boolean; inviteLink?: string; error?: string }> {
  try {
    const admin = getAdminClient();
    if (!admin) return { success: false, error: "Invite not configured (missing service role key)" };

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const token = crypto.randomUUID();

    // Check if there's already a pending invite for this email
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .ilike("email", data.email)
      .eq("is_pending", true)
      .maybeSingle();

    let userId: string;
    if (existingProfile) {
      userId = existingProfile.id;
    } else {
      // Create auth user with email in user_metadata so the handle_new_user trigger
      // can populate profiles.email (avoids NOT NULL constraint on profiles.email).
      const tempPassword = crypto.randomUUID() + crypto.randomUUID(); // 72 chars, no dashes
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email: data.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { email: data.email, full_name: null, is_pending: true },
      });
      if (createError) return { success: false, error: `createUser: ${createError.message}` };
      userId = created.user.id;

      // Upsert profile — trigger may have already created it; set is_pending + email
      const { error: profileErr } = await admin.from("profiles").upsert(
        { id: userId, email: data.email, full_name: null, avatar_url: null, is_pending: true },
        { onConflict: "id", ignoreDuplicates: false }
      );
      if (profileErr) return { success: false, error: `profile upsert: ${profileErr.message}` };
    }

    // Project-scoped: add to project_members so admin can pre-assign tasks
    for (const projectId of data.projectIds) {
      const { data: existing } = await admin
        .from("project_members")
        .select("id")
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .maybeSingle();

      if (!existing) {
        await admin.from("project_members").insert({
          project_id: projectId,
          user_id: userId,
          role: data.role,
        });
      }
    }

    // pending_invites rows for tracking — one per project
    // For global invites use allAdminProjectIds so project_id is never null
    // (avoids NOT NULL constraint until schema migration is done)
    const trackingProjectIds = data.projectIds.length > 0
      ? data.projectIds
      : (data.allAdminProjectIds ?? []);

    if (trackingProjectIds.length > 0) {
      for (const projectId of trackingProjectIds) {
        const { error: inviteErr } = await admin.from("pending_invites").insert({
          email: data.email,
          project_id: projectId,
          role: data.role,
          invited_by: data.invitedBy,
          token,
        });
        if (inviteErr) return { success: false, error: `pending_invites insert: ${inviteErr.message}` };
      }
    } else {
      const { error: inviteError } = await admin.from("pending_invites").insert({
        email: data.email,
        project_id: null,
        role: data.role,
        invited_by: data.invitedBy,
        token,
      });
      if (inviteError) return { success: false, error: `pending_invites null: ${inviteError.message}` };
    }

    const inviteLink = `${appUrl}/register?token=${token}`;
    return { success: true, inviteLink };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Failed to create invite" };
  }
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
 * Fetches all pending invites using admin client (bypasses RLS).
 * Used by the team page to show invites the admin sent.
 */
export async function fetchPendingInvitesAdmin(): Promise<Array<{
  id: string; email: string; role: string; invitedAt: string;
  projectId: string | null; projectName: string; projectColor: string; token: string;
}>> {
  const admin = getAdminClient();
  if (!admin) return [];
  const { data, error } = await admin
    .from("pending_invites")
    .select("id, email, role, invited_at, token, project_id, projects(name, color)")
    .order("invited_at", { ascending: false });
  if (error || !data) return [];
  return data.map((row: any) => ({
    id: row.id,
    email: row.email,
    role: row.role,
    invitedAt: row.invited_at,
    projectId: row.project_id ?? null,
    projectName: row.projects?.name ?? "",
    projectColor: row.projects?.color ?? "",
    token: row.token,
  }));
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
 * Updates the pre-created placeholder auth user (preserves UUID so all
 * task assignments remain intact). Sets is_pending = false on profile.
 */
export async function completeInviteRegistration(formData: FormData): Promise<{ error?: string }> {
  try {
    const token = formData.get("token") as string;
    const name = formData.get("name") as string;
    const password = formData.get("password") as string;
    const email = formData.get("email") as string;

    const admin = getAdminClient();
    if (!admin) return { error: "Server configuration error" };

    // Validate token exists
    const { data: invites, error: fetchError } = await admin
      .from("pending_invites")
      .select("project_id, role")
      .eq("token", token);

    if (fetchError || !invites || invites.length === 0) {
      return { error: "Invite link is invalid or has already been used" };
    }

    // Find the placeholder auth user by email
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .ilike("email", email)
      .eq("is_pending", true)
      .maybeSingle();

    if (!profile) {
      return { error: "Could not find your invite. Please contact your admin." };
    }

    const userId = profile.id;

    // Update the existing auth user — set real password + name
    const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
      password,
      user_metadata: { full_name: name, is_pending: false },
    });
    if (updateError) return { error: updateError.message };

    // Update profile
    await admin.from("profiles").update({
      full_name: name,
      is_pending: false,
    }).eq("id", userId);

    // Add user to project_members for all projects from their invite
    const role = invites[0]?.role ?? "member";
    const projectIds = [...new Set(invites.map((r: any) => r.project_id).filter(Boolean))];
    for (const projectId of projectIds) {
      const { data: existing } = await admin
        .from("project_members")
        .select("id")
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!existing) {
        await admin.from("project_members").insert({ project_id: projectId, user_id: userId, role });
      }
    }

    // Delete pending_invites rows for this token
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
 * Cancels a pending invite — removes pending_invites rows and deletes
 * the placeholder auth user + profile so they can be re-invited cleanly.
 */
export async function cancelPendingInviteAction(
  email: string,
): Promise<{ success: boolean; error?: string }> {
  const admin = getAdminClient();
  if (!admin) return { success: false, error: "Missing service role key" };

  // Find placeholder user
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .eq("is_pending", true)
    .maybeSingle();

  if (profile) {
    // Remove from project_members
    await admin.from("project_members").delete().eq("user_id", profile.id);
    // Delete placeholder profile
    await admin.from("profiles").delete().eq("id", profile.id);
    // Delete placeholder auth user
    await admin.auth.admin.deleteUser(profile.id);
  }

  // Delete pending_invites rows
  await admin.from("pending_invites").delete().ilike("email", email);

  return { success: true };
}

/**
 * Re-sends invite — returns the same link (token is permanent until cancelled).
 */
export async function resendInvite(
  token: string,
): Promise<{ success: boolean; link?: string; error?: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return { success: true, link: `${appUrl}/register?token=${token}` };
}
