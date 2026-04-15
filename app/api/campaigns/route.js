import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabaseServer";

const DEFAULT_MARKETING_PLAN = [
  {
    id: "step-1",
    title: "Step 1: Define Target Audience",
    description:
      "Identify ideal candidate persona, industry segments, and role seniority. Prioritize audience quality to improve conversion from impression to application.",
    channels: ["LinkedIn", "Email"],
  },
  {
    id: "step-2",
    title: "Step 2: Build Content Strategy",
    description:
      "Create channel-specific messaging pillars like salary transparency, growth path, and project exposure. Keep content concise and role-focused.",
    channels: ["LinkedIn", "Instagram", "Blog", "Email"],
  },
  {
    id: "step-3",
    title: "Step 3: Execute Outreach",
    description:
      "Run outbound and inbound outreach through targeted shortlists and warm leads. Use personalized communication and clear call-to-action.",
    channels: ["Email", "WhatsApp", "Naukri"],
  },
  {
    id: "step-4",
    title: "Step 4: Retarget and Optimize",
    description:
      "Retarget engaged users with reminder touchpoints and proof points. Iterate weekly using response trends and channel-level performance.",
    channels: ["LinkedIn", "Instagram", "SMS"],
  },
];

const getDefaultChatMessage = () => [
  {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role: "assistant",
    content:
      "Share your campaign brief here. I will build a detailed marketing plan, suggest channels, and generate content.",
  },
];

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("campaigns")
      .select("id,name,company,goal,updated_at,last_activity_at")
      .order("last_activity_at", { ascending: false })
      .limit(300);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ campaigns: data || [] });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Failed to fetch campaigns." }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("campaigns")
      .insert([
        {
          name: body?.name || "Untitled Campaign",
          company: body?.company || "",
          goal: body?.goal || "",
          website: body?.website || "",
          attachment_name: body?.attachment_name || "",
          description: body?.description || "",
          chat_messages: getDefaultChatMessage(),
          marketing_plan: DEFAULT_MARKETING_PLAN,
          selected_step_ids: [],
          recommended_actions: [],
          selected_actions: [],
          outputs: {},
        },
      ])
      .select("id,name,company,goal,updated_at,last_activity_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, campaign: data });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Failed to create campaign." }, { status: 500 });
  }
}
