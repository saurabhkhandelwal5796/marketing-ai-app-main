"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  GraduationCap,
  RefreshCw,
  Sparkles,
  Video,
  X,
  Bookmark,
  Clock,
  Flame,
  Award,
  CheckCircle2,
  PlayCircle,
  TrendingUp,
  ThumbsUp,
  RotateCcw
} from "lucide-react";
import { getCurrentSessionId, getCurrentUserId } from "../../lib/getCurrentUserId";

// Static Videos Dataset (Covers B2B Marketing, Sales, LinkedIn, Cold Calling, Lead Gen, AI Tools)
const VIDEO_RECOMMENDATIONS = [
  {
    title: "Marketing Fundamentals: 4 Ps of Marketing Explained",
    url: "https://www.youtube.com/watch?v=h95p3fQbGn4",
    takeaway: "Master the classic 4 Ps of marketing: Product, Price, Place, and Promotion with modern B2B examples.",
    category: "Marketing",
    views: "145K views",
    likes: "8.2K likes",
    id: "vid-1"
  },
  {
    title: "Complete Digital Marketing Course for Beginners",
    url: "https://www.youtube.com/watch?v=nU-IIXBWlS4",
    takeaway: "Build a solid baseline in SEO, social media advertising, and email funnel setups.",
    category: "Marketing",
    views: "340K views",
    likes: "19K likes",
    id: "vid-2"
  },
  {
    title: "B2B Sales Masterclass: Pipeline Generation Strategies",
    url: "https://www.youtube.com/watch?v=k5j4lD6sCik",
    takeaway: "Understand how high-performing B2B reps generate pipeline and manage opportunities.",
    category: "Sales",
    views: "89K views",
    likes: "4.1K likes",
    id: "vid-3"
  },
  {
    title: "Modern B2B Sales Framework and Objection Handling",
    url: "https://www.youtube.com/watch?v=zPcr722kH_c",
    takeaway: "Learn how to structure sales discovery calls and resolve common buyer objections.",
    category: "Sales",
    views: "62K views",
    likes: "3.5K likes",
    id: "vid-4"
  },
  {
    title: "LinkedIn Organic Outreach and Social Selling Strategy",
    url: "https://www.youtube.com/watch?v=qX3H4zG0g5U",
    takeaway: "Optimize your LinkedIn presence and run non-spammy organic outreach campaigns.",
    category: "LinkedIn",
    views: "105K views",
    likes: "5.8K likes",
    id: "vid-5"
  },
  {
    title: "How to Build a Powerful LinkedIn Profile for Lead Gen",
    url: "https://www.youtube.com/watch?v=d_kI1n85r6s",
    takeaway: "Turn your personal profile into a landing page that attracts inbound clients.",
    category: "LinkedIn",
    views: "74K views",
    likes: "3.9K likes",
    id: "vid-6"
  },
  {
    title: "Live B2B Cold Calling and Pitching Techniques",
    url: "https://www.youtube.com/watch?v=eLwW2Q2j3-I",
    takeaway: "Watch live cold calls to marketing executives and learn how to handle gatekeepers.",
    category: "Cold Calling",
    views: "120K views",
    likes: "6.7K likes",
    id: "vid-7"
  },
  {
    title: "Overcoming B2B Cold Call Objections with Confidence",
    url: "https://www.youtube.com/watch?v=t1Lz_0fUebI",
    takeaway: "Simple frameworks to handle objections like 'no budget' or 'send me an email'.",
    category: "Cold Calling",
    views: "83K views",
    likes: "4.2K likes",
    id: "vid-8"
  },
  {
    title: "How to Build a B2B Lead Generation Machine",
    url: "https://www.youtube.com/watch?v=P2d8D4W6U4w",
    takeaway: "Step-by-step tutorial on automated scraping, filtering, and warm lead qualification.",
    category: "Lead Generation",
    views: "95K views",
    likes: "5.3K likes",
    id: "vid-9"
  },
  {
    title: "Cold Email Blueprint: Zero to 50 Lead Inquiries",
    url: "https://www.youtube.com/watch?v=mD0kY8S9d14",
    takeaway: "Draft high-converting cold email sequences, set up subdomains, and warm up inboxes.",
    category: "Lead Generation",
    views: "112K views",
    likes: "6.1K likes",
    id: "vid-10"
  },
  {
    title: "Leveraging ChatGPT for Content and Copywriting",
    url: "https://www.youtube.com/watch?v=p1k6VjFw6rQ",
    takeaway: "Advanced prompts for creating buyer personas, landing page copies, and ad variations.",
    category: "AI Tools",
    views: "210K views",
    likes: "12.5K likes",
    id: "vid-11"
  },
  {
    title: "Top AI Tools for B2B Growth Hackers and Marketers",
    url: "https://www.youtube.com/watch?v=uK1X_36vCco",
    takeaway: "A comprehensive roundup of AI tools for video generation, research, and list building.",
    category: "AI Tools",
    views: "185K views",
    likes: "10.2K likes",
    id: "vid-12"
  }
];

