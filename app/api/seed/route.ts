import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const PEOPLE = [
  { name: "Ava Thompson",   email: "ava.thompson@blockan.demo",   img: "https://i.pravatar.cc/256?img=47" },
  { name: "Liam Carter",    email: "liam.carter@blockan.demo",    img: "https://i.pravatar.cc/256?img=12" },
  { name: "Sofia Martinez", email: "sofia.martinez@blockan.demo", img: "https://i.pravatar.cc/256?img=33" },
  { name: "Noah Williams",  email: "noah.williams@blockan.demo",  img: "https://i.pravatar.cc/256?img=14" },
  { name: "Mia Chen",       email: "mia.chen@blockan.demo",       img: "https://i.pravatar.cc/256?img=5"  },
  { name: "Ethan Brooks",   email: "ethan.brooks@blockan.demo",   img: "https://i.pravatar.cc/256?img=51" },
  { name: "Isabella Kim",   email: "isabella.kim@blockan.demo",   img: "https://i.pravatar.cc/256?img=29" },
  { name: "Lucas Rivera",   email: "lucas.rivera@blockan.demo",   img: "https://i.pravatar.cc/256?img=60" },
  { name: "Grace Patel",    email: "grace.patel@blockan.demo",    img: "https://i.pravatar.cc/256?img=44" },
  { name: "Oliver Bennett", email: "oliver.bennett@blockan.demo", img: "https://i.pravatar.cc/256?img=15" },
];

const PROJECTS = [
  { name: "Atlas Mobile App",   key: "ATL", color: "avatar-orb-blue",    description: "Cross-platform mobile client rebuild." },
  { name: "Nova Design System", key: "NOV", color: "avatar-orb-violet",  description: "Shared component library and tokens." },
  { name: "Orbit Billing",      key: "ORB", color: "avatar-orb-emerald", description: "Subscription billing and invoicing platform." },
  { name: "Pulse Analytics",    key: "PUL", color: "avatar-orb-amber",   description: "Realtime product analytics dashboards." },
  { name: "Forge API Gateway",  key: "FRG", color: "avatar-orb-rose",    description: "Internal API gateway and auth layer." },
];

const STATUSES  = ["Todo", "In Progress", "Reviewing", "Completed", "Cancelled"];
const PRIORITIES = ["Critical", "High", "Medium", "Low"];
const TYPES     = ["Bug", "Story", "Task", "Epic"];

const ISSUE_TITLES = [
  "Set up CI pipeline for staging deploys",
  "Fix memory leak in background sync worker",
  "Design empty states for onboarding flow",
  "Add pagination to activity feed",
  "Migrate auth tokens to rotating refresh",
  "Improve cold-start time on app launch",
  "Audit color contrast for dark mode",
  "Write integration tests for checkout flow",
  "Refactor sidebar navigation component",
  "Add rate limiting to public API",
  "Investigate intermittent webhook failures",
  "Polish drag-and-drop board interactions",
  "Add CSV export for billing reports",
  "Localize date formatting across app",
  "Set up error tracking dashboards",
  "Reduce bundle size for marketing site",
  "Add keyboard shortcuts for power users",
  "Fix race condition in comment threads",
  "Build admin panel for member roles",
  "Optimize database indexes for issue search",
];

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randN(n: number) { return Math.floor(Math.random() * n); }

