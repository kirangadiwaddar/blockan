"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, FolderKanban, ListTree, SquareStack,
  CalendarDays, BarChart2, BookText, Users, Settings,
  Bug, BookOpen, CheckSquare, Zap, ChevronRight,
  Flame, AlertTriangle, Minus, TrendingDown,
  Grid3x2, Search, Bell, ArrowLeft,
  UserPlus, UserCheck, MessageSquare, AtSign,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";

/* ─── Section data ─────────────────────────────────────────── */

const SECTIONS = [
  { id: "overview",   label: "Overview",       icon: LayoutDashboard },
  { id: "projects",   label: "Projects",       icon: FolderKanban    },
  { id: "issues",     label: "Issues",         icon: ListTree        },
  { id: "board",      label: "Board",          icon: Grid3x2         },
  { id: "backlog",    label: "Backlog",        icon: ListTree        },
  { id: "sprints",    label: "Sprints",        icon: SquareStack     },
  { id: "timeline",   label: "Timeline",       icon: CalendarDays    },
  { id: "workload",   label: "Workload",       icon: BarChart2       },
  { id: "reports",    label: "Reports",        icon: BookText        },
  { id: "team",       label: "Team",           icon: Users           },
  { id: "notifications", label: "Notifications",  icon: Bell            },
  { id: "settings",   label: "Settings",       icon: Settings        },
  { id: "shortcuts",  label: "Shortcuts",      icon: Search          },
];

/* ─── Reusable blocks ──────────────────────────────────────── */

function SectionHeading({ id, icon: Icon, children }: { id: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div id={id} className="flex items-center gap-3 scroll-mt-24">
      <div className="flex items-center justify-center size-9 rounded-xl bg-muted border">
        <Icon size={18} className="text-foreground" />
      </div>
      <h2 className="text-xl font-bold">{children}</h2>
    </div>
  );
}

function Callout({ children, variant = "info" }: { children: React.ReactNode; variant?: "info" | "tip" }) {
  return (
    <div className={cn(
      "rounded-xl border px-4 py-3 text-sm",
      variant === "tip"
        ? "bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200"
        : "bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-200"
    )}>
      {children}
    </div>
  );
}

function FeatureRow({ icon: Icon, color, label, children }: {
  icon: React.ElementType; color: string; label: string; children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <Icon size={16} className={cn("shrink-0 mt-0.5", color)} />
      <div>
        <span className="font-semibold text-sm">{label} — </span>
        <span className="text-sm text-muted-foreground">{children}</span>
      </div>
    </div>
  );
}

