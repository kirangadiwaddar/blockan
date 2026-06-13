"use client";

import { FolderKanban, Bell, GitBranch, CheckSquare, BarChart3, Users, ArrowRight, Zap } from "lucide-react";

const FEATURES = [
  { icon: GitBranch, label: "Sprints" },
  { icon: CheckSquare, label: "Issues" },
  { icon: BarChart3, label: "Reports" },
  { icon: Users, label: "Team" },
];

const STEPS = [
  {
    number: "01",
    title: "Create a project",
    description: "Organise your work into projects — one per product, team, or initiative.",
  },
  {
    number: "02",
    title: "Invite your team",
    description: "Add teammates via invite link. They get access with the role you assign.",
  },
  {
    number: "03",
    title: "Ship together",
    description: "Plan sprints, assign issues, track progress, and hit your goals.",
  },
];

interface OnboardingScreenProps {
  displayName?: string | null;
  onCreateProject: () => void;
}

export function OnboardingScreen({ displayName, onCreateProject }: OnboardingScreenProps) {
  const firstName = displayName?.split(" ")[0] ?? "there";

  return (
    <div className="h-full w-full flex flex-col items-center justify-center px-4 py-8 bg-background">
      <div className="w-full max-w-xl flex flex-col gap-10">

        {/* Hero */}
        <div className="flex flex-col items-center text-center gap-4">
          {/* Gradient badge */}
          <div className="relative inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium"
            style={{
              background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.12), rgba(236,72,153,0.10))",
              border: "1px solid transparent",
              backgroundClip: "padding-box",
            }}
          >
            <span
              className="absolute inset-0 rounded-full"
              style={{
                background: "linear-gradient(135deg, rgba(99,102,241,0.5), rgba(168,85,247,0.5), rgba(236,72,153,0.4))",
                WebkitMask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
                WebkitMaskComposite: "destination-out",
                maskComposite: "exclude",
                padding: "1px",
              }}
            />
            <Zap size={11} className="text-violet-500 relative z-10" />
            <span className="relative z-10 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent font-semibold">
              Workspace ready
            </span>
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Welcome, {firstName}!
          </h1>
          <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
            Your workspace is set up. Create your first project to start tracking work, or join a team you were invited to.
          </p>

          {/* Feature pills */}
          <div className="flex items-center gap-2 flex-wrap justify-center mt-1">
            {FEATURES.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border bg-card text-muted-foreground"
              >
                <Icon size={11} />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Action cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Primary card */}
          <button
            onClick={onCreateProject}
            className="group flex flex-col items-start gap-4 rounded-2xl border border-border bg-card p-5 text-left hover:border-blue-400/60 transition-all duration-150 cursor-pointer"
          >
            <div className="flex w-full items-start justify-between">
              <div className="size-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <FolderKanban size={18} className="text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-500/20">
                Start here
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-foreground">Create your first project</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Set up a project and start tracking issues, sprints, and progress.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400">
              Get started
              <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
            </div>
          </button>

          {/* Secondary card */}
          <button
            onClick={() => {
              const bell = document.querySelector<HTMLButtonElement>("[data-notification-bell]");
              bell?.click();
            }}
            className="group flex flex-col items-start gap-4 rounded-2xl border border-border bg-card p-5 text-left hover:border-violet-400/60 transition-all duration-150 cursor-pointer"
          >
            <div className="size-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <Bell size={18} className="text-violet-600 dark:text-violet-400" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-foreground">Joining a team?</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                If you were invited, your project will appear in the sidebar once the admin adds you.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-medium text-violet-600 dark:text-violet-400">
              Check notifications
              <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
            </div>
          </button>
        </div>

        {/* How it works */}
        <div className="rounded-2xl border bg-muted/30 px-5 py-4">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">How it works</p>
          <div className="grid grid-cols-3 divide-x divide-border">
            {STEPS.map(({ number, title, description }) => (
              <div key={number} className="flex flex-col gap-1.5 px-4 first:pl-0 last:pr-0">
                <span className="text-[11px] font-bold text-muted-foreground/50 font-mono">{number}</span>
                <p className="text-xs font-semibold text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