// Static Articles Dataset (Used to select 10 dynamic articles rotating daily)
const ARTICLE_RECOMMENDATIONS = [
  {
    title: "The 2026 B2B Marketing Blueprint",
    url: "https://blog.hubspot.com/marketing/b2b-marketing-strategy",
    takeaway: "Key trends shaping business-to-business campaigns, including zero-click content.",
    category: "Marketing",
    readTime: "6 min read",
    views: "12K reads",
    id: "art-1"
  },
  {
    title: "Mastering the Art of B2B Copywriting",
    url: "https://copyblogger.com/b2b-copywriting/",
    takeaway: "How to write plain-spoken, high-intent headlines that convert executives.",
    category: "Marketing",
    readTime: "5 min read",
    views: "8.5K reads",
    id: "art-2"
  },
  {
    title: "Cold Email Optimization Secrets",
    url: "https://ahrefs.com/blog/cold-emailing/",
    takeaway: "Actionable experiments that increased reply rates from 2% to 18% in B2B SaaS.",
    category: "Lead Generation",
    readTime: "7 min read",
    views: "15K reads",
    id: "art-3"
  },
  {
    title: "Advanced LinkedIn Lead Generation Strategies",
    url: "https://www.socialmediaexaminer.com/linkedin-lead-generation/",
    takeaway: "Using search filters, personal branding, and custom messages to secure demos.",
    category: "LinkedIn",
    readTime: "8 min read",
    views: "11K reads",
    id: "art-4"
  },
  {
    title: "AI Prompts for High-Converting Landing Pages",
    url: "https://unbounce.com/landing-pages/ai-prompts/",
    takeaway: "Copy-pasteable templates for marketing copy generation using ChatGPT.",
    category: "AI Tools",
    readTime: "4 min read",
    views: "22K reads",
    id: "art-5"
  },
  {
    title: "Building a High-Performance Sales Funnel",
    url: "https://www.salesforce.com/blog/sales-funnel/",
    takeaway: "Aligning marketing qualification with sales pipeline stages for smooth handoff.",
    category: "Sales",
    readTime: "10 min read",
    views: "9.2K reads",
    id: "art-6"
  },
  {
    title: "The Psychology of B2B Cold Calling",
    url: "https://www.gong.io/blog/cold-calling-tips/",
    takeaway: "Overcome fear of rejection and use speech patterns that build trust in 3 seconds.",
    category: "Cold Calling",
    readTime: "6 min read",
    views: "14K reads",
    id: "art-7"
  },
  {
    title: "SEO Trends That Actually Matter Today",
    url: "https://moz.com/blog/seo-trends",
    takeaway: "Adapting search strategies for AI-driven search engines and conversational query styles.",
    category: "Marketing",
    readTime: "8 min read",
    views: "17K reads",
    id: "art-8"
  },
  {
    title: "Creating Interactive Content to Drive Leads",
    url: "https://contentmarketinginstitute.com/articles/interactive-content-lead-generation",
    takeaway: "How quizzes, calculators, and builders outperform static PDFs by 3x.",
    category: "Lead Generation",
    readTime: "5 min read",
    views: "6.4K reads",
    id: "art-9"
  },
  {
    title: "How to Track Marketing ROI and Attribution",
    url: "https://blog.hubspot.com/marketing/marketing-attribution",
    takeaway: "Understanding multi-touch, first-touch, and linear models of revenue tracking.",
    category: "Marketing",
    readTime: "9 min read",
    views: "7.8K reads",
    id: "art-10"
  },
  {
    title: "Data-Driven Marketing: Personalization at Scale",
    url: "https://www.mckinsey.com/capabilities/growth-marketing-and-sales/our-insights",
    takeaway: "How enterprise organizations deliver hyper-personalized experiences dynamically.",
    category: "Marketing",
    readTime: "11 min read",
    views: "13K reads",
    id: "art-11"
  },
  {
    title: "Leveraging AI for Predictive Sales Pipeline",
    url: "https://hbr.org/2024/02/how-ai-can-help-predict-sales",
    takeaway: "Using machine learning to score leads, forecast deals, and reduce churn.",
    category: "AI Tools",
    readTime: "7 min read",
    views: "19K reads",
    id: "art-12"
  },
  {
    title: "Social Selling: The New Era of Prospecting",
    url: "https://business.linkedin.com/sales-solutions/blog/social-selling",
    takeaway: "How to use relationship intelligence to close high-ticket B2B accounts.",
    category: "LinkedIn",
    readTime: "6 min read",
    views: "10.4K reads",
    id: "art-13"
  },
  {
    title: "How to Design a Perfect Lead Magnet",
    url: "https://optinmonster.com/how-to-create-a-lead-magnet/",
    takeaway: "A checklist of formats, hooks, and deliverability tips for high opt-in rates.",
    category: "Lead Generation",
    readTime: "5 min read",
    views: "12.8K reads",
    id: "art-14"
  },
  {
    title: "The Complete Guide to Account-Based Marketing (ABM)",
    url: "https://www.demandbase.com/resources/abm-guide/",
    takeaway: "Targeting high-value accounts with custom creatives, ads, and direct outreach.",
    category: "Marketing",
    readTime: "12 min read",
    views: "8.1K reads",
    id: "art-15"
  }
];

