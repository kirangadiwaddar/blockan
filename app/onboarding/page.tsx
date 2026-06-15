"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadAvatar, createProject } from "@/lib/supabase/db";
import { cn } from "@/lib/utils";
import { ArrowRight, ArrowLeft, Camera, Plus, X, Check } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const BlockanLogo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none">
    <g><path d="M16.6584 40H15.3817C12.0653 40 10.07 39.9994 8.54578 39.7159L17.3668 28.0344L16.6584 40Z" fill="#FF1616"/><path d="M31.2482 39.7514C29.7502 39.9988 27.7875 40 24.6183 40H23.109L22.397 28.0309L31.2482 39.7514Z" fill="#FF1616"/><path d="M39.6714 31.6708C39.607 31.9773 39.5312 32.2655 39.4388 32.5426C38.8336 34.3567 37.7711 35.9522 36.3866 37.1982L26.4399 26.044L39.6714 31.6708Z" fill="#FF1616"/><path d="M3.4854 37.0792C2.16393 35.8511 1.14735 34.3 0.561036 32.5426C0.459507 32.2382 0.375209 31.921 0.307129 31.5803L13.3239 26.0458L3.4854 37.0792Z" fill="#FF1616"/><path d="M40 24.6183C40 25.7428 39.9968 26.7154 39.9858 27.5692L28.1729 23.006H40V24.6183Z" fill="#FF1616"/><path d="M11.5962 23.006L0.0106534 27.4805C0.000706105 26.6481 0 25.704 0 24.6183V23.006H11.5962Z" fill="#FF1616"/><path d="M24.6183 0C28.7807 0 30.862 0.000553668 32.5426 0.56108C35.7979 1.64713 38.3529 4.20208 39.4389 7.45739C39.9994 9.13798 40 11.2193 40 15.3817V20.016H27.5089L36.5181 16.1861L33.8459 14.4123L25.1048 17.7876L29.2081 12.358L26.2571 11.5501L21.7259 16.6282L21.3885 10.9091H18.3825L18.0398 16.6282L13.5121 11.5501L10.5629 12.358L14.6609 17.7859L5.92507 14.4123L3.25284 16.1861L12.2603 20.016H0V15.3817C0 11.2193 0.000553668 9.13798 0.56108 7.45739C1.64713 4.20208 4.20208 1.64713 7.45739 0.56108C9.13798 0.000553668 11.2193 0 15.3817 0H24.6183Z" fill="#FF1616"/></g>
  </svg>
);

const PROJECT_COLORS = [
  "avatar-orb-blue",
  "avatar-orb-violet",
  "avatar-orb-pink",
  "avatar-orb-amber",
  "avatar-orb-emerald",
  "avatar-orb-cyan",
  "avatar-orb-rose",
];

