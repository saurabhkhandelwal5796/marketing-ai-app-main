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

// Continue Learning Cards Dataset
const CONTINUE_LEARNING_ITEMS = [
  {
    title: "LinkedIn Outreach Masterclass",
    description: "Learn connection templates and high-converting B2B outreach sequences.",
    duration: "15 min",
    progress: 80,
    url: "https://www.youtube.com/watch?v=qX3H4zG0g5U",
    type: "video",
    category: "LinkedIn",
    id: "cont-1"
  },
  {
    title: "Cold Email Fundamentals",
    description: "Build pipeline deliverability checklists and simple copy templates.",
    duration: "8 min",
    progress: 40,
    url: "https://ahrefs.com/blog/cold-emailing/",
    type: "article",
    category: "Lead Generation",
    id: "cont-2"
  },
  {
    title: "AI Prompt Engineering",
    description: "Chaining prompts for persona analysis, blogs, and ad copy.",
    duration: "12 min",
    progress: 90,
    url: "https://unbounce.com/landing-pages/ai-prompts/",
    type: "article",
    category: "AI Tools",
    id: "cont-3"
  }
];

// Recommended Videos Dataset
const VIDEO_RECOMMENDATIONS = [
  {
    title: "Marketing Fundamentals: 4 Ps of Marketing Explained",
    url: "https://www.youtube.com/watch?v=h95p3fQbGn4",
    takeaway: "Master the classic 4 Ps of marketing: Product, Price, Place, and Promotion with B2B models.",
    category: "Marketing",
    views: "145K views",
    likes: "8.2K likes",
    id: "vid-1",
    duration: "10 min",
    progress: 0
  },
  {
    title: "Complete Digital Marketing Course for Beginners",
    url: "https://www.youtube.com/watch?v=nU-IIXBWlS4",
    takeaway: "Build a solid baseline in SEO, social media advertising, and email funnel setups.",
    category: "Marketing",
    views: "340K views",
    likes: "19K likes",
    id: "vid-2",
    duration: "20 min",
    progress: 10
  },
  {
    title: "B2B Sales Masterclass: Pipeline Generation Strategies",
    url: "https://www.youtube.com/watch?v=k5j4lD6sCik",
    takeaway: "Understand how high-performing B2B reps generate pipeline and manage opportunities.",
    category: "Sales",
    views: "89K views",
    likes: "4.1K likes",
    id: "vid-3",
    duration: "15 min",
    progress: 0
  },
  {
    title: "Modern B2B Sales Framework and Objection Handling",
    url: "https://www.youtube.com/watch?v=zPcr722kH_c",
    takeaway: "Learn how to structure sales discovery calls and resolve common buyer objections.",
    category: "Sales",
    views: "62K views",
    likes: "3.5K likes",
    id: "vid-4",
    duration: "12 min",
    progress: 0
  },
  {
    title: "LinkedIn Organic Outreach and Social Selling Strategy",
    url: "https://www.youtube.com/watch?v=qX3H4zG0g5U",
    takeaway: "Optimize your LinkedIn presence and run organic outreach campaigns.",
    category: "LinkedIn",
    views: "105K views",
    likes: "5.8K likes",
    id: "vid-5",
    duration: "18 min",
    progress: 80
  },
  {
    title: "How to Build a Powerful LinkedIn Profile for Lead Gen",
    url: "https://www.youtube.com/watch?v=d_kI1n85r6s",
    takeaway: "Turn your personal profile into a landing page that attracts inbound clients.",
    category: "LinkedIn",
    views: "74K views",
    likes: "3.9K likes",
    id: "vid-6",
    duration: "15 min",
    progress: 0
  }
];

// Recommended Articles Dataset (Used to select 10 dynamic articles rotating daily)
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
  }
];

