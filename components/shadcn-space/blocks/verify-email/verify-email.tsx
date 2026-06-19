"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { resendVerification } from "@/lib/supabase/auth-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup } from "@/components/ui/field";
import { CheckCircle2, Loader2, Mail } from "lucide-react";

const VerifyEmail = () => {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleResend = () => {
    if (!email) return;
    setError(null);
    startTransition(async () => {
      const result = await resendVerification(email);
      if (result?.error) setError(result.error);
      else setResent(true);
    });
  };

  return (
    <section className="bg-foreground dark:bg-background min-h-screen flex items-center relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 z-0" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(249, 115, 22, 0.25), transparent 70%), #000000" }} />
      </div>

      <div className="py-10 md:py-20 max-w-lg px-4 sm:px-0 mx-auto w-full">
        <Card className="px-6 py-8 sm:p-12 relative gap-6">
          <CardHeader className="text-center gap-6 p-0">
            <div className="mx-auto">
              <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <Mail size={28} className="text-primary" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <CardTitle className="text-2xl font-medium text-card-foreground">Check your inbox</CardTitle>
              <CardDescription className="text-sm font-normal text-muted-foreground">
                We sent a verification link to{" "}
                {email ? <strong className="text-card-foreground">{email}</strong> : "your email address"}.
                Click the link to activate your account.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <FieldGroup>
              <Field className="gap-4">
                {resent && (
                  <div className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2.5 text-sm text-green-600 dark:text-green-400">
                    <CheckCircle2 size={14} className="shrink-0" />
                    Verification email resent successfully.
                  </div>
                )}
                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive">
                    {error}
                  </div>
                )}
                <FieldDescription className="text-center text-sm font-normal text-muted-foreground">
                  Didn&apos;t get the email?{" "}
                  <button
                    onClick={handleResend}
                    disabled={isPending || resent || !email}
                    className="font-medium text-card-foreground hover:underline disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isPending ? <span className="flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Sending…</span> : "Resend"}
                  </button>
                </FieldDescription>
                <Button size="lg" className="rounded-xl hover:bg-primary/80 cursor-pointer" onClick={() => window.location.href = "/login"}>
                  Back to Sign in
                </Button>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default VerifyEmail;
