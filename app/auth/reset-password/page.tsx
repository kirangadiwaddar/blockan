"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { LogoMark } from "@/assets/logo/logo";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirm = formData.get("confirm") as string;

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) setError(error.message);
      else {
        setSuccess(true);
        setTimeout(() => router.push("/dashboard"), 2000);
      }
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
              <CardTitle className="text-2xl font-medium text-card-foreground">Set new password</CardTitle>
              <CardDescription className="text-sm font-normal text-muted-foreground">
                Choose a strong password for your account.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {success ? (
              <div className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm text-green-600 dark:text-green-400">
                <CheckCircle2 size={14} className="shrink-0" />
                Password updated — redirecting to dashboard…
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <FieldGroup className="gap-5">
                  {error && (
                    <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive">
                      <AlertCircle size={14} className="shrink-0" />{error}
                    </div>
                  )}
                  <Field className="gap-1.5">
                    <FieldLabel htmlFor="password" className="text-sm text-muted-foreground font-normal">New password*</FieldLabel>
                    <Input id="password" name="password" type="password" placeholder="Min. 8 characters" required minLength={8} disabled={isPending} className="dark:bg-background h-9 shadow-xs" />
                  </Field>
                  <Field className="gap-1.5">
                    <FieldLabel htmlFor="confirm" className="text-sm text-muted-foreground font-normal">Confirm password*</FieldLabel>
                    <Input id="confirm" name="confirm" type="password" placeholder="Repeat your password" required disabled={isPending} className="dark:bg-background h-9 shadow-xs" />
                  </Field>
                  <Button type="submit" size="lg" disabled={isPending} className="rounded-lg hover:bg-primary/80 cursor-pointer">
                    {isPending ? <><Loader2 size={14} className="animate-spin" /> Updating…</> : "Update password"}
                  </Button>
                </FieldGroup>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