export async function POST(request: NextRequest) {
  // Only allow in non-production, or when a valid seed secret is provided
  const isProduction = process.env.NODE_ENV === "production";
  const seedSecret = process.env.SEED_SECRET;
  const authHeader = request.headers.get("x-seed-secret");

  if (isProduction && (!seedSecret || authHeader !== seedSecret)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Require an authenticated session
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return NextResponse.json({ error: "Missing SUPABASE credentials" }, { status: 500 });
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const log: string[] = [];

  // Ensure users
  log.push("Creating demo users…");
  const { data: existingList } = await supabase.auth.admin.listUsers({ perPage: 200 });
  const existingEmails = new Set(existingList?.users?.map((u) => u.email) ?? []);

  const userIds: string[] = [];
  for (const p of PEOPLE) {
    let uid: string;
    const existing = existingList?.users?.find((u) => u.email === p.email);
    if (existing) {
      uid = existing.id;
    } else if (!existingEmails.has(p.email)) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: p.email,
        email_confirm: true,
        password: `Demo-${Math.random().toString(36).slice(2)}!1`,
        user_metadata: { full_name: p.name, avatar_url: p.img },
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      uid = data.user.id;
    } else {
      continue;
    }
    await supabase.from("profiles").upsert({ id: uid, full_name: p.name, avatar_url: p.img, email: p.email });
    userIds.push(uid);
    log.push(`  ✓ ${p.name}`);
  }

  // Projects
  log.push("Creating projects…");
  for (const p of PROJECTS) {
    const ownerId = rand(userIds);
    const { data: existing } = await supabase.from("projects").select("id").eq("key", p.key).maybeSingle();
    let projectId = existing?.id as string | undefined;

    if (!projectId) {
      const { data, error } = await supabase
        .from("projects")
        .insert({ name: p.name, key: p.key, code: p.key, description: p.description, color: p.color, owner_id: ownerId, status: "active" })
        .select("id").single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      projectId = data.id;
    }

    // Members
    const members = [ownerId, ...[...userIds].sort(() => Math.random() - 0.5).filter((id) => id !== ownerId).slice(0, 4 + randN(3))];
    for (const uid of members) {
      await supabase.from("project_members").upsert(
        { project_id: projectId, user_id: uid, role: uid === ownerId ? "owner" : rand(["admin", "member", "member", "viewer"]) },
        { onConflict: "project_id,user_id" }
      );
    }

    // Sprint
    let sprintId: string;
    const { data: existingSprint } = await supabase.from("sprints").select("id").eq("project_id", projectId).limit(1).maybeSingle();
    if (existingSprint?.id) {
      sprintId = existingSprint.id;
    } else {
      const { data: sprint, error: sprintErr } = await supabase
        .from("sprints")
        .insert({
          project_id: projectId, name: "Sprint 1", goal: "Ship the next milestone", status: "active",
          start_date: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
          end_date:   new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        })
        .select("id").single();
      if (sprintErr) return NextResponse.json({ error: sprintErr.message }, { status: 500 });
      sprintId = sprint.id;
    }

    // Issues
    const { count } = await supabase.from("issues").select("id", { count: "exact", head: true }).eq("project_id", projectId);
    if (!count) {
      const rows: object[] = [];
      let n = 1;
      for (const status of STATUSES) {
        const cnt = status === "Cancelled" ? 1 + randN(2) : 3 + randN(3);
        for (let i = 0; i < cnt; i++) {
          const daysOffset = randN(30) - 10;
          const due = new Date(Date.now() + daysOffset * 86400000).toISOString().slice(0, 10);
          rows.push({
            project_id: projectId, sprint_id: sprintId,
            title: rand(ISSUE_TITLES), description: "",
            status, priority: rand(PRIORITIES), type: rand(TYPES),
            points: rand([1, 2, 3, 5, 8]),
            due_date: due,
            assignee_id: rand(members), reporter_id: rand(members),
            code: `${p.key}-${n++}`,
          });
        }
      }
      const { data: inserted, error: issueErr } = await supabase.from("issues").insert(rows).select("id, assignee_id");
      if (issueErr) return NextResponse.json({ error: issueErr.message }, { status: 500 });
      const junctionRows = (inserted ?? []).filter((i) => i.assignee_id).map((i) => ({ issue_id: i.id, user_id: i.assignee_id }));
      if (junctionRows.length) await supabase.from("issue_assignees").insert(junctionRows);
      log.push(`  ✓ ${p.name} — ${rows.length} issues`);
    } else {
      log.push(`  ✓ ${p.name} — skipped (already has ${count} issues)`);
    }
  }

  return NextResponse.json({ ok: true, log });
}
