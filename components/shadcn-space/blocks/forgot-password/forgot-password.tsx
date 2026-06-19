"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { forgotPassword } from "@/lib/supabase/auth-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { LogoMark } from "@/assets/logo/logo";

const ForgotPasswordForm = () => {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await forgotPassword(formData);
      if (result?.error) setError(result.error);
      else setSuccess(true);
    });
  };

  return (
    <section className="bg-foreground dark:bg-background min-h-screen flex items-center justify-center relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 z-0" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(249, 115, 22, 0.25), transparent 70%), #000000" }} />
      </div>

      <div className="py-10 md:py-20 max-w-lg px-4 sm:px-0 mx-auto w-full">
        <Card className="px-6 py-8 sm:p-12 relative gap-6">
          <CardHeader className="text-center gap-6 p-0">
            <div className="mx-auto"><LogoMark size={40} /></div>
            <div className="flex flex-col gap-1">
              <CardTitle className="text-2xl font-medium text-card-foreground">Forgot your password?</CardTitle>
              <CardDescription className="text-sm font-normal text-muted-foreground">
                Enter your email and we&apos;ll send you a link to reset your password.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {success ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm text-green-600 dark:text-green-400 w-full">
                  <CheckCircle2 size={14} className="shrink-0" />
                  Reset link sent — check your inbox.
                </div>
                <Button variant="ghost" className="cursor-pointer w-full" onClick={() => router.push("/login")}>
                  Back to Sign in
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <FieldGroup className="gap-6">
                  {error && (
                    <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive">
                      <AlertCircle size={14} className="shrink-0" />{error}
                    </div>
                  )}
                  <Field className="gap-1.5">
                    <FieldLabel htmlFor="email" className="text-sm text-muted-foreground font-normal">Email*</FieldLabel>
                    <Input id="email" name="email" type="email" placeholder="you@example.com" required disabled={isPending} className="dark:bg-background h-9 shadow-xs" />
                  </Field>
                  <Field className="gap-3">
                    <Button type="submit" size="lg" disabled={isPending} className="rounded-xl cursor-pointer hover:bg-primary/80">
                      {isPending ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : "Send reset link"}
                    </Button>
                    <Button type="button" size="lg" variant="ghost" className="rounded-xl cursor-pointer" onClick={() => router.push("/login")}>
                      Back to Sign in
                    </Button>
                  </Field>
                </FieldGroup>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default ForgotPasswordForm;
