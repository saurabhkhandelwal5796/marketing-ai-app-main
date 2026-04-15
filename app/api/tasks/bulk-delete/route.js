import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";

export async function POST(req) {
  try {
    const supabase = getSupabaseServerClient();
    const body = await req.json();
    const idsRaw = body?.ids;

    if (!Array.isArray(idsRaw)) {
      return NextResponse.json({ error: "ids must be an array." }, { status: 400 });
    }

    const ids = Array.from(
      new Set(
        idsRaw
          .map((x) => (typeof x === "string" ? x.trim() : ""))
          .filter((x) => x.length > 0)
      )
    );

    if (ids.length === 0) {
      return NextResponse.json({ error: "No valid task ids provided." }, { status: 400 });
    }

    // Guardrail to avoid accidentally deleting too much at once
    if (ids.length > 500) {
      return NextResponse.json({ error: "Too many task ids (max 500)." }, { status: 400 });
    }

    const { error } = await supabase.from("tasks").delete().in("id", ids);
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, deletedCount: ids.length });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to delete tasks." }, { status: 500 });
  }
}

