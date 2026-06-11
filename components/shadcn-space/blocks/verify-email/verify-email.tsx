"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { resendVerification } from "@/lib/supabase/auth-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup } from "@/components/ui/field";
import { CheckCircle2, Loader2, Mail } from "lucide-react";

const BlockanLogo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none">
    <g><path d="M16.6584 40H15.3817C12.0653 40 10.07 39.9994 8.54578 39.7159L17.3668 28.0344L16.6584 40Z" fill="#FF1616"/><path d="M31.2482 39.7514C29.7502 39.9988 27.7875 40 24.6183 40H23.109L22.397 28.0309L31.2482 39.7514Z" fill="#FF1616"/><path d="M39.6714 31.6708C39.607 31.9773 39.5312 32.2655 39.4388 32.5426C38.8336 34.3567 37.7711 35.9522 36.3866 37.1982L26.4399 26.044L39.6714 31.6708Z" fill="#FF1616"/><path d="M3.4854 37.0792C2.16393 35.8511 1.14735 34.3 0.561036 32.5426C0.459507 32.2382 0.375209 31.921 0.307129 31.5803L13.3239 26.0458L3.4854 37.0792Z" fill="#FF1616"/><path d="M40 24.6183C40 25.7428 39.9968 26.7154 39.9858 27.5692L28.1729 23.006H40V24.6183Z" fill="#FF1616"/><path d="M11.5962 23.006L0.0106534 27.4805C0.000706105 26.6481 0 25.704 0 24.6183V23.006H11.5962Z" fill="#FF1616"/><path d="M24.6183 0C28.7807 0 30.862 0.000553668 32.5426 0.56108C35.7979 1.64713 38.3529 4.20208 39.4389 7.45739C39.9994 9.13798 40 11.2193 40 15.3817V20.016H27.5089L36.5181 16.1861L33.8459 14.4123L25.1048 17.7876L29.2081 12.358L26.2571 11.5501L21.7259 16.6282L21.3885 10.9091H18.3825L18.0398 16.6282L13.5121 11.5501L10.5629 12.358L14.6609 17.7859L5.92507 14.4123L3.25284 16.1861L12.2603 20.016H0V15.3817C0 11.2193 0.000553668 9.13798 0.56108 7.45739C1.64713 4.20208 4.20208 1.64713 7.45739 0.56108C9.13798 0.000553668 11.2193 0 15.3817 0H24.6183Z" fill="#FF1616"/></g>
  </svg>
);

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
                <Button size="lg" className="rounded-xl h-10 hover:bg-primary/80 cursor-pointer" onClick={() => window.location.href = "/login"}>
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
