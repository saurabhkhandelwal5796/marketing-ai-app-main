import { NextResponse } from "next/server";
import { getSessionFromCookies } from "../../../../lib/authSession";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";

export async function GET(req) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";
    const platform = url.searchParams.get("platform") || "";
    const status = url.searchParams.get("status") || "";
    const sortBy = url.searchParams.get("sortBy") || "created_at";
    const sortOrder = url.searchParams.get("sortOrder") || "desc";
    const all = url.searchParams.get("all") === "true";
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "10", 10);

    const supabase = getSupabaseServerClient();

    let query = supabase
      .from("create_post_history")
      .select("*", { count: "exact" })
      .eq("user_id", session.id);

    // Apply Filters
    if (platform) {
      query = query.eq("platform", platform);
    }
    if (status) {
      query = query.eq("status", status);
    }
    if (search) {
      query = query.or(`content.ilike.%${search}%,subject.ilike.%${search}%,platform.ilike.%${search}%`);
    }

    // Apply Sorting
    const isAscending = sortOrder === "asc";
    query = query.order(sortBy, { ascending: isAscending });

    // Apply Pagination if not loading all
    if (!all) {
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
    }

    const { data, count, error } = await query;

    console.log("Logged User ID:", session.id);
    console.log("Records Retrieved:", data ? data.length : 0);
    console.log("Supabase Query Result:", JSON.stringify(data || []));

    if (error) {
      console.warn("create_post_history select failed, table might not exist yet:", error.message);
      return NextResponse.json({ records: [], totalCount: 0 });
    }

    return NextResponse.json({
      records: data || [],
      totalCount: count != null ? count : (data ? data.length : 0),
      page,
      limit
    });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to fetch history." }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const {
      id,
      type,
      platform,
      content,
      subject,
      status,
      recipient,
      recipient_name,
      company,
      sent_via
    } = body;

    if (!platform) {
      return NextResponse.json({ error: "Platform is required." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    const row = {
      user_id: session.id,
      type: type || null,
      platform,
      content: content || "",
      subject: subject || "",
      status: status || "Draft",
      recipient: recipient || null,
      recipient_name: recipient_name || null,
      company: company || null,
      sent_via: sent_via || null,
      updated_at: new Date().toISOString()
    };

    let result = null;

    // Check if ID is a valid database UUID
    const isDbUuid = id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    if (isDbUuid) {
      const { data, error } = await supabase
        .from("create_post_history")
        .update(row)
        .eq("id", id)
        .eq("user_id", session.id)
        .select()
        .maybeSingle();

      if (error) throw new Error(error.message);
      result = data;
    } else {
      row.created_at = new Date().toISOString();
      
      const { data, error } = await supabase
        .from("create_post_history")
        .insert(row)
        .select()
        .maybeSingle();

      if (error) throw new Error(error.message);
      result = data;
    }

    return NextResponse.json({ success: true, record: result });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to save history record." }, { status: 500 });
  }
}

