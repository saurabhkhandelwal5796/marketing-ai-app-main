import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabaseServer";
import { getSessionFromCookies } from "../../../lib/authSession";

const SORT_FIELDS = new Set(["name", "created_at"]);

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

export async function GET(req) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = String(searchParams.get("search") || "").trim();
    const sortBy = SORT_FIELDS.has(String(searchParams.get("sortBy") || "")) ? String(searchParams.get("sortBy")) : "created_at";
    const sortOrder = String(searchParams.get("sortOrder") || "desc") === "asc" ? "asc" : "desc";
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") || "10")));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const supabase = getSupabaseServerClient();
    let query = supabase
      .from("email_templates")
      .select("id,name,subject,body,case_studies,created_at", { count: "exact" })
      .order(sortBy, { ascending: sortOrder === "asc" })
      .range(from, to);
    if (search) {
      query = query.or(`name.ilike.%${search}%,subject.ilike.%${search}%,body.ilike.%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);
    return NextResponse.json({
      templates: data || [],
      pagination: { page, pageSize, total: count || 0 },
    });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to fetch templates." }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const body = await req.json();
    const name = String(body?.name || "").trim();
    const subject = String(body?.subject || "").trim();
    const emailBody = String(body?.body || "").trim();
    const caseStudies = normalizeCaseStudies(body?.case_studies);
    if (!name || !subject || !emailBody) {
      return NextResponse.json({ error: "Template name, subject, and body are required." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("email_templates")
      .insert([{ name, subject, body: emailBody, case_studies: caseStudies }])
      .select("id,name,subject,body,case_studies,created_at")
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ template: data });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to create template." }, { status: 500 });
  }
}