// Trending List Content
const TRENDING_CONTENT = [
  {
    title: "B2B SaaS Growth Hacks to Scale from $1M to $10M ARR",
    url: "https://www.ycombinator.com/library/growth-hacking-saas",
    takeaway: "The product-led growth model and strategic channel diversification frameworks.",
    category: "Marketing",
    type: "article",
    views: "42K views",
    likes: "3.2K saves",
    id: "trend-1"
  },
  {
    title: "Cold Email Outreaches that Booked Fortune 500 Clients",
    url: "https://www.youtube.com/watch?v=mD0kY8S9d14",
    type: "video",
    takeaway: "Step-by-step review of real cold emails that converted enterprise decision makers.",
    category: "Lead Generation",
    views: "35K views",
    likes: "2.8K saves",
    id: "trend-2"
  },
  {
    title: "Unlocking the Power of AI Agent Workflows for Marketers",
    url: "https://hbr.org/2024/02/how-ai-can-help-predict-sales",
    type: "article",
    takeaway: "How marketing teams automate research, content generation, and lead qualification.",
    category: "AI Tools",
    views: "58K views",
    likes: "4.5K saves",
    id: "trend-3"
  }
];

function getYouTubeId(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) return parsed.pathname.replace("/", "");
    if (parsed.hostname.includes("youtube.com")) return parsed.searchParams.get("v") || "";
  } catch {
    return "";
  }
  return "";
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "";
  }
}

