import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";
import { getSessionFromCookies } from "../../../../lib/authSession";

export async function GET() {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("users")
      .select("id,name,email,is_admin,status")
      .order("name", { ascending: true })
      .limit(500);
    if (error) throw new Error(error.message);

    return NextResponse.json({
      users: (data || []).filter((user) => (user?.status || "Active") === "Active"),
    });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to fetch meeting users." }, { status: 500 });
  }
}
