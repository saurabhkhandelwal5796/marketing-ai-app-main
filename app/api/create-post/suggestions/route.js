import { NextResponse } from "next/server";

const TYPE_CATALOG = [
  { id: "linkedin_post", label: "LinkedIn", hint: "Professional launch/update post", needsRecipients: false, keywords: ["linkedin", "b2b", "professional"] },
  { id: "instagram_post", label: "Instagram", hint: "Short visual-first caption post", needsRecipients: false, keywords: ["instagram", "reel", "visual"] },
  { id: "email_campaign", label: "Email", hint: "Subject + body email draft", needsRecipients: true, keywords: ["email", "mail", "outreach"] },
  { id: "newsletter", label: "Newsletter", hint: "Long-form email update", needsRecipients: true, keywords: ["newsletter", "digest"] },
  { id: "ad_copy", label: "Ad Copy", hint: "Performance ad text ideas", needsRecipients: false, keywords: ["ad", "ads", "ppc", "meta", "google"] },
  { id: "blog_post", label: "Blog", hint: "SEO article style draft", needsRecipients: false, keywords: ["blog", "article", "seo"] },
  { id: "whatsapp_message", label: "WhatsApp", hint: "Short conversational message", needsRecipients: false, keywords: ["whatsapp", "message"] },
];

function inferPreselected(input) {
  const value = String(input || "").toLowerCase();
  const picks = [];
  if (/linkedin/.test(value)) picks.push("linkedin_post");
  if (/instagram/.test(value)) picks.push("instagram_post");
  if (/email|mail|campaign/.test(value)) picks.push("email_campaign");
  if (/newsletter|digest/.test(value)) picks.push("newsletter");
  if (picks.length === 0) picks.push("linkedin_post");
  return [...new Set(picks)];
}

function buildDynamicSuggestions(input, preselected) {
  const value = String(input || "").toLowerCase();
  const scored = TYPE_CATALOG.map((item) => {
    const keywordHits = item.keywords.filter((word) => value.includes(word)).length;
    const preselectedBoost = preselected.includes(item.id) ? 100 : 0;
    return { ...item, _score: preselectedBoost + keywordHits };
  })
    .sort((a, b) => b._score - a._score);

  const strongMatches = scored.filter((item) => item._score > 0);
  // Allow broader suggestion sets so users can choose more channels when relevant.
  const targetCount = Math.max(4, Math.min(TYPE_CATALOG.length, strongMatches.length || 5));
  const selected = strongMatches.length >= targetCount ? strongMatches.slice(0, targetCount) : scored.slice(0, targetCount);
  return selected.map(({ _score, ...rest }) => rest);
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const input = String(body?.input || "").trim();
    if (!input) return NextResponse.json({ error: "Input is required." }, { status: 400 });

    const preselected = inferPreselected(input);
    const suggestions = buildDynamicSuggestions(input, preselected).map((item) => ({
      ...item,
      selected: preselected.includes(item.id),
    }));

    return NextResponse.json({ suggestions, preselected });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to generate suggestions." }, { status: 500 });
  }
}
