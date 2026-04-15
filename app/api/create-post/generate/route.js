import { NextResponse } from "next/server";

const OPENAI_URL = "https://api.openai.com/v1/responses";

function humanizeType(typeId) {
  const map = {
    linkedin_post: "LinkedIn",
    instagram_post: "Instagram",
    email_campaign: "Email",
    newsletter: "Newsletter",
    ad_copy: "Ad Copy",
    blog_post: "Blog",
    whatsapp_message: "WhatsApp",
  };
  return map[typeId] || "Content";
}

function fallbackContent(typeId, prompt) {
  const label = humanizeType(typeId);
  return {
    typeId,
    typeLabel: label,
    main: `${label} draft based on: ${prompt}`,
    variants: [
      `${label} variation 1: ${prompt}`,
      `${label} variation 2: ${prompt}`,
      `${label} variation 3: ${prompt}`,
    ],
    hashtags: typeId.includes("post") ? ["#Marketing", "#AI"] : [],
    cta: "Reply to continue.",
    subject: typeId === "email_campaign" || typeId === "newsletter" ? `${label} update` : "",
  };
}

function extractText(data) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) return data.output_text;
  const outputs = Array.isArray(data?.output) ? data.output : [];
  const chunks = [];
  for (const out of outputs) {
    const content = Array.isArray(out?.content) ? out.content : [];
    for (const item of content) {
      if (typeof item?.text === "string") chunks.push(item.text);
      if (typeof item?.output_text === "string") chunks.push(item.output_text);
    }
  }
  return chunks.join("\n").trim();
}

function parseJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function generateForType(apiKey, typeId, prompt) {
  const platform = humanizeType(typeId);
  const isEmailType = typeId === "email_campaign" || typeId === "newsletter";
  const channelRules = isEmailType
    ? `Email-specific requirements:
- main must be a REAL email body with greeting, context, value proposition, clear CTA, and sign-off.
- Tone should be professional and human.
- subject must be meaningful and non-empty.
- hashtags must be [] for email.`
    : `Post-specific requirements:
- main must be post-ready for ${platform}.
- subject must be an empty string.
- Keep tone native to the selected platform.`;
  const payloadPrompt = `Return ONLY valid JSON:
{
  "main": "string",
  "variants": ["string","string","string"],
  "hashtags": ["string","string"],
  "cta": "string",
  "subject": "string"
}

Create ${platform} marketing content for this requirement:
${prompt}

Rules:
- Write high quality, prompt-specific, practical copy.
- variants must be 3 meaningful alternatives.
- hashtags should be empty [] for email/newsletter.
- subject required only for email/newsletter, otherwise empty string.
- Keep language clear and publish-ready.
${channelRules}`;

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: [{ role: "user", content: payloadPrompt }],
      text: { format: { type: "text" } },
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "OpenAI generation failed.");
  const parsed = parseJson(extractText(data));
  if (!parsed?.main) throw new Error("AI returned invalid format.");
  return {
    typeId,
    typeLabel: humanizeType(typeId),
    main: String(parsed.main || ""),
    variants: Array.isArray(parsed.variants) ? parsed.variants.map((v) => String(v || "")).filter(Boolean).slice(0, 3) : [],
    hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.map((v) => String(v || "")).filter(Boolean).slice(0, 8) : [],
    cta: String(parsed.cta || ""),
    subject: String(parsed.subject || ""),
  };
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const prompt = String(body?.input || "").trim();
    const selectedTypes = Array.isArray(body?.selectedTypes) ? body.selectedTypes.filter(Boolean) : [];
    if (!prompt || selectedTypes.length === 0) {
      return NextResponse.json({ error: "Input and selected types are required." }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    let contents = [];
    if (!apiKey) {
      contents = selectedTypes.map((typeId) => fallbackContent(typeId, prompt));
    } else {
      contents = await Promise.all(
        selectedTypes.map(async (typeId) => {
          try {
            return await generateForType(apiKey, typeId, prompt);
          } catch {
            return fallbackContent(typeId, prompt);
          }
        })
      );
    }

    return NextResponse.json({ contents });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to generate content." }, { status: 500 });
  }
}
