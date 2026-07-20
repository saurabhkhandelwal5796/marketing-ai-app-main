import { NextResponse } from "next/server";

const OPENAI_URL = "https://api.openai.com/v1/responses";

const RESOURCE_LIBRARY = {
  marketing_fundamentals: {
    label: "Marketing Fundamentals",
    videos: [
      {
        title: "YouTube: Marketing Fundamentals for Beginners",
        url: "https://www.youtube.com/watch?v=h95p3fQbGn4",
        takeaway: "Start with core concepts like STP, funnels, and positioning.",
      },
      {
        title: "YouTube: Digital Marketing Course for Beginners",
        url: "https://www.youtube.com/watch?v=nU-IIXBWlS4",
        takeaway: "Build a practical understanding of modern digital channels.",
      },
    ],
    blogs: [
      {
        title: "HubSpot - Marketing",
        url: "https://blog.hubspot.com/marketing",
        takeaway: "Easy-to-follow guides and templates for beginners.",
      },
      {
        title: "Ahrefs Blog",
        url: "https://ahrefs.com/blog/",
        takeaway: "Clear tutorials on growth, content, and SEO basics.",
      },
    ],
    webResources: [
      {
        title: "Google Digital Garage",
        url: "https://learndigital.withgoogle.com/digitalgarage",
        takeaway: "Free beginner-friendly digital marketing lessons.",
      },
      {
        title: "Meta Blueprint",
        url: "https://www.facebook.com/business/learn",
        takeaway: "Structured learning paths for social media marketing.",
      },
    ],
  },
  seo: {
    label: "SEO Foundations",
    videos: [
      {
        title: "YouTube: SEO for Beginners",
        url: "https://www.youtube.com/watch?v=DvwS7cV9GmQ",
        takeaway: "Learn keyword research, on-page SEO, and search intent.",
      },
      {
        title: "YouTube: Technical SEO Basics",
        url: "https://www.youtube.com/watch?v=xsVTqzratPs",
        takeaway: "Understand crawlability, indexing, and page performance.",
      },
    ],
    blogs: [
      {
        title: "Google Search Central Documentation",
        url: "https://developers.google.com/search/docs",
        takeaway: "Official best practices directly from Google.",
      },
      {
        title: "Moz Beginner's Guide to SEO",
        url: "https://moz.com/beginners-guide-to-seo",
        takeaway: "Step-by-step beginner roadmap for SEO learning.",
      },
    ],
    webResources: [
      {
        title: "Ahrefs Academy",
        url: "https://ahrefs.com/academy",
        takeaway: "Hands-on lessons for SEO and content marketing.",
      },
      {
        title: "Semrush Academy",
        url: "https://www.semrush.com/academy/",
        takeaway: "Practical SEO and marketing courses with examples.",
      },
    ],
  },
  content_marketing: {
    label: "Content Marketing",
    videos: [
      {
        title: "YouTube: Content Marketing Strategy",
        url: "https://www.youtube.com/watch?v=V6x3Q9xy7R8",
        takeaway: "Learn how to build topic clusters and content calendars.",
      },
      {
        title: "YouTube: Copywriting for Marketers",
        url: "https://www.youtube.com/watch?v=Jv4sLxQ9WvA",
        takeaway: "Improve hooks, structure, and conversion-focused writing.",
      },
    ],
    blogs: [
      {
        title: "Content Marketing Institute",
        url: "https://contentmarketinginstitute.com/articles/",
        takeaway: "Deep practical content strategy and distribution insights.",
      },
      {
        title: "HubSpot Content Marketing",
        url: "https://blog.hubspot.com/marketing/topic/content-marketing",
        takeaway: "Beginner-friendly frameworks and examples.",
      },
    ],
    webResources: [
      {
        title: "Google Trends",
        url: "https://trends.google.com/trends/",
        takeaway: "Discover trending topics before creating content.",
      },
      {
        title: "Answer The Public",
        url: "https://answerthepublic.com/",
        takeaway: "Find real audience questions for content ideas.",
      },
    ],
  },
  social_media: {
    label: "Social Media Marketing",
    videos: [
      {
        title: "YouTube: Social Media Marketing for Beginners",
        url: "https://www.youtube.com/watch?v=3QK2mK7wN1Q",
        takeaway: "Understand platform strategy and posting consistency.",
      },
      {
        title: "YouTube: LinkedIn Marketing Strategy",
        url: "https://www.youtube.com/watch?v=YQHsXMglC9A",
        takeaway: "Build thought leadership and B2B audience engagement.",
      },
    ],
    blogs: [
      {
        title: "Hootsuite Blog",
        url: "https://blog.hootsuite.com/",
        takeaway: "Tactical social media playbooks and trend updates.",
      },
      {
        title: "Buffer Blog",
        url: "https://buffer.com/resources/",
        takeaway: "Simple social growth ideas and practical execution tips.",
      },
    ],
    webResources: [
      {
        title: "LinkedIn Marketing Solutions",
        url: "https://business.linkedin.com/marketing-solutions",
        takeaway: "Official guidance for LinkedIn campaigns and audience targeting.",
      },
      {
        title: "Meta Business Help Center",
        url: "https://www.facebook.com/business/help",
        takeaway: "Official references for campaigns and ad troubleshooting.",
      },
    ],
  },
  email_marketing: {
    label: "Email Marketing",
    videos: [
      {
        title: "YouTube: Email Marketing Beginner Tutorial",
        url: "https://www.youtube.com/watch?v=KXrM8fWmPZQ",
        takeaway: "Learn list building, segmentation, and campaign setup.",
      },
      {
        title: "YouTube: Email Copywriting and Subject Lines",
        url: "https://www.youtube.com/watch?v=Q6k6fE2i5X8",
        takeaway: "Write better subject lines and conversion-focused emails.",
      },
    ],
    blogs: [
      {
        title: "Mailchimp Marketing Library",
        url: "https://mailchimp.com/resources/",
        takeaway: "Beginner-focused guidance on email campaigns and automation.",
      },
      {
        title: "Campaign Monitor Blog",
        url: "https://www.campaignmonitor.com/resources/",
        takeaway: "Useful templates and practical campaign examples.",
      },
    ],
    webResources: [
      {
        title: "HubSpot Email Marketing Guide",
        url: "https://blog.hubspot.com/marketing/email-marketing-guide",
        takeaway: "Understand best practices, cadence, and measurement.",
      },
      {
        title: "Sender - Email Marketing Resources",
        url: "https://www.sender.net/blog/",
        takeaway: "Tactical guides for improving open and click rates.",
      },
    ],
  },
  paid_ads: {
    label: "Paid Ads and Performance Marketing",
    videos: [
      {
        title: "YouTube: Google Ads for Beginners",
        url: "https://www.youtube.com/watch?v=Y6QfM9bXnqM",
        takeaway: "Learn campaign setup, keyword match types, and optimization.",
      },
      {
        title: "YouTube: Meta Ads Beginner Tutorial",
        url: "https://www.youtube.com/watch?v=mYFagyP6n8A",
        takeaway: "Understand targeting, creatives, and retargeting flow.",
      },
    ],
    blogs: [
      {
        title: "Google Ads Help",
        url: "https://support.google.com/google-ads/",
        takeaway: "Official documentation for setup and troubleshooting.",
      },
      {
        title: "WordStream Blog",
        url: "https://www.wordstream.com/blog",
        takeaway: "Performance-focused PPC tactics and channel benchmarks.",
      },
    ],
    webResources: [
      {
        title: "Think with Google",
        url: "https://www.thinkwithgoogle.com/",
        takeaway: "Consumer insights and paid media strategy ideas.",
      },
      {
        title: "Google Skillshop",
        url: "https://skillshop.withgoogle.com/",
        takeaway: "Free certifications and practical ad platform training.",
      },
    ],
  },
  analytics: {
    label: "Marketing Analytics and Measurement",
    videos: [
      {
        title: "YouTube: Google Analytics 4 for Beginners",
        url: "https://www.youtube.com/watch?v=R3QhLw6J2x8",
        takeaway: "Track traffic, engagement, and conversions properly.",
      },
      {
        title: "YouTube: Marketing Dashboard Tutorial",
        url: "https://www.youtube.com/watch?v=8nQ8H9m7S1M",
        takeaway: "Learn KPI reporting and decision-making dashboards.",
      },
    ],
    blogs: [
      {
        title: "Google Analytics Help Center",
        url: "https://support.google.com/analytics/",
        takeaway: "Official setup and troubleshooting documentation.",
      },
      {
        title: "Hotjar Blog",
        url: "https://www.hotjar.com/blog/",
        takeaway: "Behavior analytics and user insight techniques.",
      },
    ],
    webResources: [
      {
        title: "Looker Studio Learning",
        url: "https://support.google.com/looker-studio/",
        takeaway: "Build clear, shareable marketing dashboards.",
      },
      {
        title: "Mixpanel Blog",
        url: "https://mixpanel.com/blog/",
        takeaway: "Product and marketing analytics playbooks.",
      },
    ],
  },
};

