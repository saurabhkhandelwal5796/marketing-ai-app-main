import { NextResponse } from "next/server";
import { getSessionFromCookies } from "../../../../lib/authSession";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";
import { checkAndRefreshGoogleToken } from "../../../../lib/googleIntegration";

async function buildRawEmailWithAttachments({ to, cc, bcc, subject, body, attachments, supabase }) {
  const boundary = "AntigravityBoundary__" + Date.now().toString(16);
  const parts = [];

  if (to) parts.push(`To: ${to}`);
  if (cc) parts.push(`Cc: ${cc}`);
  if (bcc) parts.push(`Bcc: ${bcc}`);
  parts.push(`Subject: ${subject}`);
  parts.push("MIME-Version: 1.0");

  if (attachments && attachments.length > 0) {
    parts.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    parts.push("");
    parts.push(`--${boundary}`);
    parts.push('Content-Type: text/plain; charset="UTF-8"');
    parts.push("Content-Transfer-Encoding: 7bit");
    parts.push("");
    parts.push(body);

    for (const att of attachments) {
      if (!att.fileKey) continue;
      try {
        const { data: fileData, error } = await supabase.storage
          .from("attachments")
          .download(att.fileKey);

        if (!error && fileData) {
          const arrayBuffer = await fileData.arrayBuffer();
          const base64Content = Buffer.from(arrayBuffer).toString("base64");
          
          parts.push(`--${boundary}`);
          parts.push(`Content-Type: application/octet-stream; name="${att.name}"`);
          parts.push(`Content-Disposition: attachment; filename="${att.name}"`);
          parts.push("Content-Transfer-Encoding: base64");
          parts.push("");
          parts.push(base64Content);
        }
      } catch (err) {
        console.warn("Failed to download attachment for email:", att.name, err);
      }
    }
    parts.push(`--${boundary}--`);
  } else {
    parts.push('Content-Type: text/plain; charset="UTF-8"');
    parts.push("Content-Transfer-Encoding: 7bit");
    parts.push("");
    parts.push(body);
  }

  const emailStr = parts.join("\r\n");
  return Buffer.from(emailStr).toString("base64url");
}


async function refreshGoogleAccessToken(refreshToken) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  });
  const data = await res.json();
  if (!res.ok || !data?.access_token) {
    throw new Error(data?.error_description || "Failed to refresh Google access token");
  }
  return data.access_token;
}


