import { NextResponse } from "next/server";
import { getSessionFromCookies } from "../../../../lib/authSession";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";

export async function GET() {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const supabase = getSupabaseServerClient();
    
    // Fetch drafts defensively
    let data = [];
    try {
      const { data: dbData, error } = await supabase
        .from("drafts")
        .select("*")
        .eq("user_id", session.id)
        .order("updated_at", { ascending: false });

      if (error) {
        console.warn("drafts table select failed, might not be created yet:", error.message);
      } else if (dbData) {
        data = dbData;
      }
    } catch (e) {
      console.warn("drafts table select failed defensively:", e);
    }

    const formattedDrafts = data.map(d => ({
      id: d.id,
      name: d.name,
      typeId: d.type_id,
      typeLabel: d.type_label,
      subject: d.subject || "",
      content: d.content || "",
      imageUrl: d.image_url || "",
      attachments: d.attachments || [],
      toAddress: d.to_address || "",
      ccAddress: d.cc_address || "",
      bccAddress: d.bcc_address || "",
      emailList: d.email_list || [],
      createdAt: d.created_at,
      lastModified: d.updated_at,
      createdBy: d.created_by || "",
      status: d.status || "Draft",
      favorite: !!d.favorite
    }));

    return NextResponse.json({ drafts: formattedDrafts });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to fetch drafts." }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const {
      id,
      name,
      typeId,
      typeLabel,
      subject,
      content,
      imageUrl,
      attachments,
      toAddress,
      ccAddress,
      bccAddress,
      emailList,
      status,
      favorite
    } = body;

    if (!name || !typeId) {
      return NextResponse.json({ error: "Name and Type ID are required." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    
    const row = {
      user_id: session.id,
      name,
      type_id: typeId,
      type_label: typeLabel || typeId,
      subject: subject || "",
      content: content || "",
      image_url: imageUrl || "",
      attachments: attachments || [],
      to_address: toAddress || "",
      cc_address: ccAddress || "",
      bcc_address: bccAddress || "",
      email_list: emailList || [],
      status: status || "Draft",
      favorite: !!favorite,
      updated_at: new Date().toISOString()
    };

    let result = null;

    // Check if ID is a valid database UUID (i.e. not a temporary client ID like "draft-1234")
    const isDbUuid = id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    if (isDbUuid) {
      const { data: dbData, error } = await supabase
        .from("drafts")
        .update(row)
        .eq("id", id)
        .eq("user_id", session.id)
        .select()
        .maybeSingle();

      if (error) throw new Error(error.message);
      result = dbData;
    } else {
      row.created_at = new Date().toISOString();
      row.created_by = session.name || session.email;
      
      const { data: dbData, error } = await supabase
        .from("drafts")
        .insert(row)
        .select()
        .maybeSingle();

      if (error) throw new Error(error.message);
      result = dbData;
    }

    const formattedDraft = result ? {
      id: result.id,
      name: result.name,
      typeId: result.type_id,
      typeLabel: result.type_label,
      subject: result.subject || "",
      content: result.content || "",
      imageUrl: result.image_url || "",
      attachments: result.attachments || [],
      toAddress: result.to_address || "",
      ccAddress: result.cc_address || "",
      bccAddress: result.bcc_address || "",
      emailList: result.email_list || [],
      createdAt: result.created_at,
      lastModified: result.updated_at,
      createdBy: result.created_by || "",
      status: result.status || "Draft",
      favorite: !!result.favorite
    } : null;

    return NextResponse.json({ success: true, draft: formattedDraft });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to save draft." }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID is required." }, { status: 400 });

    const supabase = getSupabaseServerClient();
    const { error } = await supabase
      .from("drafts")
      .delete()
      .eq("id", id)
      .eq("user_id", session.id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to delete draft." }, { status: 500 });
  }
}