const TOPIC_KEYS = Object.keys(RESOURCE_LIBRARY);
const MIN_ITEMS_PER_SECTION = 10;

const GLOBAL_VIDEO_POOL = [
  { title: "Digital Marketing 101 (Beginner's Guide)", url: "https://www.youtube.com/watch?v=t-pCoBQP9BI", takeaway: "Strong foundation across channels and campaign planning." },
  { title: "Beginner Marketing Fundamentals", url: "https://www.youtube.com/watch?v=avE-uvLPSN4", takeaway: "Covers core marketing concepts and practical strategy basics." },
  { title: "SEO For Beginners: Basic Tutorial", url: "https://www.youtube.com/watch?v=DvwS7cV9GmQ", takeaway: "Beginner-friendly SEO concepts and ranking fundamentals." },
  { title: "Complete SEO Course for Beginners", url: "https://www.youtube.com/watch?v=xsVTqzratPs", takeaway: "Structured SEO roadmap from keyword research to technical SEO." },
  { title: "YouTube SEO Beginner Guide", url: "https://www.youtube.com/watch?v=3NPieJutT9I", takeaway: "Optimize discoverability and ranking strategy on YouTube." },
  { title: "Email Marketing Step-by-Step", url: "https://www.youtube.com/watch?v=OrbhGa4aeAM", takeaway: "Hands-on guide to email campaign setup and workflow." },
  { title: "Complete Email Marketing Tutorial", url: "https://www.youtube.com/watch?v=2fBxrhV3Nk0", takeaway: "Practical beginner walkthrough for email list and campaigns." },
  { title: "Performance Marketing Concepts", url: "https://www.youtube.com/watch?v=Y6QfM9bXnqM", takeaway: "Understand paid ads and measurable funnel optimization." },
  { title: "Meta Ads Beginner Tutorial", url: "https://www.youtube.com/watch?v=mYFagyP6n8A", takeaway: "Learn audience targeting and ad creative strategy for Meta." },
  { title: "Google Ads for Beginners", url: "https://www.youtube.com/watch?v=Y6QfM9bXnqM", takeaway: "Learn campaign setup and optimization loops for paid search." },
];

