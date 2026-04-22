import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";
import { getSessionFromCookies } from "../../../../lib/authSession";
import { hashPassword } from "../../../../lib/passwords";

export async function GET(_req, { params }) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing user id." }, { status: 400 });
    if (!session.is_admin && id !== session.id) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const supabase = getSupabaseServerClient();
    let { data, error } = await supabase
      .from("users")
      .select("id,name,email,role,avatar,is_admin,status,created_at")
      .eq("id", id)
      .maybeSingle();
    if (error && String(error.message || "").includes("status")) {
      const fallback = await supabase
        .from("users")
        .select("id,name,email,role,avatar,is_admin,status,created_at")
        .eq("id", id)
        .maybeSingle();
      data = fallback.data;
      error = fallback.error;
    }
    if (error) throw new Error(error.message);
    if (!data) return NextResponse.json({ error: "User not found." }, { status: 404 });
    return NextResponse.json({ user: { ...data, status: data.status || "Active" } });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to fetch user." }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    if (!session.is_admin) return NextResponse.json({ error: "Admin only action." }, { status: 403 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing user id." }, { status: 400 });
    const body = await req.json();

    const patch = {};
    if (typeof body?.name === "string" && body.name.trim()) patch.name = body.name.trim();
    if (typeof body?.email === "string" && body.email.trim()) patch.email = body.email.trim().toLowerCase();
    if (typeof body?.role === "string") {
      patch.role = body.role;
      patch.is_admin = body.role === "Admin";
    }
    if (typeof body?.status === "string") {
      const rawStatus = String(body.status || "").trim();
      const mappedStatus = rawStatus === "Inactive" ? "Rejected" : rawStatus;
      const allowed = new Set(["Pending", "Active", "Rejected"]);
      if (allowed.has(mappedStatus)) patch.status = mappedStatus;
    }
    if (typeof body?.password === "string" && body.password.trim()) {
      if (body.password.trim().length < 8) {
        return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
      }
      patch.password = await hashPassword(body.password.trim());
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("users")
      .update(patch)
      .eq("id", id)
      .select("id,name,email,role,avatar,is_admin,status,created_at")
      .single();
    if (error && String(error.message || "").includes("status")) {
      delete patch.status;
      const fallback = await supabase
        .from("users")
        .update(patch)
        .eq("id", id)
        .select("id,name,email,role,avatar,is_admin,status,created_at")
        .single();
      if (fallback.error) throw new Error(fallback.error.message);
      return NextResponse.json({ user: { ...fallback.data, status: body?.status || "Active" } });
    }
    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Email already exists." }, { status: 409 });
      }
      throw new Error(error.message);
    }
    return NextResponse.json({ user: { ...data, status: data.status || "Active" } });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to update user." }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    if (!session.is_admin) return NextResponse.json({ error: "Admin only action." }, { status: 403 });

    const supabase = getSupabaseServerClient();
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing user id." }, { status: 400 });
    if (id === session.id) {
      return NextResponse.json({ error: "Admin cannot delete self while logged in." }, { status: 400 });
    }

    const { error } = await supabase.from("users").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to delete user." }, { status: 500 });
  }
}

