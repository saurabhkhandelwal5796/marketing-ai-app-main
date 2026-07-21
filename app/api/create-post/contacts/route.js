import { NextResponse } from "next/server";
import { getSessionFromCookies } from "../../../../lib/authSession";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";

export async function GET() {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const supabase = getSupabaseServerClient();
    
    let contacts = [];
    try {
      const { data, error } = await supabase
        .from("create_post_contacts")
        .select("*")
        .eq("user_id", session.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        contacts = data;
      }
    } catch (e) {
      console.warn("create_post_contacts table select warning:", e);
    }

    return NextResponse.json({ contacts });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to fetch contacts." }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const supabase = getSupabaseServerClient();
    const body = await req.json();
    const { contacts } = body; // Array of { name, email, company, status }

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json({ error: "No contacts provided." }, { status: 400 });
    }

    // Enforce maximum batch size of 500
    const recordsToInsert = contacts.slice(0, 500).map(c => ({
      user_id: session.id,
      name: c.name || "",
      email: c.email || "",
      company: c.company || "",
      status: c.status || "valid",
      updated_at: new Date().toISOString()
    }));

    try {
      const { data, error } = await supabase
        .from("create_post_contacts")
        .upsert(recordsToInsert, { onConflict: "user_id, email", ignoreDuplicates: false })
        .select();

      if (error) {
        // If upsert with onConflict fails due to missing unique constraint, fall back to insert
        const { data: insertData, error: insertError } = await supabase
          .from("create_post_contacts")
          .insert(recordsToInsert)
          .select();

        if (insertError) {
          console.warn("create_post_contacts insert failed:", insertError.message);
        }
      }
    } catch (e) {
      console.warn("create_post_contacts write exception:", e);
    }

    return NextResponse.json({ success: true, count: recordsToInsert.length });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to save contacts." }, { status: 500 });
  }
}
