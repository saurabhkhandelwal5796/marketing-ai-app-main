import { NextResponse } from "next/server";

const OPENAI_URL = "https://api.openai.com/v1/responses";

function extractTextFromResponse(data) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text;
  }

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

export async function POST(req) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is missing. Add it in .env.local and restart dev server." },
        { status: 500 }
      );
    }

    const { messages = [] } = await req.json();

    const systemPrompt = `You are a helpful, expert AI Marketing and Sales Assistant. 
You can answer B2B marketing questions, sales questions, generate email templates, LinkedIn outreach messages, B2B cold calling scripts, campaign/content suggestions, and prompts. 
Be concise, actionable, structured, and friendly. Avoid code fences.`;

    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          { role: "system", content: systemPrompt },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
        text: { format: { type: "text" } },
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || "OpenAI request failed.");
    const reply = extractTextFromResponse(data);
    return NextResponse.json({ reply });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Failed to query assistant." },
      { status: 500 }
    );
  }
}
