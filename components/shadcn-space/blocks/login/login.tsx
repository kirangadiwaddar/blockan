"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithOAuth } from "@/lib/supabase/auth-actions";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { LogoMark } from "@/assets/logo/logo";

const LoginForm = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isOAuthPending, setIsOAuthPending] = useState<"google" | "github" | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlError = searchParams.get("error");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    startTransition(async () => {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) { setError(signInError.message); return; }

      // Check MFA requirement
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const factorId = factors?.totp?.[0]?.id ?? "";
        router.push(`/two-factor-authentication?factorId=${factorId}`);
        return;
      }

      router.push("/dashboard");
    });
  };

  const handleOAuth = (provider: "google" | "github") => {
    setIsOAuthPending(provider);
    startTransition(async () => {
      const result = await signInWithOAuth(provider);
      if (result?.error) {
        setError(result.error);
        setIsOAuthPending(null);
      }
    });
  };

  return (
    <section className="bg-foreground dark:bg-background min-h-screen flex items-center justify-center relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 z-0" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(249, 115, 22, 0.25), transparent 70%), #000000" }} />
      </div>

      <div className="py-10 md:py-20 max-w-lg px-4 sm:px-0 mx-auto w-full">
        <Card className="max-w-lg px-6 py-8 sm:p-12 relative gap-6">
          <CardHeader className="text-center gap-6 p-0">
            <div className="mx-auto"><LogoMark size={40} /></div>
            <div className="flex flex-col gap-1">
              <CardTitle className="text-2xl font-medium text-card-foreground">Welcome to Blockan</CardTitle>
              <CardDescription className="text-sm text-muted-foreground font-normal">Sign in to your account</CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {(error || urlError) && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive mb-4">
                <AlertCircle size={14} className="shrink-0" />
                {error ?? (urlError === "auth_callback_failed" ? "Authentication failed. Please try again." : urlError)}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <FieldGroup className="gap-6">
                <Field className="grid md:grid-cols-2 md:gap-6 gap-3">
                  <Button
                    variant="outline"
                    type="button"
                    disabled={!!isOAuthPending || isPending}
                    onClick={() => handleOAuth("google")}
                    className="text-sm text-card-foreground gap-2 dark:bg-background rounded-lg h-9 shadow-xs cursor-pointer"
                  >
                    {isOAuthPending === "google" ? <Loader2 size={14} className="animate-spin" /> : <img src="https://images.shadcnspace.com/assets/svgs/icon-google.svg" alt="google" className="h-4 w-4" />}
                    Sign in with Google
                  </Button>
                  <Button
                    variant="outline"
                    type="button"
                    disabled={!!isOAuthPending || isPending}
                    onClick={() => handleOAuth("github")}
                    className="text-sm text-card-foreground gap-2 dark:bg-background rounded-lg h-9 shadow-xs cursor-pointer"
                  >
                    {isOAuthPending === "github" ? <Loader2 size={14} className="animate-spin" /> : (
                      <>
                        <img src="https://images.shadcnspace.com/assets/svgs/icon-github.svg" alt="github" className="dark:hidden h-4 w-4" />
                        <img src="https://images.shadcnspace.com/assets/svgs/icon-github-white.svg" alt="github" className="hidden dark:block h-4 w-4" />
                      </>
                    )}
                    Sign in with Github
                  </Button>
                </Field>

                <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card text-sm text-muted-foreground bg-transparent">
                  <span className="px-4">or sign in with</span>
                </FieldSeparator>

                <div className="flex flex-col gap-4">
                  <Field className="gap-1.5">
                    <FieldLabel htmlFor="email" className="text-sm text-muted-foreground font-normal">Email*</FieldLabel>
                    <Input id="email" name="email" type="email" placeholder="you@example.com" required disabled={isPending} className="dark:bg-background h-9 shadow-xs" />
                  </Field>
                  <Field className="gap-1.5">
                    <FieldLabel htmlFor="password" className="text-sm text-muted-foreground font-normal">Password*</FieldLabel>
                    <div className="relative">
                      <Input id="password" name="password" type={showPassword ? "text" : "password"} placeholder="Enter your password" required disabled={isPending} className="dark:bg-background h-9 shadow-xs pr-9" />
                      <button type="button" tabIndex={-1} onClick={() => setShowPassword((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </Field>
                </div>

                <Field orientation="horizontal" className="justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox id="remember" defaultChecked className="cursor-pointer" />
                    <FieldLabel htmlFor="remember" className="text-sm text-primary font-normal cursor-pointer dark:text-white/30">Remember this device</FieldLabel>
                  </div>
                  <a href="/forgot-password" className="text-sm text-card-foreground font-medium text-end">Forgot password?</a>
                </Field>

                <Field className="gap-4">
                  <Button type="submit" size="lg" disabled={isPending} className="rounded-lg hover:bg-primary/80 cursor-pointer">
                    {isPending ? <><Loader2 size={14} className="animate-spin" /> Signing in…</> : "Sign in"}
                  </Button>
                  <FieldDescription className="text-center text-sm font-normal text-muted-foreground">
                    Don&apos;t have an account?{" "}
                    <a href="/register" className="font-medium text-card-foreground no-underline!">Create an account</a>
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default LoginForm;
