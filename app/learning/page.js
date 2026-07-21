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
  RotateCcw,
  User,
  Users,
  Pin,
  Copy,
  FileText,
  Trash2,
  Edit3,
  Send
} from "lucide-react";
import { getCurrentSessionId, getCurrentUserId } from "../../lib/getCurrentUserId";

// Static Videos Dataset (Covers B2B Marketing, Sales, LinkedIn, Cold Calling, Lead Gen, AI Tools)
const VIDEO_RECOMMENDATIONS = [
  {
    title: "Marketing Fundamentals: 4 Ps of Marketing Explained",
    url: "https://www.youtube.com/watch?v=h95p3fQbGn4",
    takeaway: "Master the classic 4 Ps of marketing: Product, Price, Place, and Promotion with B2B models.",
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
    takeaway: "Optimize your LinkedIn presence and run organic outreach campaigns.",
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
    takeaway: "Review of real cold emails that converted B2B accounts.",
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

// Calendar days difference utility
const getCalendarDaysDiff = (d1, d2) => {
  const date1 = new Date(d1.toDateString ? d1.toDateString() : d1);
  const date2 = new Date(d2.toDateString ? d2.toDateString() : d2);
  date1.setHours(0, 0, 0, 0);
  date2.setHours(0, 0, 0, 0);
  const diffTime = date2.getTime() - date1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

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

// Lookup Level Info
const getLevelInfo = (xp) => {
  if (xp < 1000) {
    return { level: 1, title: "B2B Novice", nextThreshold: 1000, progress: Math.min(100, Math.round((xp / 1000) * 100)) };
  }
  if (xp < 2500) {
    return { level: 2, title: "B2B Specialist", nextThreshold: 2500, progress: Math.min(100, Math.round(((xp - 1000) / 1500) * 100)) };
  }
  if (xp < 5000) {
    return { level: 3, title: "B2B Strategist", nextThreshold: 5000, progress: Math.min(100, Math.round(((xp - 2500) / 2500) * 100)) };
  }
  return { level: 4, title: "Growth Marketing Expert", nextThreshold: 10000, progress: Math.min(100, Math.round(((xp - 5000) / 5000) * 100)) };
};

export default function LearningPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [content, setContent] = useState(null);
  const [generatedAt, setGeneratedAt] = useState("");
  const [activeVideo, setActiveVideo] = useState(null);
  const [showMiniPlayer, setShowMiniPlayer] = useState(false);
  const [miniPlayerVideo, setMiniPlayerVideo] = useState(null);
  const [completedModules, setCompletedModules] = useState(() => new Set());

  // Navigation tab (portal | dashboard | team | chat)
  const [activeTab, setActiveTab] = useState("portal");

  // Portal lists & filters
  const [selectedVideoTab, setSelectedVideoTab] = useState("All");
  const [bookmarks, setBookmarks] = useState([]);
  const [historyList, setHistoryList] = useState([]);
  const [continueItem, setContinueItem] = useState(null);

  // Daily goals states
  const [timeSpentToday, setTimeSpentToday] = useState(0); // in seconds
  const [articlesReadToday, setArticlesReadToday] = useState(0);
  const [videosWatchedToday, setVideosWatchedToday] = useState(0);

  // Cumulative Analytics Stats
  const [totalTime, setTotalTime] = useState(0);
  const [totalArticles, setTotalArticles] = useState(0);
  const [totalVideos, setTotalVideos] = useState(0);
  const [streakDays, setStreakDays] = useState(0);
  const [dailyLogs, setDailyLogs] = useState([]);

  // Gamification States
  const [userXp, setUserXp] = useState(0);
  const [claimedCert, setClaimedCert] = useState(null);

  // AI Assistant Chat States
  const [threads, setThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [searchChatQuery, setSearchChatQuery] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [editingThreadId, setEditingThreadId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");

  const assistantChatBottomRef = useRef(null);

  // Load cumulative stats
  const loadCumulativeStats = () => {
    try {
      setTotalTime(parseInt(localStorage.getItem("learning_stats_total_time") || "0", 10));
      setTotalArticles(parseInt(localStorage.getItem("learning_stats_total_articles") || "0", 10));
      setTotalVideos(parseInt(localStorage.getItem("learning_stats_total_videos") || "0", 10));
      setStreakDays(parseInt(localStorage.getItem("learning_stats_streak") || "0", 10));
      setDailyLogs(JSON.parse(localStorage.getItem("learning_stats_daily_log") || "[]"));
      setUserXp(parseInt(localStorage.getItem("learning_stats_xp") || "0", 10));
    } catch {}
  };

  // Verify and update streak
  const checkStreak = () => {
    try {
      const today = new Date();
      const lastActiveStr = localStorage.getItem("learning_stats_last_active");
      let streak = parseInt(localStorage.getItem("learning_stats_streak") || "0", 10);
      
      if (!lastActiveStr) {
        streak = 1;
      } else {
        const lastActive = new Date(lastActiveStr);
        const diff = getCalendarDaysDiff(lastActive, today);
        if (diff === 1) {
          streak += 1;
        } else if (diff > 1) {
          streak = 1; // streak broken
        }
      }
      
      localStorage.setItem("learning_stats_streak", String(streak));
      localStorage.setItem("learning_stats_last_active", today.toDateString());
      return streak;
    } catch {
      return 1;
    }
  };

  // Add XP helper
  const addXp = (amount) => {
    try {
      const currentXp = parseInt(localStorage.getItem("learning_stats_xp") || "0", 10);
      const newXp = currentXp + amount;
      localStorage.setItem("learning_stats_xp", String(newXp));
      setUserXp(newXp);
    } catch {}
  };

  // Log activity helper
  const logActivity = (timeToAdd = 0, articlesToAdd = 0, videosToAdd = 0) => {
    try {
      const todayStr = new Date().toDateString();
      
      // Update cumulative totals
      if (timeToAdd > 0) {
        const total = parseInt(localStorage.getItem("learning_stats_total_time") || "0", 10) + timeToAdd;
        localStorage.setItem("learning_stats_total_time", String(total));
      }
      if (articlesToAdd > 0) {
        const total = parseInt(localStorage.getItem("learning_stats_total_articles") || "0", 10) + articlesToAdd;
        localStorage.setItem("learning_stats_total_articles", String(total));
      }
      if (videosToAdd > 0) {
        const total = parseInt(localStorage.getItem("learning_stats_total_videos") || "0", 10) + videosToAdd;
        localStorage.setItem("learning_stats_total_videos", String(total));
      }
      
      checkStreak();
      
      // Update daily logs list
      const logStr = localStorage.getItem("learning_stats_daily_log") || "[]";
      let logs = JSON.parse(logStr);
      let todayLog = logs.find(l => l.date === todayStr);
      if (todayLog) {
        todayLog.time += timeToAdd;
        todayLog.articles += articlesToAdd;
        todayLog.videos += videosToAdd;
      } else {
        todayLog = { date: todayStr, time: timeToAdd, articles: articlesToAdd, videos: videosToAdd };
        logs.unshift(todayLog);
      }
      
      if (logs.length > 30) logs = logs.slice(0, 30);
      localStorage.setItem("learning_stats_daily_log", JSON.stringify(logs));
    } catch (e) {
      console.error("Failed to log activity:", e);
    }
  };

  // Initialize and load local storage states
  useEffect(() => {
    try {
      const storedBookmarks = localStorage.getItem("learning_bookmarks");
      if (storedBookmarks) setBookmarks(JSON.parse(storedBookmarks));

      const storedHistory = localStorage.getItem("learning_history");
      if (storedHistory) setHistoryList(JSON.parse(storedHistory));

      const storedContinue = localStorage.getItem("learning_continue");
      if (storedContinue) setContinueItem(JSON.parse(storedContinue));

      // Daily goals loaders
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
      
      // Load AI Assistant Chat Threads
      const storedThreads = localStorage.getItem("learning_chat_threads");
      if (storedThreads) {
        const parsed = JSON.parse(storedThreads);
        setThreads(parsed);
        if (parsed.length > 0) {
          setActiveThreadId(parsed[0].id);
        }
      }
      
      loadCumulativeStats();
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
        const lastActive = localStorage.getItem("learning_last_active_date");
        if (lastActive === todayStr) {
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

      // Accumulate to cumulative, log, and add XP
      logActivity(10, 0, 0);
      addXp(2);
      loadCumulativeStats();
    }, 10000);

    return () => clearInterval(timer);
  }, []);

  // Auto-scroll inside chat area
  const activeThread = threads.find(t => t.id === activeThreadId);
  useEffect(() => {
    if (assistantChatBottomRef.current) {
      assistantChatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeThread?.messages, chatLoading]);

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

    // Accumulate to cumulative stats and award XP
    logActivity(0, 1, 0);
    addXp(50);
    loadCumulativeStats();

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

    window.open(item.url, "_blank");
  };

  // Log video play trigger
  const handlePlayVideo = (video) => {
    saveResumeAndHistory(video, "video");

    // Set videos watched today to 1
    const todayStr = new Date().toDateString();
    setVideosWatchedToday(1);
    try {
      localStorage.setItem("learning_videos_today", "1");
    } catch {}

    // Accumulate to cumulative stats and award XP
    logActivity(0, 0, 1);
    addXp(100);
    loadCumulativeStats();

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

  // Goal completion check to trigger +200 XP award once daily
  useEffect(() => {
    if (timeProgress >= 100 && articlesProgress >= 100 && videosProgress >= 100) {
      const todayStr = new Date().toDateString();
      try {
        const claimedDate = localStorage.getItem("learning_daily_goal_claimed_date");
        if (claimedDate !== todayStr) {
          localStorage.setItem("learning_daily_goal_claimed_date", todayStr);
          addXp(200);
          alert("🎉 Daily Goal Achieved! +200 XP awarded!");
        }
      } catch {}
    }
  }, [timeProgress, articlesProgress, videosProgress]);

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

  // Reset progress tools
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

  const resetAllTrackingStats = () => {
    const conf = window.confirm("Are you sure you want to reset all your learning statistics, XP, achievements, and dashboard logs?");
    if (!conf) return;
    try {
      localStorage.removeItem("learning_stats_total_time");
      localStorage.removeItem("learning_stats_total_videos");
      localStorage.removeItem("learning_stats_total_articles");
      localStorage.removeItem("learning_stats_streak");
      localStorage.removeItem("learning_stats_last_active");
      localStorage.removeItem("learning_stats_daily_log");
      localStorage.removeItem("learning_stats_xp");
      localStorage.removeItem("learning_daily_goal_claimed_date");
      loadCumulativeStats();
    } catch {}
  };

  // Weekly report dates breakdown
  const getWeeklyReportData = () => {
    const days = [];
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toDateString();
      const matchLog = dailyLogs.find(l => l.date === dateStr) || { time: 0, articles: 0, videos: 0 };
      days.push({
        label: weekdays[d.getDay()],
        dateLabel: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        minutes: Math.round(matchLog.time / 60),
        articles: matchLog.articles,
        videos: matchLog.videos
      });
    }
    return days;
  };

  const weeklyData = getWeeklyReportData();

  // Monthly report weeks breakdown
  const getMonthlyReportData = () => {
    const weeks = [
      { label: "Week 1 (1-7 days ago)", minutes: 0, articles: 0, videos: 0 },
      { label: "Week 2 (8-14 days ago)", minutes: 0, articles: 0, videos: 0 },
      { label: "Week 3 (15-21 days ago)", minutes: 0, articles: 0, videos: 0 },
      { label: "Week 4 (22-28 days ago)", minutes: 0, articles: 0, videos: 0 }
    ];

    dailyLogs.forEach(log => {
      const logDate = new Date(log.date);
      const today = new Date();
      const diffDays = getCalendarDaysDiff(logDate, today);
      
      if (diffDays >= 0 && diffDays < 7) {
        weeks[0].minutes += Math.round(log.time / 60);
        weeks[0].articles += log.articles;
        weeks[0].videos += log.videos;
      } else if (diffDays >= 7 && diffDays < 14) {
        weeks[1].minutes += Math.round(log.time / 60);
        weeks[1].articles += log.articles;
        weeks[1].videos += log.videos;
      } else if (diffDays >= 14 && diffDays < 21) {
        weeks[2].minutes += Math.round(log.time / 60);
        weeks[2].articles += log.articles;
        weeks[2].videos += log.videos;
      } else if (diffDays >= 21 && diffDays < 28) {
        weeks[3].minutes += Math.round(log.time / 60);
        weeks[3].articles += log.articles;
        weeks[3].videos += log.videos;
      }
    });

    return weeks;
  };

  const monthlyData = getMonthlyReportData();

  // Completion percentage
  const averageCompletion = Math.round((timeProgress + articlesProgress + videosProgress) / 3);

  // Dynamic Badge Unlocking Evaluator
  const getBadgesState = () => {
    const marketingExpert = totalArticles >= 5;
    const salesChampion = totalVideos >= 5;
    
    let totalMessages = 0;
    try {
      const stored = localStorage.getItem("learning_chat_threads");
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.forEach(t => {
          totalMessages += t.messages.filter(m => m.role === "user").length;
        });
      }
    } catch {}
    const aiMaster = totalMessages >= 5;

    let linkedinCount = 0;
    historyList.forEach(item => {
      if (item.category === "LinkedIn" || (item.title && item.title.toLowerCase().includes("linkedin"))) {
        linkedinCount++;
      }
    });
    const linkedinPro = linkedinCount >= 3;

    let customCount = 0;
    try {
      const stored = localStorage.getItem("learning_chat_threads");
      if (stored) {
        const parsed = JSON.parse(stored);
        const suggestionChips = [
          "Generate a cold email for real estate.",
          "Explain B2B lead generation.",
          "Create 10 LinkedIn outreach messages.",
          "Generate a B2B cold call script.",
          "Generate 5 SaaS campaign ideas.",
          "Generate 10 blog content ideas."
        ];
        parsed.forEach(t => {
          t.messages.forEach(m => {
            if (m.role === "user" && !suggestionChips.includes(m.content)) {
              customCount++;
            }
          });
        });
      }
    } catch {}
    const promptEngineer = customCount >= 3;

    return [
      { key: "marketing", title: "Marketing Expert", description: "Read 5 marketing resources", unlocked: marketingExpert, icon: "🎯" },
      { key: "sales", title: "Sales Champion", description: "Watch 5 tutorial videos", unlocked: salesChampion, icon: "🏆" },
      { key: "ai", title: "AI Master", description: "Query the AI Assistant 5 times", unlocked: aiMaster, icon: "⚡" },
      { key: "linkedin", title: "LinkedIn Pro", description: "Study 3 LinkedIn resources", unlocked: linkedinPro, icon: "💼" },
      { key: "prompt", title: "Prompt Engineer", description: "Submit 3 custom prompts", unlocked: promptEngineer, icon: "✍️" }
    ];
  };

  const badgesList = getBadgesState();
  const unlockedBadgesCount = badgesList.filter(b => b.unlocked).length;

  // Dynamic Certification Achievements Evaluator
  const getCertificationsState = () => {
    const marketingCert = totalArticles >= 3 && totalVideos >= 2;
    const salesCert = totalVideos >= 4 && totalArticles >= 2;
    
    const promptEngineerUnlocked = badgesList.find(b => b.key === "prompt")?.unlocked || false;
    const aiCert = totalVideos >= 1 && promptEngineerUnlocked;

    return [
      {
        id: "cert-marketing",
        title: "B2B Growth Marketing Specialist",
        description: "Credentials in B2B content positioning, lead loops, and growth hacking campaigns.",
        progress: Math.min(100, Math.round(((totalArticles / 3) * 0.5 + (totalVideos / 2) * 0.5) * 100)),
        unlocked: marketingCert,
        criteria: "Read 3 articles & Watch 2 videos"
      },
      {
        id: "cert-sales",
        title: "Inbound Sales Associate",
        description: "Credentials in sales discovery frameworks, pipeline, and objection handling.",
        progress: Math.min(100, Math.round(((totalVideos / 4) * 0.6 + (totalArticles / 2) * 0.4) * 100)),
        unlocked: salesCert,
        criteria: "Watch 4 videos & Read 2 articles"
      },
      {
        id: "cert-ai",
        title: "AI Prospecting Professional",
        description: "Credentials in prompt engineering, automated lead scraping, and script generation workflows.",
        progress: aiCert ? 100 : Math.min(99, Math.round(((totalVideos / 1) * 0.4 + (promptEngineerUnlocked ? 1 : 0) * 0.6) * 100)),
        unlocked: aiCert,
        criteria: "Watch 1 video & Unlock Prompt Engineer badge"
      }
    ];
  };

  const certificationsList = getCertificationsState();
  const levelInfo = getLevelInfo(userXp);

  // Leaderboard data sorted dynamically by XP
  const teamMembers = [
    { name: "Sarah Connor", xp: 14400, streak: 10, avatar: "SC", badges: ["marketing", "sales", "linkedin"], isUser: false },
    { name: "John Doe (You)", xp: userXp, streak: streakDays, avatar: "JD", badges: badgesList.filter(b => b.unlocked).map(b => b.key), isUser: true },
    { name: "Bharti Sharma", xp: 7850, streak: 5, avatar: "BS", badges: ["marketing", "linkedin"], isUser: false },
    { name: "Akshay Verma", xp: 6000, streak: 3, avatar: "AV", badges: ["sales"], isUser: false },
    { name: "Emily Watson", xp: 2400, streak: 1, avatar: "EW", badges: [], isUser: false },
  ].sort((a, b) => b.xp - a.xp);

  // Manager console summaries
  const totalTeamHours = (teamMembers.reduce((acc, m) => acc + (m.isUser ? parseFloat((totalTime / 3600).toFixed(1)) : parseFloat((m.xp / 1000).toFixed(1))), 0)).toFixed(1);
  const avgTeamStreak = Math.round(teamMembers.reduce((acc, m) => acc + m.streak, 0) / teamMembers.length);
  const topLearner = teamMembers[0];
  const leastActive = teamMembers[teamMembers.length - 1];

  // AI Assistant Methods
  const createNewThread = () => {
    const newThread = {
      id: `thread-${Date.now()}`,
      title: "New Conversation",
      pinned: false,
      createdAt: new Date().toISOString(),
      messages: []
    };
    const updated = [newThread, ...threads];
    setThreads(updated);
    setActiveThreadId(newThread.id);
    try {
      localStorage.setItem("learning_chat_threads", JSON.stringify(updated));
    } catch {}
  };

  const deleteThread = (id, e) => {
    e.stopPropagation();
    const conf = window.confirm("Are you sure you want to delete this conversation?");
    if (!conf) return;
    const updated = threads.filter(t => t.id !== id);
    setThreads(updated);
    try {
      localStorage.setItem("learning_chat_threads", JSON.stringify(updated));
    } catch {}
    if (activeThreadId === id) {
      if (updated.length > 0) {
        setActiveThreadId(updated[0].id);
      } else {
        setActiveThreadId(null);
      }
    }
  };

  const renameThread = (id, newTitle) => {
    const updated = threads.map(t => {
      if (t.id === id) {
        return { ...t, title: newTitle.trim() || "Untitled" };
      }
      return t;
    });
    setThreads(updated);
    try {
      localStorage.setItem("learning_chat_threads", JSON.stringify(updated));
    } catch {}
  };

  const togglePinThread = (id, e) => {
    e.stopPropagation();
    const updated = threads.map(t => {
      if (t.id === id) {
        return { ...t, pinned: !t.pinned };
      }
      return t;
    });
    setThreads(updated);
    try {
      localStorage.setItem("learning_chat_threads", JSON.stringify(updated));
    } catch {}
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Response copied to clipboard!");
  };

  const exportChat = (thread) => {
    if (!thread || thread.messages.length === 0) return;
    const text = thread.messages
      .map(m => `[${m.role.toUpperCase()}]\n${m.content}\n`)
      .join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${thread.title.replace(/\s+/g, "_")}_transcript.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSendChatMessage = async (overridePrompt = "") => {
    const text = (overridePrompt || chatInput).trim();
    if (!text || chatLoading || !activeThreadId) return;

    setChatInput("");
    
    const userMsg = { role: "user", content: text };
    const currentThread = threads.find(t => t.id === activeThreadId);
    const updatedMessages = [...currentThread.messages, userMsg];
    
    const updatedThreads = threads.map(t => {
      if (t.id === activeThreadId) {
        const title = t.title === "New Conversation" ? (text.slice(0, 30) + (text.length > 30 ? "..." : "")) : t.title;
        return { ...t, title, messages: updatedMessages };
      }
      return t;
    });
    setThreads(updatedThreads);
    try {
      localStorage.setItem("learning_chat_threads", JSON.stringify(updatedThreads));
    } catch {}

    setChatLoading(true);
    addXp(20);

    try {
      const res = await fetch("/api/learning/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Query failed");
      
      const assistantMsg = { role: "assistant", content: data.reply };
      
      const finalThreads = updatedThreads.map(t => {
        if (t.id === activeThreadId) {
          return { ...t, messages: [...updatedMessages, assistantMsg] };
        }
        return t;
      });
      setThreads(finalThreads);
      try {
        localStorage.setItem("learning_chat_threads", JSON.stringify(finalThreads));
      } catch {}
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setChatLoading(false);
    }
  };

  // Sort and filter threads
  const getSortedThreads = () => {
    return [...threads].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  };

  const sortedThreadsList = getSortedThreads();

  const filteredThreadsList = sortedThreadsList.filter(t => {
    const q = searchChatQuery.toLowerCase().trim();
    if (!q) return true;
    return t.title.toLowerCase().includes(q) || t.messages.some(m => m.content.toLowerCase().includes(q));
  });

  return (
    <main className="min-h-screen space-y-6 bg-slate-950 p-6 text-white custom-sidebar-scroll overflow-y-auto">
      {/* Top Header Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-6 shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-4 relative z-10">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-blue-400">
              <Sparkles size={13} className="text-blue-400 animate-pulse" />
              AI Learning & Coaching Portal
            </p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">Enterprise Hub</h1>
            <p className="mt-2 text-sm text-slate-300 leading-relaxed">
              Curate knowledge, build B2B pipeline skills, track daily achievements, and compare progress with the marketing team.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadContent}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Sync Content
            </button>
          </div>
        </div>
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-blue-600/10 blur-[100px] pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-20 h-64 w-64 rounded-full bg-indigo-600/10 blur-[100px] pointer-events-none" />
      </section>

      {/* Sub Navigation menu */}
      <div className="border-b border-slate-800 flex gap-6 text-sm font-semibold tracking-tight pb-3.5">
        <button
          onClick={() => setActiveTab("portal")}
          className={`pb-1 border-b-2 transition-all ${
            activeTab === "portal" ? "border-blue-500 text-white font-bold" : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          Learning Hub
        </button>
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`pb-1 border-b-2 transition-all ${
            activeTab === "dashboard" ? "border-blue-500 text-white font-bold" : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          My Analytics
        </button>
        <button
          onClick={() => setActiveTab("team")}
          className={`pb-1 border-b-2 transition-all ${
            activeTab === "team" ? "border-blue-500 text-white font-bold" : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          Team & Leaderboard
        </button>
        <button
          onClick={() => {
            setActiveTab("chat");
            if (threads.length === 0) createNewThread();
          }}
          className={`pb-1 border-b-2 transition-all ${
            activeTab === "chat" ? "border-blue-500 text-white font-bold" : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          AI Assistant
        </button>
      </div>

      {error ? (
        <section className="rounded-2xl border border-red-900/50 bg-red-950/20 p-4 text-xs font-semibold text-red-400">{error}</section>
      ) : null}

      {/* TAB 1: Learning Hub (Existing Portal Widgets) */}
      {activeTab === "portal" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fadeIn">
          {/* Left Core Area */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Daily focus widget */}
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
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-500 shadow-md transition-all active:scale-95 border-0 cursor-pointer"
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
                  <button onClick={() => scrollVideoRail("left")} className="rounded-lg border border-slate-800 bg-slate-900/60 p-1.5 text-slate-300 hover:bg-slate-800 bg-transparent cursor-pointer">
                    <ChevronLeft size={14} />
                  </button>
                  <button onClick={() => scrollVideoRail("right")} className="rounded-lg border border-slate-800 bg-slate-900/60 p-1.5 text-slate-300 hover:bg-slate-800 bg-transparent cursor-pointer">
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
                    className={`rounded-full px-3.5 py-1 text-xs font-semibold whitespace-nowrap transition-all border-0 cursor-pointer ${
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
                        {cardImage && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={cardImage} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-200" />
                        )}
                        <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                          <PlayCircle size={28} className="text-white drop-shadow-lg" />
                        </div>
                        <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-white">
                          YouTube
                        </span>
                        <button
                          onClick={(e) => toggleBookmark(e, video, "video")}
                          className="absolute top-2 right-2 rounded-lg bg-black/60 p-1.5 text-slate-300 hover:text-amber-400 hover:bg-black transition-colors border-0 cursor-pointer"
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
                  <p className="text-[11px] text-slate-400 mt-0.5">Handpicked B2B resources that rotate daily.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dailyArticlesList.map((article, index) => {
                  const isBookmarked = bookmarks.some(b => b.url === article.url);
                  return (
                    <div
                      key={`${article.url}-${index}`}
                      onClick={() => handleArticleClick(article)}
                      className="p-4 rounded-xl border border-slate-855 bg-slate-900/30 hover:bg-slate-900/70 hover:border-slate-700/60 transition cursor-pointer flex flex-col justify-between relative group"
                    >
                      <button
                        onClick={(e) => toggleBookmark(e, article, "article")}
                        className="absolute top-3 right-3 rounded-lg bg-slate-900/80 p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition border-0 cursor-pointer bg-transparent"
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
                  <p className="text-[11px] text-slate-400 mt-0.5">Top trending B2B assets inside the growth marketing network.</p>
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
                      className="p-3.5 rounded-xl border border-slate-855 bg-slate-900/40 hover:bg-slate-900/80 hover:border-slate-700/60 transition cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group"
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
                            className="rounded-lg border border-slate-800 p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition bg-transparent border-0 cursor-pointer"
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

          {/* Right Sidebar Area */}
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
                  className="rounded-lg border border-slate-800 bg-slate-900/60 p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition bg-transparent cursor-pointer"
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
                        logActivity(0, 1, 0);
                        addXp(50);
                        loadCumulativeStats();
                      }}
                      className="text-[9px] font-bold text-indigo-400 hover:text-indigo-300 tracking-wider uppercase bg-transparent border-0 cursor-pointer"
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
                        logActivity(0, 0, 1);
                        addXp(100);
                        loadCumulativeStats();
                      }}
                      className="text-[9px] font-bold text-blue-400 hover:text-blue-300 tracking-wider uppercase bg-transparent border-0 cursor-pointer"
                      disabled={videosWatchedToday >= 1}
                    >
                      + Log Video
                    </button>
                  </div>
                </div>

                {/* Completion indicator */}
                {(timeProgress >= 100 && articlesProgress >= 100 && videosProgress >= 100) ? (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 flex items-center gap-3">
                    <Award size={32} className="text-amber-500 animate-pulse shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-400">All Goals Completed!</h4>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        Excellent job. You have completed all of your daily objectives!
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-3.5 flex items-center gap-3">
                    <Award size={32} className="text-slate-600 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-300">In Progress</h4>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        Continue reading and learning to achieve your daily targets.
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
                        className="text-slate-500 hover:text-red-400 p-0.5 shrink-0 bg-transparent border-0 cursor-pointer"
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

            {/* Action Plan */}
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
                              addXp(150);
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
                            className="mt-2 rounded bg-slate-800 hover:bg-slate-700 px-2 py-0.5 text-[10px] font-bold text-slate-300 disabled:opacity-50 border-0 cursor-pointer"
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
      )}

      {/* TAB 2: My Analytics (Personal Dashboard & Gamification) */}
      {activeTab === "dashboard" && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* XP & Level Progress Bar */}
          <section className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 to-indigo-950 p-5 shadow-lg relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-2xl shadow-md border border-amber-300/30">
                  ⚡
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                    Level {levelInfo.level}: {levelInfo.title}
                  </h3>
                  <p className="text-xs text-slate-400">Claim certificates and unlock badges by earning XP.</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-amber-400">{userXp} XP</span>
                <span className="text-xs text-slate-500 block">Next Level: {levelInfo.nextThreshold} XP</span>
              </div>
            </div>
            
            <div className="mt-4">
              <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-750">
                <div
                  style={{ width: `${levelInfo.progress}%` }}
                  className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-indigo-500 rounded-full transition-all duration-500"
                />
              </div>
            </div>
            <div className="absolute right-0 bottom-0 h-24 w-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
          </section>

          {/* Main Stat metrics Row */}
          <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="rounded-2xl border border-slate-850 bg-slate-900/40 p-4 text-center shadow-md relative overflow-hidden">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Learning Streak</p>
              <div className="mt-2 flex items-center justify-center gap-1">
                <Flame size={20} className="text-orange-500 fill-orange-500 animate-pulse" />
                <span className="text-2xl font-black text-white">{streakDays} Days</span>
              </div>
              <div className="absolute right-0 bottom-0 h-10 w-10 bg-orange-500/5 rounded-full blur-md" />
            </div>

            <div className="rounded-2xl border border-slate-850 bg-slate-900/40 p-4 text-center shadow-md">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Hours</p>
              <p className="mt-2 text-2xl font-black text-white">{(totalTime / 3600).toFixed(1)} Hrs</p>
            </div>

            <div className="rounded-2xl border border-slate-850 bg-slate-900/40 p-4 text-center shadow-md">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Videos Watched</p>
              <p className="mt-2 text-2xl font-black text-white">{totalVideos}</p>
            </div>

            <div className="rounded-2xl border border-slate-850 bg-slate-900/40 p-4 text-center shadow-md">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Articles Opened</p>
              <p className="mt-2 text-2xl font-black text-white">{totalArticles}</p>
            </div>

            <div className="rounded-2xl border border-slate-850 bg-slate-900/40 p-4 text-center shadow-md col-span-2 md:col-span-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Avg Completion</p>
              <p className="mt-2 text-2xl font-black text-emerald-400">{averageCompletion}%</p>
            </div>
          </section>

          {/* Badges Locker Grid */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/20 p-5 shadow-lg">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Award size={15} className="text-amber-500" />
                Gamification Badges ({unlockedBadgesCount}/5 Unlocked)
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Badges unlock automatically when you achieve the milestone criteria.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {badgesList.map((badge) => (
                <div
                  key={badge.key}
                  className={`p-4 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-2 ${
                    badge.unlocked
                      ? "border-amber-500/40 bg-amber-500/5 shadow-[0_0_15px_rgba(245,158,11,0.08)]"
                      : "border-slate-850 bg-slate-900/10 opacity-40 grayscale"
                  }`}
                >
                  <span className="text-3xl">{badge.icon}</span>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-snug">{badge.title}</h4>
                    <p className="text-[9px] text-slate-400 leading-normal mt-1 max-w-[120px] mx-auto">
                      {badge.description}
                    </p>
                  </div>
                  {badge.unlocked ? (
                    <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[8px] font-bold text-amber-400 uppercase tracking-widest">
                      Unlocked
                    </span>
                  ) : (
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                      Locked
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Certifications Panel */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/20 p-5 shadow-lg">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Award size={15} className="text-indigo-400" />
                Curriculum Certifications
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Pass targets to claim and print your official certificate credentials.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {certificationsList.map((cert) => (
                <div
                  key={cert.id}
                  className={`p-4 rounded-2xl border flex flex-col justify-between gap-4 ${
                    cert.unlocked
                      ? "border-indigo-500/40 bg-indigo-500/5 shadow-[0_0_15px_rgba(99,102,241,0.08)]"
                      : "border-slate-850 bg-slate-905"
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      {cert.unlocked ? "✅ Achieved" : "⏳ In Progress"}
                    </span>
                    <h4 className="text-sm font-black text-white leading-snug mt-1">{cert.title}</h4>
                    <p className="text-[11px] text-slate-400 leading-normal mt-1.5">{cert.description}</p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 mb-1">
                        <span>Progress Criteria: {cert.criteria}</span>
                        <span>{cert.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${cert.progress}%` }}
                          className={`h-full rounded-full ${
                            cert.unlocked ? "bg-indigo-500" : "bg-slate-700"
                          }`}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!cert.unlocked}
                      onClick={() => setClaimedCert(cert)}
                      className="w-full text-center inline-flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold transition border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-500 text-white"
                    >
                      {cert.unlocked ? "Claim Certificate" : "Locked"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Reports Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Weekly Report Graph */}
            <section className="md:col-span-7 rounded-2xl border border-slate-850 bg-slate-900/30 p-5 shadow-lg flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Clock size={15} className="text-blue-400" />
                  Weekly Progress Report
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Daily learning minutes logged during the past 7 days.</p>
              </div>

              <div className="mt-8 h-48 flex items-end justify-between px-2.5 border-b border-slate-800 pb-2">
                {weeklyData.map((day, idx) => {
                  const heightPercent = Math.min(100, Math.round((day.minutes / 60) * 100));
                  return (
                    <div key={idx} className="flex flex-col items-center flex-1 group relative">
                      <div className="absolute bottom-full mb-2 bg-slate-900 border border-slate-800 rounded-lg p-2 text-[10px] opacity-0 group-hover:opacity-100 transition duration-150 pointer-events-none z-10 w-28 text-center shadow-xl">
                        <p className="font-bold text-white">{day.dateLabel}</p>
                        <p className="mt-0.5 text-blue-400">{day.minutes} mins spent</p>
                        <p className="text-slate-500">{day.videos} vids • {day.articles} arts</p>
                      </div>

                      <div className="w-6 sm:w-8 bg-slate-850 rounded-t-md overflow-hidden h-36 flex items-end">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-full bg-gradient-to-t from-blue-600 to-indigo-500 rounded-t-md transition-all duration-500 group-hover:brightness-110"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold mt-2">{day.label}</span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center justify-between text-[10px] text-slate-500 font-semibold uppercase">
                <span>Base: 60 min goal</span>
                <span>Active Streak: {streakDays} days</span>
              </div>
            </section>

            {/* Monthly Report Progress bars */}
            <section className="md:col-span-5 rounded-2xl border border-slate-855 bg-slate-900/30 p-5 shadow-lg flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <TrendingUp size={15} className="text-purple-400" />
                  Monthly Performance
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Summed learning minutes mapped across 4-week blocks.</p>
              </div>

              <div className="mt-6 space-y-4 flex-1 flex flex-col justify-center">
                {monthlyData.map((week, idx) => {
                  const pct = Math.min(100, Math.round((week.minutes / 300) * 100));
                  return (
                    <div key={idx}>
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300 mb-1">
                        <span>{week.label}</span>
                        <span>{week.minutes} min</span>
                      </div>
                      <div className="h-2 w-full bg-slate-850 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${pct}%` }}
                          className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-300"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center">
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Monthly Goal: 1200 mins</span>
                <button
                  onClick={resetAllTrackingStats}
                  className="text-[10px] font-bold text-red-400 hover:text-red-300 uppercase bg-transparent border-0 cursor-pointer"
                >
                  Reset Analytics
                </button>
              </div>
            </section>

          </div>
        </div>
      )}

      {/* TAB 3: Team Leaderboard & Manager View */}
      {activeTab === "team" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fadeIn">
          {/* Left Column (Team Leaderboard) */}
          <section className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-900/20 p-5 shadow-lg">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Award size={15} className="text-amber-500" />
                Team Leaderboard
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Real-time learning ranks based on cumulative XP Points.</p>
            </div>

            <div className="space-y-3">
              {teamMembers.map((member, idx) => {
                const rankColor = idx === 0 ? "text-amber-400" : idx === 1 ? "text-slate-300" : idx === 2 ? "text-amber-600" : "text-slate-500";
                return (
                  <div
                    key={member.name}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition duration-155 ${
                      member.isUser
                        ? "border-blue-500/50 bg-blue-950/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                        : "border-slate-850 bg-slate-900/40 hover:bg-slate-900/80"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-5 font-black text-sm text-center shrink-0 ${rankColor}`}>
                        {idx + 1}
                      </span>
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        member.isUser ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-200"
                      }`}>
                        {member.avatar}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white truncate leading-snug">
                          {member.name}
                        </h4>
                        
                        {/* Member achievements badges line */}
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">🔥 {member.streak}d streak</span>
                          {member.badges.map(bKey => {
                            const matchBadge = badgesList.find(badge => badge.key === bKey);
                            if (!matchBadge) return null;
                            return (
                              <span
                                key={bKey}
                                className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] text-amber-400 font-bold border border-amber-500/10"
                                title={matchBadge.title}
                              >
                                {matchBadge.icon}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-flex rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
                        {member.xp} XP
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Monthly Awards Section */}
            <div className="mt-6 pt-5 border-t border-slate-800">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block mb-3">Monthly Awards</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl border border-slate-850 bg-slate-900/30 text-center">
                  <span className="text-2xl block mb-1">🥇</span>
                  <h4 className="text-[11px] font-bold text-white">Top Learner</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Sarah Connor</p>
                </div>
                <div className="p-3 rounded-xl border border-slate-850 bg-slate-900/30 text-center">
                  <span className="text-2xl block mb-1">🔥</span>
                  <h4 className="text-[11px] font-bold text-white">Super Streak</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Sarah Connor (10 days)</p>
                </div>
                <div className="p-3 rounded-xl border border-slate-850 bg-slate-900/30 text-center">
                  <span className="text-2xl block mb-1">🚀</span>
                  <h4 className="text-[11px] font-bold text-white">Growth Star</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Bharti Sharma</p>
                </div>
              </div>
            </div>
          </section>

          {/* Right Column (Manager View Console) */}
          <section className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-900/30 p-5 shadow-lg space-y-6">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Users size={15} className="text-indigo-400" />
                Manager Console
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Analytics overview of team B2B learning engagement.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-850 bg-slate-900/40 p-3 text-center">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Total Learning Hours</p>
                <p className="mt-1 text-lg font-black text-white">{totalTeamHours} Hrs</p>
              </div>
              <div className="rounded-xl border border-slate-850 bg-slate-900/40 p-3 text-center">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Active Users (Streak)</p>
                <p className="mt-1 text-lg font-black text-amber-400">{avgTeamStreak} Days</p>
              </div>
            </div>

            <div className="space-y-4 pt-2 border-t border-slate-800/80">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block mb-2">Top Performers</span>
                <div className="space-y-2">
                  {teamMembers.slice(0, 2).map((member, idx) => (
                    <div key={member.name} className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xs font-bold text-emerald-400">{idx + 1}</span>
                        <div className="h-7 w-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                          {member.avatar}
                        </div>
                        <h4 className="text-xs font-bold text-white truncate">{member.name}</h4>
                      </div>
                      <span className="text-xs font-bold text-emerald-400 shrink-0">{member.xp} XP</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block mb-2">Needs Encouragement</span>
                <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/5 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-red-955/60 text-red-400 flex items-center justify-center text-xs font-bold shrink-0 border border-red-900/50">
                    {leastActive.avatar}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-red-400 truncate">{leastActive.name}</h4>
                    <p className="text-[10px] text-slate-400 leading-normal mt-0.5">
                      Completed **{leastActive.xp} XP** so far. Reach out to schedule coaching support.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/80">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block mb-3">Team Completion Stats</span>
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between items-center text-slate-300 mb-1">
                    <span>B2B Growth Marketing Specialist</span>
                    <span className="font-bold text-white">80% completion rate</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: "80%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center text-slate-300 mb-1">
                    <span>Inbound Sales Associate</span>
                    <span className="font-bold text-white">60% completion rate</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: "60%" }} />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* TAB 4: ChatGPT-like AI Assistant */}
      {activeTab === "chat" && (
        <div className="flex flex-col md:flex-row rounded-2xl border border-slate-800 bg-slate-900/10 min-h-[500px] h-[65vh] overflow-hidden animate-fadeIn">
          
          {/* Left Panel: Conversations Sidebar */}
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-950/40 p-4 flex flex-col justify-between shrink-0">
            <div className="space-y-3 min-h-0 flex-1 flex flex-col">
              <button
                onClick={createNewThread}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 py-2 text-xs font-bold text-white transition active:scale-95 shadow-md border-0 cursor-pointer"
              >
                + New Chat
              </button>

              <div className="relative">
                <input
                  type="text"
                  value={searchChatQuery}
                  onChange={(e) => setSearchChatQuery(e.target.value)}
                  placeholder="Search chats..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-white outline-none focus:border-slate-700 placeholder-slate-500"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 custom-sidebar-scroll pr-1">
                {filteredThreadsList.length === 0 ? (
                  <p className="text-[11px] text-slate-600 italic text-center py-4">No conversations found</p>
                ) : (
                  filteredThreadsList.map((thread) => {
                    const isActive = thread.id === activeThreadId;
                    const isEditing = thread.id === editingThreadId;
                    return (
                      <div
                        key={thread.id}
                        onClick={() => {
                          if (!isEditing) setActiveThreadId(thread.id);
                        }}
                        className={`p-2.5 rounded-xl flex items-center justify-between gap-2 cursor-pointer transition ${
                          isActive
                            ? "bg-slate-800/80 border border-slate-750 text-white"
                            : "border border-transparent text-slate-400 hover:bg-slate-900/50 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          {thread.pinned ? (
                            <Pin size={11} className="text-amber-500 fill-amber-500 shrink-0 rotation-45" />
                          ) : (
                            <BookOpen size={11} className="text-slate-500 shrink-0" />
                          )}
                          
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onBlur={() => {
                                renameThread(thread.id, editingTitle);
                                setEditingThreadId(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  renameThread(thread.id, editingTitle);
                                  setEditingThreadId(null);
                                }
                              }}
                              autoFocus
                              className="bg-slate-900 border border-slate-700 text-xs text-white px-1.5 py-0.5 rounded outline-none w-full"
                            />
                          ) : (
                            <span
                              onDoubleClick={() => {
                                setEditingThreadId(thread.id);
                                setEditingTitle(thread.title);
                              }}
                              className="text-xs font-semibold truncate select-none"
                              title="Double click to rename"
                            >
                              {thread.title}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity focus-within:opacity-100">
                          <button
                            onClick={(e) => togglePinThread(thread.id, e)}
                            className="text-slate-500 hover:text-amber-400 p-0.5 bg-transparent border-0 cursor-pointer"
                            title={thread.pinned ? "Unpin chat" : "Pin chat"}
                          >
                            <Pin size={10} className={thread.pinned ? "fill-amber-500 text-amber-500" : ""} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingThreadId(thread.id);
                              setEditingTitle(thread.title);
                            }}
                            className="text-slate-500 hover:text-blue-400 p-0.5 bg-transparent border-0 cursor-pointer"
                            title="Rename chat"
                          >
                            <Edit3 size={10} />
                          </button>
                          <button
                            onClick={(e) => deleteThread(thread.id, e)}
                            className="text-slate-500 hover:text-red-400 p-0.5 bg-transparent border-0 cursor-pointer"
                            title="Delete chat"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            
            <div className="pt-3 border-t border-slate-900 text-center">
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">AI Co-Pilot Beta</span>
            </div>
          </div>

          {/* Right Panel: Active Chat Room */}
          {activeThread ? (
            <div className="flex-1 bg-slate-900/10 flex flex-col justify-between overflow-hidden relative">
              
              {/* Chat Panel Header */}
              <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3 bg-slate-950/20">
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-white truncate">{activeThread.title}</h3>
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold mt-0.5">Active Session</p>
                </div>
                
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => togglePinThread(activeThread.id, e)}
                    className={`rounded-lg border border-slate-800 bg-slate-900/50 p-1.5 hover:text-amber-400 transition cursor-pointer border-0 ${
                      activeThread.pinned ? "text-amber-500" : "text-slate-400"
                    }`}
                    title={activeThread.pinned ? "Unpin chat" : "Pin chat"}
                  >
                    <Pin size={12} className={activeThread.pinned ? "fill-amber-500" : ""} />
                  </button>
                  <button
                    onClick={() => exportChat(activeThread)}
                    className="rounded-lg border border-slate-800 bg-slate-900/50 p-1.5 text-slate-400 hover:text-blue-400 transition cursor-pointer border-0 bg-transparent"
                    title="Export transcript"
                  >
                    <FileText size={12} />
                  </button>
                  <button
                    onClick={() => {
                      setEditingThreadId(activeThread.id);
                      setEditingTitle(activeThread.title);
                    }}
                    className="rounded-lg border border-slate-800 bg-slate-900/50 p-1.5 text-slate-400 hover:text-blue-400 transition cursor-pointer border-0 bg-transparent"
                    title="Rename chat"
                  >
                    <Edit3 size={12} />
                  </button>
                  <button
                    onClick={(e) => deleteThread(activeThread.id, e)}
                    className="rounded-lg border border-slate-800 bg-slate-900/50 p-1.5 text-slate-400 hover:text-red-400 transition cursor-pointer border-0 bg-transparent"
                    title="Delete chat"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {/* Chat Messages scroll area */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 [scrollbar-width:thin] bg-slate-955/10">
                {activeThread.messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center h-full max-w-lg mx-auto py-8">
                    <Sparkles size={36} className="text-blue-500 animate-pulse mb-2" />
                    <h4 className="text-sm font-bold text-white">How can I help you today?</h4>
                    <p className="text-xs text-slate-400 mt-1">Ask marketing or sales questions, outline email campaigns, write LinkedIn followups, or generate scripting cold calls.</p>
                    
                    {/* Prompt suggestions grid */}
                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
                      {[
                        "Generate a cold email for real estate.",
                        "Explain B2B lead generation.",
                        "Create 10 LinkedIn outreach messages.",
                        "Generate a B2B cold call script.",
                        "Generate 5 SaaS campaign ideas.",
                        "Generate 10 blog content ideas."
                      ].map((promptText) => (
                        <button
                          key={promptText}
                          onClick={() => handleSendChatMessage(promptText)}
                          className="p-3 text-left rounded-xl border border-slate-850 bg-slate-900/50 hover:bg-slate-900 text-[11px] text-slate-300 hover:text-white font-semibold transition leading-relaxed cursor-pointer"
                        >
                          &ldquo;{promptText}&rdquo;
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  activeThread.messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex flex-col max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-md leading-relaxed ${
                        msg.role === "user"
                          ? "bg-blue-600 text-white self-end ml-auto rounded-tr-none"
                          : "bg-slate-900/80 text-slate-200 mr-auto rounded-tl-none border border-slate-800 relative group"
                      }`}
                    >
                      <span className="text-[9px] font-bold uppercase tracking-widest opacity-60 mb-0.5">
                        {msg.role === "user" ? "You" : "AI Assistant"}
                      </span>
                      <p className="whitespace-pre-line font-medium">{msg.content}</p>
                      
                      {msg.role === "assistant" && (
                        <button
                          onClick={() => copyToClipboard(msg.content)}
                          className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 hover:opacity-100 transition p-1 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
                          title="Copy response"
                        >
                          <Copy size={11} />
                        </button>
                      )}
                    </div>
                  ))
                )}
                {chatLoading && (
                  <div className="bg-slate-900/80 text-slate-200 mr-auto rounded-2xl rounded-tl-none px-4 py-3 text-xs max-w-[85%] border border-slate-855 flex items-center gap-2">
                    <RefreshCw className="animate-spin text-blue-500 shrink-0" size={13} />
                    <span className="font-semibold text-slate-400">Assistant is writing...</span>
                  </div>
                )}
                <div ref={assistantChatBottomRef} />
              </div>

              {/* Chat Input panel */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChatMessage();
                }}
                className="border-t border-slate-800 p-4 bg-slate-955/20 flex gap-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask the AI Assistant..."
                  disabled={chatLoading}
                  className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-white outline-none focus:border-slate-700 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  className="rounded-xl bg-blue-600 hover:bg-blue-500 px-4 text-white transition disabled:opacity-55 active:scale-95 flex items-center justify-center cursor-pointer border-0"
                >
                  <Send size={13} />
                </button>
              </form>

            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              <p className="text-xs font-semibold">Select or create a conversation to start chat</p>
            </div>
          )}

        </div>
      )}

      {/* Printable Certificate Preview Modal */}
      {claimedCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 no-print animate-fadeIn">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
            
            {/* Modal actions panel */}
            <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-bold text-white">Your Certificate Credential</h4>
                <p className="text-[11px] text-slate-400">Achieved by fulfilling curriculum training goals.</p>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 text-xs font-bold transition border-0 cursor-pointer"
                >
                  Print Certificate
                </button>
                <button
                  onClick={() => setClaimedCert(null)}
                  className="rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 p-1.5 bg-transparent cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Certificate Print Area */}
            <div
              id="print-certificate-area"
              className="bg-white text-slate-950 p-8 sm:p-12 rounded-xl border-[12px] border-double border-amber-600 text-center relative overflow-hidden shadow-inner flex flex-col justify-between aspect-[1.414/1] min-h-[420px]"
            >
              <div>
                <span className="text-amber-600 font-extrabold text-xs tracking-widest uppercase block mb-1">
                  OFFICIAL DIPLOMA CREDENTIAL
                </span>
                <div className="h-0.5 w-24 bg-amber-600 mx-auto mb-6" />
                
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight font-serif">
                  Certificate of Completion
                </h2>
                <p className="text-xs text-slate-500 italic mt-3">This B2B qualification is proudly presented to</p>
                
                <h3 className="text-xl sm:text-3xl font-serif font-black text-slate-900 border-b-2 border-slate-300 max-w-md mx-auto py-2 my-2 tracking-tight">
                  John Doe (You)
                </h3>
                
                <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed mt-4">
                  for successfully finishing all curricular learning criteria and demonstrating mastery in B2B tactics, frameworks, and pipeline execution inside:
                </p>
                <p className="text-sm sm:text-lg font-extrabold text-indigo-950 mt-2 font-serif uppercase tracking-normal">
                  {claimedCert.title}
                </p>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-6 max-w-2xl mx-auto w-full">
                <div className="text-center sm:text-left">
                  <span className="block font-serif font-semibold text-sm italic text-indigo-950">AI Lead Coach</span>
                  <div className="h-px w-28 bg-slate-300 my-1 mx-auto sm:mx-0" />
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Authorized Signature</span>
                </div>

                {/* Golden Badge Seal */}
                <div className="h-16 w-16 bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 rounded-full flex items-center justify-center border-4 border-white shadow-lg relative shrink-0">
                  <Award size={32} className="text-white fill-white/10" />
                  <div className="absolute inset-0 rounded-full border border-dashed border-white/40 animate-spin-slow pointer-events-none" />
                </div>

                <div className="text-center sm:text-right">
                  <span className="block font-serif font-semibold text-sm text-indigo-950">
                    {new Date().toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                  </span>
                  <div className="h-px w-28 bg-slate-300 my-1 mx-auto sm:mx-0" />
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Date of Qualification</span>
                </div>
              </div>

              {/* Decorative Corner Seals */}
              <div className="absolute top-3 left-3 h-10 w-10 border-t-2 border-l-2 border-amber-600/30" />
              <div className="absolute top-3 right-3 h-10 w-10 border-t-2 border-r-2 border-amber-600/30" />
              <div className="absolute bottom-3 left-3 h-10 w-10 border-b-2 border-l-2 border-amber-600/30" />
              <div className="absolute bottom-3 right-3 h-10 w-10 border-b-2 border-r-2 border-amber-600/30" />
            </div>

            {/* Local Styles for Print Layout */}
            <style jsx global>{`
              @media print {
                body * {
                  visibility: hidden;
                }
                #print-certificate-area, #print-certificate-area * {
                  visibility: visible;
                }
                #print-certificate-area {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                  height: 100%;
                  background: white !important;
                  color: black !important;
                  border: 12px double #b45309 !important;
                  padding: 50px !important;
                  box-shadow: none !important;
                  display: flex !important;
                  flex-direction: column !important;
                  justify-content: space-between !important;
                }
                .no-print {
                  display: none !important;
                }
              }
            `}</style>

          </div>
        </div>
      )}

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
                  className="rounded-lg border border-slate-350 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-55 shadow-xs bg-transparent cursor-pointer"
                >
                  Picture in Picture
                </button>
                <a
                  href={activeVideo.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-slate-350 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-55 shadow-xs text-center"
                >
                  YouTube
                </a>
                <button onClick={() => setActiveVideo(null)} className="rounded-lg border border-slate-300 p-1.5 hover:bg-slate-100 bg-transparent cursor-pointer">
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
            <button onClick={() => setShowMiniPlayer(false)} className="rounded border border-white/30 px-1.5 py-0.5 text-[10px] hover:bg-slate-800 transition bg-transparent cursor-pointer">
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