async function getLinkedInUrn(accessToken) {
  // Try userInfo sub first
  try {
    const userInfoRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await userInfoRes.json();
    if (userInfoRes.ok && data?.sub) {
      return `urn:li:person:${data.sub}`;
    }
  } catch (e) {
    console.warn("LinkedIn userInfo call failed, trying /v2/me", e);
  }

  // Fallback to /v2/me
  const resMe = await fetch("https://api.linkedin.com/v2/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const dataMe = await resMe.json();
  if (!resMe.ok || !dataMe?.id) {
    throw new Error(dataMe?.error_message || "Failed to fetch LinkedIn profile ID.");
  }
  return `urn:li:person:${dataMe.id}`;
}

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
  
  if (!res.ok) {
    const textBody = await res.text();
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
    
    const supabase = getSupabaseServerClient();

    if (mode === "send_gmail_api") {
      let token = null;
      let conn = null;

      // Try reading from google_integrations first
      try {
        const integration = await checkAndRefreshGoogleToken(session.id);
        if (integration && integration.access_token && integration.status !== "Expired") {
          token = integration.access_token;
        }
      } catch (gErr) {
        console.warn("Failed to get token from google_integrations:", gErr);
      }

      // Fallback to connected_accounts if needed
      if (!token) {
        const { data } = await supabase
          .from("connected_accounts")
          .select("*")
          .eq("user_id", session.id)
          .eq("provider", "gmail")
          .eq("connected", true)
          .maybeSingle();
        conn = data;
        if (!conn || !conn.access_token) {
          return NextResponse.json({ error: "Gmail account is not connected." }, { status: 400 });
        }
        token = conn.access_token;
      }

      const sendEmailRequest = async (accessToken) => {
        const raw = await buildRawEmailWithAttachments({
          to: body.to || "",
          cc: body.cc || "",
          bcc: body.bcc || "",
          subject: body.subject || "",
          body: body.body || "",
          attachments: body.attachments || [],
          supabase
        });
        return fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ raw })
        });
      };

      let resSend = await sendEmailRequest(token);

      // Handle fallback token refresh if we used connected_accounts
      if (resSend.status === 401 && conn && conn.refresh_token) {
        try {
          token = await refreshGoogleAccessToken(conn.refresh_token);
          await supabase
            .from("connected_accounts")
            .update({ access_token: token, connected_at: new Date().toISOString() })
            .eq("id", conn.id);
          resSend = await sendEmailRequest(token);
        } catch (refreshErr) {
          console.error("Gmail refresh token error:", refreshErr);
        }
      }

      const campaignId = body.campaignId || `CAMP-GMAIL-${Date.now()}`;
      const sendStatus = resSend.ok ? "Sent" : "Failed";

      // Save email history to Supabase campaign_emails
      try {
        await supabase.from("campaign_emails").insert({
          user_id: session.id,
          campaign_id: campaignId,
          recipient_email: body.to || "",
          recipient_name: (body.to || "").split("@")[0],
          company: "",
          subject: body.subject || "",
          body: body.body || "",
          send_status: sendStatus,
        });
      } catch (dbErr) {
        console.warn("Failed to log campaign_emails history:", dbErr);
      }

      // Save to create_post_email_history table
      try {
        await supabase.from("create_post_email_history").insert({
          user_id: session.id,
          recipient: body.to || "",
          subject: body.subject || "",
          status: sendStatus,
          sent_via: "Automated Gmail",
          sent_timestamp: new Date().toISOString()
        });
      } catch (dbErr) {
        console.warn("Failed to log create_post_email_history:", dbErr);
      }

      if (!resSend.ok) {
        const errText = await resSend.text();
        throw new Error(`Gmail API send failed: ${errText}`);
      }


      return NextResponse.json({ success: true, message: "Email sent successfully via Gmail API." });
    }

    if (mode === "post_linkedin") {
      // Find connected LinkedIn account
      const { data: conn } = await supabase
        .from("connected_accounts")
        .select("access_token")
        .eq("user_id", session.id)
        .eq("provider", "linkedin")
        .eq("connected", true)
        .maybeSingle();

      let accessToken = conn?.access_token;
      let authorUrn = null;

      // Compatibility fallback to legacy users table
      if (!accessToken) {
        const { data: userData } = await supabase
          .from("users")
          .select("linkedin_access_token,linkedin_member_urn")
          .eq("id", session.id)
          .maybeSingle();
        accessToken = userData?.linkedin_access_token;
        authorUrn = userData?.linkedin_member_urn;
      }

      if (!accessToken) {
        return NextResponse.json(
          {
            error: "LinkedIn account is not connected.",
            connectRequired: true,
            connectUrl: "/api/integrations/connect?provider=linkedin",
          },
          { status: 428 }
        );
      }

      const postText = String(body?.contentByType?.linkedin_post?.content || "").trim();
      if (!postText) return NextResponse.json({ error: "LinkedIn content is empty." }, { status: 400 });

      // Fetch URN dynamically if missing
      if (!authorUrn) {
        authorUrn = await getLinkedInUrn(accessToken);
      }

      await publishToLinkedIn({
        accessToken,
        authorUrn,
        text: postText,
      });

      return NextResponse.json({
        ok: true,
        message: "Posted on LinkedIn successfully.",
        meta: { by: session.email, types: selectedTypes },
      });
    }

    if (mode === "post_facebook") {
      const { data: conn } = await supabase
        .from("connected_accounts")
        .select("access_token")
        .eq("user_id", session.id)
        .eq("provider", "facebook")
        .eq("connected", true)
        .maybeSingle();

      const accessToken = conn?.access_token;
      if (!accessToken) {
        return NextResponse.json(
          {
            error: "Facebook account is not connected.",
            connectRequired: true,
            connectUrl: "/api/integrations/connect?provider=facebook",
          },
          { status: 428 }
        );
      }

      const postText = String(body?.contentByType?.facebook_post?.content || "").trim();
      if (!postText) return NextResponse.json({ error: "Facebook content is empty." }, { status: 400 });

      const res = await fetch(`https://graph.facebook.com/v12.0/me/feed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: postText,
          access_token: accessToken
        })
      });
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData?.error?.message || "Facebook API call failed.");
      }

      return NextResponse.json({
        ok: true,
        message: "Posted on Facebook successfully.",
        meta: { by: session.email, types: selectedTypes },
      });
    }

    if (mode === "post_instagram") {
      const { data: conn } = await supabase
        .from("connected_accounts")
        .select("access_token")
        .eq("user_id", session.id)
        .eq("provider", "instagram")
        .eq("connected", true)
        .maybeSingle();

      const accessToken = conn?.access_token;
      if (!accessToken) {
        return NextResponse.json(
          {
            error: "Instagram account is not connected.",
            connectRequired: true,
            connectUrl: "/api/integrations/connect?provider=instagram",
          },
          { status: 428 }
        );
      }

      const postText = String(body?.contentByType?.instagram_post?.content || "").trim();
      if (!postText) return NextResponse.json({ error: "Instagram content is empty." }, { status: 400 });
      const imageUrl = String(body?.contentByType?.instagram_post?.imageUrl || "").trim();

      const meRes = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`);
      const meData = await meRes.json();
      if (!meRes.ok) {
        throw new Error(meData?.error?.message || meData?.error_message || "Instagram API identity check failed.");
      }

      const userId = meData.id;

      if (!imageUrl) {
        throw new Error("Instagram posts require a media image URL to publish via API.");
      }

      // 1. Create media container
      const containerRes = await fetch(`https://graph.facebook.com/v12.0/${userId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: imageUrl,
          caption: postText,
          access_token: accessToken
        })
      });
      const containerData = await containerRes.json();
      if (!containerRes.ok) {
        throw new Error(containerData?.error?.message || "Failed to create Instagram media container.");
      }

      const creationId = containerData.id;

      // 2. Publish container
      const publishRes = await fetch(`https://graph.facebook.com/v12.0/${userId}/media_publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: creationId,
          access_token: accessToken
        })
      });
      const publishData = await publishRes.json();
      if (!publishRes.ok) {
        throw new Error(publishData?.error?.message || "Failed to publish Instagram media container.");
      }

      return NextResponse.json({
        ok: true,
        message: "Posted on Instagram successfully.",
        meta: { by: session.email, types: selectedTypes },
      });
    }

    const actionLabel =
      mode === "send_all"
        ? "Emails sent successfully."
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
