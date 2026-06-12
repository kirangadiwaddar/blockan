"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useProjects } from "@/lib/projects-context";
import { useIssues } from "@/lib/issues-context";
import AppSidebar from "@/components/shadcn-space/blocks/dashboard/app-sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useTheme, ACCENT_COLORS } from "@/components/providers";
import { useUser } from "@/lib/supabase/user-context";
import { enrollTotp, verifyAndActivateTotp, getMfaFactors, unenrollTotp } from "@/lib/supabase/mfa-actions";
import {
  Moon, Sun, Bell, Shield, Palette, User, Trash2, Upload,
  ShieldCheck, ShieldOff, Loader2, CheckCircle2, AlertCircle,
  Download, Eye, EyeOff, Check, KeyRound, FolderOpen, ListChecks, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

/* ─── Nav sections ───────────────────────────────────────── */
const SECTIONS = [
  { id: "profile",       label: "Profile",           icon: User    },
  { id: "appearance",    label: "Appearance",         icon: Palette },
  { id: "notifications", label: "Notifications",      icon: Bell    },
  { id: "security",      label: "Security & Privacy", icon: Shield  },
  { id: "danger",        label: "Danger Zone",        icon: Trash2  },
];

/* ─── Tiny status badge ──────────────────────────────────── */
function StatusMsg({ msg }: { msg: string | null }) {
  if (!msg) return null;
  const isError = /fail|error|invalid|wrong|mismatch/i.test(msg);
  return (
    <span className={cn(
      "flex items-center gap-1.5 text-sm",
      isError ? "text-destructive" : "text-green-600 dark:text-green-400",
    )}>
      {isError
        ? <AlertCircle size={13} className="shrink-0" />
        : <CheckCircle2 size={13} className="shrink-0" />}
      {msg}
    </span>
  );
}

/* ─── Toggle switch ──────────────────────────────────────── */
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        on ? "bg-muted-foreground/80" : "bg-muted-foreground/30",
      )}
    >
      <span className={cn(
        "pointer-events-none inline-block size-4 rounded-full bg-white shadow-sm transition-transform",
        on ? "translate-x-4" : "translate-x-0",
      )} />
    </button>
  );
}

