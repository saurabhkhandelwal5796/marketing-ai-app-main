import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";

export async function DELETE(_req, { params }) {
  try {
    const supabase = getSupabaseServerClient();
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing user id." }, { status: 400 });

    const { error } = await supabase.from("users").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to delete user." }, { status: 500 });
  }
}

