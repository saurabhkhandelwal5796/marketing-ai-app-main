import { getSessionFromCookies } from "../../../lib/authSession";
import { checkAndRefreshGoogleToken } from "../../../lib/googleIntegration";

function extractBase64AndMime(dataUrlInput, defaultType = "application/octet-stream") {
  if (!dataUrlInput || typeof dataUrlInput !== "string") {
    return { mimeType: defaultType, base64Data: "" };
  }

  let str = dataUrlInput.trim();
  let mimeType = defaultType;
  let base64Data = "";

  if (str.startsWith("data:")) {
    const commaIdx = str.indexOf(",");
    if (commaIdx !== -1) {
      const headerPart = str.substring(0, commaIdx);
      base64Data = str.substring(commaIdx + 1).replace(/\s/g, "");

      const mimeMatch = headerPart.match(/^data:([^;]+)/);
      if (mimeMatch && mimeMatch[1]) {
        mimeType = mimeMatch[1];
      }
    } else {
      base64Data = str.replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "");
    }
  } else {
    base64Data = str.replace(/\s/g, "");
  }

  return { mimeType, base64Data };
}

async function resolveAttachments(attachments = []) {
  const resolved = [];
  for (const att of attachments) {
    if (!att || !att.name) continue;
    let dataUrl = att.dataUrl;
    let mimeType = att.type || "application/octet-stream";

    // If dataUrl is missing but we have a storage URL, fetch it server-side
    if (!dataUrl && att.url) {
      try {
        const res = await fetch(att.url);
        if (res.ok) {
          const arrayBuf = await res.arrayBuffer();
          const buffer = Buffer.from(arrayBuf);
          const fetchedMime = res.headers.get("content-type") || mimeType;
          dataUrl = `data:${fetchedMime};base64,${buffer.toString("base64")}`;
          mimeType = fetchedMime;
        }
      } catch (e) {
        console.warn(`Failed to fetch attachment from URL ${att.url}:`, e);
      }
    }

    if (dataUrl) {
      resolved.push({
        name: att.name,
        type: mimeType,
        size: att.size,
        dataUrl
      });
    }
  }
  return resolved;
}

function buildRawEmail({ to, cc, bcc, subject, body, attachments = [] }) {
  const sanitize = (str) => String(str || "").replace(/[\r\n]/g, " ").trim();
  const textBody = String(body || "").trim();
  const safeTextBody = textBody || "(No message text provided)";

  const htmlBody = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family: sans-serif; font-size: 14px; color: #111827; line-height: 1.6; padding: 10px;"><div>${safeTextBody.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')}</div></body></html>`;

  const base64Text = Buffer.from(safeTextBody, "utf-8").toString("base64").replace(/(.{76})/g, "$1\r\n");
  const base64Html = Buffer.from(htmlBody, "utf-8").toString("base64").replace(/(.{76})/g, "$1\r\n");

  if (!attachments || attachments.length === 0) {
    const boundary = `----=_Part_Alt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const headers = [];
    if (to) headers.push(`To: ${sanitize(to)}`);
    if (cc) headers.push(`Cc: ${sanitize(cc)}`);
    if (bcc) headers.push(`Bcc: ${sanitize(bcc)}`);
    headers.push(`Subject: ${sanitize(subject)}`);
    headers.push("MIME-Version: 1.0");
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);

    let msg = headers.join("\r\n") + "\r\n\r\n";

    msg += `--${boundary}\r\n`;
    msg += 'Content-Type: text/plain; charset="UTF-8"\r\n';
    msg += "Content-Transfer-Encoding: base64\r\n\r\n";
    msg += base64Text + "\r\n\r\n";

    msg += `--${boundary}\r\n`;
    msg += 'Content-Type: text/html; charset="UTF-8"\r\n';
    msg += "Content-Transfer-Encoding: base64\r\n\r\n";
    msg += base64Html + "\r\n\r\n";

    msg += `--${boundary}--\r\n`;

    return Buffer.from(msg, "utf-8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  const mixedBoundary = `----=_Part_Mixed_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const altBoundary = `----=_Part_Alt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  const headers = [];
  if (to) headers.push(`To: ${sanitize(to)}`);
  if (cc) headers.push(`Cc: ${sanitize(cc)}`);
  if (bcc) headers.push(`Bcc: ${sanitize(bcc)}`);
  headers.push(`Subject: ${sanitize(subject)}`);
  headers.push("MIME-Version: 1.0");
  headers.push(`Content-Type: multipart/mixed; boundary="${mixedBoundary}"`);

  let msg = headers.join("\r\n") + "\r\n\r\n";

  msg += `--${mixedBoundary}\r\n`;
  msg += `Content-Type: multipart/alternative; boundary="${altBoundary}"\r\n\r\n`;

  msg += `--${altBoundary}\r\n`;
  msg += 'Content-Type: text/plain; charset="UTF-8"\r\n';
  msg += "Content-Transfer-Encoding: base64\r\n\r\n";
  msg += base64Text + "\r\n\r\n";

  msg += `--${altBoundary}\r\n`;
  msg += 'Content-Type: text/html; charset="UTF-8"\r\n';
  msg += "Content-Transfer-Encoding: base64\r\n\r\n";
  msg += base64Html + "\r\n\r\n";

  msg += `--${altBoundary}--\r\n\r\n`;

  for (const att of attachments) {
    if (!att || !att.name) continue;

    const { mimeType, base64Data } = extractBase64AndMime(att.dataUrl, att.type);
    if (!base64Data) continue;

    const safeFileName = sanitize(att.name);
    const chunkedBase64 = base64Data.replace(/(.{76})/g, "$1\r\n");

    msg += `--${mixedBoundary}\r\n`;
    msg += `Content-Type: ${mimeType}; name="${safeFileName}"\r\n`;
    msg += `Content-Disposition: attachment; filename="${safeFileName}"\r\n`;
    msg += "Content-Transfer-Encoding: base64\r\n\r\n";
    msg += chunkedBase64 + "\r\n\r\n";
  }

  msg += `--${mixedBoundary}--\r\n`;

  return Buffer.from(msg, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
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
    const { to, cc, bcc, subject, body, attachments = [] } = bodyParams;

    const resolvedAtts = await resolveAttachments(attachments);
    const raw = buildRawEmail({ to, cc, bcc, subject, body, attachments: resolvedAtts });

    console.log(`SENDING EMAIL TO: ${to} (Body length: ${(body || "").length}, Attachments: ${resolvedAtts.length})`);

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
