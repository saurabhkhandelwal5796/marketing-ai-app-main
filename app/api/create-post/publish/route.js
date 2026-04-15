import { NextResponse } from "next/server";
import { getSessionFromCookies } from "../../../../lib/authSession";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";

async function publishToLinkedIn({ accessToken, authorUrn, text }) {
  const payload = {
    author: authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: {
          text,
        },
        shareMediaCategory: "NONE",
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(payload),
  });
  const textBody = await res.text();
  if (!res.ok) {
    throw new Error(`LinkedIn post failed (${res.status}): ${textBody || "unknown error"}`);
  }
}

export async function POST(req) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const mode = String(body?.mode || "post_now");
    const selectedTypes = Array.isArray(body?.selectedTypes) ? body.selectedTypes.filter(Boolean) : [];
    if (selectedTypes.length === 0) {
      return NextResponse.json({ error: "No content types selected." }, { status: 400 });
    }

    if (mode === "post_linkedin") {
      const supabase = getSupabaseServerClient();
      const { data: userData, error: userErr } = await supabase
        .from("users")
        .select("linkedin_access_token,linkedin_member_urn,linkedin_token_expires_at")
        .eq("id", session.id)
        .maybeSingle();
      if (userErr) throw new Error(userErr.message);

      const connected = !!(userData?.linkedin_access_token && userData?.linkedin_member_urn);
      const expiresAt = userData?.linkedin_token_expires_at ? new Date(userData.linkedin_token_expires_at).getTime() : 0;
      const expired = !!(expiresAt && Date.now() >= expiresAt);
      if (!connected || expired) {
        return NextResponse.json(
          {
            error: "LinkedIn account is not connected.",
            connectRequired: true,
            connectUrl: "/api/linkedin/connect",
          },
          { status: 428 }
        );
      }

      const postText = String(body?.contentByType?.linkedin_post?.content || "").trim();
      if (!postText) return NextResponse.json({ error: "LinkedIn content is empty." }, { status: 400 });

      await publishToLinkedIn({
        accessToken: userData.linkedin_access_token,
        authorUrn: userData.linkedin_member_urn,
        text: postText,
      });

      return NextResponse.json({
        ok: true,
        message: "Posted on LinkedIn successfully.",
        meta: { by: session.email, types: selectedTypes },
      });
    }

    const actionLabel =
      mode === "send_all"
        ? "Emails sent successfully."
        : mode === "post_linkedin"
          ? "LinkedIn post sent to queue."
          : mode === "post_instagram"
            ? "Instagram post sent to queue."
            : mode === "schedule"
              ? "Scheduled successfully."
              : mode === "save_draft"
                ? "Saved as draft."
                : "Posted successfully.";

    return NextResponse.json({
      ok: true,
      message: actionLabel,
      meta: {
        by: session.email,
        types: selectedTypes,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to process publish action." }, { status: 500 });
  }
}
