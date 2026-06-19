"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { challengeAndVerifyMfa } from "@/lib/supabase/mfa-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup } from "@/components/ui/field";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { AlertCircle, Loader2, ShieldCheck } from "lucide-react";

const TwoFactorAuthForm = () => {
  const searchParams = useSearchParams();
  const factorId = searchParams.get("factorId") ?? "";
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (otp.length < 6) return;
    setError(null);
    startTransition(async () => {
      const result = await challengeAndVerifyMfa(factorId, otp);
      if (result?.error) {
        setError(result.error);
        setOtp("");
      }
    });
  };

  return (
    <section className="bg-foreground dark:bg-background min-h-screen relative flex items-center justify-center">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 z-0" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(249, 115, 22, 0.25), transparent 70%), #000000" }} />
      </div>

      <div className="py-10 md:py-20 max-w-lg px-4 sm:px-0 mx-auto w-full">
        <Card className="px-6 py-8 sm:p-12 relative gap-6">
          <CardHeader className="text-center gap-6 p-0">
            <div className="mx-auto">
              <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-2 mx-auto">
                <ShieldCheck size={26} className="text-primary" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <CardTitle className="text-2xl font-medium text-card-foreground">Two-factor authentication</CardTitle>
              <CardDescription className="text-sm text-muted-foreground font-normal">
                Open your authenticator app and enter the 6-digit code
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <form onSubmit={handleSubmit}>
              <FieldGroup className="gap-6">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive">
                    <AlertCircle size={14} className="shrink-0" />{error}
                  </div>
                )}

                <div className="flex flex-col items-center gap-6">
                  <InputOTP maxLength={6} value={otp} onChange={setOtp} disabled={isPending}>
                    <InputOTPGroup className="gap-2 *:data-[slot=input-otp-slot]:rounded-xl *:data-[slot=input-otp-slot]:border *:data-[slot=input-otp-slot]:size-12 *:data-[slot=input-otp-slot]:text-lg">
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>

                  <Field className="gap-3 w-full">
                    <Button type="submit" size="lg" disabled={isPending || otp.length < 6} className="rounded-lg hover:bg-primary/80 cursor-pointer w-full">
                      {isPending ? <><Loader2 size={14} className="animate-spin" /> Verifying…</> : "Verify"}
                    </Button>
                    <FieldDescription className="text-center text-sm font-normal text-muted-foreground">
                      <a href="/login" className="font-medium text-card-foreground hover:underline">Use a different account</a>
                    </FieldDescription>
                  </Field>
                </div>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default TwoFactorAuthForm;
