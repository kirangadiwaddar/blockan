"use server";

import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { createClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  try {
    const supabase = await createClient();
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };

    // Check if user has MFA enrolled — if so, require 2FA
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const factorId = factors?.totp?.[0]?.id ?? "";
      redirect(`/two-factor-authentication?factorId=${factorId}`);
    }

    // New user with no name set → onboarding
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("full_name, is_pending").eq("id", user.id).single();
      if (!profile?.full_name || profile?.is_pending) redirect("/onboarding");
    }

    redirect("/dashboard");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { error: "An error occurred. Please try again." };
  }
}

export async function signUp(formData: FormData) {
  try {
    const supabase = await createClient();
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const name = formData.get("name") as string;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
      },
    });

    if (error) return { error: error.message };

    redirect("/verify-email?email=" + encodeURIComponent(email));
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { error: "An error occurred. Please try again." };
  }
}

export async function signOut() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  } catch (error) {
    if (isRedirectError(error)) throw error;
  }
}

export async function forgotPassword(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/reset-password`,
  });

  if (error) return { error: error.message };

  return { success: true };
}

export async function resendVerification(email: string) {
  const supabase = await createClient();

  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
    },
  });

  if (error) return { error: error.message };

  return { success: true };
}

export async function verifyOtp(formData: FormData) {
  try {
    const supabase = await createClient();
    const email = formData.get("email") as string;
    const token = formData.get("token") as string;

    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    if (error) return { error: error.message };

    // Check if this is a new user that needs onboarding
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      if (!profile?.full_name) {
        redirect("/onboarding");
      }
    }

    redirect("/dashboard");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { error: "An error occurred. Please try again." };
  }
}

export async function deleteAccount(userId: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return { error: "Server misconfigured" };

  const { createClient: createAdminClient } = await import("@supabase/supabase-js");
  const admin = createAdminClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function signInWithOAuth(provider: "google" | "github") {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
      },
    });

    if (error) return { error: error.message };
    if (data.url) redirect(data.url);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { error: "An error occurred. Please try again." };
  }
}
