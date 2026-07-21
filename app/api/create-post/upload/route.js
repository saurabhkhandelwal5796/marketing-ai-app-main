import { NextResponse } from "next/server";
import { getSessionFromCookies } from "../../../../lib/authSession";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";

export async function POST(req) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file");
    if (!file) return NextResponse.json({ error: "No file uploaded." }, { status: 400 });

    // Validate size (up to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File exceeds 10 MB limit." }, { status: 400 });
    }

    // Validate extension
    const allowedExtensions = [".pdf", ".docx", ".xlsx", ".jpg", ".jpeg", ".png", ".csv"];
    const dotIndex = file.name.lastIndexOf(".");
    const ext = dotIndex !== -1 ? file.name.slice(dotIndex).toLowerCase() : "";
    if (!allowedExtensions.includes(ext)) {
      return NextResponse.json({ error: "Unsupported file format." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    
    // Unique file name to avoid collisions
    const fileKey = `${session.id}/${Date.now()}_${file.name}`;

    const { data, error } = await supabase.storage
      .from("attachments")
      .upload(fileKey, fileBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (error) {
      throw new Error(error.message);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("attachments")
      .getPublicUrl(fileKey);

    return NextResponse.json({
      success: true,
      name: file.name,
      size: file.size,
      url: urlData.publicUrl,
      fileKey,
    });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to upload file." }, { status: 500 });
  }
}
