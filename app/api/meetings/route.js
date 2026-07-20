import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabaseServer";
import { getSessionFromCookies } from "../../../lib/authSession";

function normalizeMeetingPayload(payload, currentUserId) {
  const title = String(payload?.title || "").trim();
  const description = String(payload?.description || "").trim();
  const startTime = payload?.start_time ? new Date(payload.start_time) : null;
  const endTime = payload?.end_time ? new Date(payload.end_time) : null;
  const meetingType = payload?.meeting_type === "Offline" ? "Offline" : "Online";
  const location = String(payload?.location || "").trim();
  const attendees = Array.isArray(payload?.attendees)
    ? [...new Set(payload.attendees.map((id) => String(id || "").trim()).filter(Boolean))]
    : [];
  const externalAttendees = Array.isArray(payload?.external_attendees)
    ? [...new Set(payload.external_attendees.map((email) => String(email || "").trim().toLowerCase()).filter(Boolean))]
    : [];

  if (currentUserId && !attendees.includes(currentUserId)) attendees.push(currentUserId);

  if (!title) return { error: "Title is required." };
  if (!startTime || Number.isNaN(startTime.getTime())) return { error: "Start date & time is required." };
  if (!endTime || Number.isNaN(endTime.getTime())) return { error: "End date & time is required." };
  if (endTime <= startTime) return { error: "End time must be after start time." };
  if ((meetingType === "Online" || meetingType === "Offline") && !location) {
    return { error: meetingType === "Online" ? "Meeting link is required for online meetings." : "Location is required for offline meetings." };
  }

  return {
    value: {
      title,
      description: description || null,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      attendees,
      external_attendees: externalAttendees,
      meeting_type: meetingType,
      location,
    },
  };
}

function applyScope(query, session) {
  if (session?.is_admin) return query;
  const userId = String(session?.id || "").replace(/"/g, "");
  const userEmail = String(session?.email || "")
    .trim()
    .toLowerCase()
    .replace(/"/g, "");
  const filters = [`created_by.eq.${userId}`, `attendees.cs.{"${userId}"}`];
  if (userEmail) filters.push(`external_attendees.cs.{"${userEmail}"}`);
  return query.or(filters.join(","));
}

export async function GET(req) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const from = String(searchParams.get("from") || "").trim();
    const to = String(searchParams.get("to") || "").trim();

    const supabase = getSupabaseServerClient();
    let query = supabase
      .from("meetings")
      .select("id,title,description,start_time,end_time,created_by,attendees,external_attendees,meeting_type,location,created_at")
      .order("start_time", { ascending: true });

    if (from) query = query.gte("start_time", from);
    if (to) query = query.lte("start_time", to);
    query = applyScope(query, session);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return NextResponse.json({ meetings: data || [] });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to fetch meetings." }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const normalized = normalizeMeetingPayload(body, session.id);
    if (normalized.error) return NextResponse.json({ error: normalized.error }, { status: 400 });

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("meetings")
      .insert([{ ...normalized.value, created_by: session.id }])
      .select("id,title,description,start_time,end_time,created_by,attendees,external_attendees,meeting_type,location,created_at")
      .single();
    if (error) throw new Error(error.message);

    return NextResponse.json({ meeting: data });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to create meeting." }, { status: 500 });
  }
}