const GLOBAL_BLOG_POOL = [
  { title: "Neil Patel Blog", url: "https://neilpatel.com/blog/", takeaway: "Actionable growth and SEO tactics with practical examples." },
  { title: "Search Engine Journal", url: "https://www.searchenginejournal.com/", takeaway: "Latest SEO and performance marketing updates." },
  { title: "Backlinko Blog", url: "https://backlinko.com/blog", takeaway: "Research-backed digital marketing tactics." },
  { title: "SEMrush Blog", url: "https://www.semrush.com/blog/", takeaway: "Hands-on content, SEO, and paid campaign playbooks." },
  { title: "Google Ads Blog", url: "https://blog.google/products/ads-commerce/", takeaway: "Official Google Ads product and strategy updates." },
  { title: "Meta for Business Blog", url: "https://www.facebook.com/business/news", takeaway: "Platform updates and ad best practices from Meta." },
  { title: "Kissmetrics Blog", url: "https://neilpatel.com/blog/", takeaway: "Data-led acquisition and retention tactics." },
  { title: "Unbounce Blog", url: "https://unbounce.com/blog/", takeaway: "Conversion optimization and landing-page insights." },
  { title: "CoSchedule Blog", url: "https://coschedule.com/blog", takeaway: "Content and campaign planning frameworks." },
  { title: "MarketingProfs Articles", url: "https://www.marketingprofs.com/articles", takeaway: "B2B and strategic marketing knowledge base." },
];

const GLOBAL_WEB_POOL = [
  { title: "Google Skillshop", url: "https://skillshop.withgoogle.com/", takeaway: "Official Google training and certifications." },
  { title: "HubSpot Academy", url: "https://academy.hubspot.com/", takeaway: "High-quality marketing certifications and free courses." },
  { title: "Coursera Marketing Courses", url: "https://www.coursera.org/browse/business/marketing", takeaway: "Structured courses from top universities." },
  { title: "edX Marketing Courses", url: "https://www.edx.org/learn/marketing", takeaway: "Academic-style marketing learning paths." },
  { title: "Think with Google", url: "https://www.thinkwithgoogle.com/", takeaway: "Consumer insights and strategic playbooks." },
  { title: "Canva Design School", url: "https://www.canva.com/learn/", takeaway: "Creative and visual communication learning resources." },
  { title: "Google Trends", url: "https://trends.google.com/trends/", takeaway: "Discover audience interest and topic momentum." },
  { title: "Answer The Public", url: "https://answerthepublic.com/", takeaway: "Find real audience questions for content." },
  { title: "Ahrefs Webmaster Tools", url: "https://ahrefs.com/webmaster-tools", takeaway: "Free SEO tooling for website improvement." },
  { title: "Moz Learning Center", url: "https://moz.com/learn/seo", takeaway: "Structured SEO learning for all levels." },
];

