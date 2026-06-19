/**
 * Seeds the app with 5 full projects: real auth users (with photo avatars),
 * project members, sprints, and issues spread across every board column.
 *
 * Run with: node scripts/seed-dummy-data.mjs
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

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
  { name: "Atlas Mobile App",    key: "ATL", color: "avatar-orb-blue",    description: "Cross-platform mobile client rebuild." },
  { name: "Nova Design System",  key: "NOV", color: "avatar-orb-violet",  description: "Shared component library and tokens." },
  { name: "Orbit Billing",       key: "ORB", color: "avatar-orb-emerald", description: "Subscription billing and invoicing platform." },
  { name: "Pulse Analytics",     key: "PUL", color: "avatar-orb-amber",   description: "Realtime product analytics dashboards." },
  { name: "Forge API Gateway",   key: "FRG", color: "avatar-orb-rose",    description: "Internal API gateway and auth layer." },
];

const STATUSES = ["Todo", "In Progress", "In Review", "Completed", "Cancelled"];
const PRIORITIES = ["Critical", "High", "Medium", "Low", "No Priority"];
// DB check constraint allows Bug/Feature/Task/Improvement/Epic, but the
// IssueCard UI only has icons for Bug/Story/Task/Epic — stick to the safe intersection.
const TYPES = ["Bug", "Task", "Epic"];

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

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randN(n) { return Math.floor(Math.random() * n); }

async function ensureUser(person) {
  // Try to find existing user by email first
  const { data: existingList } = await supabase.auth.admin.listUsers({ perPage: 200 });
  const existing = existingList?.users?.find((u) => u.email === person.email);

  let userId;
  if (existing) {
    userId = existing.id;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: person.email,
      email_confirm: true,
      password: `Demo-${Math.random().toString(36).slice(2)}!1`,
      user_metadata: { full_name: person.name, avatar_url: person.img },
    });
    if (error) throw new Error(`createUser(${person.email}): ${error.message}`);
    userId = data.user.id;
  }

  // Make sure the profile row has the photo avatar (trigger may have left it null)
  const { error: profileErr } = await supabase
    .from("profiles")
    .upsert({ id: userId, full_name: person.name, avatar_url: person.img, email: person.email });
  if (profileErr) throw new Error(`profile upsert(${person.email}): ${profileErr.message}`);

  return userId;
}

async function main() {
  console.log("Seeding demo users...");
  const userIds = [];
  for (const person of PEOPLE) {
    const id = await ensureUser(person);
    userIds.push(id);
    console.log(`  ✓ ${person.name}`);
  }

  console.log("\nSeeding projects...");
  for (const p of PROJECTS) {
    const ownerId = rand(userIds);

    const { data: existingProject } = await supabase
      .from("projects")
      .select("id")
      .eq("key", p.key)
      .maybeSingle();

    let projectId = existingProject?.id;
    if (!projectId) {
      const { data: project, error } = await supabase
        .from("projects")
        .insert({
          name: p.name,
          key: p.key,
          code: p.key,
          description: p.description,
          color: p.color,
          owner_id: ownerId,
          status: "active",
        })
        .select("id")
        .single();
      if (error) throw new Error(`project insert(${p.key}): ${error.message}`);
      projectId = project.id;
    }
    console.log(`  ✓ ${p.name}`);

    // Members: owner + 4-6 random others
    const memberCount = 4 + randN(3);
    const shuffled = [...userIds].sort(() => Math.random() - 0.5);
    const members = [ownerId, ...shuffled.filter((id) => id !== ownerId).slice(0, memberCount)];

    for (const uid of members) {
      await supabase.from("project_members").upsert(
        { project_id: projectId, user_id: uid, role: uid === ownerId ? "owner" : rand(["admin", "member", "member", "viewer"]) },
        { onConflict: "project_id,user_id" }
      );
    }

    // A sprint to anchor issues
    const { data: existingSprint } = await supabase
      .from("sprints")
      .select("id")
      .eq("project_id", projectId)
      .limit(1)
      .maybeSingle();

    let sprintId = existingSprint?.id;
    if (!sprintId) {
      const { data: sprint, error: sprintErr } = await supabase
        .from("sprints")
        .insert({
          project_id: projectId,
          name: "Sprint 1",
          goal: "Ship the next milestone",
          status: "active",
          start_date: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
          end_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        })
        .select("id")
        .single();
      if (sprintErr) throw new Error(`sprint insert: ${sprintErr.message}`);
      sprintId = sprint.id;
    }

    // Skip seeding issues if this project already has some
    const { count } = await supabase
      .from("issues")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId);

    if (!count) {
      const issuesToInsert = [];
      let n = 1;
      for (const status of STATUSES) {
        const countForStatus = status === "Cancelled" ? 1 + randN(2) : 3 + randN(3);
        for (let i = 0; i < countForStatus; i++) {
          const reporter = rand(members);
          issuesToInsert.push({
            project_id: projectId,
            sprint_id: sprintId,
            title: rand(ISSUE_TITLES),
            description: "",
            status,
            priority: rand(PRIORITIES),
            type: rand(TYPES),
            points: rand([1, 2, 3, 5, 8]),
            assignee_id: rand(members),
            reporter_id: reporter,
            code: `${p.key}-${n++}`,
          });
        }
      }
      const { data: insertedIssues, error: issueErr } = await supabase
        .from("issues")
        .insert(issuesToInsert)
        .select("id, assignee_id");
      if (issueErr) throw new Error(`issue insert(${p.key}): ${issueErr.message}`);

      // Populate issue_assignees junction table to match the legacy assignee_id
      const junctionRows = insertedIssues
        .filter((i) => i.assignee_id)
        .map((i) => ({ issue_id: i.id, user_id: i.assignee_id }));
      if (junctionRows.length) {
        await supabase.from("issue_assignees").insert(junctionRows);
      }
      console.log(`    ${issuesToInsert.length} issues across all columns`);
    } else {
      console.log(`    skipped issues (already has ${count})`);
    }
  }

  console.log("\nDone. Refresh the app to see 5 fully-populated projects.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
