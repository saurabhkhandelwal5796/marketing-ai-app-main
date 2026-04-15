import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";
import { getSessionFromCookies } from "../../../../lib/authSession";

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

async function getMeetingById(id) {
  const supabase = getSupabaseServerClient();
  return supabase
    .from("meetings")
    .select("id,title,description,start_time,end_time,created_by,attendees,external_attendees,meeting_type,location,created_at")
    .eq("id", id)
    .maybeSingle();
}

function canManage(session, meeting) {
  return !!(session?.is_admin || meeting?.created_by === session?.id);
}

export async function PATCH(req, { params }) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Meeting id is required." }, { status: 400 });

    const existing = await getMeetingById(id);
    if (existing.error) throw new Error(existing.error.message);
    if (!existing.data) return NextResponse.json({ error: "Meeting not found." }, { status: 404 });
    if (!canManage(session, existing.data)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const normalized = normalizeMeetingPayload(body, existing.data.created_by || session.id);
    if (normalized.error) return NextResponse.json({ error: normalized.error }, { status: 400 });

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("meetings")
      .update(normalized.value)
      .eq("id", id)
      .select("id,title,description,start_time,end_time,created_by,attendees,external_attendees,meeting_type,location,created_at")
      .single();
    if (error) throw new Error(error.message);

    return NextResponse.json({ meeting: data });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to update meeting." }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Meeting id is required." }, { status: 400 });

    const existing = await getMeetingById(id);
    if (existing.error) throw new Error(existing.error.message);
    if (!existing.data) return NextResponse.json({ error: "Meeting not found." }, { status: 404 });
    if (!canManage(session, existing.data)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from("meetings").delete().eq("id", id);
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to delete meeting." }, { status: 500 });
  }
}