const FALLBACK_CONTENT = {
  topic: RESOURCE_LIBRARY.marketing_fundamentals.label,
  summary: "Start with fundamentals first, then move to one channel and practice consistently for faster growth.",
  videos: RESOURCE_LIBRARY.marketing_fundamentals.videos,
  blogs: RESOURCE_LIBRARY.marketing_fundamentals.blogs,
  webResources: RESOURCE_LIBRARY.marketing_fundamentals.webResources,
  actionPlan: [
    "Spend 30 minutes on one video and note 5 key concepts.",
    "Read one blog and write down how you can apply it in a sample campaign.",
    "Use one web resource to plan your first mini project this week.",
  ],
};

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

function safeUrl(url) {
  const value = String(url || "").trim();
  if (!value) return "";
  if (!/^https?:\/\//i.test(value)) return "";
  try {
    new URL(value);
    return value;
  } catch {
    return "";
  }
}

function normalizeResourceItem(item) {
  const title = String(item?.title || "").trim();
  const url = safeUrl(item?.url);
  const takeaway = String(item?.takeaway || "").trim();
  return { title, url, takeaway };
}

function mergeToMin(primary, pool, minCount) {
  const uniq = new Map();
  [...primary, ...pool].forEach((item) => {
    if (item?.url && !uniq.has(item.url)) uniq.set(item.url, item);
  });
  return Array.from(uniq.values()).slice(0, minCount);
}

function isMarketingResource(item) {
  const haystack = `${item?.title || ""} ${item?.takeaway || ""} ${item?.url || ""}`.toLowerCase();
  const keywords = ["marketing", "seo", "social", "content", "email", "ads", "analytics", "brand", "campaign", "conversion"];
  return keywords.some((word) => haystack.includes(word));
}

function pickTopicKey(seed = Date.now()) {
  const index = Math.abs(Number(seed) || 0) % TOPIC_KEYS.length;
  return TOPIC_KEYS[index];
}

function buildContentFromLibrary(topicKey, summary, actionPlan) {
  const lib = RESOURCE_LIBRARY[topicKey] || RESOURCE_LIBRARY.marketing_fundamentals;
  const videos = mergeToMin([], GLOBAL_VIDEO_POOL, MIN_ITEMS_PER_SECTION)
    .map(normalizeResourceItem)
    .filter((item) => item.title && item.url && isMarketingResource(item));
  const blogs = mergeToMin(lib.blogs, GLOBAL_BLOG_POOL, MIN_ITEMS_PER_SECTION)
    .map(normalizeResourceItem)
    .filter((item) => item.title && item.url && isMarketingResource(item));
  const webResources = mergeToMin(lib.webResources, GLOBAL_WEB_POOL, MIN_ITEMS_PER_SECTION)
    .map(normalizeResourceItem)
    .filter((item) => item.title && item.url && isMarketingResource(item));
  const cleanActionPlan = Array.isArray(actionPlan)
    ? actionPlan.map((step) => String(step || "").trim()).filter(Boolean).slice(0, 5)
    : [];

  if (!videos.length || !blogs.length || !webResources.length) return FALLBACK_CONTENT;

  return {
    topic: lib.label,
    summary: String(summary || "").trim() || FALLBACK_CONTENT.summary,
    videos: mergeToMin(videos, GLOBAL_VIDEO_POOL, MIN_ITEMS_PER_SECTION),
    blogs: mergeToMin(blogs, GLOBAL_BLOG_POOL, MIN_ITEMS_PER_SECTION),
    webResources: mergeToMin(webResources, GLOBAL_WEB_POOL, MIN_ITEMS_PER_SECTION),
    actionPlan: cleanActionPlan.length ? cleanActionPlan : FALLBACK_CONTENT.actionPlan,
  };
}

async function generateLearning(apiKey) {
  const prompt = `Return ONLY valid JSON in this shape:
{
  "topicKey": "one of: ${TOPIC_KEYS.join(", ")}",
  "summary": "string",
  "actionPlan": ["string","string","string"]
}

Task:
- Select one beginner-friendly topicKey for today's learning.
- Write a concise summary that helps a fresher understand what to learn first.
- actionPlan should be practical and beginner-level.`;

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: [{ role: "user", content: prompt }],
      text: { format: { type: "text" } },
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Failed to generate learning content.");
  const parsed = parseJson(extractText(data));
  const topicKey = TOPIC_KEYS.includes(parsed?.topicKey) ? parsed.topicKey : pickTopicKey(Date.now());
  return buildContentFromLibrary(topicKey, parsed?.summary, parsed?.actionPlan);
}

export async function GET() {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const content = apiKey
      ? await generateLearning(apiKey)
      : buildContentFromLibrary(pickTopicKey(Date.now()), FALLBACK_CONTENT.summary, FALLBACK_CONTENT.actionPlan);
    return NextResponse.json(
      {
        content,
        generatedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      {
        content: FALLBACK_CONTENT,
        generatedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
}