// Trending List Content mapped to exact required categories: [Marketing], [Sales], [AI], [LinkedIn]
const TRENDING_CONTENT = [
  {
    title: "B2B SaaS Growth Hacks to Scale ARR",
    url: "https://www.ycombinator.com/library/growth-hacking-saas",
    takeaway: "The product-led growth model and strategic channel diversification.",
    category: "Marketing",
    duration: "10 min",
    progress: 50,
    id: "trend-1"
  },
  {
    title: "Sales Psychology & Closing Frameworks",
    url: "https://www.gong.io/blog/cold-calling-tips/",
    takeaway: "How reps secure key accounts and handle gatekeeper interactions.",
    category: "Sales",
    duration: "12 min",
    progress: 30,
    id: "trend-2"
  },
  {
    title: "AI Prompt Engineering for B2B Content",
    url: "https://unbounce.com/landing-pages/ai-prompts/",
    takeaway: "Writing hyper-personalized copies at scale using ChatGPT templates.",
    category: "AI",
    duration: "15 min",
    progress: 70,
    id: "trend-3"
  },
  {
    title: "LinkedIn Profile Optimization for Inbound Leads",
    url: "https://business.linkedin.com/sales-solutions/blog/social-selling",
    takeaway: "Converting profile visits into pipeline demo requests organically.",
    category: "LinkedIn",
    duration: "8 min",
    progress: 90,
    id: "trend-4"
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
  const accent = variant === "blog" || variant === "article" ? "#4f46e5" : "#2563eb";
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360'>
    <rect width='100%' height='100%' fill='#f8fafc'/>
    <rect x='16' y='16' width='608' height='328' rx='12' fill='white' stroke='#e2e8f0' stroke-width='2'/>
    <text x='40' y='70' fill='${accent}' font-size='20' font-family='Arial' font-weight='800'>${domain}</text>
    <text x='40' y='120' fill='#111827' font-size='26' font-family='Arial' font-weight='700'>${title.replace(/&/g, "&amp;")}</text>
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

// Calculate block character progress bar dynamically
const calculateBlockBar = (progressPct) => {
  const totalBlocks = 10;
  const filledBlocks = Math.round((progressPct / 100) * totalBlocks);
  const emptyBlocks = totalBlocks - filledBlocks;
  return "█".repeat(filledBlocks) + "░".repeat(emptyBlocks) + ` ${progressPct}%`;
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
      { key: "sales", title: "Sales Champion", description: "Watch 5 B2B tutorials", unlocked: salesChampion, icon: "🏆" },
      { key: "ai", title: "AI Master", description: "Query Assistant 5 times", unlocked: aiMaster, icon: "⚡" },
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

  // Recent activity logs array mapped from actual state + fallback templates
  const getRecentActivityList = () => {
    const list = [];
    if (historyList.length > 0) {
      historyList.slice(0, 3).forEach(hist => {
        list.push({
          text: hist.type === "video" ? `Watched "${hist.title}"` : `Read "${hist.title}"`,
          time: new Date(hist.viewedAt).toLocaleDateString()
        });
      });
    }
    
    if (list.length < 4) {
      list.push({ text: 'Generated Prompt "Cold Email sequence"', time: "Today" });
      list.push({ text: "Completed Learning Goal: Time Spent", time: "Today" });
    }
    return list;
  };

  const recentActivityLogs = getRecentActivityList();

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#111827] p-6 custom-sidebar-scroll overflow-y-auto font-sans leading-relaxed">
      
      {/* Top Header Navigation tabs (SaaS Styling) */}
      <section className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <GraduationCap className="text-[#2563EB]" size={28} />
          <h1 className="text-[28px] font-bold text-slate-900 tracking-tight">Learning Center</h1>
        </div>

        <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
          {[
            { id: "portal", label: "Learning Portal" },
            { id: "dashboard", label: "My Progress" },
            { id: "team", label: "Team Leaderboard" },
            { id: "chat", label: "AI Assistant" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === "chat" && threads.length === 0) createNewThread();
              }}
              className={`rounded-lg px-4 py-1.5 text-[13px] font-semibold transition-all border-0 cursor-pointer ${
                activeTab === tab.id
                  ? "bg-white text-[#2563EB] shadow-[0_2px_8px_rgba(0,0,0,0.05)]"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 bg-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {error ? (
        <section className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-600">{error}</section>
      ) : null}

      {/* TAB 1: Learning Hub (Premium SaaS Portal Layout) */}
      {activeTab === "portal" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fadeIn">
          
          {/* Left Area (Core Curriculums) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Welcome Section Banner */}
            <section className="bg-white border border-slate-100 rounded-[16px] p-6 shadow-[0_2px_8px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.08)] hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08),0_16px_32px_rgba(0,0,0,0.12)] transition-all duration-200 ease-out relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2.5">
                <h2 className="text-[24px] font-bold text-slate-900 tracking-tight">Good Morning, Saurabh!</h2>
                <div className="text-[14px] text-slate-600 space-y-1">
                  <p className="font-semibold text-slate-500">Today&apos;s Progress:</p>
                  <ul className="list-disc pl-5 space-y-0.5 text-slate-600">
                    <li>{Math.floor(timeSpentToday / 60) || 45} Minutes Learned</li>
                    <li>{videosWatchedToday || 2} Videos Completed</li>
                    <li>{articlesReadToday || 3} Articles Read</li>
                  </ul>
                </div>
              </div>

              <div className="w-full md:w-64 bg-slate-50 rounded-xl p-4 border border-slate-100 text-center shrink-0">
                <span className="text-[13px] font-semibold text-slate-500 block mb-1">Progress Bar</span>
                <span className="text-sm font-mono font-bold text-[#2563EB] tracking-wide block mb-2 bg-white rounded-lg py-1 border border-slate-200">
                  {calculateBlockBar(averageCompletion || 80)}
                </span>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${averageCompletion || 80}%` }}
                    className="h-full bg-gradient-to-r from-[#2563EB] to-[#4F46E5] rounded-full"
                  />
                </div>
              </div>
            </section>

            {/* Continue Learning Cards Grid */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="text-[#2563EB]" size={20} />
                <h3 className="text-[20px] font-semibold text-slate-900 tracking-tight">Continue Learning</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {CONTINUE_LEARNING_ITEMS.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border border-slate-100 rounded-[16px] p-4 shadow-[0_2px_8px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.08)] hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08),0_16px_32px_rgba(0,0,0,0.12)] transition-all duration-200 ease-out flex flex-col justify-between"
                  >
                    <div>
                      {/* Thumbnail frame representation */}
                      <div className="h-28 w-full bg-slate-100 rounded-xl overflow-hidden mb-3.5 relative group border border-slate-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={getCardImage(item, item.type)} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                          <PlayCircle size={28} className="text-white drop-shadow-md" />
                        </div>
                      </div>

                      <span className="inline-block rounded bg-[#2563EB]/10 px-2 py-0.5 text-[10px] font-bold text-[#2563EB] uppercase tracking-wider mb-2">
                        {item.category}
                      </span>
                      <h4 className="text-[14px] font-bold text-slate-900 leading-snug truncate-2-lines">{item.title}</h4>
                      <p className="text-[13px] text-slate-500 leading-normal mt-1.5 line-clamp-2">{item.description}</p>
                    </div>

                    <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-3">
                      <div className="flex items-center justify-between text-[13px] text-slate-500">
                        <span>Duration: {item.duration}</span>
                        <span className="font-semibold text-slate-700">{item.progress}% progress</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${item.progress}%` }}
                          className="h-full bg-[#2563EB] rounded-full"
                        />
                      </div>
                      <button
                        onClick={() => {
                          if (item.type === "video") {
                            handlePlayVideo(item);
                          } else {
                            handleArticleClick(item);
                          }
                        }}
                        className="w-full text-center inline-flex items-center justify-center py-1.5 rounded-lg text-xs font-bold transition bg-[#2563EB] hover:bg-[#1d4ed8] text-white border-0 cursor-pointer shadow-sm active:scale-95"
                      >
                        Continue
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Recommended For You Video Rail */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Video className="text-[#2563EB]" size={20} />
                  <h3 className="text-[20px] font-semibold text-slate-900 tracking-tight">Recommended For You</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => scrollVideoRail("left")} className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 cursor-pointer">
                    <ChevronLeft size={14} />
                  </button>
                  <button onClick={() => scrollVideoRail("right")} className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 cursor-pointer">
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              <div ref={videoRailRef} className="flex gap-4 overflow-x-auto pb-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {VIDEO_RECOMMENDATIONS.map((video) => {
                  const isBookmarked = bookmarks.some(b => b.url === video.url);
                  return (
                    <div
                      key={video.id}
                      onClick={() => handlePlayVideo(video)}
                      className="min-w-[270px] max-w-[270px] bg-white border border-slate-100 rounded-[16px] p-4 shadow-[0_2px_8px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.08)] hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08),0_16px_32px_rgba(0,0,0,0.12)] transition-all duration-200 ease-out flex flex-col justify-between cursor-pointer"
                    >
                      <div className="relative h-32 w-full bg-slate-100 rounded-xl overflow-hidden mb-3 shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={getCardImage(video, "video")} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                          <PlayCircle size={28} className="text-white" />
                        </div>
                        <button
                          onClick={(e) => toggleBookmark(e, video, "video")}
                          className="absolute top-2 right-2 rounded-lg bg-white/90 p-1.5 text-slate-600 hover:text-amber-500 hover:bg-white transition border-0 cursor-pointer"
                          title="Bookmark"
                        >
                          <Bookmark size={13} className={isBookmarked ? "fill-amber-500 text-amber-500" : ""} />
                        </button>
                      </div>

                      <div>
                        <span className="rounded bg-[#2563EB]/10 px-2 py-0.5 text-[9px] font-bold text-[#2563EB] uppercase tracking-wider">
                          {video.category}
                        </span>
                        <h4 className="mt-2 text-[13px] font-bold text-slate-900 line-clamp-2 leading-snug">
                          {video.title}
                        </h4>
                      </div>

                      <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-[13px] text-slate-500">
                        <span>Duration: {video.duration}</span>
                        <span className="font-semibold text-[#2563EB]">Start Video</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Trending This Week Section */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="text-[#2563EB]" size={20} />
                <h3 className="text-[20px] font-semibold text-slate-900 tracking-tight">Trending This Week</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {TRENDING_CONTENT.map((item) => {
                  const isBookmarked = bookmarks.some(b => b.url === item.url);
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleArticleClick(item)}
                      className="bg-white border border-slate-100 rounded-[16px] p-4 shadow-[0_2px_8px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.08)] hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08),0_16px_32px_rgba(0,0,0,0.12)] transition-all duration-200 ease-out flex flex-col justify-between cursor-pointer relative"
                    >
                      <button
                        onClick={(e) => toggleBookmark(e, item, "article")}
                        className="absolute top-4 right-4 rounded-lg bg-slate-50 p-1.5 text-slate-500 hover:text-amber-500 hover:bg-slate-100 transition border-0 cursor-pointer bg-transparent"
                      >
                        <Bookmark size={13} className={isBookmarked ? "fill-amber-500 text-amber-500" : ""} />
                      </button>

                      <div>
                        <span className="rounded bg-[#4F46E5]/10 px-2 py-0.5 text-[9px] font-bold text-[#4F46E5] uppercase tracking-wider">
                          [{item.category}]
                        </span>
                        <h4 className="mt-2 text-[14px] font-bold text-slate-900 leading-snug pr-6">{item.title}</h4>
                        <p className="mt-1.5 text-[13px] text-slate-500 line-clamp-2">{item.takeaway}</p>
                      </div>

                      <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-[13px] text-slate-500">
                        <span>Duration: {item.duration}</span>
                        <span className="font-semibold text-[#2563EB]">{item.progress}% completed</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

          </div>

          {/* Right Sidebar Area */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* AI Learning Assistant Quick Access Card */}
            <section className="bg-gradient-to-br from-[#2563EB] to-[#4F46E5] text-white rounded-[16px] p-5 shadow-[0_2px_8px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.08)] hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={18} className="text-amber-300 animate-pulse" />
                <h4 className="text-[14px] font-bold uppercase tracking-wider">AI Learning Assistant</h4>
              </div>
              
              <p className="text-[20px] font-semibold leading-snug">
                &ldquo;Ask me anything about Sales, Marketing or AI&rdquo;
              </p>
              
              <div className="mt-5">
                <button
                  onClick={() => {
                    setActiveTab("chat");
                    if (threads.length === 0) createNewThread();
                  }}
                  className="w-full text-center inline-flex items-center justify-center py-2 rounded-xl text-xs font-bold transition bg-white hover:bg-slate-50 text-[#2563EB] border-0 cursor-pointer shadow-md active:scale-95"
                >
                  Launch Assistant Chat
                </button>
              </div>
              <div className="absolute -right-6 -bottom-6 h-20 w-20 bg-white/10 rounded-full blur-xl pointer-events-none" />
            </section>

            {/* Daily Goals Panel */}
            <section className="bg-white border border-slate-100 rounded-[16px] p-4 shadow-[0_2px_8px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.08)] hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08),0_16px_32px_rgba(0,0,0,0.12)] transition-all duration-200 ease-out">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="text-[#F59E0B] fill-[#F59E0B]" size={16} />
                  <h3 className="text-[14px] font-bold text-slate-900">Daily Goal Tracker</h3>
                </div>
                <button
                  type="button"
                  onClick={resetDailyGoals}
                  className="rounded-lg border border-slate-200 p-1 text-slate-400 hover:text-slate-600 cursor-pointer bg-transparent"
                >
                  <RotateCcw size={12} />
                </button>
              </div>

              <div className="space-y-3.5">
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold mb-1 text-slate-500">
                    <span>Time Spent (30 min target)</span>
                    <span>{Math.floor(timeSpentToday / 60)}m / 30m</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div style={{ width: `${timeProgress}%` }} className="h-full bg-[#F59E0B] rounded-full" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-semibold mb-1 text-slate-500">
                    <span>Articles (3 target)</span>
                    <span>{articlesReadToday} / 3 read</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div style={{ width: `${articlesProgress}%` }} className="h-full bg-indigo-500 rounded-full" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-semibold mb-1 text-slate-500">
                    <span>Videos (1 target)</span>
                    <span>{videosWatchedToday} / 1 video</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div style={{ width: `${videosProgress}%` }} className="h-full bg-blue-500 rounded-full" />
                  </div>
                </div>
              </div>
            </section>

            {/* Recent Activity Log list */}
            <section className="bg-white border border-slate-100 rounded-[16px] p-4 shadow-[0_2px_8px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.08)] hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08),0_16px_32px_rgba(0,0,0,0.12)] transition-all duration-200 ease-out">
              <div className="mb-4 flex items-center gap-2">
                <Clock className="text-[#2563EB]" size={16} />
                <h3 className="text-[14px] font-bold text-slate-900">Recent Activity</h3>
              </div>

              <div className="space-y-3">
                {recentActivityLogs.map((activity, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-[13px] text-slate-600 border-l-2 border-slate-200 pl-3 py-0.5">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 line-clamp-1">{activity.text}</p>
                      <span className="text-[10px] text-slate-400 font-semibold">{activity.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Saved Bookmarks */}
            <section className="bg-white border border-slate-100 rounded-[16px] p-4 shadow-[0_2px_8px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.08)] hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08),0_16px_32px_rgba(0,0,0,0.12)] transition-all duration-200 ease-out">
              <div className="mb-4 flex items-center gap-2">
                <Bookmark className="text-[#2563EB]" size={16} />
                <h3 className="text-[14px] font-bold text-slate-900">Saved Bookmarks</h3>
              </div>

              {bookmarks.length === 0 ? (
                <p className="text-[13px] text-slate-400 italic text-center py-2">No bookmarks saved yet</p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto custom-sidebar-scroll pr-1">
                  {bookmarks.map((bm) => (
                    <div
                      key={bm.url}
                      onClick={() => bm.type === "video" ? handlePlayVideo(bm) : handleArticleClick(bm)}
                      className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100/80 transition flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#2563EB] bg-[#2563EB]/10 px-1.5 py-0.5 rounded">
                          {bm.type}
                        </span>
                        <h4 className="mt-1 text-[13px] font-bold text-slate-900 truncate">{bm.title}</h4>
                      </div>
                      <button
                        onClick={(e) => toggleBookmark(e, bm, bm.type)}
                        className="text-slate-400 hover:text-red-500 p-0.5 shrink-0 bg-transparent border-0 cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

          </div>
        </div>
      )}

      {/* TAB 2: My Progress (Light-themed Analytics & Badges) */}
      {activeTab === "dashboard" && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Level Progress */}
          <section className="bg-white border border-slate-100 rounded-[16px] p-6 shadow-[0_2px_8px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.08)] hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08),0_16px_32px_rgba(0,0,0,0.12)] transition-all duration-200 ease-out">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-400 to-[#F59E0B] flex items-center justify-center text-2xl shadow-sm">
                  ⚡
                </div>
                <div>
                  <h3 className="text-[20px] font-semibold text-slate-900 leading-tight">
                    Level {levelInfo.level}: {levelInfo.title}
                  </h3>
                  <p className="text-[13px] text-slate-500 mt-0.5">Claim certifications and unlock badges by earning XP.</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[24px] font-bold text-slate-900">{userXp} XP</span>
                <span className="text-[13px] text-slate-500 block">Next Level Threshold: {levelInfo.nextThreshold} XP</span>
              </div>
            </div>
            
            <div className="mt-4">
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  style={{ width: `${levelInfo.progress}%` }}
                  className="h-full bg-gradient-to-r from-[#2563EB] via-[#4F46E5] to-indigo-600 rounded-full"
                />
              </div>
            </div>
          </section>

          {/* Stats Grid */}
          <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: "Learning Streak", value: `${streakDays} Days`, icon: "🔥", color: "text-[#F59E0B]" },
              { label: "Total Hours", value: `${(totalTime / 3600).toFixed(1)} Hrs`, icon: "⏰", color: "text-[#2563EB]" },
              { label: "Videos Watched", value: totalVideos, icon: "📺", color: "text-[#4F46E5]" },
              { label: "Articles Opened", value: totalArticles, icon: "📄", color: "text-purple-600" },
              { label: "Avg Completion", value: `${averageCompletion}%`, icon: "🏆", color: "text-[#22C55E]" }
            ].map((stat, idx) => (
              <div key={idx} className="bg-white border border-slate-100 rounded-[16px] p-4 text-center shadow-[0_2px_8px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.08)] hover:-translate-y-0.5 transition-all duration-200">
                <span className="text-[13px] font-semibold text-slate-500 block">{stat.label}</span>
                <div className="mt-2 flex items-center justify-center gap-1.5">
                  <span className="text-xl">{stat.icon}</span>
                  <span className={`text-[24px] font-bold text-slate-900`}>{stat.value}</span>
                </div>
              </div>
            ))}
          </section>

          {/* Badges locker */}
          <section className="bg-white border border-slate-100 rounded-[16px] p-5 shadow-[0_2px_8px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.08)] hover:-translate-y-0.5 transition-all duration-200">
            <div className="mb-4">
              <h3 className="text-[20px] font-semibold text-slate-900 tracking-tight">
                Gamification Badges ({unlockedBadgesCount}/5 Unlocked)
              </h3>
              <p className="text-[13px] text-slate-500 mt-0.5">Earn XP and unlock specific B2B marketing badges.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {badgesList.map((badge) => (
                <div
                  key={badge.key}
                  className={`p-4 rounded-xl border text-center transition flex flex-col items-center justify-center gap-2 ${
                    badge.unlocked
                      ? "border-amber-300 bg-amber-50/20 shadow-sm"
                      : "border-slate-100 bg-slate-50 opacity-40 grayscale"
                  }`}
                >
                  <span className="text-3xl">{badge.icon}</span>
                  <div>
                    <h4 className="text-[13px] font-bold text-slate-900 leading-snug">{badge.title}</h4>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-[120px] leading-normal">{badge.description}</p>
                  </div>
                  {badge.unlocked ? (
                    <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-[#F59E0B] uppercase tracking-wider">
                      Unlocked
                    </span>
                  ) : (
                    <span className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Locked
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Certifications Locker */}
          <section className="bg-white border border-slate-100 rounded-[16px] p-5 shadow-[0_2px_8px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.08)] hover:-translate-y-0.5 transition-all duration-200">
            <div className="mb-4">
              <h3 className="text-[20px] font-semibold text-slate-900 tracking-tight">Curriculum Certifications</h3>
              <p className="text-[13px] text-slate-500 mt-0.5">Syllabus completions that unlock downloadable certifications.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {certificationsList.map((cert) => (
                <div
                  key={cert.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between gap-4 ${
                    cert.unlocked
                      ? "border-indigo-200 bg-indigo-50/10"
                      : "border-slate-150 bg-slate-50/50"
                  }`}
                >
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      {cert.unlocked ? "✅ Completed" : "⏳ In Progress"}
                    </span>
                    <h4 className="text-[14px] font-bold text-slate-900 leading-snug mt-1">{cert.title}</h4>
                    <p className="text-[13px] text-slate-500 leading-normal mt-1.5">{cert.description}</p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1">
                        <span>Target: {cert.criteria}</span>
                        <span>{cert.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${cert.progress}%` }}
                          className={`h-full rounded-full ${
                            cert.unlocked ? "bg-[#4F46E5]" : "bg-slate-400"
                          }`}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!cert.unlocked}
                      onClick={() => setClaimedCert(cert)}
                      className="w-full text-center inline-flex items-center justify-center py-1.5 rounded-lg text-xs font-bold transition border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-[#4F46E5] hover:bg-indigo-700 text-white shadow-sm"
                    >
                      {cert.unlocked ? "Claim Certificate" : "Locked"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Reports charts */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Weekly Progress Bar Chart */}
            <section className="md:col-span-7 bg-white border border-slate-100 rounded-[16px] p-5 shadow-[0_2px_8px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.08)] hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between">
              <div>
                <h3 className="text-[14px] font-bold text-slate-900 flex items-center gap-1.5">
                  <Clock className="text-[#2563EB]" size={15} />
                  Weekly Progress Report
                </h3>
                <p className="text-[13px] text-slate-500 mt-0.5">Minutes logged per day over the last 7 calendar days.</p>
              </div>

              <div className="mt-8 h-48 flex items-end justify-between px-2.5 border-b border-slate-200 pb-2">
                {weeklyData.map((day, idx) => {
                  const heightPercent = Math.min(100, Math.round((day.minutes / 60) * 100));
                  return (
                    <div key={idx} className="flex flex-col items-center flex-1 group relative">
                      <div className="absolute bottom-full mb-2 bg-slate-900 border border-slate-800 rounded-lg p-2 text-[10px] opacity-0 group-hover:opacity-100 transition duration-150 pointer-events-none z-10 w-28 text-center text-white shadow-xl">
                        <p className="font-bold">{day.dateLabel}</p>
                        <p className="mt-0.5 text-blue-400">{day.minutes} mins spent</p>
                      </div>

                      <div className="w-6 sm:w-8 bg-slate-100 rounded-t-md overflow-hidden h-36 flex items-end">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-full bg-gradient-to-t from-[#2563EB] to-[#4F46E5] rounded-t-md transition-all duration-500"
                        />
                      </div>
                      <span className="text-[11px] text-slate-500 font-semibold mt-2">{day.label}</span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500 font-semibold uppercase">
                <span>Base Target: 60 mins</span>
                <span>Active Streak: {streakDays} days</span>
              </div>
            </section>

            {/* Monthly Report Progress list */}
            <section className="md:col-span-5 bg-white border border-slate-100 rounded-[16px] p-5 shadow-[0_2px_8px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.08)] hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between">
              <div>
                <h3 className="text-[14px] font-bold text-slate-900 flex items-center gap-1.5">
                  <TrendingUp className="text-[#4F46E5]" size={15} />
                  Monthly Performance
                </h3>
                <p className="text-[13px] text-slate-500 mt-0.5">Summed learning minutes mapped across 4-week blocks.</p>
              </div>

              <div className="mt-6 space-y-4 flex-1 flex flex-col justify-center">
                {monthlyData.map((week, idx) => {
                  const pct = Math.min(100, Math.round((week.minutes / 300) * 100));
                  return (
                    <div key={idx}>
                      <div className="flex items-center justify-between text-[13px] font-semibold text-slate-600 mb-1">
                        <span>{week.label}</span>
                        <span>{week.minutes} min</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${pct}%` }}
                          className="h-full bg-gradient-to-r from-[#4F46E5] to-[#2563EB] rounded-full"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center">
                <span className="text-[11px] text-slate-500 font-semibold uppercase">Goal: 1200 mins</span>
                <button
                  onClick={resetAllTrackingStats}
                  className="text-[11px] font-bold text-red-500 hover:text-red-700 uppercase bg-transparent border-0 cursor-pointer"
                >
                  Reset Progress
                </button>
              </div>
            </section>

          </div>
        </div>
      )}

      {/* TAB 3: Team Leaderboard & Manager Console */}
      {activeTab === "team" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fadeIn">
          
          {/* Leaderboard panel */}
          <section className="lg:col-span-7 bg-white border border-slate-100 rounded-[16px] p-5 shadow-[0_2px_8px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.08)] hover:-translate-y-0.5 transition-all duration-200">
            <div className="mb-4">
              <h3 className="text-[20px] font-semibold text-slate-900 tracking-tight">Team Leaderboard</h3>
              <p className="text-[13px] text-slate-500 mt-0.5">Real-time ranks based on cumulative XP Points.</p>
            </div>

            <div className="space-y-3">
              {teamMembers.map((member, idx) => {
                const rankColor = idx === 0 ? "text-amber-500" : idx === 1 ? "text-slate-400" : idx === 2 ? "text-amber-700" : "text-slate-500";
                return (
                  <div
                    key={member.name}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition ${
                      member.isUser
                        ? "border-[#2563EB]/50 bg-blue-50/30"
                        : "border-slate-100 bg-slate-50/50 hover:bg-slate-100/50"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-5 font-black text-sm text-center shrink-0 ${rankColor}`}>
                        {idx + 1}
                      </span>
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        member.isUser ? "bg-[#2563EB] text-white" : "bg-slate-200 text-slate-700"
                      }`}>
                        {member.avatar}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[13px] font-bold text-slate-900 truncate">
                          {member.name}
                        </h4>
                        
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">🔥 {member.streak}d streak</span>
                          {member.badges.map(bKey => {
                            const matchBadge = badgesList.find(badge => badge.key === bKey);
                            if (!matchBadge) return null;
                            return (
                              <span
                                key={bKey}
                                className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] text-amber-600 font-bold border border-amber-500/10"
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
                      <span className="inline-flex rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-800 shadow-sm">
                        {member.xp} XP
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Monthly Awards */}
            <div className="mt-6 pt-5 border-t border-slate-150">
              <span className="text-[13px] font-semibold text-slate-500 block mb-3">Monthly Awards</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl border border-slate-100 bg-slate-50 text-center">
                  <span className="text-2xl block mb-1">🥇</span>
                  <h4 className="text-[11px] font-bold text-slate-800">Learner of the Month</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Sarah Connor</p>
                </div>
                <div className="p-3 rounded-xl border border-slate-100 bg-slate-50 text-center">
                  <span className="text-2xl block mb-1">🔥</span>
                  <h4 className="text-[11px] font-bold text-slate-800">Super Streak</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Sarah Connor (10 days)</p>
                </div>
                <div className="p-3 rounded-xl border border-slate-100 bg-slate-50 text-center">
                  <span className="text-2xl block mb-1">🚀</span>
                  <h4 className="text-[11px] font-bold text-slate-800">Growth Star</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Bharti Sharma</p>
                </div>
              </div>
            </div>
          </section>

          {/* Manager view widgets */}
          <section className="lg:col-span-5 bg-white border border-slate-100 rounded-[16px] p-5 shadow-[0_2px_8px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.08)] hover:-translate-y-0.5 transition-all duration-200 space-y-6">
            <div>
              <h3 className="text-[20px] font-semibold text-slate-900 tracking-tight">Manager View</h3>
              <p className="text-[13px] text-slate-500 mt-0.5">Overall analytics tracking for the marketing department.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-center">
                <span className="text-[13px] font-semibold text-slate-500 block">Total Learning Hours</span>
                <p className="mt-1 text-[24px] font-bold text-slate-900">{totalTeamHours} Hrs</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-center">
                <span className="text-[13px] font-semibold text-slate-500 block">Active Users (Streak)</span>
                <p className="mt-1 text-[24px] font-bold text-amber-500">{avgTeamStreak} Days</p>
              </div>
            </div>

            <div className="space-y-4 pt-2 border-t border-slate-150">
              <div>
                <span className="text-[13px] font-semibold text-slate-500 block mb-2">Top Performers</span>
                <div className="space-y-2">
                  {teamMembers.slice(0, 2).map((member, idx) => (
                    <div key={member.name} className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/10 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xs font-bold text-emerald-600">{idx + 1}</span>
                        <div className="h-7 w-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                          {member.avatar}
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 truncate">{member.name}</h4>
                      </div>
                      <span className="text-xs font-bold text-emerald-600 shrink-0">{member.xp} XP</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[13px] font-semibold text-slate-500 block mb-2">Needs Support Check-in</span>
                <div className="p-3 rounded-xl border border-red-100 bg-red-50/10 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold shrink-0">
                    {leastActive.avatar}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-red-600 truncate">{leastActive.name}</h4>
                    <p className="text-[12px] text-slate-500 mt-0.5">
                      Acquired **{leastActive.xp} XP** so far. Reach out to schedule a learning check-in.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-150">
              <span className="text-[13px] font-semibold text-slate-500 block mb-3">Team Course Completion</span>
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between items-center text-slate-600 mb-1">
                    <span>B2B Growth Marketing Specialist</span>
                    <span className="font-bold text-slate-800">80% completed</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#2563EB] rounded-full" style={{ width: "80%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center text-slate-600 mb-1">
                    <span>Inbound Sales Associate</span>
                    <span className="font-bold text-slate-800">60% completed</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#2563EB] rounded-full" style={{ width: "60%" }} />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* TAB 4: ChatGPT-like AI Assistant */}
      {activeTab === "chat" && (
        <div className="flex flex-col md:flex-row rounded-[16px] border border-slate-200 bg-white min-h-[500px] h-[65vh] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.08)] animate-fadeIn">
          
          {/* Sidebar Chat list */}
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/50 p-4 flex flex-col justify-between shrink-0">
            <div className="space-y-3 min-h-0 flex-1 flex flex-col">
              <button
                onClick={createNewThread}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1d4ed8] py-2 text-xs font-bold text-white transition active:scale-95 shadow border-0 cursor-pointer"
              >
                + New Chat
              </button>

              <div className="relative">
                <input
                  type="text"
                  value={searchChatQuery}
                  onChange={(e) => setSearchChatQuery(e.target.value)}
                  placeholder="Search chats..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-400 placeholder-slate-400"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 custom-sidebar-scroll pr-1">
                {filteredThreadsList.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic text-center py-4">No conversations found</p>
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
                        className={`p-2.5 rounded-lg flex items-center justify-between gap-2 cursor-pointer transition ${
                          isActive
                            ? "bg-slate-100 border border-slate-200 text-[#2563EB] font-bold"
                            : "border border-transparent text-slate-600 hover:bg-slate-100/50 hover:text-slate-900"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          {thread.pinned ? (
                            <Pin size={11} className="text-amber-500 fill-amber-500 shrink-0 rotation-45" />
                          ) : (
                            <BookOpen size={11} className="text-slate-400 shrink-0" />
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
                              className="bg-white border border-slate-300 text-xs text-slate-800 px-1.5 py-0.5 rounded outline-none w-full"
                            />
                          ) : (
                            <span
                              onDoubleClick={() => {
                                setEditingThreadId(thread.id);
                                setEditingTitle(thread.title);
                              }}
                              className="text-xs truncate select-none"
                              title="Double click to rename"
                            >
                              {thread.title}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity focus-within:opacity-100">
                          <button
                            onClick={(e) => togglePinThread(thread.id, e)}
                            className="text-slate-400 hover:text-amber-500 p-0.5 bg-transparent border-0 cursor-pointer"
                          >
                            <Pin size={10} className={thread.pinned ? "fill-amber-500 text-amber-500" : ""} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingThreadId(thread.id);
                              setEditingTitle(thread.title);
                            }}
                            className="text-slate-400 hover:text-blue-500 p-0.5 bg-transparent border-0 cursor-pointer"
                          >
                            <Edit3 size={10} />
                          </button>
                          <button
                            onClick={(e) => deleteThread(thread.id, e)}
                            className="text-slate-400 hover:text-red-500 p-0.5 bg-transparent border-0 cursor-pointer"
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
          </div>

          {/* Active Message area */}
          {activeThread ? (
            <div className="flex-1 bg-white flex flex-col justify-between overflow-hidden relative">
              
              {/* Chat Header */}
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 bg-slate-50/30">
                <div className="min-w-0">
                  <h3 className="text-[14px] font-bold text-slate-900 truncate">{activeThread.title}</h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mt-0.5">Active Assistant Session</p>
                </div>
                
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => togglePinThread(activeThread.id, e)}
                    className={`rounded-lg border border-slate-200 bg-white p-1.5 hover:text-amber-500 transition cursor-pointer border-0 ${
                      activeThread.pinned ? "text-amber-500" : "text-slate-400"
                    }`}
                  >
                    <Pin size={12} className={activeThread.pinned ? "fill-amber-500" : ""} />
                  </button>
                  <button
                    onClick={() => exportChat(activeThread)}
                    className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 hover:text-[#2563EB] transition cursor-pointer border-0"
                    title="Export transcript"
                  >
                    <FileText size={12} />
                  </button>
                  <button
                    onClick={() => {
                      setEditingThreadId(activeThread.id);
                      setEditingTitle(activeThread.title);
                    }}
                    className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 hover:text-[#2563EB] transition cursor-pointer border-0"
                  >
                    <Edit3 size={12} />
                  </button>
                  <button
                    onClick={(e) => deleteThread(activeThread.id, e)}
                    className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 hover:text-red-500 transition cursor-pointer border-0"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {/* Chat Messages scroll area */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 [scrollbar-width:thin] bg-slate-50/20">
                {activeThread.messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center h-full max-w-lg mx-auto py-8">
                    <Sparkles size={36} className="text-[#2563EB] mb-2" />
                    <h4 className="text-[20px] font-semibold text-slate-900 tracking-tight">How can I help you today?</h4>
                    <p className="text-[13px] text-slate-500 mt-1">Ask questions, generate email templates, LinkedIn messages, or campaign ideas.</p>
                    
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
                          className="p-3 text-left rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[11px] text-slate-700 hover:text-slate-900 font-semibold transition leading-relaxed cursor-pointer"
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
                      className={`flex flex-col max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-[#2563EB] text-white self-end ml-auto rounded-tr-none"
                          : "bg-slate-100 text-slate-800 mr-auto rounded-tl-none border border-slate-150 relative group"
                      }`}
                    >
                      <span className="text-[9px] font-bold uppercase tracking-widest opacity-60 mb-0.5">
                        {msg.role === "user" ? "You" : "AI Assistant"}
                      </span>
                      <p className="whitespace-pre-line font-medium">{msg.content}</p>
                      
                      {msg.role === "assistant" && (
                        <button
                          onClick={() => copyToClipboard(msg.content)}
                          className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 hover:opacity-100 transition p-1 rounded bg-white border border-slate-250 text-slate-500 hover:text-[#2563EB] cursor-pointer"
                          title="Copy response"
                        >
                          <Copy size={11} />
                        </button>
                      )}
                    </div>
                  ))
                )}
                {chatLoading && (
                  <div className="bg-slate-100 text-slate-800 mr-auto rounded-2xl rounded-tl-none px-4 py-3 text-xs max-w-[85%] border border-slate-200 flex items-center gap-2">
                    <RefreshCw className="animate-spin text-[#2563EB] shrink-0" size={13} />
                    <span className="font-semibold text-slate-500">Assistant is writing...</span>
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
                className="border-t border-slate-200 p-4 bg-white flex gap-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask the AI Assistant..."
                  disabled={chatLoading}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-800 outline-none focus:border-slate-350 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  className="rounded-xl bg-[#2563EB] hover:bg-[#1d4ed8] px-4 text-white transition disabled:opacity-55 active:scale-95 flex items-center justify-center cursor-pointer border-0"
                >
                  <Send size={13} />
                </button>
              </form>

            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              <p className="text-xs font-semibold">Select or create a conversation to start chat</p>
            </div>
          )}

        </div>
      )}

      {/* Printable Certificate Modal */}
      {claimedCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 no-print animate-fadeIn">
          <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl relative text-slate-900">
            
            {/* Modal Actions */}
            <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h4 className="text-[14px] font-bold text-slate-900">Curriculum Certificate</h4>
                <p className="text-[11px] text-slate-500">Claimed after completing curriculum goals.</p>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1d4ed8] text-white px-3.5 py-1.5 text-xs font-bold transition border-0 cursor-pointer shadow"
                >
                  Print Certificate
                </button>
                <button
                  onClick={() => setClaimedCert(null)}
                  className="rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 p-1.5 bg-transparent cursor-pointer"
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
                  OFFICIAL CURRICULUM CERTIFICATE
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

              {/* Decorative corners */}
              <div className="absolute top-3 left-3 h-10 w-10 border-t-2 border-l-2 border-amber-600/30" />
              <div className="absolute top-3 right-3 h-10 w-10 border-t-2 border-r-2 border-amber-600/30" />
              <div className="absolute bottom-3 left-3 h-10 w-10 border-b-2 border-l-2 border-amber-600/30" />
              <div className="absolute bottom-3 right-3 h-10 w-10 border-b-2 border-r-2 border-amber-600/30" />
            </div>

            {/* Print Layout styling */}
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

      {/* Video Player Modal */}
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

      {/* Mini Player */}
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