function svgThumbnail(item, variant) {
  const title = String(item?.title || "").slice(0, 48);
  const domain = getDomain(item?.url || "") || "resource";
  const accent = variant === "blog" || variant === "article" ? "#7c3aed" : "#0ea5e9";
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360'>
    <defs>
      <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0%' stop-color='#0f172a'/>
        <stop offset='100%' stop-color='${accent}'/>
      </linearGradient>
    </defs>
    <rect width='100%' height='100%' fill='url(#g)'/>
    <rect x='24' y='24' width='592' height='312' rx='20' fill='rgba(255,255,255,0.08)'/>
    <text x='44' y='78' fill='#bfdbfe' font-size='20' font-family='Arial' font-weight='700'>${domain}</text>
    <text x='44' y='126' fill='white' font-size='28' font-family='Arial' font-weight='700'>${title.replace(/&/g, "&amp;")}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function getCardImage(item, variant) {
  if (variant === "video" || item.type === "video") {
    const videoId = getYouTubeId(item.url);
    return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : "";
  }
  return svgThumbnail(item, variant);
}

export default function LearningPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [content, setContent] = useState(null);
  const [generatedAt, setGeneratedAt] = useState("");
  const [activeVideo, setActiveVideo] = useState(null);
  const [showMiniPlayer, setShowMiniPlayer] = useState(false);
  const [miniPlayerVideo, setMiniPlayerVideo] = useState(null);
  const [completedModules, setCompletedModules] = useState(() => new Set());

  // Modern Portal States
  const [selectedVideoTab, setSelectedVideoTab] = useState("All");
  const [bookmarks, setBookmarks] = useState([]);
  const [historyList, setHistoryList] = useState([]);
  const [continueItem, setContinueItem] = useState(null);
  const [timeSpentToday, setTimeSpentToday] = useState(0); // in seconds
  const [articlesReadToday, setArticlesReadToday] = useState(0);
  const [videosWatchedToday, setVideosWatchedToday] = useState(0);

  // Initialize and load local storage states
  useEffect(() => {
    try {
      const storedBookmarks = localStorage.getItem("learning_bookmarks");
      if (storedBookmarks) setBookmarks(JSON.parse(storedBookmarks));

      const storedHistory = localStorage.getItem("learning_history");
      if (storedHistory) setHistoryList(JSON.parse(storedHistory));

      const storedContinue = localStorage.getItem("learning_continue");
      if (storedContinue) setContinueItem(JSON.parse(storedContinue));

      // Daily goals date-bound loaders
      const todayStr = new Date().toDateString();
      const lastActiveDate = localStorage.getItem("learning_last_active_date");
      if (lastActiveDate === todayStr) {
        setTimeSpentToday(parseInt(localStorage.getItem("learning_time_today") || "0", 10));
        setArticlesReadToday(parseInt(localStorage.getItem("learning_articles_today") || "0", 10));
        setVideosWatchedToday(parseInt(localStorage.getItem("learning_videos_today") || "0", 10));
      } else {
        localStorage.setItem("learning_last_active_date", todayStr);
        localStorage.setItem("learning_time_today", "0");
        localStorage.setItem("learning_articles_today", "0");
        localStorage.setItem("learning_videos_today", "0");
      }
    } catch (e) {
      console.error("Failed to load local storage state:", e);
    }
  }, []);

  // Real-time time spent tracking interval (saves every 10 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      const todayStr = new Date().toDateString();
      let currentLog = 0;
      try {
        const lastDate = localStorage.getItem("learning_last_active_date");
        if (lastDate === todayStr) {
          currentLog = parseInt(localStorage.getItem("learning_time_today") || "0", 10);
        } else {
          localStorage.setItem("learning_last_active_date", todayStr);
          localStorage.setItem("learning_time_today", "0");
          localStorage.setItem("learning_articles_today", "0");
          localStorage.setItem("learning_videos_today", "0");
          setArticlesReadToday(0);
          setVideosWatchedToday(0);
        }
      } catch {}

      const newTime = currentLog + 10;
      setTimeSpentToday(newTime);
      try {
        localStorage.setItem("learning_time_today", String(newTime));
      } catch {}
    }, 10000);

    return () => clearInterval(timer);
  }, []);

  // Pre-existing unmount audit tracking event
  useEffect(() => {
    const startTime = Date.now();
    return () => {
      const timeSpent = Date.now() - startTime;
      if (timeSpent > 10000) {
        (async () => {
          const currentUserId = await getCurrentUserId();
          fetch("/api/audit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: currentUserId || "anonymous",
              event_type: "page_visit",
              page_name: "Learning",
              time_spent_ms: timeSpent,
              details: `Spent ${Math.round(timeSpent / 1000)} seconds on Learning page`,
              session_id: getCurrentSessionId(),
            }),
          }).catch(() => {});
        })();
      }
    };
  }, []);

  const loadContent = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/learning/content?t=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data?.content) throw new Error(data?.error || "Failed to load learning content.");
      setContent(data.content);
      setGeneratedAt(data.generatedAt || "");
    } catch (e) {
      setError(e?.message || "Failed to load learning content.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  // Log article visit trigger
  const handleArticleClick = (item) => {
    // Add to continue learning & history
    saveResumeAndHistory(item, "article");

    // Increment articles read today (up to max 3)
    const todayStr = new Date().toDateString();
    let currentCount = 0;
    try {
      const lastDate = localStorage.getItem("learning_last_active_date");
      if (lastDate === todayStr) {
        currentCount = parseInt(localStorage.getItem("learning_articles_today") || "0", 10);
      }
    } catch {}
    const newCount = Math.min(3, currentCount + 1);
    setArticlesReadToday(newCount);
    try {
      localStorage.setItem("learning_articles_today", String(newCount));
    } catch {}

    // Audit log
    (async () => {
      const currentUserId = await getCurrentUserId();
      fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: currentUserId || "anonymous",
          event_type: "action",
          page_name: "Learning",
          action_name: "Opened Article",
          details: `Read: ${String(item?.title || "Untitled Article")}`,
          session_id: getCurrentSessionId(),
        }),
      }).catch(() => {});
    })();

    // Open article
    window.open(item.url, "_blank");
  };

  // Log video play trigger
  const handlePlayVideo = (video) => {
    // Add to continue learning & history
    saveResumeAndHistory(video, "video");

    // Set videos watched today to 1
    const todayStr = new Date().toDateString();
    setVideosWatchedToday(1);
    try {
      localStorage.setItem("learning_videos_today", "1");
    } catch {}

    // Audit log
    (async () => {
      const currentUserId = await getCurrentUserId();
      fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: currentUserId || "anonymous",
          event_type: "action",
          page_name: "Learning",
          action_name: "Started Learning Video",
          details: `Watched: ${String(video?.title || "Untitled lesson")}`,
          session_id: getCurrentSessionId(),
        }),
      }).catch(() => {});
    })();

    setActiveVideo(video);
    setShowMiniPlayer(false);
  };

  // Helper to save recently viewed and continue learning state
  const saveResumeAndHistory = (item, type) => {
    const entry = { ...item, type, viewedAt: new Date().toISOString() };
    setContinueItem(entry);
    try {
      localStorage.setItem("learning_continue", JSON.stringify(entry));
    } catch {}

    // History prepending (max 5)
    let updatedHistory = [entry, ...historyList.filter(h => h.url !== item.url)];
    if (updatedHistory.length > 5) updatedHistory = updatedHistory.slice(0, 5);
    setHistoryList(updatedHistory);
    try {
      localStorage.setItem("learning_history", JSON.stringify(updatedHistory));
    } catch {}
  };

  // Helper to toggle bookmarked state
  const toggleBookmark = (e, item, type) => {
    e.stopPropagation();
    let updated;
    const isBookmarked = bookmarks.some(b => b.url === item.url);
    if (isBookmarked) {
      updated = bookmarks.filter(b => b.url !== item.url);
    } else {
      updated = [{ ...item, type }, ...bookmarks];
    }
    setBookmarks(updated);
    try {
      localStorage.setItem("learning_bookmarks", JSON.stringify(updated));
    } catch {}
  };

  // Rotate 10 Recommended Articles Daily
  const getDailyArticles = () => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000) || 0;
    const items = [];
    for (let i = 0; i < 10; i++) {
      const index = (dayOfYear + i) % ARTICLE_RECOMMENDATIONS.length;
      items.push(ARTICLE_RECOMMENDATIONS[index]);
    }
    return items;
  };

  const dailyArticlesList = getDailyArticles();

  // Filter YouTube Video suggestions by category
  const filteredVideos = VIDEO_RECOMMENDATIONS.filter(vid => {
    if (selectedVideoTab === "All") return true;
    return vid.category === selectedVideoTab;
  });

  // Goal metrics percentages
  const timeProgress = Math.min(100, Math.round((timeSpentToday / 1800) * 100)); // 30 mins = 1800s
  const articlesProgress = Math.min(100, Math.round((articlesReadToday / 3) * 100));
  const videosProgress = Math.min(100, Math.round((videosWatchedToday / 1) * 100));

  const videoRailRef = useRef(null);
  const scrollVideoRail = (direction) => {
    if (!videoRailRef.current) return;
    const amount = direction === "left" ? -400 : 400;
    videoRailRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  // Render continue learning default
  const activeContinue = continueItem || {
    title: "Digital Marketing Course for Beginners",
    url: "https://www.youtube.com/watch?v=nU-IIXBWlS4",
    takeaway: "Build a solid baseline in SEO, social media advertising, and email funnel setups.",
    category: "Marketing",
    type: "video"
  };

  // Quick reset goals tool
  const resetDailyGoals = () => {
    setTimeSpentToday(0);
    setArticlesReadToday(0);
    setVideosWatchedToday(0);
    try {
      localStorage.setItem("learning_time_today", "0");
      localStorage.setItem("learning_articles_today", "0");
      localStorage.setItem("learning_videos_today", "0");
    } catch {}
  };

  return (
    <main className="min-h-screen space-y-6 bg-slate-950 p-6 text-white custom-sidebar-scroll overflow-y-auto">
      {/* Top Banner section */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-6 shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-4 relative z-10">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-blue-400">
              <Sparkles size={13} className="text-blue-400 animate-pulse" />
              AI Learning & Coaching Portal
            </p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">Enterprise Hub</h1>
            <p className="mt-2 text-sm text-slate-300 leading-relaxed">
              Curate knowledge, build your pipeline skills, and check off daily development challenges. Fresh topic suggestions refresh automatically.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadContent}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              {loading ? "Refreshing..." : "Sync Content"}
            </button>
          </div>
        </div>
        {/* Subtle decorative glowing background bubbles */}
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-blue-600/10 blur-[100px] pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-20 h-64 w-64 rounded-full bg-indigo-600/10 blur-[100px] pointer-events-none" />
      </section>

      {error ? (
        <section className="rounded-2xl border border-red-900/50 bg-red-950/20 p-4 text-xs font-semibold text-red-400">{error}</section>
      ) : null}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (Core Learning Content) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Daily focus widget (from API) */}
          {content ? (
            <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 shadow-lg backdrop-blur-md relative overflow-hidden">
              <div className="flex items-center gap-2 text-blue-400">
                <GraduationCap size={16} />
                <p className="text-xs font-bold uppercase tracking-wider">Focus of the Day</p>
              </div>
              <h2 className="mt-2.5 text-lg font-bold text-white leading-snug">{content.topic}</h2>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed font-normal">{content.summary}</p>
              {generatedAt && (
                <p className="mt-4 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Synced: {new Date(generatedAt).toLocaleDateString()}</p>
              )}
              <div className="absolute right-0 bottom-0 h-24 w-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
            </section>
          ) : loading ? (
            <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 shadow-lg flex items-center gap-3">
              <RefreshCw className="animate-spin text-blue-500" size={16} />
              <p className="text-xs font-bold text-slate-400">Generating daily focus recommendations...</p>
            </section>
          ) : null}

          {/* Continue Learning */}
          <section className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-5 shadow-lg relative overflow-hidden">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-400">
                  <Clock size={16} />
                </div>
                <h3 className="text-sm font-bold text-white">Continue Learning</h3>
              </div>
              <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Last Activity
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="w-full sm:w-48 h-28 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 shrink-0 relative group">
                {activeContinue.type === "video" ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={getCardImage(activeContinue, "video")} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-200" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-80 group-hover:opacity-100 transition">
                      <PlayCircle size={32} className="text-white" />
                    </div>
                  </>
                ) : (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={getCardImage(activeContinue, "article")} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-200" />
                    <div className="absolute inset-0 bg-black/30" />
                  </>
                )}
              </div>
              
              <div className="flex-1 min-w-0 self-start sm:self-center">
                <span className="inline-flex rounded-full bg-indigo-500/10 px-2 py-0.5 text-[9px] font-bold text-indigo-400 uppercase tracking-wider">
                  {activeContinue.category || "General"}
                </span>
                <h4 className="mt-1 text-sm font-bold text-white truncate leading-snug">{activeContinue.title}</h4>
                <p className="mt-1.5 text-xs text-slate-400 line-clamp-2 leading-relaxed">{activeContinue.takeaway}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => {
                      if (activeContinue.type === "video") {
                        handlePlayVideo(activeContinue);
                      } else {
                        handleArticleClick(activeContinue);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-500 shadow-md transition-all active:scale-95"
                  >
                    Resume Learning
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Recommended Videos (YouTube Gallery) */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/20 p-5 shadow-lg">
            <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
                  <Video size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Recommended Videos</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Explore structured video lectures and live tutorials.</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 self-end md:self-center">
                <button onClick={() => scrollVideoRail("left")} className="rounded-lg border border-slate-800 bg-slate-900/60 p-1.5 text-slate-300 hover:bg-slate-800">
                  <ChevronLeft size={14} />
                </button>
                <button onClick={() => scrollVideoRail("right")} className="rounded-lg border border-slate-800 bg-slate-900/60 p-1.5 text-slate-300 hover:bg-slate-800">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* Video Category Filter Tabs */}
            <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {["All", "Marketing", "Sales", "LinkedIn", "Cold Calling", "Lead Generation", "AI Tools"].map(tab => (
                <button
                  key={tab}
                  onClick={() => setSelectedVideoTab(tab)}
                  className={`rounded-full px-3.5 py-1 text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedVideoTab === tab
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-900/80 text-slate-400 border border-slate-800 hover:bg-slate-800"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div ref={videoRailRef} className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {filteredVideos.map((video, index) => {
                const cardImage = getCardImage(video, "video");
                const isBookmarked = bookmarks.some(b => b.url === video.url);
                return (
                  <div
                    key={`${video.url}-${index}`}
                    className="min-w-[280px] max-w-[280px] rounded-xl overflow-hidden border border-slate-850 bg-slate-900/40 hover:bg-slate-900/80 transition duration-200 hover:-translate-y-1 hover:border-slate-700/60 flex flex-col justify-between cursor-pointer group shadow-md"
                    onClick={() => handlePlayVideo(video)}
                  >
                    <div className="relative h-36 w-full bg-slate-800 overflow-hidden shrink-0">
                      {cardImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cardImage} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-200" />
                      ) : null}
                      <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                        <PlayCircle size={28} className="text-white drop-shadow-lg" />
                      </div>
                      <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-white">
                        YouTube
                      </span>
                      <button
                        onClick={(e) => toggleBookmark(e, video, "video")}
                        className="absolute top-2 right-2 rounded-lg bg-black/60 p-1.5 text-slate-300 hover:text-amber-400 hover:bg-black transition-colors"
                        title="Bookmark"
                      >
                        <Bookmark size={13} className={isBookmarked ? "fill-amber-400 text-amber-400" : ""} />
                      </button>
                    </div>

                    <div className="p-3.5 flex-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                          {video.category}
                        </span>
                        <h4 className="mt-2 text-xs font-bold text-white line-clamp-2 leading-snug tracking-tight group-hover:text-blue-300 transition-colors">
                          {video.title}
                        </h4>
                        <p className="mt-1.5 text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                          {video.takeaway}
                        </p>
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 font-semibold uppercase">
                        <span>{video.views}</span>
                        <span>{video.likes}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Recommended Articles Section */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/20 p-5 shadow-lg">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-lg bg-purple-500/10 p-2 text-purple-400">
                <BookOpen size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Recommended Articles</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Handpicked resources that rotate daily (10 fresh updates every morning).</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dailyArticlesList.map((article, index) => {
                const isBookmarked = bookmarks.some(b => b.url === article.url);
                return (
                  <div
                    key={`${article.url}-${index}`}
                    onClick={() => handleArticleClick(article)}
                    className="p-4 rounded-xl border border-slate-850 bg-slate-900/30 hover:bg-slate-900/70 hover:border-slate-700/60 transition cursor-pointer flex flex-col justify-between relative group"
                  >
                    <button
                      onClick={(e) => toggleBookmark(e, article, "article")}
                      className="absolute top-3 right-3 rounded-lg bg-slate-900/80 p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition"
                      title="Bookmark"
                    >
                      <Bookmark size={13} className={isBookmarked ? "fill-amber-400 text-amber-400" : ""} />
                    </button>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">
                          {article.category}
                        </span>
                        <span className="text-[10px] text-slate-500 font-semibold">{article.readTime}</span>
                      </div>
                      <h4 className="mt-2 text-xs font-bold text-white group-hover:text-purple-300 transition-colors leading-snug max-w-[90%]">
                        {article.title}
                      </h4>
                      <p className="mt-1 text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {article.takeaway}
                      </p>
                    </div>

                    <div className="mt-3.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500">
                      <span>{getDomain(article.url)}</span>
                      <span className="font-semibold uppercase tracking-wider">{article.views}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Trending Section */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/20 p-5 shadow-lg">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
                <TrendingUp size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Trending Content</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Top trending assets inside the growth marketing network.</p>
              </div>
            </div>

            <div className="space-y-3">
              {TRENDING_CONTENT.map((item, idx) => {
                const isBookmarked = bookmarks.some(b => b.url === item.url);
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (item.type === "video") {
                        handlePlayVideo(item);
                      } else {
                        handleArticleClick(item);
                      }
                    }}
                    className="p-3.5 rounded-xl border border-slate-850 bg-slate-900/40 hover:bg-slate-900/80 hover:border-slate-700/60 transition cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group"
                  >
                    <div className="flex gap-3 items-center min-w-0">
                      <div className="h-7 w-7 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] font-bold text-amber-400 uppercase tracking-wider shrink-0 border border-slate-700">
                        #{idx + 1}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white truncate group-hover:text-amber-300 transition-colors leading-snug">
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5 leading-normal">
                          {item.takeaway}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        {item.category}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => toggleBookmark(e, item, item.type)}
                          className="rounded-lg border border-slate-800 p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition"
                        >
                          <Bookmark size={12} className={isBookmarked ? "fill-amber-400 text-amber-400" : ""} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

        </div>

        {/* Right Column (Sidebar, Status, Saved Resources, Progress Goals) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Daily Goal Dashboard Card */}
          <section className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-5 shadow-lg relative overflow-hidden">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-orange-500/10 p-2 text-orange-400">
                  <Flame size={16} className="animate-bounce" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Daily Learning Goal</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wider font-bold">Goal stats persist daily</p>
                </div>
              </div>
              <button
                type="button"
                onClick={resetDailyGoals}
                className="rounded-lg border border-slate-800 bg-slate-900/60 p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                title="Reset progress metrics"
              >
                <RotateCcw size={12} />
              </button>
            </div>

            <div className="space-y-4">
              
              {/* Goal 1: Time spent */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                  <span className="text-slate-300">Time Spent (30 Min Goal)</span>
                  <span className="text-slate-400">{Math.floor(timeSpentToday / 60)} min / 30 min</span>
                </div>
                <div className="h-2 w-full bg-slate-850 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${timeProgress}%` }}
                    className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-500"
                  />
                </div>
              </div>

              {/* Goal 2: Articles read */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                  <span className="text-slate-300">Articles Read (3 Goal)</span>
                  <span className="text-slate-400">{articlesReadToday} / 3 read</span>
                </div>
                <div className="h-2 w-full bg-slate-850 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${articlesProgress}%` }}
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                  />
                </div>
                <div className="mt-1 flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => {
                      const todayStr = new Date().toDateString();
                      const val = Math.min(3, articlesReadToday + 1);
                      setArticlesReadToday(val);
                      try { localStorage.setItem("learning_articles_today", String(val)); } catch {}
                    }}
                    className="text-[9px] font-bold text-indigo-400 hover:text-indigo-300 tracking-wider uppercase"
                    disabled={articlesReadToday >= 3}
                  >
                    + Log Article
                  </button>
                </div>
              </div>

              {/* Goal 3: Videos watched */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                  <span className="text-slate-300">Videos Watched (1 Goal)</span>
                  <span className="text-slate-400">{videosWatchedToday} / 1 video</span>
                </div>
                <div className="h-2 w-full bg-slate-850 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${videosProgress}%` }}
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
                  />
                </div>
                <div className="mt-1 flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => {
                      setVideosWatchedToday(1);
                      try { localStorage.setItem("learning_videos_today", "1"); } catch {}
                    }}
                    className="text-[9px] font-bold text-blue-400 hover:text-blue-300 tracking-wider uppercase"
                    disabled={videosWatchedToday >= 1}
                  >
                    + Log Video
                  </button>
                </div>
              </div>

              {/* Medal / Goal completion indicator */}
              {(timeProgress >= 100 && articlesProgress >= 100 && videosProgress >= 100) ? (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 flex items-center gap-3">
                  <Award size={32} className="text-amber-500 animate-pulse shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-400">All Goals Completed!</h4>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      Excellent job. You have completed all of your daily B2B learning objectives!
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-3.5 flex items-center gap-3">
                  <Award size={32} className="text-slate-600 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-300">In Progress</h4>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      Continue reading and learning to achieve your daily skills target.
                    </p>
                  </div>
                </div>
              )}

            </div>
          </section>

          {/* Saved Resources Widget */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/20 p-5 shadow-lg">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
                <Bookmark size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Saved Resources</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Toggle bookmarks on any content to save.</p>
              </div>
            </div>

            {bookmarks.length === 0 ? (
              <div className="py-6 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                <p className="text-xs font-semibold">No saved bookmarks yet</p>
                <p className="text-[10px] mt-0.5 text-slate-600">Bookmark articles or videos to read/watch later.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[280px] overflow-y-auto custom-sidebar-scroll pr-1">
                {bookmarks.map((bookmark) => (
                  <div
                    key={bookmark.url}
                    onClick={() => {
                      if (bookmark.type === "video") {
                        handlePlayVideo(bookmark);
                      } else {
                        handleArticleClick(bookmark);
                      }
                    }}
                    className="p-3 rounded-xl border border-slate-855 bg-slate-900/60 hover:bg-slate-905 transition flex items-start gap-2.5 cursor-pointer relative group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                          {bookmark.type}
                        </span>
                        <span className="text-[10px] text-slate-500 truncate">{getDomain(bookmark.url)}</span>
                      </div>
                      <h4 className="mt-1 text-[11px] font-bold text-white line-clamp-1 leading-snug group-hover:text-amber-300 transition-colors">
                        {bookmark.title}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => toggleBookmark(e, bookmark, bookmark.type)}
                      className="text-slate-500 hover:text-red-400 p-0.5 shrink-0"
                      title="Remove bookmark"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recently Viewed */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/20 p-5 shadow-lg">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-lg bg-teal-500/10 p-2 text-teal-400">
                <Clock size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Recently Viewed</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">History of content you recently read or played.</p>
              </div>
            </div>

            {historyList.length === 0 ? (
              <div className="py-6 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                <p className="text-xs font-semibold">No recent activity</p>
                <p className="text-[10px] mt-0.5 text-slate-600">Items will list here as you browse.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {historyList.map((hist) => {
                  const elapsedMs = Date.now() - new Date(hist.viewedAt).getTime();
                  const elapsedMins = Math.max(1, Math.floor(elapsedMs / 60000));
                  return (
                    <div
                      key={hist.url}
                      onClick={() => {
                        if (hist.type === "video") {
                          handlePlayVideo(hist);
                        } else {
                          handleArticleClick(hist);
                        }
                      }}
                      className="p-3 rounded-xl border border-slate-855 bg-slate-900/50 hover:bg-slate-905/80 transition cursor-pointer flex items-center justify-between gap-2 group"
                    >
                      <div className="min-w-0 flex-1">
                        <h4 className="text-[11px] font-bold text-white truncate leading-snug group-hover:text-blue-400 transition-colors">
                          {hist.title}
                        </h4>
                        <span className="text-[9px] text-slate-500 font-semibold">{elapsedMins}m ago</span>
                      </div>
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[8px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
                        {hist.type}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Action Plan (preserved) */}
          {content && content.actionPlan && content.actionPlan.length > 0 && (
            <section className="rounded-2xl border border-slate-800 bg-slate-900/20 p-5 shadow-lg">
              <div className="mb-4 flex items-center gap-2">
                <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-400">
                  <CheckCircle2 size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Daily Action Plan</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">B2B skills execution guidelines from the AI Coach.</p>
                </div>
              </div>

              <div className="space-y-2">
                {content.actionPlan.map((step, index) => {
                  const moduleName = String(step || `Module ${index + 1}`);
                  const key = `${index}-${moduleName}`;
                  const isCompleted = completedModules.has(key);
                  return (
                    <div
                      key={key}
                      className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-855 bg-slate-900/40 text-xs text-slate-200"
                    >
                      <span className={`mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${
                        isCompleted ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-400"
                      }`}>
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`leading-relaxed font-semibold ${isCompleted ? "line-through text-slate-500" : ""}`}>{step}</p>
                        <button
                          type="button"
                          onClick={() => {
                            if (isCompleted) return;
                            setCompletedModules((prev) => new Set([...prev, key]));
                            (async () => {
                              const currentUserId = await getCurrentUserId();
                              fetch("/api/audit", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  user_id: currentUserId || "anonymous",
                                  event_type: "action",
                                  page_name: "Learning",
                                  action_name: "Completed Learning Module",
                                  details: `Completed: ${moduleName}`,
                                  session_id: getCurrentSessionId(),
                                }),
                              }).catch(() => {});
                            })();
                          }}
                          className="mt-2 rounded bg-slate-800 hover:bg-slate-700 px-2 py-0.5 text-[10px] font-bold text-slate-300 disabled:opacity-50"
                          disabled={isCompleted}
                        >
                          {isCompleted ? "Completed" : "Mark Done"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

        </div>

      </div>

      {/* Main Overlay Video Player */}
      {activeVideo ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-4">
          <div className="w-full max-w-5xl rounded-2xl bg-white p-4 shadow-xl text-slate-950">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-slate-900 truncate pr-4">{activeVideo.title}</p>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setMiniPlayerVideo(activeVideo);
                    setShowMiniPlayer(true);
                    setActiveVideo(null);
                  }}
                  className="rounded-lg border border-slate-350 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-55 shadow-xs"
                >
                  Picture in Picture
                </button>
                <a
                  href={activeVideo.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-slate-350 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-55 shadow-xs"
                >
                  YouTube
                </a>
                <button onClick={() => setActiveVideo(null)} className="rounded-lg border border-slate-300 p-1.5 hover:bg-slate-100">
                  <X size={14} />
                </button>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-black aspect-video">
              <iframe
                title={activeVideo.title}
                src={`https://www.youtube.com/embed/${getYouTubeId(activeVideo.url)}?autoplay=1`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* Mini Picture-in-Picture Player */}
      {showMiniPlayer && miniPlayerVideo ? (
        <div className="fixed bottom-5 right-5 z-40 w-[320px] sm:w-[360px] overflow-hidden rounded-xl border border-slate-700 bg-black shadow-2xl">
          <div className="flex items-center justify-between bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
            <span className="truncate max-w-[200px]">{miniPlayerVideo.title}</span>
            <button onClick={() => setShowMiniPlayer(false)} className="rounded border border-white/30 px-1.5 py-0.5 text-[10px] hover:bg-slate-800 transition">
              Close
            </button>
          </div>
          <div className="aspect-video w-full">
            <iframe
              title="Mini YouTube Player"
              src={`https://www.youtube.com/embed/${getYouTubeId(miniPlayerVideo.url)}?autoplay=1`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      ) : null}
    </main>
  );
}
