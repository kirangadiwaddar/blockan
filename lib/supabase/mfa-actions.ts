"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/** Called after signInWithPassword — checks if MFA is required */
export async function checkMfaRequired() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) return { required: false };
  // nextLevel is aal2 → user has TOTP enrolled and needs to verify
  return { required: data.nextLevel === "aal2" && data.currentLevel !== "aal2" };
}

/** Enroll a new TOTP factor — returns QR code URI and secret */
export async function enrollTotp() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", issuer: "Blockan" });
  if (error) return { error: error.message };
  return {
    factorId: data.id,
    qrCodeSvg: data.totp.qr_code,
    secret: data.totp.secret,
    uri: data.totp.uri,
  };
}

/** Verify and activate the enrolled TOTP factor */
export async function verifyAndActivateTotp(factorId: string, code: string) {
  const supabase = await createClient();
  const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeErr) return { error: challengeErr.message };

  const { error: verifyErr } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });
  if (verifyErr) return { error: verifyErr.message };
  return { success: true };
}

/** Unenroll (disable) TOTP */
export async function unenrollTotp(factorId: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) return { error: error.message };
  return { success: true };
}

/** Get enrolled factors */
export async function getMfaFactors() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) return { factors: [] };
  return { factors: data.totp ?? [] };
}

/** Challenge + verify on the 2FA login page */
export async function challengeAndVerifyMfa(factorId: string, code: string) {
  const supabase = await createClient();
  const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeErr) return { error: challengeErr.message };

  const { error: verifyErr } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });
  if (verifyErr) return { error: verifyErr.message };

  redirect("/dashboard");
}
