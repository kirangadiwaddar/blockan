"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { signIn, signInWithOAuth } from "@/lib/supabase/auth-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Loader2 } from "lucide-react";

const BlockanLogo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none">
    <g><path d="M16.6584 40H15.3817C12.0653 40 10.07 39.9994 8.54578 39.7159L17.3668 28.0344L16.6584 40Z" fill="#FF1616"/><path d="M31.2482 39.7514C29.7502 39.9988 27.7875 40 24.6183 40H23.109L22.397 28.0309L31.2482 39.7514Z" fill="#FF1616"/><path d="M39.6714 31.6708C39.607 31.9773 39.5312 32.2655 39.4388 32.5426C38.8336 34.3567 37.7711 35.9522 36.3866 37.1982L26.4399 26.044L39.6714 31.6708Z" fill="#FF1616"/><path d="M3.4854 37.0792C2.16393 35.8511 1.14735 34.3 0.561036 32.5426C0.459507 32.2382 0.375209 31.921 0.307129 31.5803L13.3239 26.0458L3.4854 37.0792Z" fill="#FF1616"/><path d="M40 24.6183C40 25.7428 39.9968 26.7154 39.9858 27.5692L28.1729 23.006H40V24.6183Z" fill="#FF1616"/><path d="M11.5962 23.006L0.0106534 27.4805C0.000706105 26.6481 0 25.704 0 24.6183V23.006H11.5962Z" fill="#FF1616"/><path d="M24.6183 0C28.7807 0 30.862 0.000553668 32.5426 0.56108C35.7979 1.64713 38.3529 4.20208 39.4389 7.45739C39.9994 9.13798 40 11.2193 40 15.3817V20.016H27.5089L36.5181 16.1861L33.8459 14.4123L25.1048 17.7876L29.2081 12.358L26.2571 11.5501L21.7259 16.6282L21.3885 10.9091H18.3825L18.0398 16.6282L13.5121 11.5501L10.5629 12.358L14.6609 17.7859L5.92507 14.4123L3.25284 16.1861L12.2603 20.016H0V15.3817C0 11.2193 0.000553668 9.13798 0.56108 7.45739C1.64713 4.20208 4.20208 1.64713 7.45739 0.56108C9.13798 0.000553668 11.2193 0 15.3817 0H24.6183Z" fill="#FF1616"/></g>
  </svg>
);

const LoginForm = () => {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isOAuthPending, setIsOAuthPending] = useState<"google" | "github" | null>(null);
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await signIn(formData);
      if (result?.error) setError(result.error);
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
            <div className="mx-auto"><BlockanLogo /></div>
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
                    <Input id="password" name="password" type="password" placeholder="Enter your password" required disabled={isPending} className="dark:bg-background h-9 shadow-xs" />
                  </Field>
                </div>

                <Field orientation="horizontal" className="justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox id="remember" defaultChecked className="cursor-pointer" />
                    <FieldLabel htmlFor="remember" className="text-sm text-primary font-normal cursor-pointer">Remember this device</FieldLabel>
                  </div>
                  <a href="/forgot-password" className="text-sm text-card-foreground font-medium text-end">Forgot password?</a>
                </Field>

                <Field className="gap-4">
                  <Button type="submit" size="lg" disabled={isPending} className="rounded-lg h-10 hover:bg-primary/80 cursor-pointer">
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
