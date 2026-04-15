import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabaseServer";
import { getSessionFromCookies } from "../../../lib/authSession";
import { hashPassword } from "../../../lib/passwords";

function initialsFromName(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : "";
  return (first + last).toUpperCase();
}

export async function GET(req) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = String(searchParams.get("search") || "").trim();
    const role = String(searchParams.get("role") || "all").trim();
    const status = String(searchParams.get("status") || "all").trim();
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") || "10")));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const supabase = getSupabaseServerClient();
    let query = supabase
      .from("users")
      .select("id,name,email,role,avatar,is_admin,created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (!session.is_admin) query = query.eq("id", session.id);
    if (role === "Admin") query = query.eq("is_admin", true);
    if (role === "User") query = query.eq("is_admin", false);
    if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    const { data, error, count } = await query;
    if (error) throw new Error(error.message);
    const users = (data || []).map((u) => ({ ...u, status: u.status || "Active" }));
    if (status !== "all") {
      return NextResponse.json({
        users: users.filter((u) => u.status === status),
        pagination: { page, pageSize, total: users.filter((u) => u.status === status).length },
      });
    }
    return NextResponse.json({ users, pagination: { page, pageSize, total: count ?? 0 } });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to fetch users." }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    if (!session.is_admin) return NextResponse.json({ error: "Admin only action." }, { status: 403 });

    const supabase = getSupabaseServerClient();
    const body = await req.json();
    const name = String(body?.name || "").trim();
    const email = String(body?.email || "")
      .trim()
      .toLowerCase();
    const role = body?.role ? String(body.role).trim() : "User";
    const status = body?.status === "Inactive" ? "Inactive" : "Active";
    const password = String(body?.password || "").trim();
    const isAdmin = role === "Admin";
    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: "Password is required." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const avatar = initialsFromName(name);
    const passwordHash = await hashPassword(password);
    const { data, error } = await supabase
      .from("users")
      .insert([{ name, email, role, avatar, password: passwordHash, is_admin: isAdmin, status }])
      .select("id,name,email,role,avatar,is_admin,created_at")
      .single();
    if (error && String(error.message || "").includes("status")) {
      const fallback = await supabase
        .from("users")
        .insert([{ name, email, role, avatar, password: passwordHash, is_admin: isAdmin }])
        .select("id,name,email,role,avatar,is_admin,created_at")
        .single();
      if (fallback.error) throw new Error(fallback.error.message);
      return NextResponse.json({ user: { ...fallback.data, status } });
    }
    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Email already exists." }, { status: 409 });
      }
      throw new Error(error.message);
    }
    return NextResponse.json({ user: data });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to create user." }, { status: 500 });
  }
}

