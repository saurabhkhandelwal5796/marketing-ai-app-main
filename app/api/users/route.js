import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabaseServer";

function initialsFromName(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : "";
  return (first + last).toUpperCase();
}

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("users")
      .select("id,name,email,role,avatar,created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return NextResponse.json({ users: data || [] });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to fetch users." }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const supabase = getSupabaseServerClient();
    const body = await req.json();
    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim();
    const role = body?.role ? String(body.role).trim() : null;
    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
    }

    const avatar = initialsFromName(name);
    const { data, error } = await supabase
      .from("users")
      .insert([{ name, email, role, avatar }])
      .select("id,name,email,role,avatar,created_at")
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ user: data });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to create user." }, { status: 500 });
  }
}

