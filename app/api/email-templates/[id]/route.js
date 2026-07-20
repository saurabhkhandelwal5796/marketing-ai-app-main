import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";
import { getSessionFromCookies } from "../../../../lib/authSession";

function normalizeCaseStudies(input) {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => ({
      name: String(item?.name || "").trim(),
      type: String(item?.type || "").trim(),
      size: Number(item?.size || 0),
      dataUrl: String(item?.dataUrl || "").trim(),
    }))
    .filter((item) => item.name && item.dataUrl);
}

export async function GET(_req, { params }) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing template id." }, { status: 400 });

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("email_templates")
      .select("id,name,subject,body,case_studies,created_at")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return NextResponse.json({ error: "Template not found." }, { status: 404 });
    return NextResponse.json({ template: data });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to fetch template." }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing template id." }, { status: 400 });

    const body = await req.json();
    const patch = {};
    if (typeof body?.name === "string" && body.name.trim()) patch.name = body.name.trim();
    if (typeof body?.subject === "string" && body.subject.trim()) patch.subject = body.subject.trim();
    if (typeof body?.body === "string" && body.body.trim()) patch.body = body.body.trim();
    if (Array.isArray(body?.case_studies)) patch.case_studies = normalizeCaseStudies(body.case_studies);
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("email_templates")
      .update(patch)
      .eq("id", id)
      .select("id,name,subject,body,case_studies,created_at")
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ template: data });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to update template." }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing template id." }, { status: 400 });

    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from("email_templates").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to delete template." }, { status: 500 });
  }
}
