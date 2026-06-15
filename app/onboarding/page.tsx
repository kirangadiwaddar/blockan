"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadAvatar, createProject } from "@/lib/supabase/db";
import { cn } from "@/lib/utils";
import { Check, ArrowRight, Upload, Plus, X } from "lucide-react";

const PROJECT_COLORS = [
  "avatar-orb-violet",
  "avatar-orb-blue",
  "avatar-orb-cyan",
  "avatar-orb-green",
  "avatar-orb-amber",
  "avatar-orb-red",
  "avatar-orb-pink",
];

type Step = "profile" | "project" | "invite";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("profile");
  const [isInvitee, setIsInvitee] = useState(false);
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [direction, setDirection] = useState<"forward" | "back">("forward");

  // Profile step
  const [name, setName] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Project step
  const [projectName, setProjectName] = useState("");
  const [projectColor, setProjectColor] = useState(PROJECT_COLORS[0]);
  const [projectKey, setProjectKey] = useState("");

  // Invite step
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [inviteInput, setInviteInput] = useState("");

  // Saving state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.replace("/login"); return; }
      setUserId(data.user.id);
      setUserEmail(data.user.email ?? "");
      const meta = data.user.user_metadata;
      if (meta?.full_name) setName(meta.full_name);
    });

    // Check if invitee (profile exists with is_pending)
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_pending, full_name")
        .eq("id", data.user.id)
        .single();
      if (profile?.is_pending) setIsInvitee(true);
      if (profile?.full_name) setName(profile.full_name);
    });
  }, [router]);

  // Auto-generate project key from name
  useEffect(() => {
    if (projectName) {
      const key = projectName
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, "")
        .split(/\s+/)
        .map((w) => w[0])
        .join("")
        .slice(0, 4) || projectName.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
      setProjectKey(key);
    }
  }, [projectName]);

  const goTo = (next: Step, dir: "forward" | "back" = "forward") => {
    setAnimating(true);
    setDirection(dir);
    setTimeout(() => {
      setStep(next);
      setAnimating(false);
    }, 220);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const addInviteEmail = () => {
    const email = inviteInput.trim();
    if (!email || !email.includes("@") || inviteEmails.includes(email)) return;
    setInviteEmails((prev) => [...prev, email]);
    setInviteInput("");
  };

  const handleProfileNext = async () => {
    if (!name.trim()) { setError("Please enter your name"); return; }
    setError("");
    setSaving(true);
    const supabase = createClient();
    // Save name
    await supabase.from("profiles").upsert({
      id: userId,
      full_name: name.trim(),
      is_pending: false,
      updated_at: new Date().toISOString(),
    });
    // Upload avatar in background
    if (avatarFile) uploadAvatar(userId, avatarFile).catch(() => {});
    setSaving(false);
    if (isInvitee) {
      handleFinish();
    } else {
      goTo("project");
    }
  };

  const handleProjectNext = async () => {
    if (!projectName.trim()) { setError("Please enter a project name"); return; }
    if (!projectKey.trim()) { setError("Project key is required"); return; }
    setError("");
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await createProject({
        name: projectName.trim(),
        key: projectKey.trim(),
        color: projectColor,
        description: "",
        ownerId: user.id,
      }).catch(() => {});
    }
    setSaving(false);
    goTo("invite");
  };

  const handleFinish = async () => {
    setSaving(true);
    // Send invites if any
    if (inviteEmails.length > 0) {
      const { inviteNewUser } = await import("@/lib/supabase/invite-actions");
      await Promise.allSettled(
        inviteEmails.map((email) => inviteNewUser({ email, projectId: "", role: "member" }).catch(() => {}))
      );
    }
    router.push("/");
  };

  const steps: Step[] = isInvitee ? ["profile"] : ["profile", "project", "invite"];
  const stepIndex = steps.indexOf(step);
  const totalSteps = steps.length;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background subtle grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--border) / 0.4) 1px, transparent 0)`,
        backgroundSize: "32px 32px",
      }} />

      {/* Logo */}
      <div className="absolute top-6 left-8 flex items-center gap-2.5">
        <div className="size-7 rounded-lg bg-primary flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="7" height="7" rx="1.5" fill="white" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" fill="white" opacity="0.6" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" fill="white" opacity="0.6" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" fill="white" opacity="0.3" />
          </svg>
        </div>
        <span className="text-sm font-semibold tracking-tight">Blockan</span>
      </div>

      {/* Step indicators */}
      {totalSteps > 1 && (
        <div className="absolute top-7 right-8 flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s} className={cn(
              "size-1.5 rounded-full transition-all duration-300",
              i === stepIndex ? "bg-primary w-4" : i < stepIndex ? "bg-primary/40" : "bg-border"
            )} />
          ))}
        </div>
      )}

      {/* Card */}
      <div
        className={cn(
          "w-full max-w-md transition-all duration-200",
          animating
            ? direction === "forward"
              ? "opacity-0 translate-x-4"
              : "opacity-0 -translate-x-4"
            : "opacity-100 translate-x-0"
        )}
      >
        {step === "profile" && (
          <ProfileStep
            name={name}
            setName={setName}
            avatarPreview={avatarPreview}
            fileRef={fileRef}
            onAvatarChange={handleAvatarChange}
            onNext={handleProfileNext}
            saving={saving}
            error={error}
            isInvitee={isInvitee}
            userEmail={userEmail}
          />
        )}
        {step === "project" && (
          <ProjectStep
            projectName={projectName}
            setProjectName={setProjectName}
            projectKey={projectKey}
            setProjectKey={setProjectKey}
            projectColor={projectColor}
            setProjectColor={setProjectColor}
            onNext={handleProjectNext}
            onBack={() => goTo("profile", "back")}
            saving={saving}
            error={error}
          />
        )}
        {step === "invite" && (
          <InviteStep
            inviteEmails={inviteEmails}
            setInviteEmails={setInviteEmails}
            inviteInput={inviteInput}
            setInviteInput={setInviteInput}
            onAddEmail={addInviteEmail}
            onFinish={handleFinish}
            onBack={() => goTo("project", "back")}
            saving={saving}
          />
        )}
      </div>

      {/* Step counter */}
      {totalSteps > 1 && (
        <p className="absolute bottom-6 text-xs text-muted-foreground">
          Step {stepIndex + 1} of {totalSteps}
        </p>
      )}
    </div>
  );
}

/* ── Profile Step ─────────────────────────────────────────────── */
function ProfileStep({ name, setName, avatarPreview, fileRef, onAvatarChange, onNext, saving, error, isInvitee, userEmail }: any) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome to Blockan</h1>
        <p className="text-sm text-muted-foreground">
          {isInvitee ? "You've been invited. Set up your profile to get started." : "Let's set up your profile first."}
        </p>
      </div>

      <div className="flex flex-col gap-5">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative group size-20 rounded-full bg-muted border-2 border-dashed border-border hover:border-primary/50 transition-colors overflow-hidden cursor-pointer"
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="size-full object-cover" />
            ) : (
              <div className="size-full flex flex-col items-center justify-center gap-1">
                <Upload size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-[10px] text-muted-foreground group-hover:text-primary transition-colors">Photo</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
              <Upload size={16} className="text-white" />
            </div>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onAvatarChange} />
          <p className="text-xs text-muted-foreground">Upload a photo (optional)</p>
        </div>

        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Full name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onNext()}
            placeholder="Jane Smith"
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            autoFocus
          />
        </div>

        {/* Email (readonly) */}
        {userEmail && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-muted-foreground">Email</label>
            <div className="h-10 w-full rounded-lg border border-input bg-muted/40 px-3 text-sm text-muted-foreground flex items-center">
              {userEmail}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button
          type="button"
          onClick={onNext}
          disabled={saving}
          className="h-10 w-full rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
        >
          {saving ? "Saving…" : isInvitee ? "Go to dashboard" : "Continue"}
          {!saving && <ArrowRight size={15} />}
        </button>
      </div>
    </div>
  );
}

/* ── Project Step ─────────────────────────────────────────────── */
function ProjectStep({ projectName, setProjectName, projectKey, setProjectKey, projectColor, setProjectColor, onNext, onBack, saving, error }: any) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Create your first project</h1>
        <p className="text-sm text-muted-foreground">This is where your team tracks issues and sprints.</p>
      </div>

      <div className="flex flex-col gap-5">
        {/* Color picker */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Color</label>
          <div className="flex items-center gap-2">
            {PROJECT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setProjectColor(color)}
                className={cn(
                  "size-7 rounded-full transition-all cursor-pointer",
                  `avatar-orb ${color}`,
                  projectColor === color ? "ring-2 ring-offset-2 ring-primary scale-110" : "hover:scale-105"
                )}
              />
            ))}
          </div>
        </div>

        {/* Project name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Project name</label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onNext()}
            placeholder="Acme Website"
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            autoFocus
          />
        </div>

        {/* Project key */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Project key</label>
          <input
            type="text"
            value={projectKey}
            onChange={(e) => setProjectKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
            placeholder="ACM"
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          />
          <p className="text-xs text-muted-foreground">Used as prefix for issue codes (e.g. {projectKey || "ACM"}-1)</p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onBack}
            className="h-10 px-4 rounded-lg border border-input text-sm hover:bg-muted/50 transition-colors cursor-pointer"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={saving}
            className="h-10 flex-1 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
          >
            {saving ? "Creating…" : "Continue"}
            {!saving && <ArrowRight size={15} />}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Invite Step ──────────────────────────────────────────────── */
function InviteStep({ inviteEmails, setInviteEmails, inviteInput, setInviteInput, onAddEmail, onFinish, onBack, saving }: any) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Invite your team</h1>
        <p className="text-sm text-muted-foreground">Add teammates now, or skip and do it later from the project.</p>
      </div>

      <div className="flex flex-col gap-5">
        {/* Email input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Email addresses</label>
          <div className="flex gap-2">
            <input
              type="email"
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); onAddEmail(); } }}
              placeholder="teammate@company.com"
              className="h-10 flex-1 rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
            <button
              type="button"
              onClick={onAddEmail}
              className="h-10 px-3 rounded-lg border border-input bg-background hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <Plus size={16} />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">Press Enter or comma to add multiple</p>
        </div>

        {/* Email list */}
        {inviteEmails.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {inviteEmails.map((email: string) => (
              <div key={email} className="flex items-center justify-between h-9 px-3 rounded-lg bg-muted/40 border border-border">
                <span className="text-sm text-foreground">{email}</span>
                <button
                  type="button"
                  onClick={() => setInviteEmails((prev: string[]) => prev.filter((e) => e !== email))}
                  className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onBack}
            className="h-10 px-4 rounded-lg border border-input text-sm hover:bg-muted/50 transition-colors cursor-pointer"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onFinish}
            disabled={saving}
            className="h-10 flex-1 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
          >
            {saving ? "Setting up…" : inviteEmails.length > 0 ? "Send invites & go to dashboard" : "Go to dashboard"}
            {!saving && <ArrowRight size={15} />}
          </button>
        </div>

        {inviteEmails.length === 0 && (
          <button
            type="button"
            onClick={onFinish}
            disabled={saving}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-center -mt-2"
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}
