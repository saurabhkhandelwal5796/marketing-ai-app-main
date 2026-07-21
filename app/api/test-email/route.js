import { getSessionFromCookies } from "../../../lib/authSession";
import { checkAndRefreshGoogleToken } from "../../../lib/googleIntegration";

function buildRawEmail({ to, cc, bcc, subject, body }) {
  const parts = [];
  if (to) parts.push(`To: ${to}`);
  if (cc) parts.push(`Cc: ${cc}`);
  if (bcc) parts.push(`Bcc: ${bcc}`);
  parts.push(`Subject: ${subject}`);
  parts.push("MIME-Version: 1.0");
  parts.push('Content-Type: text/plain; charset="UTF-8"');
  parts.push("Content-Transfer-Encoding: 7bit");
  parts.push("");
  parts.push(body);
  
  const emailStr = parts.join("\r\n");
  return Buffer.from(emailStr).toString("base64url");
}

export async function POST(req) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return Response.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    const integration = await checkAndRefreshGoogleToken(session.id);
    if (!integration || !integration.access_token || integration.status === "Expired") {
      return Response.json({
        success: false,
        error: "Google account not connected.",
      });
    }

    const bodyParams = await req.json().catch(() => ({}));
    const { to, cc, bcc, subject, body } = bodyParams;

    const raw = buildRawEmail({ to, cc, bcc, subject, body });

    console.log("SENDING EMAIL TO:", to);

    const resSend = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${integration.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    });

    const data = await resSend.json();

    if (!resSend.ok) {
      console.error("Gmail messages send failed:", data);
      return Response.json({
        success: false,
        error: data?.error?.message || "Gmail API failed to send email.",
      });
    }

    return Response.json({
      success: true,
      gmailMessageId: data.id,
      threadId: data.threadId,
    });
  } catch (error) {
    console.error("test-email error:", error);
    return Response.json({
      success: false,
      error: error.message,
    });
  }
}
