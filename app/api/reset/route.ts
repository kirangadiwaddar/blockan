import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  // Require authenticated session
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // In production also require the seed secret header
  const isProduction = process.env.NODE_ENV === "production";
  const seedSecret = process.env.SEED_SECRET;
  const authHeader = request.headers.get("x-seed-secret");
  if (isProduction && (!seedSecret || authHeader !== seedSecret)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Missing credentials" }, { status: 500 });

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Delete all table data in dependency order (children before parents)
  const tables = [
    "issue_assignees",
    "issue_activity",
    "notifications",
    "comments",
    "project_labels",
    "issues",
    "sprints",
    "project_members",
    "projects",
    "profiles",
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) return NextResponse.json({ error: `Failed to clear ${table}: ${error.message}` }, { status: 500 });
  }

  // Delete all auth users except the current user
  const { data: userList } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const others = (userList?.users ?? []).filter((u) => u.id !== user.id);
  for (const u of others) {
    await supabase.auth.admin.deleteUser(u.id);
  }

  // Delete the current user last (they'll be signed out)
  await supabase.auth.admin.deleteUser(user.id);

  return NextResponse.json({ ok: true });
}
