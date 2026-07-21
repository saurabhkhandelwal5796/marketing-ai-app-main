import { NextResponse } from "next/server";

const ARTICLE_POOL = [
  {
    title: "The B2B Marketing Strategy Guide",
    url: "https://blog.hubspot.com/marketing/b2b-marketing-strategy",
    takeaway: "Key trends shaping business-to-business campaigns, including zero-click content.",
    category: "Marketing",
    readTime: "6 min read",
    id: "art-1"
  },
  {
    title: "Mastering B2B Copywriting",
    url: "https://copyblogger.com/b2b-copywriting/",
    takeaway: "How to write plain-spoken, high-intent headlines that convert executives.",
    category: "Marketing",
    readTime: "5 min read",
    id: "art-2"
  },
  {
    title: "Cold Email Optimization Secrets",
    url: "https://ahrefs.com/blog/cold-emailing/",
    takeaway: "Actionable experiments that increased reply rates from 2% to 18% in B2B SaaS.",
    category: "Lead Generation",
    readTime: "7 min read",
    id: "art-3"
  },
  {
    title: "Advanced LinkedIn Lead Generation Strategies",
    url: "https://www.socialmediaexaminer.com/linkedin-lead-generation/",
    takeaway: "Using search filters, personal branding, and custom messages to secure demos.",
    category: "LinkedIn",
    readTime: "8 min read",
    id: "art-4"
  },
  {
    title: "AI Prompts for High-Converting Landing Pages",
    url: "https://unbounce.com/landing-pages/ai-prompts/",
    takeaway: "Copy-pasteable templates for marketing copy generation using ChatGPT.",
    category: "AI Tools",
    readTime: "4 min read",
    id: "art-5"
  },
  {
    title: "Building a High-Performance Sales Funnel",
    url: "https://www.salesforce.com/blog/sales-funnel/",
    takeaway: "Aligning marketing qualification with sales pipeline stages for smooth handoff.",
    category: "Sales",
    readTime: "10 min read",
    id: "art-6"
  },
  {
    title: "The Psychology of B2B Cold Calling",
    url: "https://www.gong.io/blog/cold-calling-tips/",
    takeaway: "Overcome fear of rejection and use speech patterns that build trust in 3 seconds.",
    category: "Cold Calling",
    readTime: "6 min read",
    id: "art-7"
  },
  {
    title: "SEO Trends That Actually Matter Today",
    url: "https://moz.com/blog/seo-trends",
    takeaway: "Adapting search strategies for AI-driven search engines and conversational query styles.",
    category: "Marketing",
    readTime: "8 min read",
    id: "art-8"
  },
  {
    title: "Creating Interactive Content to Drive Leads",
    url: "https://contentmarketinginstitute.com/articles/interactive-content-lead-generation",
    takeaway: "How quizzes, calculators, and builders outperform static PDFs by 3x.",
    category: "Lead Generation",
    readTime: "5 min read",
    id: "art-9"
  },
  {
    title: "How to Track Marketing ROI and Attribution",
    url: "https://blog.hubspot.com/marketing/marketing-attribution",
    takeaway: "Understanding multi-touch, first-touch, and linear models of revenue tracking.",
    category: "Marketing",
    readTime: "9 min read",
    id: "art-10"
  },
  {
    title: "LinkedIn Organic Social Selling Strategy",
    url: "https://business.linkedin.com/sales-solutions/blog/social-selling",
    takeaway: "Turn your personal profile into a landing page that attracts inbound clients.",
    category: "LinkedIn",
    readTime: "7 min read",
    id: "art-11"
  },
  {
    title: "B2B SaaS Growth Hacks to Scale ARR",
    url: "https://www.ycombinator.com/library/growth-hacking-saas",
    takeaway: "The product-led growth model and strategic channel diversification.",
    category: "Marketing",
    readTime: "10 min read",
    id: "art-12"
  }
];

const checkUrl = async (url) => {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36"
      },
      signal: AbortSignal.timeout(2000)
    });
    return res.status >= 200 && res.status < 400;
  } catch {
    return false;
  }
};

export async function GET() {
  try {
    const validations = await Promise.all(
      ARTICLE_POOL.map(async (art) => {
        const isValid = await checkUrl(art.url);
        return isValid ? art : null;
      })
    );
    
    const verifiedArticles = validations.filter(Boolean);
    return NextResponse.json({ articles: verifiedArticles });
  } catch (error) {
    return NextResponse.json({ error: error.message, articles: [] }, { status: 500 });
  }
}