function ShortcutRow({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        {keys.map((k, i) => (
          <kbd key={i} className="inline-flex items-center justify-center px-2 py-0.5 rounded border bg-muted text-xs font-mono font-medium">
            {k}
          </kbd>
        ))}
      </div>
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────── */

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("overview");

  return (
    <div className="min-h-screen bg-background">

      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <Link
            href="/dashboard"
            className={buttonVariants({ variant: "ghost", size: "sm", className: "gap-1.5 cursor-pointer" })}
          >
            <ArrowLeft size={14} /> Back to app
          </Link>
          <Separator orientation="vertical" className="h-5" />
          <span className="font-semibold text-sm">Blockan Docs</span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex gap-10">

        {/* Sidebar nav */}
        <aside className="hidden lg:flex flex-col gap-1 w-48 shrink-0 sticky top-24 self-start">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-2">Contents</p>
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={() => setActiveSection(id)}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors",
                activeSection === id
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon size={13} className="shrink-0" />
              {label}
            </a>
          ))}
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 flex flex-col gap-12">

          {/* ── Overview ── */}
          <section className="flex flex-col gap-5">
            <SectionHeading id="overview" icon={LayoutDashboard}>Overview</SectionHeading>
            <p className="text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Blockan</strong> is a project management tool built for agile teams. It gives you everything you need to plan work, track progress, and ship together — from a kanban board to sprint planning, Gantt timelines, team workload views, and rich reports.
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { icon: FolderKanban, label: "Projects", desc: "Organise work into projects, each with its own board, backlog, and sprints." },
                { icon: ListTree,     label: "Issues",   desc: "Create and track tasks, bugs, stories, and epics with sub-tasks." },
                { icon: BarChart2,    label: "Insights", desc: "Monitor team workload, velocity, and progress with built-in reports." },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="rounded-xl border p-4 flex flex-col gap-2">
                  <Icon size={18} className="text-foreground" />
                  <p className="font-semibold text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </section>

          <Separator />

          {/* ── Projects ── */}
          <section className="flex flex-col gap-5">
            <SectionHeading id="projects" icon={FolderKanban}>Projects</SectionHeading>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Projects are the top-level container for work. Each project has its own board, backlog, sprint list, timeline, workload view, and reports page.
            </p>
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground list-none">
              <li className="flex gap-2"><ChevronRight size={14} className="shrink-0 mt-0.5 text-primary" /> Go to <strong className="text-foreground">Projects</strong> from the left sidebar to see all your projects.</li>
              <li className="flex gap-2"><ChevronRight size={14} className="shrink-0 mt-0.5 text-primary" /> Click <strong className="text-foreground">New project</strong> to create one — give it a name, color, and short key (e.g. <code className="bg-muted px-1 rounded text-xs">BLKN</code>).</li>
              <li className="flex gap-2"><ChevronRight size={14} className="shrink-0 mt-0.5 text-primary" /> Each project has <strong className="text-foreground">roles</strong>: Owner, Admin, Member, Viewer, Guest — controlling who can edit or just view.</li>
              <li className="flex gap-2"><ChevronRight size={14} className="shrink-0 mt-0.5 text-primary" /> Archive a project from Settings when work is complete — it stays visible but read-only.</li>
            </ul>
          </section>

          <Separator />

          {/* ── Issues ── */}
          <section className="flex flex-col gap-5">
            <SectionHeading id="issues" icon={ListTree}>Issues</SectionHeading>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Issues are the unit of work. Every task, bug, story, or epic is an issue. You can create them from the board, backlog, or sprints page.
            </p>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold">Types</p>
              <div className="flex flex-col gap-2">
                <FeatureRow icon={Bug}         color="text-red-500"    label="Bug">Something broken that needs a fix.</FeatureRow>
                <FeatureRow icon={BookOpen}    color="text-blue-500"   label="Story">A user-facing feature or requirement.</FeatureRow>
                <FeatureRow icon={CheckSquare} color="text-green-500"  label="Task">A concrete unit of work with a clear done state.</FeatureRow>
                <FeatureRow icon={Zap}         color="text-purple-500" label="Epic">A large body of work that groups multiple stories or tasks.</FeatureRow>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold">Priority</p>
              <div className="flex flex-col gap-2">
                <FeatureRow icon={Flame}         color="text-destructive"     label="Critical">Drop everything — production is on fire.</FeatureRow>
                <FeatureRow icon={AlertTriangle} color="text-orange-500"      label="High">Important, needs to be done this sprint.</FeatureRow>
                <FeatureRow icon={Minus}         color="text-yellow-500"      label="Medium">Standard priority — default for new issues.</FeatureRow>
                <FeatureRow icon={TrendingDown}  color="text-muted-foreground" label="Low">Nice to have, no urgency.</FeatureRow>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold">Fields on every issue</p>
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-1.5 text-sm text-muted-foreground">
                {[
                  ["Title", "Short summary of the work."],
                  ["Description", "Rich text with support for images and formatting."],
                  ["Status", "Todo → In Progress → Reviewing → Completed."],
                  ["Assignees", "One or more team members responsible."],
                  ["Story points", "Effort estimate for sprint capacity planning."],
                  ["Due date", "Optional deadline — overdue issues show in red."],
                  ["Sprint", "Which sprint this issue belongs to."],
                  ["Sub-tasks", "Child issues that break this issue into smaller steps."],
                ].map(([field, desc]) => (
                  <div key={field} className="flex gap-1.5">
                    <ChevronRight size={13} className="shrink-0 mt-0.5 text-primary" />
                    <span><strong className="text-foreground">{field}</strong> — {desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold">Sub-tasks</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Open any issue and scroll to the <strong className="text-foreground">Sub-tasks</strong> section. Click <strong className="text-foreground">Add</strong>, type a title, and press <kbd className="bg-muted px-1 rounded text-xs">Enter</kbd>. Each sub-task gets its own status checkbox — tick it to mark it complete.
              </p>
            </div>

            <Callout>
              <strong>Tip:</strong> Press <kbd className="bg-blue-100 dark:bg-blue-900 px-1.5 py-0.5 rounded text-xs font-mono">C</kbd> anywhere in a project to quickly open the Create Issue dialog.
            </Callout>
          </section>

          <Separator />

          {/* ── Board ── */}
          <section className="flex flex-col gap-5">
            <SectionHeading id="board" icon={Grid3x2}>Board</SectionHeading>
            <p className="text-muted-foreground text-sm leading-relaxed">
              The board is a kanban view of your active sprint. Issues are grouped by status into columns. Drag and drop cards between columns to update their status instantly.
            </p>
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
              <li className="flex gap-2"><ChevronRight size={14} className="shrink-0 mt-0.5 text-primary" /> Filter cards by <strong className="text-foreground">Assignee</strong>, <strong className="text-foreground">Priority</strong>, or <strong className="text-foreground">Type</strong> using the toolbar pills.</li>
              <li className="flex gap-2"><ChevronRight size={14} className="shrink-0 mt-0.5 text-primary" /> Use the <strong className="text-foreground">search bar</strong> to find issues by title or code.</li>
              <li className="flex gap-2"><ChevronRight size={14} className="shrink-0 mt-0.5 text-primary" /> Click the <strong className="text-foreground">settings icon</strong> to show, hide, or rename columns.</li>
              <li className="flex gap-2"><ChevronRight size={14} className="shrink-0 mt-0.5 text-primary" /> Export all issues to <strong className="text-foreground">Excel</strong> using the download button in the top bar.</li>
            </ul>
          </section>

          <Separator />

          {/* ── Backlog ── */}
          <section className="flex flex-col gap-5">
            <SectionHeading id="backlog" icon={ListTree}>Backlog</SectionHeading>
            <p className="text-muted-foreground text-sm leading-relaxed">
              The backlog is a table view of all issues not yet in a sprint. Use it to groom and organise your upcoming work.
            </p>
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
              <li className="flex gap-2"><ChevronRight size={14} className="shrink-0 mt-0.5 text-primary" /> <strong className="text-foreground">Search</strong> by title or issue code, and filter by Assignee, Priority, or Type.</li>
              <li className="flex gap-2"><ChevronRight size={14} className="shrink-0 mt-0.5 text-primary" /> Select multiple issues with checkboxes and <strong className="text-foreground">bulk-move them to a sprint</strong> in one click.</li>
              <li className="flex gap-2"><ChevronRight size={14} className="shrink-0 mt-0.5 text-primary" /> Click any row to open the full issue detail sheet.</li>
            </ul>
          </section>

          <Separator />

          {/* ── Sprints ── */}
          <section className="flex flex-col gap-5">
            <SectionHeading id="sprints" icon={SquareStack}>Sprints</SectionHeading>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Sprints are time-boxed iterations of work. Plan issues into a sprint, start it, and track progress to completion.
            </p>
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
              <li className="flex gap-2"><ChevronRight size={14} className="shrink-0 mt-0.5 text-primary" /> Create a sprint with a <strong className="text-foreground">name</strong>, <strong className="text-foreground">goal</strong>, <strong className="text-foreground">start</strong> and <strong className="text-foreground">end date</strong>.</li>
              <li className="flex gap-2"><ChevronRight size={14} className="shrink-0 mt-0.5 text-primary" /> Add issues from the backlog by clicking <strong className="text-foreground">Add issues</strong>.</li>
              <li className="flex gap-2"><ChevronRight size={14} className="shrink-0 mt-0.5 text-primary" /> Only one sprint can be <strong className="text-foreground">Active</strong> at a time — start it when the team is ready.</li>
              <li className="flex gap-2"><ChevronRight size={14} className="shrink-0 mt-0.5 text-primary" /> <strong className="text-foreground">Complete</strong> a sprint to archive it and move remaining issues back to the backlog.</li>
              <li className="flex gap-2"><ChevronRight size={14} className="shrink-0 mt-0.5 text-primary" /> The sprint stats panel shows total issues, story points done, and overall progress.</li>
            </ul>
          </section>

          <Separator />

          {/* ── Timeline ── */}
          <section className="flex flex-col gap-5">
            <SectionHeading id="timeline" icon={CalendarDays}>Timeline</SectionHeading>
            <p className="text-muted-foreground text-sm leading-relaxed">
              The timeline is a Gantt-style view that maps your sprints and issues across a calendar. It's the best way to see how work is scheduled and where things overlap.
            </p>
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
              <li className="flex gap-2"><ChevronRight size={14} className="shrink-0 mt-0.5 text-primary" /> Navigate months with the <strong className="text-foreground">arrow buttons</strong> or jump to today.</li>
              <li className="flex gap-2"><ChevronRight size={14} className="shrink-0 mt-0.5 text-primary" /> Sprints appear as coloured bands; issues with due dates appear as bars inside them.</li>
              <li className="flex gap-2"><ChevronRight size={14} className="shrink-0 mt-0.5 text-primary" /> Click any issue bar to open the detail sheet.</li>
            </ul>
          </section>

          <Separator />

          {/* ── Workload ── */}
          <section className="flex flex-col gap-5">
            <SectionHeading id="workload" icon={BarChart2}>Workload</SectionHeading>
            <p className="text-muted-foreground text-sm leading-relaxed">
              The workload view shows every team member's assigned issues for a project at a glance — great for spotting who is overloaded before you start a sprint.
            </p>
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
              <li className="flex gap-2"><ChevronRight size={14} className="shrink-0 mt-0.5 text-primary" /> Each member card shows their issues with <strong className="text-foreground">status</strong>, <strong className="text-foreground">priority</strong>, and <strong className="text-foreground">due date</strong>.</li>
              <li className="flex gap-2"><ChevronRight size={14} className="shrink-0 mt-0.5 text-primary" /> A progress bar shows how many of their issues are completed.</li>
              <li className="flex gap-2"><ChevronRight size={14} className="shrink-0 mt-0.5 text-primary" /> An <strong className="text-foreground">Unassigned</strong> section lists issues that haven't been picked up yet.</li>
            </ul>
          </section>

          <Separator />

          {/* ── Reports ── */}
          <section className="flex flex-col gap-5">
            <SectionHeading id="reports" icon={BookText}>Reports</SectionHeading>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Reports give you charts and metrics across your project — useful for retrospectives, stakeholder updates, and spotting bottlenecks.
            </p>
            <div className="grid sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
              {[
                ["Status breakdown",   "Pie chart of issues by current status."],
                ["Priority breakdown", "See how much Critical and High priority work is in flight."],
                ["Type breakdown",     "Ratio of Bugs, Stories, Tasks, and Epics."],
                ["Sprint velocity",    "Story points completed per sprint over time."],
                ["Member load",        "Issues assigned to each team member."],
                ["Overdue issues",     "Issues past their due date that aren't completed."],
              ].map(([title, desc]) => (
                <div key={title} className="flex gap-2">
                  <ChevronRight size={13} className="shrink-0 mt-0.5 text-primary" />
                  <span><strong className="text-foreground">{title}</strong> — {desc}</span>
                </div>
              ))}
            </div>
          </section>

          <Separator />

          {/* ── Team ── */}
          <section className="flex flex-col gap-5">
            <SectionHeading id="team" icon={Users}>Team</SectionHeading>
            <p className="text-muted-foreground text-sm leading-relaxed">
              The Team page lets workspace owners and admins manage who has access and what they can do.
            </p>
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
              <li className="flex gap-2"><ChevronRight size={14} className="shrink-0 mt-0.5 text-primary" /> <strong className="text-foreground">Invite members</strong> by email — they'll receive an invite link and join on sign-up.</li>
              <li className="flex gap-2"><ChevronRight size={14} className="shrink-0 mt-0.5 text-primary" /> Change a member's <strong className="text-foreground">role</strong> from the ··· menu: Owner, Admin, Member, Viewer, or Guest.</li>
              <li className="flex gap-2"><ChevronRight size={14} className="shrink-0 mt-0.5 text-primary" /> <strong className="text-foreground">Resend</strong> or <strong className="text-foreground">cancel</strong> pending invites from the same table.</li>
              <li className="flex gap-2"><ChevronRight size={14} className="shrink-0 mt-0.5 text-primary" /> <strong className="text-foreground">Remove</strong> a member to revoke their access immediately.</li>
            </ul>
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Role</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Can do</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {[
                    ["Owner",  "Full control including billing, delete project, transfer ownership."],
                    ["Admin",  "Manage members, sprints, settings. Cannot delete project."],
                    ["Member", "Create and edit issues, comment, log time. Default for invitees."],
                    ["Viewer", "Read-only access — can view all content but not change anything."],
                    ["Guest",  "Limited access — can only see issues assigned to them."],
                  ].map(([role, desc]) => (
                    <tr key={role} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 font-medium whitespace-nowrap">{role}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <Separator />

          {/* ── Notifications ── */}
          <section className="flex flex-col gap-5">
            <SectionHeading id="notifications" icon={Bell}>Notifications</SectionHeading>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Blockan sends you in-app notifications for activity that's relevant to you. The bell icon in the top bar shows your unread count and updates in real time.
            </p>
            <div className="flex flex-col gap-3">
              {[
                {
                  icon: UserPlus,
                  color: "text-amber-500",
                  label: "Invite",
                  desc: "You receive this when an admin adds you to a project. Clicking it takes you to your dashboard where the new project appears in the sidebar.",
                },
                {
                  icon: UserCheck,
                  color: "text-green-500",
                  label: "Assignment",
                  desc: "You receive this when someone assigns an issue to you. Clicking it opens the issue detail sheet directly.",
                },
                {
                  icon: MessageSquare,
                  color: "text-blue-500",
                  label: "Comment",
                  desc: "You receive this when someone comments on an issue you reported or are assigned to. You won't be notified for your own comments.",
                },
                {
                  icon: AtSign,
                  color: "text-purple-500",
                  label: "Mention",
                  desc: "Coming soon — you'll be notified when someone @mentions you in a comment or issue description.",
                },
              ].map(({ icon: Icon, color, label, desc }) => (
                <div key={label} className="flex gap-3 rounded-xl border p-4">
                  <div className={`shrink-0 mt-0.5 ${color}`}><Icon size={16} /></div>
                  <div>
                    <p className="text-sm font-semibold">{label}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <Callout>
              Click the bell to open the notification panel. Hover any notification and click the checkmark to mark it read, or use <strong>Mark all read</strong> to clear them all at once.
            </Callout>
          </section>

          <Separator />

          {/* ── Settings ── */}
          <section className="flex flex-col gap-5">
            <SectionHeading id="settings" icon={Settings}>Settings</SectionHeading>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Access Settings from the profile menu at the bottom of the sidebar. Sections include:
            </p>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              {[
                ["Profile",           "Update your display name, avatar, and bio."],
                ["Appearance",        "Switch between light and dark mode, and choose an accent colour."],
                ["Notifications",     "Control which in-app notifications you receive."],
                ["Security & Privacy","Enable two-factor authentication (TOTP) via an authenticator app."],
                ["Danger Zone",       "Delete your account — this is permanent and irreversible."],
              ].map(([section, desc]) => (
                <div key={section} className="flex gap-2">
                  <ChevronRight size={13} className="shrink-0 mt-0.5 text-primary" />
                  <span><strong className="text-foreground">{section}</strong> — {desc}</span>
                </div>
              ))}
            </div>
          </section>

          <Separator />

          {/* ── Shortcuts ── */}
          <section className="flex flex-col gap-5">
            <SectionHeading id="shortcuts" icon={Search}>Keyboard Shortcuts</SectionHeading>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Blockan is built for keyboard-first navigation. Press <kbd className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">?</kbd> anywhere to open the shortcuts dialog.
            </p>
            <div className="rounded-xl border divide-y overflow-hidden">
              {[
                { keys: ["C"],         label: "Create new issue" },
                { keys: ["⌘", "K"],    label: "Open command palette" },
                { keys: ["?"],         label: "Show keyboard shortcuts" },
                { keys: ["Esc"],       label: "Close sheet / dialog" },
                { keys: ["G", "D"],    label: "Go to Dashboard" },
                { keys: ["G", "P"],    label: "Go to Projects" },
                { keys: ["G", "T"],    label: "Go to Team" },
                { keys: ["G", "S"],    label: "Go to Settings" },
              ].map(({ keys, label }) => (
                <div key={label} className="px-4">
                  <ShortcutRow keys={keys} label={label} />
                </div>
              ))}
            </div>
          </section>

          <Callout variant="tip">
            <strong>Need help?</strong> If something isn't working as expected, try refreshing the page. For persistent issues, contact your workspace admin.
          </Callout>

          <div className="pb-8" />
        </main>
      </div>
    </div>
  );
}
