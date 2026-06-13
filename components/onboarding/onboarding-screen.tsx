"use client";

import { useState } from "react";
import {
  FolderKanban, Users, CheckSquare, ArrowRight,
  Sparkles, Mail, Zap, BarChart3, GitBranch,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Feature pill shown in the hero ─────────────────────── */
const FEATURES = [
  { icon: GitBranch,   label: "Sprints"    },
  { icon: CheckSquare, label: "Issues"     },
  { icon: BarChart3,   label: "Reports"    },
  { icon: Users,       label: "Team"       },
];

/* ── Path cards ─────────────────────────────────────────── */
type PathCardProps = {
  icon: React.ElementType;
  gradient: string;
  iconBg: string;
  title: string;
  description: string;
  primaryLabel: string;
  secondaryLabel?: string;
  onPrimary: () => void;
  badge?: string;
};

function PathCard({
  icon: Icon, gradient, iconBg, title, description,
  primaryLabel, secondaryLabel, onPrimary, badge,
}: PathCardProps) {
  return (
    <div className={cn(
      "relative rounded-2xl border bg-card overflow-hidden flex flex-col gap-5 p-6",
      "hover:shadow-lg transition-shadow duration-200",
    )}>
      {/* gradient accent */}
      <div className={cn("absolute inset-x-0 top-0 h-1 rounded-t-2xl", gradient)} />

      {badge && (
        <span className="absolute top-4 right-4 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
          {badge}
        </span>
      )}

      <div className={cn("size-11 rounded-xl flex items-center justify-center", iconBg)}>
        <Icon size={20} />
      </div>

      <div className="flex flex-col gap-1.5">
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>

      <div className="flex flex-col gap-2 mt-auto">
        <button
          onClick={onPrimary}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
        >
          {primaryLabel}
          <ArrowRight size={14} />
        </button>
        {secondaryLabel && (
          <p className="text-center text-xs text-muted-foreground">{secondaryLabel}</p>
        )}
      </div>
    </div>
  );
}

/* ── Step indicator ─────────────────────────────────────── */
function StepRow({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="size-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
        {number}
      </div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────── */

interface OnboardingScreenProps {
  displayName?: string | null;
  onCreateProject: () => void;
}

export function OnboardingScreen({ displayName, onCreateProject }: OnboardingScreenProps) {
  const firstName = displayName?.split(" ")[0] ?? "there";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      {/* ── Hero ── */}
      <div className="w-full max-w-2xl flex flex-col items-center gap-6 text-center mb-10">
        <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center ring-4 ring-primary/5">
          <Sparkles size={28} className="text-primary" />
        </div>

        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome, {firstName}! 👋
          </h1>
          <p className="text-muted-foreground mt-2 text-base max-w-md mx-auto">
            You're in. Your workspace is ready — pick how you'd like to get started.
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {FEATURES.map(({ icon: Icon, label }) => (
            <span key={label} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border bg-muted/40 text-muted-foreground">
              <Icon size={11} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Path cards ── */}
      <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        <PathCard
          icon={FolderKanban}
          gradient="bg-gradient-to-r from-blue-500 to-violet-500"
          iconBg="bg-blue-500/10 text-blue-600 dark:text-blue-400"
          title="Start a new project"
          description="Create your workspace, set up a project, and start tracking issues, sprints, and progress from day one."
          primaryLabel="Create my first project"
          secondaryLabel="Takes less than a minute"
          onPrimary={onCreateProject}
          badge="Most popular"
        />

        <PathCard
          icon={Mail}
          gradient="bg-gradient-to-r from-violet-500 to-pink-500"
          iconBg="bg-violet-500/10 text-violet-600 dark:text-violet-400"
          title="Joining a team?"
          description="If someone invited you to their project, you'll find it in your sidebar as soon as they add you. No action needed."
          primaryLabel="Check my notifications"
          onPrimary={() => {
            const bell = document.querySelector<HTMLButtonElement>("[data-notification-bell]");
            bell?.click();
          }}
        />
      </div>

      {/* ── How it works ── */}
      <div className="w-full max-w-2xl rounded-2xl border bg-muted/30 p-6">
        <div className="flex items-center gap-2 mb-5">
          <Zap size={15} className="text-primary" />
          <h2 className="text-sm font-semibold">How Blockan works</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <StepRow
            number={1}
            title="Create a project"
            description="Organise your work into projects — one per product, team, or initiative."
          />
          <StepRow
            number={2}
            title="Invite your team"
            description="Add teammates by email. They get instant access with the role you choose."
          />
          <StepRow
            number={3}
            title="Ship together"
            description="Plan sprints, assign issues, track progress, and hit your goals."
          />
        </div>
      </div>
    </div>
  );
}
