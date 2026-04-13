import { NextResponse } from "next/server";

const OPENAI_URL = "https://api.openai.com/v1/responses";

const SYSTEM_PROMPT = `You are a senior marketing strategist for B2B campaigns.
Return concise, practical outputs in JSON only.`;

function extractJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_) {
    // Try markdown code fences first.
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenceMatch?.[1]) {
      try {
        return JSON.parse(fenceMatch[1]);
      } catch (_) {
        // continue
      }
    }

    // Try the first JSON object in plain text.
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const slice = text.slice(start, end + 1);
      try {
        return JSON.parse(slice);
      } catch (_) {
        return null;
      }
    }

    return null;
  }
}

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

async function callOpenAI({ apiKey, prompt, schema }) {
  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      text: schema
        ? {
            format: {
              type: "json_schema",
              name: schema.name,
              schema: schema.schema,
              strict: true,
            },
          }
        : { format: { type: "text" } },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "OpenAI request failed.");
  }

  const text = extractTextFromResponse(data);
  return text;
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

    const body = await req.json();
    const {
      company = "",
      campaign = "",
      website = "",
      description = "",
      selectedPlanSteps = [],
      selectedActions = [],
      step = "suggestions",
      attachmentName = "",
    } = body || {};

    if (step === "suggestions") {
      const prompt = `Return ONLY valid JSON with this shape:
{
  "marketingPlan": [
    {
      "id": "step-1",
      "title": "Step 1: ...",
      "description": "...",
      "channels": ["LinkedIn", "Email"]
    }
  ],
  "suggestions": ["...","...","...","..."],
  "recommendedActions": ["...","...","..."],
  "aiMessage": "..."
}

Context:
- Company: ${company}
- Campaign Goal: ${campaign}
- Website: ${website}
- Attachment: ${attachmentName}
- Description: ${description}

Rules:
- marketingPlan: 4 to 10 detailed plan steps.
- Each step should include id, title, description (2-3 lines), and channels array.
- suggestions: 4 to 8 short campaign ideas.
- recommendedActions: 3-6 channels based on plan steps (e.g. LinkedIn, Email, WhatsApp, Instagram, Blog, SMS, Naukri, Ad Copy).
- aiMessage: 1-2 short lines.`;

      const raw = await callOpenAI({
        apiKey,
        prompt,
        schema: {
          name: "suggestions_payload",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              suggestions: {
                type: "array",
                items: { type: "string" },
                minItems: 4,
                maxItems: 8,
              },
              marketingPlan: {
                type: "array",
                minItems: 4,
                maxItems: 10,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    id: { type: "string" },
                    title: { type: "string" },
                    description: { type: "string" },
                    channels: { type: "array", items: { type: "string" } },
                  },
                  required: ["id", "title", "description", "channels"],
                },
              },
              recommendedActions: {
                type: "array",
                items: { type: "string" },
                minItems: 3,
                maxItems: 6,
              },
              aiMessage: { type: "string" },
            },
            required: ["marketingPlan", "suggestions", "recommendedActions", "aiMessage"],
          },
        },
      });
      const parsed = extractJson(raw);
      if (!parsed) {
        throw new Error("Model returned non-JSON response for suggestions.");
      }
      return NextResponse.json(parsed);
    }

    const safeActions = Array.isArray(selectedActions) ? selectedActions.filter(Boolean) : [];
    if (safeActions.length === 0) {
      return NextResponse.json({ error: "Please select at least one action." }, { status: 400 });
    }

    const prompt = `Return ONLY valid JSON with this shape:
{
  "outputs": {
    "<selected action 1>": "...",
    "<selected action 2>": "..."
  }
}

Context:
- Company: ${company}
- Campaign Goal: ${campaign}
- Website: ${website}
- Attachment: ${attachmentName}
- Description: ${description}
- Selected marketing plan steps: ${Array.isArray(selectedPlanSteps) ? selectedPlanSteps.join(" | ") : ""}
- Selected actions: ${safeActions.join(", ")}

Rules:
- Include ONLY selected actions in outputs.
- Keep each output actionable and channel-specific.
- No markdown code fences.`;

    const raw = await callOpenAI({ apiKey, prompt });
    const parsed = extractJson(raw);
    if (!parsed?.outputs || typeof parsed.outputs !== "object") {
      throw new Error("Model returned invalid content output format.");
    }

    const filteredOutputs = {};
    for (const action of safeActions) {
      if (typeof parsed.outputs[action] === "string") {
        filteredOutputs[action] = parsed.outputs[action];
      }
    }

    return NextResponse.json({ outputs: filteredOutputs });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Failed to generate content." },
      { status: 500 }
    );
  }
}