/* ─── Page ───────────────────────────────────────────────── */
export default function SettingsPage() {
  const { theme, toggle: toggleTheme, accentId, setAccent } = useTheme();
  const { displayName, email: userEmail, avatarUrl, initials, bio: profileBio, user, refreshProfile } = useUser();
  const { projects } = useProjects();
  const { issues } = useIssues();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeSection, setActiveSection] = useState("profile");

  /* ── Profile ── */
  const [name, setName]   = useState("");
  const [bio, setBio]     = useState("");
  const [saving, setSaving]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  useEffect(() => { if (displayName) setName(displayName); }, [displayName]);
  useEffect(() => { setBio(profileBio); }, [profileBio]);

  const flashMsg = (setter: (m: string | null) => void, msg: string) => {
    setter(msg);
    setTimeout(() => setter(null), 3000);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url || url.includes("placeholder")) {
      flashMsg(setProfileMsg, "Saved (demo mode)");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, full_name: name.trim(), bio: bio.trim(), updated_at: new Date().toISOString() });
    await refreshProfile();
    setSaving(false);
    flashMsg(setProfileMsg, error ? `Failed: ${error.message}` : "Profile saved!");
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    // Reset input so same file can be re-selected
    e.target.value = "";

    if (file.size > 2 * 1024 * 1024) {
      flashMsg(setProfileMsg, "Image must be under 2 MB");
      return;
    }
    setUploading(true);
    const { uploadAvatar } = await import("@/lib/supabase/db");
    const result = await uploadAvatar(user.id, file);
    await refreshProfile();
    setUploading(false);
    flashMsg(setProfileMsg, result.url ? "Avatar updated!" : `Upload failed: ${result.error ?? "unknown error"}`);
  };

  /* ── Notifications ── */
  const NOTIF_DEFAULTS = {
    issueAssigned:  true,
    issueCommented: true,
    sprintStarted:  false,
    weeklyDigest:   true,
    mentionsOnly:   false,
  };
  const [notifs, setNotifs] = useState(NOTIF_DEFAULTS);
  const [notifMsg, setNotifMsg] = useState<string | null>(null);

  // Load persisted notif prefs — Supabase user metadata takes priority, localStorage as fallback
  useEffect(() => {
    try {
      const metaPrefs = user?.user_metadata?.notif_prefs;
      if (metaPrefs) { setNotifs(metaPrefs); return; }
      const stored = localStorage.getItem("notifPrefs");
      if (stored) setNotifs(JSON.parse(stored));
    } catch {}
  }, [user]);

  const toggleNotif = (key: keyof typeof notifs) => {
    setNotifs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem("notifPrefs", JSON.stringify(next));
      // Persist to Supabase user metadata so it survives browser clears
      createClient().auth.updateUser({ data: { notif_prefs: next } }).catch(() => {});
      return next;
    });
    flashMsg(setNotifMsg, "Preferences saved");
  };

  /* ── Security / Password ── */
  const [curPwd,     setCurPwd]     = useState("");
  const [newPwd,     setNewPwd]     = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [pwdSaving, setPwdSaving]   = useState(false);
  const [pwdMsg,    setPwdMsg]      = useState<string | null>(null);

  const handleUpdatePassword = async () => {
    if (newPwd.length < 8) {
      flashMsg(setPwdMsg, "New password must be at least 8 characters");
      return;
    }
    if (newPwd !== confirmPwd) {
      flashMsg(setPwdMsg, "Passwords do not match");
      return;
    }
    if (!user) return;
    setPwdSaving(true);
    const supabase = createClient();
    // Supabase uses session-based auth; re-authenticate first with current password
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: curPwd,
    });
    if (signInErr) {
      setPwdSaving(false);
      flashMsg(setPwdMsg, "Current password is incorrect");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    setPwdSaving(false);
    if (error) {
      flashMsg(setPwdMsg, `Failed: ${error.message}`);
    } else {
      setCurPwd(""); setNewPwd(""); setConfirmPwd("");
      flashMsg(setPwdMsg, "Password updated successfully!");
    }
  };

  /* ── MFA ── */
  const [mfaStep,     setMfaStep]     = useState<"idle" | "enrolling">("idle");
  const [mfaEnrolled, setMfaEnrolled] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [mfaQr,       setMfaQr]       = useState("");
  const [mfaSecret,   setMfaSecret]   = useState("");
  const [mfaCode,     setMfaCode]     = useState("");
  const [mfaError,    setMfaError]    = useState<string | null>(null);
  const [mfaSuccess,  setMfaSuccess]  = useState(false);
  const [isMfaPending, startMfaTransition] = useTransition();

  useEffect(() => {
    getMfaFactors().then(({ factors }) => {
      const verified = factors.filter((f: { status: string }) => f.status === "verified");
      setMfaEnrolled(verified.length > 0);
      if (verified.length > 0) setMfaFactorId(verified[0].id);
    });
  }, []);

  const startEnroll = () => {
    setMfaError(null);
    startMfaTransition(async () => {
      const result = await enrollTotp();
      if (result.error) { setMfaError(result.error); return; }
      setMfaFactorId(result.factorId!);
      setMfaQr(result.qrCodeSvg!);
      setMfaSecret(result.secret!);
      setMfaStep("enrolling");
    });
  };

  const confirmEnroll = () => {
    setMfaError(null);
    startMfaTransition(async () => {
      const result = await verifyAndActivateTotp(mfaFactorId, mfaCode);
      if (result.error) { setMfaError(result.error); return; }
      setMfaEnrolled(true);
      setMfaStep("idle");
      setMfaSuccess(true);
      setMfaCode("");
    });
  };

  const disableMfa = () => {
    startMfaTransition(async () => {
      await unenrollTotp(mfaFactorId);
      setMfaEnrolled(false);
      setMfaFactorId("");
      setMfaSuccess(false);
    });
  };

  /* ── Danger Zone ── */
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting]   = useState(false);

  const handleExport = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const supabase = createClient();
      const [{ data: projects }, { data: issues }, { data: comments }] = await Promise.all([
        supabase.from("projects").select("*").order("created_at", { ascending: false }),
        supabase.from("issues").select("*").order("created_at", { ascending: false }),
        supabase.from("comments").select("*").order("created_at", { ascending: false }),
      ]);
      const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), user: { id: user.id, email: userEmail }, projects, issues, comments }, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `blockan-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      flashMsg(setDeleteMsg, "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") {
      flashMsg(setDeleteMsg, 'Type "DELETE" to confirm');
      return;
    }
    if (!user) return;
    setDeleting(true);
    try {
      const supabase = createClient();
      // Clear profile data first
      await supabase.from("profiles").delete().eq("id", user.id);
      // Sign out — account deletion requires admin API; we sign out and clear data
      await supabase.auth.signOut();
      window.location.href = "/sign-in";
    } catch {
      setDeleting(false);
      flashMsg(setDeleteMsg, "Failed to delete account");
    }
  };

  /* ── Render ── */
  return (
    <AppSidebar>
      <div className="flex flex-col gap-6 p-6 w-full max-w-7xl">
        <div>
          <h1 className="text-xl font-semibold">Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your account and workspace preferences</p>
        </div>

        <div className="flex flex-col md:flex-row gap-6">

          {/* ── Sidebar nav ── */}
          <nav className="flex md:flex-col gap-1 md:w-48 shrink-0 overflow-x-auto md:overflow-visible pb-1 md:pb-0">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer",
                    activeSection === s.id
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted",
                    s.id === "danger" && activeSection !== "danger" && "text-destructive hover:text-destructive",
                    s.id === "danger" && activeSection === "danger" && "bg-destructive/10 text-destructive",
                  )}
                >
                  <Icon size={14} />
                  {s.label}
                </button>
              );
            })}
          </nav>

          {/* ── Content ── */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">

            {/* ══ PROFILE ══════════════════════════════════════════ */}
            {activeSection === "profile" && (
              <>
                <Card className="shadow-none">
                  <CardHeader>
                    <CardTitle className="text-base">Profile Information</CardTitle>
                    <CardDescription>Update your display name, avatar, and bio</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-5">

                    {/* Avatar row */}
                    <div className="flex items-center gap-5">
                      <div className="relative shrink-0">
                        <Avatar className="size-20">
                          <AvatarImage src={avatarUrl} alt={displayName} />
                          <AvatarFallback className="text-lg" colorSeed={displayName}>{initials || "U"}</AvatarFallback>
                        </Avatar>
                        {uploading && (
                          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                            <Loader2 size={16} className="animate-spin text-white" />
                          </div>
                        )}
                        <span className="absolute right-0.5 bottom-0.5 size-3 rounded-full bg-green-500 ring-2 ring-background" />
                      </div>

                      <div className="flex flex-col gap-2">
                        <input
                          ref={fileInputRef}
                          id="avatar-upload"
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          className="sr-only"
                          onChange={handleAvatarUpload}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="cursor-pointer gap-2 w-fit"
                          disabled={uploading}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {uploading
                            ? <><Loader2 size={13} className="animate-spin" /> Uploading…</>
                            : <><Upload size={13} /> Upload photo</>}
                        </Button>
                        <p className="text-xs text-muted-foreground">JPG, PNG, GIF or WebP · Max 2 MB</p>
                      </div>
                    </div>

                    <Separator />

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="name">Full name</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="email">Email address</Label>
                        <Input id="email" value={userEmail} disabled className="opacity-60 cursor-not-allowed" />
                        <p className="text-[11px] text-muted-foreground">Email changes are not supported yet</p>
                      </div>
                      <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <Label htmlFor="bio">Bio</Label>
                        <Input id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A short bio about yourself…" />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3">
                      <StatusMsg msg={profileMsg} />
                      <Button onClick={handleSaveProfile} disabled={saving} className="cursor-pointer gap-2">
                        {saving ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : "Save changes"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-none">
                  <CardHeader>
                    <CardTitle className="text-base">Workspace</CardTitle>
                    <CardDescription>Overview of your workspace activity</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex flex-col gap-1.5 p-4 rounded-xl border bg-muted/30">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <FolderOpen size={14} />
                          <span className="text-xs font-medium uppercase tracking-wide">Projects</span>
                        </div>
                        <p className="text-2xl font-bold">{projects.length}</p>
                        <p className="text-xs text-muted-foreground">{projects.length === 1 ? "1 active project" : `${projects.length} active projects`}</p>
                      </div>
                      <div className="flex flex-col gap-1.5 p-4 rounded-xl border bg-muted/30">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <ListChecks size={14} />
                          <span className="text-xs font-medium uppercase tracking-wide">Issues</span>
                        </div>
                        <p className="text-2xl font-bold">{issues.length}</p>
                        <p className="text-xs text-muted-foreground">{issues.filter(i => i.status !== "Completed").length} open · {issues.filter(i => i.status === "Completed").length} done</p>
                      </div>
                      <div className="flex flex-col gap-1.5 p-4 rounded-xl border bg-muted/30">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Activity size={14} />
                          <span className="text-xs font-medium uppercase tracking-wide">In Progress</span>
                        </div>
                        <p className="text-2xl font-bold">{issues.filter(i => i.status === "In Progress").length}</p>
                        <p className="text-xs text-muted-foreground">across all projects</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* ══ APPEARANCE ══════════════════════════════════════ */}
            {activeSection === "appearance" && (
              <Card className="shadow-none">
                <CardHeader>
                  <CardTitle className="text-base">Appearance</CardTitle>
                  <CardDescription>Customize how Blockan looks for you</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-6">

                  {/* Accent colors */}
                  <div className="flex flex-col gap-3">
                    <div>
                      <p className="text-sm font-medium">Accent color</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Changes buttons, links, and interactive elements</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {ACCENT_COLORS.map((color) => (
                        <button
                          key={color.id}
                          onClick={() => setAccent(color.id)}
                          title={color.label}
                          className={cn(
                            "group flex flex-col items-center gap-1.5 cursor-pointer",
                          )}
                        >
                          <span className={cn(
                            "size-8 rounded-full transition-all ring-offset-2 ring-offset-background",
                            color.swatch,
                            accentId === color.id
                              ? "ring-2 ring-foreground scale-110"
                              : "hover:ring-2 hover:ring-muted-foreground hover:scale-105",
                          )}>
                            {accentId === color.id && (
                              <span className="flex items-center justify-center h-full">
                                <Check size={12} className="text-white" strokeWidth={3} />
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                            {color.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ══ NOTIFICATIONS ════════════════════════════════════ */}
            {activeSection === "notifications" && (
              <Card className="shadow-none">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Notifications</CardTitle>
                      <CardDescription>Choose what you want to be notified about</CardDescription>
                    </div>
                    <StatusMsg msg={notifMsg} />
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-0 divide-y p-0">
                  {([
                    { key: "issueAssigned",  label: "Issue assigned to me",     description: "When someone assigns an issue to you"               },
                    { key: "issueCommented", label: "Comments on my issues",    description: "When someone comments on an issue you created"      },
                    { key: "sprintStarted",  label: "Sprint started",           description: "When a sprint you're part of begins"                },
                    { key: "weeklyDigest",   label: "Weekly digest",            description: "A weekly summary of activity in your projects"      },
                    { key: "mentionsOnly",   label: "Mentions only",            description: "Only notify when you're directly @mentioned"        },
                  ] as { key: keyof typeof notifs; label: string; description: string }[]).map(({ key, label, description }) => (
                    <div key={key} className="flex items-center justify-between px-6 py-4">
                      <div>
                        <p className="text-sm font-medium">{label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                      </div>
                      <Toggle on={notifs[key]} onToggle={() => toggleNotif(key)} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* ══ SECURITY ════════════════════════════════════════ */}
            {activeSection === "security" && (
              <>
                {/* Password change */}
                <Card className="shadow-none">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <KeyRound size={15} /> Change Password
                    </CardTitle>
                    <CardDescription>Update your account password</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    {([
                      { id: "cur-pwd",  label: "Current password",  val: curPwd,     setter: setCurPwd     },
                      { id: "new-pwd",  label: "New password",       val: newPwd,     setter: setNewPwd,    hint: "Minimum 8 characters" },
                      { id: "conf-pwd", label: "Confirm new password", val: confirmPwd, setter: setConfirmPwd },
                    ] as { id: string; label: string; val: string; setter: (v: string) => void; hint?: string }[]).map(({ id, label, val, setter, hint }) => (
                      <div key={id} className="flex flex-col gap-1.5 max-w-xs">
                        <Label htmlFor={id}>{label}</Label>
                        <div className="relative">
                          <Input
                            id={id}
                            type={showPwd ? "text" : "password"}
                            value={val}
                            onChange={(e) => setter(e.target.value)}
                            placeholder="••••••••"
                            className="pr-9"
                            onKeyDown={(e) => { if (e.key === "Enter") handleUpdatePassword(); }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPwd((p) => !p)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          >
                            {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
                      </div>
                    ))}

                    {/* Strength indicator */}
                    {newPwd.length > 0 && (
                      <div className="flex items-center gap-2 max-w-xs">
                        {[8, 12, 16].map((threshold, i) => (
                          <div
                            key={i}
                            className={cn(
                              "flex-1 h-1 rounded-full transition-colors",
                              newPwd.length >= threshold
                                ? i === 0 ? "bg-red-400" : i === 1 ? "bg-yellow-400" : "bg-green-500"
                                : "bg-muted",
                            )}
                          />
                        ))}
                        <span className="text-[11px] text-muted-foreground shrink-0">
                          {newPwd.length < 8 ? "Too short" : newPwd.length < 12 ? "Fair" : newPwd.length < 16 ? "Good" : "Strong"}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-3 max-w-xs justify-end">
                      <StatusMsg msg={pwdMsg} />
                      <Button
                        onClick={handleUpdatePassword}
                        disabled={pwdSaving || !curPwd || !newPwd || !confirmPwd}
                        className="cursor-pointer gap-2"
                      >
                        {pwdSaving ? <><Loader2 size={13} className="animate-spin" /> Updating…</> : "Update password"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* 2FA */}
                <Card className="shadow-none">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <ShieldCheck size={15} /> Two-Factor Authentication
                      {mfaEnrolled && (
                        <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 font-normal text-xs px-2">
                          <ShieldCheck size={9} className="mr-1" /> Enabled
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {mfaEnrolled
                        ? "Your account is protected with an authenticator app."
                        : "Add an extra layer of security using an authenticator app (Google Authenticator, Authy, etc.)"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    {mfaSuccess && (
                      <div className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2.5 text-sm text-green-600 dark:text-green-400">
                        <CheckCircle2 size={14} className="shrink-0" />
                        2FA enabled successfully. You'll need your authenticator app on next sign in.
                      </div>
                    )}
                    {mfaError && (
                      <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive">
                        <AlertCircle size={14} className="shrink-0" /> {mfaError}
                      </div>
                    )}

                    {mfaEnrolled && mfaStep === "idle" && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isMfaPending}
                        onClick={disableMfa}
                        className="cursor-pointer gap-1.5 w-fit text-destructive border-destructive/30 hover:bg-destructive/10"
                      >
                        {isMfaPending ? <Loader2 size={13} className="animate-spin" /> : <ShieldOff size={13} />}
                        Disable 2FA
                      </Button>
                    )}

                    {!mfaEnrolled && mfaStep === "idle" && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isMfaPending}
                        onClick={startEnroll}
                        className="cursor-pointer gap-1.5 w-fit"
                      >
                        {isMfaPending ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                        Set up 2FA
                      </Button>
                    )}

                    {mfaStep === "enrolling" && (
                      <div className="flex flex-col gap-5 p-4 rounded-xl border bg-muted/30">
                        <div>
                          <p className="text-sm font-semibold mb-0.5">Step 1 — Scan the QR code</p>
                          <p className="text-xs text-muted-foreground">Open your authenticator app and scan the code below.</p>
                        </div>
                        {mfaQr && (
                          <div className="flex items-start gap-5 flex-wrap">
                            <div className="bg-white dark:bg-white p-3 rounded-xl shadow-sm" dangerouslySetInnerHTML={{ __html: mfaQr }} />
                            <div className="flex flex-col gap-1.5">
                              <p className="text-xs text-muted-foreground">Or enter this secret manually:</p>
                              <code className="text-xs bg-background border px-3 py-2 rounded-lg font-mono tracking-widest break-all select-all">
                                {mfaSecret}
                              </code>
                            </div>
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold mb-2">Step 2 — Enter the 6-digit code</p>
                          <div className="flex flex-col gap-3">
                            <InputOTP maxLength={6} value={mfaCode} onChange={setMfaCode} disabled={isMfaPending}>
                              <InputOTPGroup className="gap-2 *:data-[slot=input-otp-slot]:rounded-lg *:data-[slot=input-otp-slot]:border *:data-[slot=input-otp-slot]:size-10">
                                <InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} />
                                <InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} />
                              </InputOTPGroup>
                            </InputOTP>
                            <div className="flex gap-2">
                              <Button size="sm" disabled={isMfaPending || mfaCode.length < 6} onClick={confirmEnroll} className="cursor-pointer gap-1.5">
                                {isMfaPending ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />} Activate
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => { setMfaStep("idle"); setMfaCode(""); setMfaError(null); }} className="cursor-pointer">
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {/* ══ DANGER ZONE ══════════════════════════════════════ */}
            {activeSection === "danger" && (
              <Card className="shadow-none border-destructive/40">
                <CardHeader>
                  <CardTitle className="text-base text-destructive flex items-center gap-2">
                    <Trash2 size={15} /> Danger Zone
                  </CardTitle>
                  <CardDescription>Irreversible actions — proceed with extreme caution</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-0 divide-y divide-destructive/10 p-0">

                  {/* Export */}
                  <div className="flex items-start justify-between gap-4 px-6 py-5">
                    <div>
                      <p className="text-sm font-medium">Export all data</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Download all your projects, issues, comments and activity as a JSON file
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="cursor-pointer gap-2 shrink-0"
                      disabled={exporting}
                      onClick={handleExport}
                    >
                      {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                      {exporting ? "Exporting…" : "Export"}
                    </Button>
                  </div>

                  {/* Delete account */}
                  <div className="flex flex-col gap-4 px-6 py-5">
                    <div>
                      <p className="text-sm font-medium text-destructive">Delete account</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Permanently deletes your profile and signs you out. This action cannot be undone.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 max-w-sm">
                      <Label htmlFor="delete-confirm" className="text-xs text-muted-foreground">
                        Type <span className="font-mono font-semibold text-destructive">DELETE</span> to confirm
                      </Label>
                      <Input
                        id="delete-confirm"
                        value={deleteConfirm}
                        onChange={(e) => setDeleteConfirm(e.target.value)}
                        placeholder="DELETE"
                        className="border-destructive/40 focus-visible:ring-destructive/40"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusMsg msg={deleteMsg} />
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={deleting || deleteConfirm !== "DELETE"}
                        onClick={handleDeleteAccount}
                        className="cursor-pointer gap-2"
                      >
                        {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        {deleting ? "Deleting…" : "Delete account"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        </div>
      </div>
    </AppSidebar>
  );
}
