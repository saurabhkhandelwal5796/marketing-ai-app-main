import { NextResponse } from "next/server";

const OPENAI_URL = "https://api.openai.com/v1/responses";

const SYSTEM_PROMPT = `You are a senior marketing strategist for B2B campaigns.
Return detailed, practical outputs in JSON only. Avoid fluff and be specific.

Depth requirements:
- Write FULL paragraphs (not short bullets). Each paragraph should be 4-8 sentences.
- Be highly actionable: include what to do, how to do it, examples, and measurable success criteria.
- Maximize depth and coverage: include at least 20+ concrete marketing detail points when asked for strategy/plan depth.`;

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
      responseContext = "",
      question = "",
      preferredChannel = "",
      employee = null,
      threadMessages = [],
      point = null,
      companyName = "",
      companyPayload = null,
      today = "",
      title = "",
      taskType = "",
      priority = "",
      task = null,
    } = body || {};

    if (step === "analysis") {
      const prompt = `Return ONLY valid JSON with this shape:
{
  "marketingDetails": [
    {
      "id": "point-1",
      "title": "...",
      "explanation": "...",
      "tags": ["Value proposition", "Messaging"]
    }
  ],
  "targetAudience": [
    {
      "name": "Notion",
      "description": "Workspace software for notes, docs, and collaboration.",
      "whyRelevant": "...",
      "industry": "SaaS",
      "decisionMakerRole": "CMO",
      "email": null,
      "phone": null,
      "linkedin": "https://www.linkedin.com/company/notionhq/",
      "website": "https://www.notion.so"
    }
  ],
  "employees": [
    {
      "name": "Jane Doe",
      "title": "Head of Marketing",
      "company": "Notion",
      "linkedin": "https://www.linkedin.com/in/janedoe",
      "email": null,
      "phone": null,
      "website": null
    }
  ],
  "aiMessage": "..."
}

Context:
- Company: ${company}
- Campaign Goal / Service: ${campaign}
- Website: ${website}
- Attachment: ${attachmentName}
- Description: ${description}

Rules:
- marketingDetails: MINIMUM 20 points (aim 22-26). Each point must have a unique id, a bold-style title, and a detailed explanation paragraph.
- Ensure coverage across: value proposition, market positioning, competitive advantage, messaging strategy, brand tone, channels, pricing perception, USP, emotional triggers, storytelling angle, SEO keywords, pain points addressed, social proof strategy, call-to-action suggestions, campaign hooks, content themes, awareness vs conversion tactics, seasonal relevance, partnership opportunities, and growth potential.
- targetAudience: Return a FLAT list of 12-16 REAL, specific companies (not grouped by segment).
- Each company must include: name, description (1 line), whyRelevant (1-2 lines tied to THIS campaign), industry (1 tag), decisionMakerRole (single role).
- employees: Return 20-40 REAL, specific employees across the target companies. Include likely outreach-ready roles (e.g., founder, marketing head, growth lead, sales lead, operations head).
- Each employee must include: name, title, company, linkedin, email, phone, website.
- For linkedin/email/phone/website: include only if genuinely known; otherwise null (do NOT guess).
- Prioritize finding employee email address and phone number where possible from reliable public business sources; keep null if not confidently available.
- For outreach channels: include email/phone/linkedin/website only if genuinely known; otherwise use null (do NOT guess).
- tags: 2-4 short tags per marketingDetails item.
- aiMessage: 2-4 short lines summarizing the analysis output.`;

      const raw = await callOpenAI({
        apiKey,
        prompt,
        schema: {
          name: "marketing_analysis_payload",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              marketingDetails: {
                type: "array",
                minItems: 20,
                maxItems: 30,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    id: { type: "string" },
                    title: { type: "string" },
                    explanation: { type: "string" },
                    tags: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 6 },
                  },
                  required: ["id", "title", "explanation", "tags"],
                },
              },
              targetAudience: {
                type: "array",
                minItems: 12,
                maxItems: 16,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    name: { type: "string" },
                    description: { type: "string" },
                    whyRelevant: { type: "string" },
                    industry: { type: "string" },
                    decisionMakerRole: { type: "string" },
                    email: { type: ["string", "null"] },
                    phone: { type: ["string", "null"] },
                    linkedin: { type: ["string", "null"] },
                    website: { type: ["string", "null"] },
                  },
                  required: [
                    "name",
                    "description",
                    "whyRelevant",
                    "industry",
                    "decisionMakerRole",
                    "email",
                    "phone",
                    "linkedin",
                    "website",
                  ],
                },
              },
              employees: {
                type: "array",
                minItems: 20,
                maxItems: 40,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    name: { type: "string" },
                    title: { type: "string" },
                    company: { type: "string" },
                    linkedin: { type: ["string", "null"] },
                    email: { type: ["string", "null"] },
                    phone: { type: ["string", "null"] },
                    website: { type: ["string", "null"] },
                  },
                  required: ["name", "title", "company", "linkedin", "email", "phone", "website"],
                },
              },
              aiMessage: { type: "string" },
            },
            required: ["marketingDetails", "targetAudience", "employees", "aiMessage"],
          },
        },
      });

      const parsed = extractJson(raw);
      if (!parsed) throw new Error("Model returned non-JSON response for analysis.");
      return NextResponse.json(parsed);
    }

    if (step === "employee_outreach") {
      const emp = employee && typeof employee === "object" ? employee : {};
      const empName = String(emp?.name || "").trim();
      const empTitle = String(emp?.title || "").trim();
      const empCompany = String(emp?.company || "").trim();
      const q = String(question || "").trim();
      const channel = String(preferredChannel || "").trim().toLowerCase();
      if (!empName) return NextResponse.json({ error: "Employee name is required." }, { status: 400 });
      if (!q) return NextResponse.json({ error: "Please enter your request." }, { status: 400 });

      const prompt = `Return ONLY valid JSON with this shape:
{
  "answer": "...",
  "suggestedChannels": ["Email", "LinkedIn", "Call"],
  "channelMessages": {
    "email": {
      "subject": "...",
      "body": "..."
    },
    "linkedin": {
      "message": "..."
    },
    "call": {
      "script": "..."
    }
  }
}

Context:
- Campaign company: ${company}
- Campaign goal: ${campaign}
- Campaign website: ${website}
- Campaign description: ${description}
- Employee name: ${empName}
- Employee title: ${empTitle}
- Employee company: ${empCompany}
- Preferred channel context: ${channel || "(none provided)"}

User request:
${q}

Rules:
- Provide a ready-to-use outreach response (email, LinkedIn DM, or script based on request).
- Make it personalized to the employee role and company context.
- Keep it practical, specific, and conversion-focused.
- Decide the best channels and include them in suggestedChannels.
- If Email is suggested, provide email.subject and email.body.
- If LinkedIn is suggested, provide linkedin.message.
- If Call is suggested, provide call.script.
- Do not include channels that are not relevant.`;

      const raw = await callOpenAI({
        apiKey,
        prompt,
        schema: {
          name: "employee_outreach_payload",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              answer: { type: "string" },
              suggestedChannels: {
                type: "array",
                items: { type: "string", enum: ["Email", "LinkedIn", "Call"] },
                minItems: 1,
                maxItems: 3,
              },
              channelMessages: {
                type: "object",
                additionalProperties: false,
                properties: {
                  email: {
                    type: ["object", "null"],
                    additionalProperties: false,
                    properties: {
                      subject: { type: "string" },
                      body: { type: "string" },
                    },
                    required: ["subject", "body"],
                  },
                  linkedin: {
                    type: ["object", "null"],
                    additionalProperties: false,
                    properties: {
                      message: { type: "string" },
                    },
                    required: ["message"],
                  },
                  call: {
                    type: ["object", "null"],
                    additionalProperties: false,
                    properties: {
                      script: { type: "string" },
                    },
                    required: ["script"],
                  },
                },
                required: ["email", "linkedin", "call"],
              },
            },
            required: ["answer", "suggestedChannels", "channelMessages"],
          },
        },
      });
      const parsed = extractJson(raw);
      if (!parsed?.answer) throw new Error("Model returned invalid outreach response format.");
      return NextResponse.json(parsed);
    }

    if (step === "analysis_followup") {
      const safeContext = typeof responseContext === "string" ? responseContext : "";
      const safeQuestion = typeof question === "string" ? question : "";
      if (!safeQuestion.trim()) {
        return NextResponse.json({ error: "Please enter a follow-up question." }, { status: 400 });
      }

      const safeThread = Array.isArray(threadMessages)
        ? threadMessages
            .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
            .slice(-20)
        : [];
      const threadTranscript = safeThread.length
        ? safeThread.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n")
        : "";

      const prompt = `Return ONLY valid JSON with this shape:
{
  "answer": "..."
}

Context:
- Company: ${company}
- Campaign Goal / Service: ${campaign}
- Website: ${website}
- Attachment: ${attachmentName}
- Description: ${description}

Response we are following up on:
${safeContext}

Prior thread (most recent last):
${threadTranscript || "(no prior thread)"}

User follow-up question:
${safeQuestion}

Rules:
- Be specific and actionable.
- If the user asks for examples, provide 3-6 examples.
- Keep it focused on the response context above, and maintain continuity with the prior thread.`;

      const raw = await callOpenAI({
        apiKey,
        prompt,
        schema: {
          name: "analysis_followup_payload",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: { answer: { type: "string" } },
            required: ["answer"],
          },
        },
      });

      const parsed = extractJson(raw);
      if (!parsed?.answer) throw new Error("Model returned invalid follow-up format.");
      return NextResponse.json(parsed);
    }

    if (step === "analysis_regenerate_point") {
      if (!point || typeof point !== "object") {
        return NextResponse.json({ error: "Point payload missing." }, { status: 400 });
      }

      const pointId = typeof point.id === "string" ? point.id : "";
      const pointTitle = typeof point.title === "string" ? point.title : "";
      const pointExplanation = typeof point.explanation === "string" ? point.explanation : "";
      const pointTags = Array.isArray(point.tags) ? point.tags.filter((t) => typeof t === "string").slice(0, 6) : [];

      if (!pointId || !pointTitle) {
        return NextResponse.json({ error: "Point id/title missing." }, { status: 400 });
      }

      const prompt = `Return ONLY valid JSON with this shape:
{
  "point": {
    "id": "${pointId}",
    "title": "...",
    "explanation": "...",
    "tags": ["...","..."]
  }
}

Context:
- Company: ${company}
- Campaign Goal / Service: ${campaign}
- Website: ${website}
- Attachment: ${attachmentName}
- Description: ${description}

Point to regenerate (improve specificity, add practical details, avoid fluff):
- id: ${pointId}
- title: ${pointTitle}
- explanation: ${pointExplanation}
- tags: ${pointTags.join(", ")}

Rules:
- Keep the SAME id.
- Keep the title semantically aligned with the original intent.
- Provide a detailed explanation paragraph (4-7 sentences).
- Provide 2-4 short tags.`;

      const raw = await callOpenAI({
        apiKey,
        prompt,
        schema: {
          name: "analysis_regenerate_point_payload",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              point: {
                type: "object",
                additionalProperties: false,
                properties: {
                  id: { type: "string" },
                  title: { type: "string" },
                  explanation: { type: "string" },
                  tags: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 6 },
                },
                required: ["id", "title", "explanation", "tags"],
              },
            },
            required: ["point"],
          },
        },
      });

      const parsed = extractJson(raw);
      if (!parsed?.point?.id) throw new Error("Model returned invalid regenerated point format.");
      return NextResponse.json(parsed);
    }

    if (step === "company_detail") {
      const safeName = String(companyName || companyPayload?.name || "").trim();
      if (!safeName) {
        return NextResponse.json({ error: "Company name is required." }, { status: 400 });
      }

      const safeWebsite = typeof companyPayload?.website === "string" ? companyPayload.website.trim() : "";
      const safeLinkedin = typeof companyPayload?.linkedin === "string" ? companyPayload.linkedin.trim() : "";
      const safeIndustry = typeof companyPayload?.industry === "string" ? companyPayload.industry.trim() : "";

      const prompt = `Return ONLY valid JSON with this shape:
{
  "overview": "2-3 paragraphs...",
  "whyGoodTarget": "...",
  "estimatedCompanySize": "...",
  "decisionMakerRole": "...",
  "talkingPoints": ["...","...","..."],
  "painPoints": ["...","...","..."],
  "suggestedOutreachMethod": "Cold Email",
  "outreachChannels": {
    "email": null,
    "phone": null,
    "linkedin": null,
    "website": null
  }
}

Context:
- Company: ${company}
- Campaign Goal / Service: ${campaign}
- Website: ${website}
- Description: ${description}

Target company:
- Name: ${safeName}
- Industry: ${safeIndustry}
- Website (if known): ${safeWebsite}
- LinkedIn (if known): ${safeLinkedin}

Rules:
- Be specific and actionable for THIS campaign.
- suggestedOutreachMethod must be one of: Cold Email, LinkedIn DM, Phone, Event.
- outreachChannels fields should be real URLs/contacts only if confidently known; otherwise null.`;

      const raw = await callOpenAI({
        apiKey,
        prompt,
        schema: {
          name: "company_detail_payload",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              overview: { type: "string" },
              whyGoodTarget: { type: "string" },
              estimatedCompanySize: { type: "string" },
              decisionMakerRole: { type: "string" },
              talkingPoints: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 6 },
              painPoints: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 6 },
              suggestedOutreachMethod: {
                type: "string",
                enum: ["Cold Email", "LinkedIn DM", "Phone", "Event"],
              },
              outreachChannels: {
                type: "object",
                additionalProperties: false,
                properties: {
                  email: { type: ["string", "null"] },
                  phone: { type: ["string", "null"] },
                  linkedin: { type: ["string", "null"] },
                  website: { type: ["string", "null"] },
                },
                required: ["email", "phone", "linkedin", "website"],
              },
            },
            required: [
              "overview",
              "whyGoodTarget",
              "estimatedCompanySize",
              "decisionMakerRole",
              "talkingPoints",
              "painPoints",
              "suggestedOutreachMethod",
              "outreachChannels",
            ],
          },
        },
      });

      const parsed = extractJson(raw);
      if (!parsed) throw new Error("Model returned non-JSON response for company detail.");
      return NextResponse.json(parsed);
    }

    if (step === "due_date_suggest") {
      const t = String(today || "").trim();
      const safeTitle = String(title || "").trim();
      const safeType = String(taskType || "").trim();
      const safePriority = String(priority || "").trim();
      if (!t || !safeTitle || !safeType || !safePriority) {
        return NextResponse.json({ error: "Missing fields for due date suggestion." }, { status: 400 });
      }

      const prompt = `Today's date is ${t}.
Task Title: ${safeTitle}
Task Type: ${safeType}
Priority: ${safePriority}

Suggest the best due date using this logic:
Urgent → 1 day | High → 3 days | Medium → 7 days | Low → 14 days
LinkedIn Post → 2-3 days | Blog Post → 7-10 days
Campaign Analysis → 5-7 days | Cold Email Campaign → 3-5 days
Marketing Video → 10-14 days | Email Newsletter → 5-7 days
Social Media Post → 2-3 days | Company Research → 5 days
Sales Coordination → 3 days | Generic Task → follow priority rule

Respond ONLY with valid JSON, no extra text:
{
  "suggested_date": "YYYY-MM-DD",
  "reason": "one short sentence explaining why"
}`;

      const raw = await callOpenAI({
        apiKey,
        prompt,
        schema: {
          name: "due_date_suggest_payload",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              suggested_date: { type: "string" },
              reason: { type: "string" },
            },
            required: ["suggested_date", "reason"],
          },
        },
      });
      const parsed = extractJson(raw);
      if (!parsed?.suggested_date) throw new Error("Model returned invalid due date suggestion.");
      return NextResponse.json(parsed);
    }

    if (step === "task_guide") {
      if (!task || typeof task !== "object") {
        return NextResponse.json({ error: "Task payload missing." }, { status: 400 });
      }
      const tTitle = String(task.title || "").trim();
      const tType = String(task.task_type || "").trim();
      const tPriority = String(task.priority || "").trim();
      const tDesc = String(task.description || "").trim();
      const tCtx = String(task.campaign_context || "").trim();
      if (!tTitle) return NextResponse.json({ error: "Task title missing." }, { status: 400 });

      const system = `You are a marketing mentor helping a complete beginner (fresher)
accomplish a marketing task professionally. Be friendly,
encouraging, and assume zero prior marketing knowledge.`;

      const user = `Task Title: ${tTitle}
Task Type: ${tType}
Priority: ${tPriority}
Description: ${tDesc}
Campaign Context: ${tCtx}

Give a beginner-friendly guide. Structure your response with
EXACTLY these section headers on their own lines:

WHAT THIS TASK MEANS
WHAT YOU NEED BEFORE STARTING
STEP-BY-STEP INSTRUCTIONS
PRO TIPS
HOW TO KNOW YOU ARE DONE

Then based on the task_type, add the appropriate bonus section as specified.`;

      const res = await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          input: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          text: { format: { type: "text" } },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "OpenAI request failed.");
      const guide = extractTextFromResponse(data);
      return NextResponse.json({ guide });
    }

    if (step === "suggestions") {
      const prompt = "You must follow these instructions: " + description + `\n\nGenerate minimum 20 marketing detail points. Each point must have a title and at least 4-5 sentences of detailed explanation. Be specific to this company, not generic.\n\nReturn ONLY valid JSON with this shape:
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
- marketingPlan: 12 to 15 detailed plan steps.
- Each step description must be ONE dense paragraph (5-8 sentences) with real execution details (who/what/when/how), and must include 2-4 concrete sub-actions embedded in the paragraph (e.g., "Do X, then Y, then Z").
- Across the full marketingPlan, cover at least 20+ distinct actionable marketing details (positioning, messaging, offer, channels, targeting, creatives, landing page, tracking, retargeting, budget split, timeline, KPIs, optimization loop, risks).
- suggestions: 12 to 15 short campaign ideas.
- recommendedActions: 6-10 channels based on plan steps (e.g. LinkedIn, Email, WhatsApp, Instagram, Blog, SMS, Naukri, Ad Copy).
- aiMessage: 2-4 short lines.`;

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
                minItems: 12,
                maxItems: 15,
              },
              marketingPlan: {
                type: "array",
                minItems: 12,
                maxItems: 15,
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
                minItems: 6,
                maxItems: 10,
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

    const prompt = "You must follow these instructions: " + description + `\n\nGenerate minimum 20 marketing detail points. Each point must have a title and at least 4-5 sentences of detailed explanation. Be specific to this company, not generic.\n\nReturn ONLY valid JSON with this shape:
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
- Keep each output actionable and channel-specific with deep, execution-ready detail.
- Use full paragraphs (not short bullets). If you include lists, embed them inside paragraphs and include examples.
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