type Step = "profile" | "project" | "invite";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("profile");
  const [isInvitee, setIsInvitee] = useState(false);
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [animating, setAnimating] = useState(false);

  const [name, setName] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [projectName, setProjectName] = useState("");
  const [projectColor, setProjectColor] = useState(PROJECT_COLORS[0]);
  const [projectKey, setProjectKey] = useState("");

  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [inviteInput, setInviteInput] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.replace("/login"); return; }
      setUserId(data.user.id);
      setUserEmail(data.user.email ?? "");
      if (data.user.user_metadata?.full_name) setName(data.user.user_metadata.full_name);
      const { data: profile } = await supabase
        .from("profiles").select("is_pending, full_name").eq("id", data.user.id).single();
      if (profile?.is_pending) setIsInvitee(true);
      if (profile?.full_name) setName(profile.full_name);
    });
  }, [router]);

  useEffect(() => {
    if (projectName) {
      const prefix = projectName.replace(/\s+/g, "").slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, "");
      const suffix = Math.floor(100 + Math.random() * 900);
      setProjectKey(`${prefix}-${suffix}`);
    }
  }, [projectName]);

  const steps: Step[] = isInvitee ? ["profile"] : ["profile", "project", "invite"];
  const stepIdx = steps.indexOf(step);

  const goTo = (next: Step, dir: "forward" | "back" = "forward") => {
    setAnimating(true);
    setDirection(dir);
    setError("");
    setTimeout(() => { setStep(next); setAnimating(false); }, 180);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const addEmail = () => {
    const email = inviteInput.trim().toLowerCase();
    if (!email || !email.includes("@") || inviteEmails.includes(email)) return;
    setInviteEmails((p) => [...p, email]);
    setInviteInput("");
  };

  const handleProfileNext = async () => {
    if (!name.trim()) { setError("Please enter your name"); return; }
    setError(""); setSaving(true);
    const supabase = createClient();
    await supabase.from("profiles").upsert({ id: userId, full_name: name.trim(), is_pending: false, updated_at: new Date().toISOString() });
    if (avatarFile) uploadAvatar(userId, avatarFile).catch(() => {});
    setSaving(false);
    if (isInvitee) {
      // invite_scoped = true → project invite → go to their project board
      // invite_scoped = false/missing → team invite → go to dashboard
      const { data: { user: freshUser } } = await supabase.auth.getUser();
      const isScoped = freshUser?.user_metadata?.invite_scoped === true;
      if (isScoped) {
        const { data: memberships } = await supabase
          .from("project_members")
          .select("projects(key)")
          .eq("user_id", userId)
          .limit(1);
        const projectKey = (memberships?.[0] as any)?.projects?.key;
        router.push(projectKey ? `/projects/${projectKey.toLowerCase()}/board` : "/dashboard");
      } else {
        router.push("/dashboard");
      }
      return;
    }
    goTo("project");
  };

  const handleProjectNext = async () => {
    if (!projectName.trim()) { setError("Please enter a project name"); return; }
    if (!projectKey.trim()) { setError("Project key is required"); return; }
    setError(""); setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await createProject({ name: projectName.trim(), key: projectKey.trim(), color: projectColor, description: "", ownerId: user.id }).catch(() => {});
    setSaving(false);
    goTo("invite");
  };

  const handleFinish = async () => {
    setSaving(true);
    if (inviteEmails.length > 0) {
      const { inviteNewUser } = await import("@/lib/supabase/invite-actions");
      await Promise.allSettled(inviteEmails.map((email) => inviteNewUser({ email, projectIds: [], role: "member", invitedBy: userId }).catch(() => {})));
    }
    router.push("/");
  };

  return (
    <section className="bg-foreground dark:bg-background min-h-screen relative flex items-center justify-center">
      {/* Gradient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 z-0" style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(249, 115, 22, 0.25), transparent 70%), #000000"
        }} />
      </div>

      <div className="py-10 md:py-20 max-w-lg px-4 sm:px-0 mx-auto w-full relative z-10">
        {/* Card */}
        <div className={cn(
          "transition-all duration-180",
          animating
            ? direction === "forward" ? "opacity-0 translate-y-2" : "opacity-0 -translate-y-2"
            : "opacity-100 translate-y-0"
        )}>
          <Card className="px-6 py-8 sm:p-12 relative gap-5">
            {/* Logo */}
            <CardHeader className="text-center gap-4 p-0">
              <div className="mx-auto"><BlockanLogo /></div>
              {step === "profile" && (
                <div className="flex flex-col gap-1">
                  <h1 className="text-2xl font-semibold text-card-foreground">
                    {isInvitee ? "You've been invited" : "Welcome to Blockan"}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {isInvitee ? "Set up your profile to join your team." : "Let's set up your profile to get started."}
                  </p>
                </div>
              )}
              {step === "project" && (
                <div className="flex flex-col gap-1">
                  <h1 className="text-2xl font-semibold text-card-foreground">Create your first project</h1>
                  <p className="text-sm text-muted-foreground">This is where your team tracks issues and sprints.</p>
                </div>
              )}
              {step === "invite" && (
                <div className="flex flex-col gap-1">
                  <h1 className="text-2xl font-semibold text-card-foreground">Invite your team</h1>
                  <p className="text-sm text-muted-foreground">Add teammates now, or skip and do it later.</p>
                </div>
              )}
            </CardHeader>

            <CardContent className="p-0 flex flex-col gap-5">
              {step === "profile" && (
                <ProfileFields
                  name={name} setName={setName}
                  avatarPreview={avatarPreview} fileRef={fileRef}
                  onAvatarChange={handleAvatarChange} userEmail={userEmail}
                />
              )}
              {step === "project" && (
                <ProjectFields
                  projectName={projectName} setProjectName={setProjectName}
                  projectKey={projectKey} setProjectKey={setProjectKey}
                  projectColor={projectColor} setProjectColor={setProjectColor}
                />
              )}
              {step === "invite" && (
                <InviteFields
                  inviteEmails={inviteEmails} setInviteEmails={setInviteEmails}
                  inviteInput={inviteInput} setInviteInput={setInviteInput}
                  onAddEmail={addEmail}
                />
              )}

              {error && (
                <p className="text-sm text-destructive -mt-1">{error}</p>
              )}

              {/* Footer buttons */}
              <div className="flex flex-col gap-3 pt-2">
                {/* Primary + Back row */}
                <div className={cn("flex gap-3", stepIdx > 0 && "flex-row")}>
                  {stepIdx > 0 && (
                    <button
                      type="button"
                      onClick={() => goTo(steps[stepIdx - 1], "back")}
                      className="h-11 px-5 rounded-xl border border-input text-sm font-medium flex items-center gap-1.5 hover:bg-muted/60 transition-colors cursor-pointer shrink-0"
                    >
                      <ArrowLeft size={14} /> Back
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={step === "profile" ? handleProfileNext : step === "project" ? handleProjectNext : handleFinish}
                    disabled={saving}
                    className="h-11 flex-1 rounded-xl bg-foreground text-background text-sm font-medium flex items-center justify-center gap-2 hover:opacity-85 transition-opacity disabled:opacity-40 cursor-pointer"
                  >
                    {saving
                      ? "Saving…"
                      : step === "invite"
                      ? inviteEmails.length > 0 ? "Send invites & go to dashboard" : "Go to dashboard"
                      : isInvitee ? "Go to dashboard" : "Continue"}
                    {!saving && <ArrowRight size={15} />}
                  </button>
                </div>

                {/* Skip link */}
                {step === "project" && (
                  <button
                    type="button"
                    onClick={() => goTo("invite")}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-center py-1"
                  >
                    Skip for now
                  </button>
                )}
                {step === "invite" && (
                  <button
                    type="button"
                    onClick={handleFinish}
                    disabled={saving}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-center py-1"
                  >
                    Skip for now
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Step dots */}
        {steps.length > 1 && (
          <div className="flex items-center justify-center gap-2.5 py-4">
            {steps.map((s, i) => (
              <div key={s} className={cn(
                "rounded-full transition-all duration-300",
                i === stepIdx ? "w-6 h-2 bg-white" : "w-2 h-2 bg-zinc-400",
              )} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ── Shared input style ───────────────────────────────────────── */
const inputCls = "h-11 w-full rounded-xl bg-background px-3.5 text-sm placeholder:text-muted-foreground focus:outline-none transition-colors border border-border";

/* ── Profile Fields ───────────────────────────────────────────── */
function ProfileFields({ name, setName, avatarPreview, fileRef, onAvatarChange, userEmail }: any) {
  const initials = name.trim().split(" ").filter(Boolean).map((w: string) => w[0]).join("").toUpperCase().slice(0, 2) || "?";

  return (
    <div className="flex flex-col gap-4">
      {/* Avatar */}
      <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-muted/30">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative group size-14 rounded-full overflow-hidden shrink-0 cursor-pointer border-2 border-border hover:border-primary/50 transition-colors"
        >
          {avatarPreview ? (
            <img src={avatarPreview} alt="Avatar" className="size-full object-cover" />
          ) : (
            <div className="size-full bg-muted flex items-center justify-center">
              <span className="text-base font-semibold text-muted-foreground">{initials}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera size={14} className="text-white" />
          </div>
        </button>
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium">Profile photo</p>
          <p className="text-xs text-muted-foreground">JPG or PNG, max 5MB</p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="text-xs text-primary underline underline-offset-2 mt-0.5 cursor-pointer hover:opacity-70 transition-opacity w-fit"
          >
            {avatarPreview ? "Change photo" : "Upload photo"}
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onAvatarChange} />
      </div>

      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Full name <span className="text-destructive">*</span></label>
        <input
          type="text" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Jane Smith" className={inputCls} autoFocus
        />
      </div>

      {/* Email readonly */}
      {userEmail && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-muted-foreground">Email</label>
          <div className="h-11 w-full rounded-xl border border-input bg-muted/40 px-3.5 text-sm text-muted-foreground flex items-center">
            {userEmail}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Project Fields ───────────────────────────────────────────── */
function ProjectFields({ projectName, setProjectName, projectKey, setProjectKey, projectColor, setProjectColor }: any) {

  return (
    <div className="flex flex-col gap-4">
      {/* Color */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Project color</label>
        <div className="flex items-center gap-2">
          {PROJECT_COLORS.map((c) => (
            <button
              key={c} type="button"
              onClick={() => setProjectColor(c)}
              className={`avatar-orb ${c} size-7 rounded-full cursor-pointer ring-offset-2 ${projectColor === c ? "ring-2 ring-foreground" : ""}`}
            />
          ))}
        </div>
      </div>

      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Project name <span className="text-destructive">*</span></label>
        <input
          type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)}
          placeholder="Acme Website" className={inputCls} autoFocus
        />
      </div>

      {/* Key */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-muted-foreground">Project key</label>
        <div className={cn(inputCls, "font-mono uppercase bg-muted/40 text-muted-foreground select-none cursor-default flex items-center")}>
          {projectKey || <span className="opacity-40">Auto-generated</span>}
        </div>
      </div>
    </div>
  );
}

/* ── Invite Fields ────────────────────────────────────────────── */
function InviteFields({ inviteEmails, setInviteEmails, inviteInput, setInviteInput, onAddEmail }: any) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Email addresses</label>
        <div className="flex gap-2">
          <input
            type="email" value={inviteInput}
            onChange={(e) => setInviteInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); onAddEmail(); } }}
            placeholder="colleague@company.com"
            className={cn(inputCls, "flex-1")} autoFocus
          />
          <button
            type="button" onClick={onAddEmail}
            className="h-11 px-4 rounded-xl border border-input hover:bg-muted/60 transition-colors cursor-pointer flex items-center gap-1.5 text-sm font-medium shrink-0"
          >
            <Plus size={15} /> Add
          </button>
        </div>
        <p className="text-xs text-muted-foreground">Press Enter or comma to add multiple</p>
      </div>

      {inviteEmails.length > 0 && (
        <div className="flex flex-col rounded-xl border border-border overflow-hidden">
          {inviteEmails.map((email: string, i: number) => (
            <div key={email} className={cn(
              "flex items-center justify-between px-3.5 py-2.5 bg-muted/20",
              i < inviteEmails.length - 1 && "border-b border-border"
            )}>
              <div className="flex items-center gap-2.5">
                <div className="size-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground shrink-0">
                  {email[0].toUpperCase()}
                </div>
                <span className="text-sm">{email}</span>
              </div>
              <button
                type="button"
                onClick={() => setInviteEmails((p: string[]) => p.filter((e) => e !== email))}
                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-1 rounded hover:bg-muted"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
