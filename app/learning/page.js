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

// Lookup Level Info from XP
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
  const [currentUser, setCurrentUser] = useState(null);
  
  // Real Database Records States (derived from audit logs)
  const [userLogs, setUserLogs] = useState([]);
  const [allUsersCount, setAllUsersCount] = useState(0);
  const [usersList, setUsersList] = useState([]);
  const [teamLogsSummary, setTeamLogsSummary] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);

  // Recommendations loaded dynamically via APIs
  const [recommendedVideos, setRecommendedVideos] = useState([]);
  const [videosLoading, setVideosLoading] = useState(true);
  const [recommendedArticles, setRecommendedArticles] = useState([]);
  const [articlesLoading, setArticlesLoading] = useState(true);

  // Active playing video modals
  const [activeVideo, setActiveVideo] = useState(null);
  const [showMiniPlayer, setShowMiniPlayer] = useState(false);
  const [miniPlayerVideo, setMiniPlayerVideo] = useState(null);

  // Navigation tabs (portal | dashboard | team)
  const [activeTab, setActiveTab] = useState("portal");

  // Portal lists, filters, bookmarks, history
  const [selectedVideoTab, setSelectedVideoTab] = useState("All");
  const [bookmarks, setBookmarks] = useState([]);
  const [historyList, setHistoryList] = useState([]);
  const [claimedCert, setClaimedCert] = useState(null);

  const videoRailRef = useRef(null);

  // Fetch all real database records
  const fetchRealData = useCallback(async () => {
    try {
      // 1. Fetch current profile
      const profileRes = await fetch("/api/auth/profile");
      const profileData = await profileRes.json();
      if (profileRes.ok && profileData?.user) {
        setCurrentUser(profileData.user);
      }

      // 2. Fetch active user's audit logs
      const auditRes = await fetch("/api/audit?limit=200");
      const auditData = await auditRes.json();
      if (auditRes.ok && Array.isArray(auditData.records)) {
        setUserLogs(auditData.records);
      }

      // 3. Fetch users list
      const usersRes = await fetch("/api/users?pageSize=50");
      const usersData = await usersRes.json();
      if (usersRes.ok && Array.isArray(usersData.users)) {
        setUsersList(usersData.users);
        setAllUsersCount(usersData.count || usersData.users.length);
      }

      // 4. Fetch team activity summaries (if admin)
      const summaryRes = await fetch("/api/audit?summary=true&days=30");
      const summaryData = await summaryRes.json();
      if (summaryRes.ok && Array.isArray(summaryData.userSummaries)) {
        setTeamLogsSummary(summaryData.userSummaries);
      }
    } catch (e) {
      console.error("Failed to load real database records:", e);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  // Fetch Dynamic Recommended Articles (Verified URLs)
  const fetchArticles = useCallback(async () => {
    setArticlesLoading(true);
    try {
      const res = await fetch("/api/learning/resources");
      const data = await res.json();
      if (res.ok && Array.isArray(data.articles)) {
        setRecommendedArticles(data.articles);
      } else {
        setRecommendedArticles([]);
      }
    } catch {
      setRecommendedArticles([]);
    } finally {
      setArticlesLoading(false);
    }
  }, []);

  // Fetch Dynamic Recommended Videos (YouTube Search Scraper results)
  const fetchVideos = useCallback(async () => {
    setVideosLoading(true);
    try {
      const cat = selectedVideoTab === "All" ? "B2B Marketing" : selectedVideoTab;
      const res = await fetch(`/api/learning/youtube?category=${encodeURIComponent(cat)}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.videos)) {
        setRecommendedVideos(data.videos);
      } else {
        setRecommendedVideos([]);
      }
    } catch {
      setRecommendedVideos([]);
    } finally {
      setVideosLoading(false);
    }
  }, [selectedVideoTab]);

  // Initial mount load
  useEffect(() => {
    fetchRealData();
    fetchArticles();
  }, [fetchRealData, fetchArticles]);

  // Refetch videos when category tab switches
  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // Load local state bookmarks, history list, chats on mount
  useEffect(() => {
    try {
      const storedBookmarks = localStorage.getItem("learning_bookmarks");
      if (storedBookmarks) setBookmarks(JSON.parse(storedBookmarks));

      const storedHistory = localStorage.getItem("learning_history");
      if (storedHistory) setHistoryList(JSON.parse(storedHistory));

    } catch {}
  }, []);

  // Real-time time spent tracking interval (POSTs 10-second ticks to the database audit log)
  const postTimeSpentTick = useCallback(async () => {
    try {
      const currentUserId = await getCurrentUserId();
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: currentUserId || "anonymous",
          event_type: "page_visit",
          page_name: "Learning",
          time_spent_ms: 10000,
          session_id: getCurrentSessionId()
        })
      });
      if (res.ok) {
        // Refresh local userLogs list to sync state in real-time
        const auditRes = await fetch("/api/audit?limit=200");
        const auditData = await auditRes.json();
        if (auditRes.ok && Array.isArray(auditData.records)) {
          setUserLogs(auditData.records);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      postTimeSpentTick();
    }, 10000);
    return () => clearInterval(timer);
  }, [postTimeSpentTick]);



  // Real Database-Derived Calculations
  const getTodayLogs = () => {
    const startOfToday = new Date();
    startOfToday.setHours(0,0,0,0);
    return userLogs.filter(r => new Date(r.created_at) >= startOfToday);
  };

  const todayLogs = getTodayLogs();

  // 1. Today's Minutes Learned
  const todayVisitLogs = todayLogs.filter(r => r.event_type === "page_visit" && r.page_name === "Learning" && r.time_spent_ms);
  const todayTimeSpentMs = todayVisitLogs.reduce((acc, r) => acc + (r.time_spent_ms || 0), 0);
  const todayMinutes = Math.round(todayTimeSpentMs / 60000);

  // 2. Today's Completed Videos
  const todayVideosLogs = todayLogs.filter(r => r.event_type === "action" && r.action_name === "Started Learning Video");
  const todayVideosCount = new Set(todayVideosLogs.map(r => r.details || "")).size;

  // 3. Today's Completed Articles
  const todayArticlesLogs = todayLogs.filter(r => r.event_type === "action" && r.action_name === "Opened Article");
  const todayArticlesCount = new Set(todayArticlesLogs.map(r => r.details || "")).size;

  // Daily target bounds
  const timeProgress = Math.min(100, Math.round((todayMinutes / 30) * 100));
  const articlesProgress = Math.min(100, Math.round((todayArticlesCount / 3) * 100));
  const videosProgress = Math.min(100, Math.round((todayVideosCount / 1) * 100));
  const averageCompletion = Math.round((timeProgress + articlesProgress + videosProgress) / 3);

  // Daily Goal Completion Trigger
  useEffect(() => {
    if (timeProgress >= 100 && articlesProgress >= 100 && videosProgress >= 100) {
      const todayStr = new Date().toDateString();
      try {
        const claimedDate = localStorage.getItem("learning_daily_goal_claimed_date");
        if (claimedDate !== todayStr) {
          localStorage.setItem("learning_daily_goal_claimed_date", todayStr);
          
          // Log daily goal completion to database
          (async () => {
            const currentUserId = await getCurrentUserId();
            await fetch("/api/audit", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                user_id: currentUserId || "anonymous",
                event_type: "action",
                page_name: "Learning",
                action_name: "Completed Learning Goal",
                details: "Achieved daily target: 30m time, 3 articles read, 1 video watched",
                session_id: getCurrentSessionId()
              })
            });
            fetchRealData();
          })();
          alert("🎉 Daily Goal Achieved! +200 XP awarded!");
        }
      } catch {}
    }
  }, [timeProgress, articlesProgress, videosProgress, fetchRealData]);

  // 4. Cumulative Database Stats
  const getCumulativeStats = () => {
    // Total Videos Watched
    const videoLogs = userLogs.filter(r => r.event_type === "action" && r.action_name === "Started Learning Video");
    const totalVideos = new Set(videoLogs.map(r => r.details || "")).size;

    // Total Articles Opened
    const articleLogs = userLogs.filter(r => r.event_type === "action" && r.action_name === "Opened Article");
    const totalArticles = new Set(articleLogs.map(r => r.details || "")).size;

    // Total Minutes Learned
    const visitLogs = userLogs.filter(r => r.event_type === "page_visit" && r.page_name === "Learning" && r.time_spent_ms);
    const totalTimeMs = visitLogs.reduce((acc, r) => acc + (r.time_spent_ms || 0), 0);
    const totalMinutes = Math.round(totalTimeMs / 60000);

    // Last Activity Date
    const learningLogs = userLogs.filter(r => r.page_name === "Learning");
    const lastActivityDate = learningLogs.length > 0
      ? new Date(learningLogs[0].created_at).toLocaleDateString()
      : "No activity recorded";

    // Streak Days consecutive visit check
    const calculateStreak = () => {
      const learningVisits = userLogs.filter(r => r.page_name === "Learning" && r.event_type === "page_visit");
      if (learningVisits.length === 0) return 0;
      
      const dates = [...new Set(learningVisits.map(r => new Date(r.created_at).toDateString()))]
        .map(d => new Date(d))
        .sort((a, b) => b - a);

      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const diffToLatest = getCalendarDaysDiff(dates[0], today);
      if (diffToLatest > 1) return 0; // Streak broken

      streak = 1;
      for (let i = 0; i < dates.length - 1; i++) {
        const diff = getCalendarDaysDiff(dates[i + 1], dates[i]);
        if (diff === 1) {
          streak++;
        } else if (diff > 1) {
          break;
        }
      }
      return streak;
    };

    const streakDays = calculateStreak();

    // XP calculation strictly from database logs
    const calculateXp = () => {
      let xp = 0;
      
      // 10 XP per minute
      xp += totalMinutes * 10;
      // 100 XP per unique video played
      xp += totalVideos * 100;
      // 50 XP per unique article opened
      xp += totalArticles * 50;
      // 20 XP per chat query
      const chatLogs = userLogs.filter(r => r.action_name === "Sent AI Chat query");
      xp += chatLogs.length * 20;

      // 200 XP daily goal completion bonus count
      const goalLogs = userLogs.filter(r => r.action_name === "Completed Learning Goal");
      xp += goalLogs.length * 200;

      return xp;
    };

    const xp = calculateXp();

    return { totalVideos, totalArticles, totalMinutes, lastActivityDate, streakDays, xp };
  };

  const dbStats = getCumulativeStats();

  // 5. Dynamic Badge Locker (checks database log milestones)
  const getBadgesState = () => {
    const chatLogs = userLogs.filter(r => r.action_name === "Sent AI Chat query");
    const allOpenedItems = [...new Set([
      ...userLogs.filter(r => r.event_type === "action" && r.action_name === "Started Learning Video").map(r => r.details || ""),
      ...userLogs.filter(r => r.event_type === "action" && r.action_name === "Opened Article").map(r => r.details || "")
    ])];

    const marketingExpert = dbStats.totalArticles >= 5;
    const salesChampion = dbStats.totalVideos >= 5;
    const aiMaster = chatLogs.length >= 5;
    
    const linkedinCount = allOpenedItems.filter(title => (title || "").toLowerCase().includes("linkedin")).length;
    const linkedinPro = linkedinCount >= 3;

    const starterChips = [
      "Generate a cold email for real estate.",
      "Explain B2B lead generation.",
      "Create 10 LinkedIn outreach messages.",
      "Generate a B2B cold call script.",
      "Generate 5 SaaS campaign ideas.",
      "Generate 10 blog content ideas."
    ];
    const customChatsCount = chatLogs.filter(r => !starterChips.includes(r.details || "")).length;
    const promptEngineer = customChatsCount >= 3;

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

  // 6. Dynamic Syllabus Credentials (checks database log milestones)
  const getCertificationsState = () => {
    const marketingCert = dbStats.totalArticles >= 3 && dbStats.totalVideos >= 2;
    const salesCert = dbStats.totalVideos >= 4 && dbStats.totalArticles >= 2;
    
    const promptEngineerUnlocked = badgesList.find(b => b.key === "prompt")?.unlocked || false;
    const aiCert = dbStats.totalVideos >= 1 && promptEngineerUnlocked;

    return [
      {
        id: "cert-marketing",
        title: "B2B Growth Marketing Specialist",
        description: "Credentials in B2B content positioning, lead loops, and growth hacking campaigns.",
        progress: Math.min(100, Math.round(((dbStats.totalArticles / 3) * 0.5 + (dbStats.totalVideos / 2) * 0.5) * 100)),
        unlocked: marketingCert,
        criteria: "Read 3 articles & Watch 2 videos"
      },
      {
        id: "cert-sales",
        title: "Inbound Sales Associate",
        description: "Credentials in sales discovery frameworks, pipeline, and objection handling.",
        progress: Math.min(100, Math.round(((dbStats.totalVideos / 4) * 0.6 + (dbStats.totalArticles / 2) * 0.4) * 100)),
        unlocked: salesCert,
        criteria: "Watch 4 videos & Read 2 articles"
      },
      {
        id: "cert-ai",
        title: "AI Prospecting Professional",
        description: "Credentials in prompt engineering, automated lead scraping, and script generation workflows.",
        progress: aiCert ? 100 : Math.min(99, Math.round(((dbStats.totalVideos / 1) * 0.4 + (promptEngineerUnlocked ? 1 : 0) * 0.6) * 100)),
        unlocked: aiCert,
        criteria: "Watch 1 video & Unlock Prompt Engineer badge"
      }
    ];
  };

  const certificationsList = getCertificationsState();
  const levelInfo = getLevelInfo(dbStats.xp);

  // 7. Team Leaderboard list mapped strictly from database Users & Summaries
  const getRealTeamMembers = () => {
    if (allUsersCount <= 1) return [];

    return usersList.map(u => {
      const summary = teamLogsSummary.find(s => s.user.id === u.id) || { timeSpentMsToday: 0, actionsToday: 0 };
      const minutes = Math.round(summary.timeSpentMsToday / 60000);
      const calculatedXp = (minutes * 10) + (summary.actionsToday * 50);

      return {
        name: u.name,
        xp: u.id === currentUser?.id ? dbStats.xp : calculatedXp,
        streak: u.id === currentUser?.id ? dbStats.streakDays : (calculatedXp > 0 ? 1 : 0),
        avatar: u.name.slice(0, 2).toUpperCase(),
        badges: u.id === currentUser?.id ? badgesList.filter(b => b.unlocked).map(b => b.key) : [],
        isUser: u.id === currentUser?.id
      };
    }).sort((a, b) => b.xp - a.xp);
  };

  const teamMembers = getRealTeamMembers();

  // 8. Weekly report breakdown dynamically from user's logs (last 7 days)
  const getWeeklyReportData = () => {
    const days = [];
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toDateString();
      
      const dayLogs = userLogs.filter(r => new Date(r.created_at).toDateString() === dateStr);
      const dayVisitLogs = dayLogs.filter(r => r.event_type === "page_visit" && r.page_name === "Learning" && r.time_spent_ms);
      const dayTimeMs = dayVisitLogs.reduce((acc, r) => acc + (r.time_spent_ms || 0), 0);
      
      days.push({
        label: weekdays[d.getDay()],
        dateLabel: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        minutes: Math.round(dayTimeMs / 60000),
      });
    }
    return days;
  };

  const weeklyData = getWeeklyReportData();

  // 9. Monthly report breakdown dynamically from user's logs (last 28 days)
  const getMonthlyReportData = () => {
    const weeks = [
      { label: "Week 1 (1-7 days ago)", minutes: 0 },
      { label: "Week 2 (8-14 days ago)", minutes: 0 },
      { label: "Week 3 (15-21 days ago)", minutes: 0 },
      { label: "Week 4 (22-28 days ago)", minutes: 0 }
    ];

    userLogs.forEach(log => {
      if (log.event_type !== "page_visit" || log.page_name !== "Learning" || !log.time_spent_ms) return;
      const logDate = new Date(log.created_at);
      const today = new Date();
      const diffDays = getCalendarDaysDiff(logDate, today);
      const mins = log.time_spent_ms / 60000;
      
      if (diffDays >= 0 && diffDays < 7) {
        weeks[0].minutes += mins;
      } else if (diffDays >= 7 && diffDays < 14) {
        weeks[1].minutes += mins;
      } else if (diffDays >= 14 && diffDays < 21) {
        weeks[2].minutes += mins;
      } else if (diffDays >= 21 && diffDays < 28) {
        weeks[3].minutes += mins;
      }
    });

    weeks.forEach(w => w.minutes = Math.round(w.minutes));
    return weeks;
  };

  const monthlyData = getMonthlyReportData();

  // 10. Trending content calculated dynamically from team summaries
  const getRealTrendingContent = () => {
    if (allUsersCount <= 1) return [];

    const counts = {};
    userLogs.forEach(r => {
      if (r.event_type === "action" && (r.action_name === "Opened Article" || r.action_name === "Started Learning Video")) {
        const title = (r.details || "").replace("Read: ", "").replace("Watched: ", "");
        counts[title] = (counts[title] || 0) + 1;
      }
    });
    
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([title, count]) => {
        const isVideo = userLogs.some(r => (r.details || "").includes(title) && r.action_name === "Started Learning Video");
        return {
          title,
          category: isVideo ? "Video" : "Article",
          views: `${count} views in org`,
          progress: 100,
          id: `trend-${title}`
        };
      });
  };

  const trendingList = getRealTrendingContent();

  // AI Assistant usage metrics
  const getAiChatUsageStats = () => {
    const chatLogs = userLogs.filter(r => r.action_name === "Sent AI Chat query");
    const totalQuestions = chatLogs.length;
    const lastChatDate = chatLogs.length > 0
      ? new Date(chatLogs[0].created_at).toLocaleDateString()
      : "No activity recorded";
    return { totalChats: threads.length, totalQuestions, lastChatDate };
  };

  const chatUsageStats = getAiChatUsageStats();

  // Interactive action handlers
  const handleArticleClick = (item) => {
    // Log action to database
    (async () => {
      const currentUserId = await getCurrentUserId();
      await fetch("/api/audit", {
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
      });
      fetchRealData();
    })();

    // Append to local history list
    const entry = { ...item, type: "article", viewedAt: new Date().toISOString() };
    const updatedHistory = [entry, ...historyList.filter(h => h.url !== item.url)].slice(0, 5);
    setHistoryList(updatedHistory);
    try {
      localStorage.setItem("learning_history", JSON.stringify(updatedHistory));
    } catch {}

    window.open(item.url, "_blank");
  };

  const handlePlayVideo = (video) => {
    // Log action to database
    (async () => {
      const currentUserId = await getCurrentUserId();
      await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: currentUserId || "anonymous",
          event_type: "action",
          page_name: "Learning",
          action_name: "Started Learning Video",
          details: `Watched: ${String(video?.title || "Untitled Video")}`,
          session_id: getCurrentSessionId(),
        }),
      });
      fetchRealData();
    })();

    // Append to local history list
    const entry = { ...video, type: "video", viewedAt: new Date().toISOString() };
    const updatedHistory = [entry, ...historyList.filter(h => h.url !== video.url)].slice(0, 5);
    setHistoryList(updatedHistory);
    try {
      localStorage.setItem("learning_history", JSON.stringify(updatedHistory));
    } catch {}

    setActiveVideo(video);
    setShowMiniPlayer(false);
  };

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

  const scrollVideoRail = (direction) => {
    if (!videoRailRef.current) return;
    const amount = direction === "left" ? -400 : 400;
    videoRailRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  const resetAllTrackingStats = async () => {
    const conf = window.confirm("Are you sure you want to reset all your learning activity logs and database records?");
    if (!conf) return;
    try {
      // Clear local storage metrics
      localStorage.removeItem("learning_bookmarks");
      localStorage.removeItem("learning_history");
      localStorage.removeItem("learning_daily_goal_claimed_date");
      setBookmarks([]);
      setHistoryList([]);
      
      // Wipe audit logs for current user (via backend endpoint or simulated call)
      await fetch("/api/audit/cleanup", { method: "POST" });
      fetchRealData();
    } catch {}
  };

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

    // Log chat query to database audit logs
    (async () => {
      const currentUserId = await getCurrentUserId();
      await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: currentUserId || "anonymous",
          event_type: "action",
          page_name: "Learning",
          action_name: "Sent AI Chat query",
          details: text.slice(0, 100),
          session_id: getCurrentSessionId()
        })
      });
      fetchRealData();
    })();

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
    <main className="min-h-screen bg-[#F8FAFC] text-[#111827] p-6 overflow-y-auto font-sans leading-relaxed">
      
      {/* Top Header Navigation tabs */}
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

      {logsLoading ? (
        <section className="py-12 flex flex-col items-center justify-center text-slate-500">
          <RefreshCw className="animate-spin text-[#2563EB] mb-2" size={24} />
          <p className="text-xs font-semibold">Loading real database analytics...</p>
        </section>
      ) : (
        <>
          {/* TAB 1: Learning Hub */}
          {activeTab === "portal" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fadeIn">
              
              {/* Left Main Stream */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* Welcome Section Banner */}
                <section className="bg-white border border-slate-100 rounded-[16px] p-6 shadow-[0_2px_8px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.08)] hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08),0_16px_32px_rgba(0,0,0,0.12)] transition-all duration-200 ease-out relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="space-y-2.5">
                    <h2 className="text-[24px] font-bold text-slate-900 tracking-tight">
                      Good Morning, {currentUser?.first_name || currentUser?.name || "Saurabh"}!
                    </h2>
                    <div className="text-[14px] text-slate-600 space-y-1">
                      <p className="font-semibold text-slate-500">Today&apos;s Progress:</p>
                      <ul className="list-disc pl-5 space-y-0.5 text-slate-600">
                        <li>{todayMinutes} Minutes Learned</li>
                        <li>{todayVideosCount} Videos Completed</li>
                        <li>{todayArticlesCount} Articles Read</li>
                      </ul>
                    </div>
                  </div>

                  <div className="w-full md:w-64 bg-slate-50 rounded-xl p-4 border border-slate-100 text-center shrink-0">
                    <span className="text-[13px] font-semibold text-slate-500 block mb-1">Progress Bar</span>
                    <span className="text-sm font-mono font-bold text-[#2563EB] tracking-wide block mb-2 bg-white rounded-lg py-1 border border-slate-200">
                      {calculateBlockBar(averageCompletion)}
                    </span>
                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${averageCompletion}%` }}
                        className="h-full bg-gradient-to-r from-[#2563EB] to-[#4F46E5] rounded-full"
                      />
                    </div>
                  </div>
                </section>

                {/* Continue Learning Grid (loaded dynamically from actual activity logs) */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Clock className="text-[#2563EB]" size={20} />
                    <h3 className="text-[20px] font-semibold text-slate-900 tracking-tight">Continue Learning</h3>
                  </div>

                  {historyList.length === 0 ? (
                    <div className="bg-white border border-slate-100 rounded-[16px] p-6 text-center shadow-[0_2px_8px_rgba(0,0,0,.05)]">
                      <p className="text-[13px] text-slate-500 italic">No learning history found. Explore recommendations below to get started!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {historyList.slice(0, 3).map((item) => (
                        <div
                          key={item.url}
                          className="bg-white border border-slate-100 rounded-[16px] p-4 shadow-[0_2px_8px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.08)] hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08),0_16px_32px_rgba(0,0,0,0.12)] transition-all duration-200 ease-out flex flex-col justify-between"
                        >
                          <div>
                            <div className="h-28 w-full bg-slate-100 rounded-xl overflow-hidden mb-3.5 relative border border-slate-100">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={getCardImage(item, item.type)} alt="" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                                <PlayCircle size={28} className="text-white drop-shadow-md" />
                              </div>
                            </div>

                            <span className="inline-block rounded bg-[#2563EB]/10 px-2 py-0.5 text-[10px] font-bold text-[#2563EB] uppercase tracking-wider mb-2">
                              {item.category || item.type}
                            </span>
                            <h4 className="text-[14px] font-bold text-slate-900 leading-snug line-clamp-2">{item.title}</h4>
                            <p className="text-[13px] text-slate-500 leading-normal mt-1.5 line-clamp-2">
                              {item.takeaway || item.description || "Continue exploring this resources."}
                            </p>
                          </div>

                          <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-3">
                            <div className="flex items-center justify-between text-[13px] text-slate-500">
                              <span>Duration: {item.duration || item.readTime || "5m"}</span>
                              <span className="font-semibold text-slate-700">Resume learning</span>
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
                              Resume
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Recommended Videos (Real YouTube Search Feed) */}
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

                  <div className="flex gap-2 bg-slate-150 p-1 rounded-xl w-max max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {["All", "Marketing", "Sales", "LinkedIn", "Cold Calling", "Lead Generation", "AI Tools"].map(tab => (
                      <button
                        key={tab}
                        onClick={() => setSelectedVideoTab(tab)}
                        className={`rounded-lg px-3 py-1 text-xs font-bold transition border-0 cursor-pointer ${
                          selectedVideoTab === tab
                            ? "bg-white text-[#2563EB] shadow-xs"
                            : "text-slate-550 hover:text-slate-800 bg-transparent"
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {videosLoading ? (
                    <div className="py-12 text-center text-slate-400">
                      <RefreshCw className="animate-spin mx-auto text-[#2563EB] mb-2" size={20} />
                      <p className="text-xs">Fetching real YouTube recommendations...</p>
                    </div>
                  ) : recommendedVideos.length === 0 ? (
                    <div className="bg-white border border-slate-100 rounded-[16px] p-6 text-center shadow-[0_2px_8px_rgba(0,0,0,.05)]">
                      <p className="text-[13px] text-slate-500 italic">No recommended videos available.</p>
                    </div>
                  ) : (
                    <div ref={videoRailRef} className="flex gap-4 overflow-x-auto pb-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {recommendedVideos.map((video) => {
                        const isBookmarked = bookmarks.some(b => b.url === video.url);
                        return (
                          <div
                            key={video.id}
                            onClick={() => handlePlayVideo(video)}
                            className="min-w-[270px] max-w-[270px] bg-white border border-slate-100 rounded-[16px] p-4 shadow-[0_2px_8px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.08)] hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08),0_16px_32px_rgba(0,0,0,0.12)] transition-all duration-200 ease-out flex flex-col justify-between cursor-pointer"
                          >
                            <div className="relative h-32 w-full bg-slate-100 rounded-xl overflow-hidden mb-3 shrink-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={video.thumbnail || getCardImage(video, "video")} alt="" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                                <PlayCircle size={28} className="text-white" />
                              </div>
                              <button
                                onClick={(e) => toggleBookmark(e, video, "video")}
                                className="absolute top-2 right-2 rounded-lg bg-white/90 p-1.5 text-slate-600 hover:text-amber-505 hover:bg-white transition border-0 cursor-pointer"
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
                              <span>{video.views}</span>
                              <span className="font-semibold text-[#2563EB]">Start Video</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* Recommended Articles Section (Dynamic Verified links) */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <BookOpen className="text-[#2563EB]" size={20} />
                    <h3 className="text-[20px] font-semibold text-slate-900 tracking-tight">Recommended Articles</h3>
                  </div>

                  {articlesLoading ? (
                    <div className="py-12 text-center text-slate-400">
                      <RefreshCw className="animate-spin mx-auto text-[#2563EB] mb-2" size={20} />
                      <p className="text-xs">Verifying and loading B2B article pools...</p>
                    </div>
                  ) : recommendedArticles.length === 0 ? (
                    <div className="bg-white border border-slate-100 rounded-[16px] p-6 text-center shadow-[0_2px_8px_rgba(0,0,0,.05)]">
                      <p className="text-[13px] text-slate-550 italic">No verified learning resources available.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {recommendedArticles.slice(0, 10).map((art) => {
                        const isBookmarked = bookmarks.some(b => b.url === art.url);
                        return (
                          <div
                            key={art.id}
                            onClick={() => handleArticleClick(art)}
                            className="bg-white border border-slate-100 rounded-[16px] p-4 shadow-[0_2px_8px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.08)] hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08),0_16px_32px_rgba(0,0,0,0.12)] transition-all duration-200 ease-out flex flex-col justify-between cursor-pointer relative"
                          >
                            <button
                              onClick={(e) => toggleBookmark(e, art, "article")}
                              className="absolute top-4 right-4 rounded-lg bg-slate-50 p-1.5 text-slate-500 hover:text-amber-500 hover:bg-slate-100 transition border-0 cursor-pointer"
                            >
                              <Bookmark size={13} className={isBookmarked ? "fill-amber-500 text-amber-500" : ""} />
                            </button>

                            <div>
                              <span className="rounded bg-[#4F46E5]/10 px-2 py-0.5 text-[9px] font-bold text-[#4F46E5] uppercase tracking-wider">
                                {art.category}
                              </span>
                              <h4 className="mt-2 text-[14px] font-bold text-slate-900 leading-snug pr-6">{art.title}</h4>
                              <p className="mt-1.5 text-[13px] text-slate-500 line-clamp-2">{art.takeaway}</p>
                            </div>

                            <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-[13px] text-slate-500">
                              <span>{art.readTime}</span>
                              <span className="font-semibold text-[#2563EB] inline-flex items-center gap-1">
                                Open Article <ExternalLink size={12} />
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* Trending This Week Section (Aggregated from real database records) */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="text-[#2563EB]" size={20} />
                    <h3 className="text-[20px] font-semibold text-slate-900 tracking-tight">Trending This Week</h3>
                  </div>

                  {allUsersCount <= 1 ? (
                    <div className="bg-white border border-slate-100 rounded-[16px] p-6 text-center shadow-[0_2px_8px_rgba(0,0,0,.05)]">
                      <p className="text-[13px] text-slate-500 italic">Not enough data to calculate trending content. Waiting for team activity.</p>
                    </div>
                  ) : trendingList.length === 0 ? (
                    <div className="bg-white border border-slate-100 rounded-[16px] p-6 text-center shadow-[0_2px_8px_rgba(0,0,0,.05)]">
                      <p className="text-[13px] text-slate-500 italic">No recommendations available.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {trendingList.map((item) => (
                        <div
                          key={item.id}
                          className="bg-white border border-slate-100 rounded-[16px] p-4 shadow-[0_2px_8px_rgba(0,0,0,.05)] flex flex-col justify-between"
                        >
                          <div>
                            <span className="rounded bg-[#4F46E5]/10 px-2 py-0.5 text-[9px] font-bold text-[#4F46E5] uppercase tracking-wider">
                              [{item.category}]
                            </span>
                            <h4 className="mt-2 text-[14px] font-bold text-slate-900 leading-snug">{item.title}</h4>
                          </div>

                          <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-[13px] text-slate-500 font-semibold">
                            <span>{item.views}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

              </div>

              {/* Right Sidebar */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* AI Learning Assistant Card */}
                <section className="bg-gradient-to-br from-[#2563EB] to-[#4F46E5] text-white rounded-[16px] p-5 shadow-[0_2px_8px_rgba(0,0,0,.05)] relative overflow-hidden">
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
                </section>

                {/* Daily Goals Panel */}
                <section className="bg-white border border-slate-100 rounded-[16px] p-4 shadow-[0_2px_8px_rgba(0,0,0,.05)]">
                  <div className="mb-4 flex items-center gap-2">
                    <Flame className="text-[#F59E0B] fill-[#F59E0B]" size={16} />
                    <h3 className="text-[14px] font-bold text-slate-900">Daily Goal Tracker</h3>
                  </div>

                  <div className="space-y-3.5">
                    <div>
                      <div className="flex items-center justify-between text-xs font-semibold mb-1 text-slate-500">
                        <span>Time Spent (30 min target)</span>
                        <span>{todayMinutes}m / 30m</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div style={{ width: `${timeProgress}%` }} className="h-full bg-[#F59E0B] rounded-full" />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs font-semibold mb-1 text-slate-500">
                        <span>Articles (3 target)</span>
                        <span>{todayArticlesCount} / 3 read</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div style={{ width: `${articlesProgress}%` }} className="h-full bg-indigo-500 rounded-full" />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs font-semibold mb-1 text-slate-500">
                        <span>Videos (1 target)</span>
                        <span>{todayVideosCount} / 1 video</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div style={{ width: `${videosProgress}%` }} className="h-full bg-blue-500 rounded-full" />
                      </div>
                    </div>
                  </div>
                </section>

                {/* Recent Activity Log list */}
                <section className="bg-white border border-slate-100 rounded-[16px] p-4 shadow-[0_2px_8px_rgba(0,0,0,.05)]">
                  <div className="mb-4 flex items-center gap-2">
                    <Clock className="text-[#2563EB]" size={16} />
                    <h3 className="text-[14px] font-bold text-slate-900">Recent Activity</h3>
                  </div>

                  {userLogs.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-2">No activity recorded.</p>
                  ) : (
                    <div className="space-y-3">
                      {userLogs.slice(0, 4).map((activity, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-[13px] text-slate-600 border-l-2 border-slate-200 pl-3 py-0.5">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-800 line-clamp-1">
                              {activity.action_name || activity.event_type} {activity.details ? ` - ${activity.details}` : ""}
                            </p>
                            <span className="text-[10px] text-slate-400 font-semibold">
                              {new Date(activity.created_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Saved Bookmarks */}
                <section className="bg-white border border-slate-100 rounded-[16px] p-4 shadow-[0_2px_8px_rgba(0,0,0,.05)]">
                  <div className="mb-4 flex items-center gap-2">
                    <Bookmark className="text-[#2563EB]" size={16} />
                    <h3 className="text-[14px] font-bold text-slate-900">Saved Bookmarks</h3>
                  </div>

                  {bookmarks.length === 0 ? (
                    <p className="text-[13px] text-slate-400 italic text-center py-2">No bookmarks saved yet</p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {bookmarks.map((bm) => (
                        <div
                          key={bm.url}
                          onClick={() => bm.type === "video" ? handlePlayVideo(bm) : handleArticleClick(bm)}
                          className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100/85 transition flex items-center justify-between gap-2 cursor-pointer"
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

          {/* TAB 2: My Progress */}
          {activeTab === "dashboard" && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Level Progress */}
              <section className="bg-white border border-slate-100 rounded-[16px] p-6 shadow-[0_2px_8px_rgba(0,0,0,.05)]">
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
                    <span className="text-[24px] font-bold text-slate-900">{dbStats.xp} XP</span>
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
                  { label: "Learning Streak", value: `${dbStats.streakDays} Days`, icon: "🔥" },
                  { label: "Total Minutes", value: `${dbStats.totalMinutes} Mins`, icon: "⏰" },
                  { label: "Videos Played", value: dbStats.totalVideos, icon: "📺" },
                  { label: "Articles Opened", value: dbStats.totalArticles, icon: "📄" },
                  { label: "Goal Progress", value: `${averageCompletion}%`, icon: "🏆" }
                ].map((stat, idx) => (
                  <div key={idx} className="bg-white border border-slate-100 rounded-[16px] p-4 text-center shadow-[0_2px_8px_rgba(0,0,0,.05)]">
                    <span className="text-[13px] font-semibold text-slate-500 block">{stat.label}</span>
                    <div className="mt-2 flex items-center justify-center gap-1.5">
                      <span className="text-xl">{stat.icon}</span>
                      <span className="text-[24px] font-bold text-slate-900">{stat.value}</span>
                    </div>
                  </div>
                ))}
              </section>

              {/* Badges locker */}
              <section className="bg-white border border-slate-100 rounded-[16px] p-5 shadow-[0_2px_8px_rgba(0,0,0,.05)]">
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
              <section className="bg-white border border-slate-100 rounded-[16px] p-5 shadow-[0_2px_8px_rgba(0,0,0,.05)]">
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

              {/* Chat Session stats */}
              <section className="bg-white border border-slate-100 rounded-[16px] p-5 shadow-[0_2px_8px_rgba(0,0,0,.05)]">
                <div className="mb-4">
                  <h3 className="text-[14px] font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="text-[#2563EB]" size={15} />
                    AI Assistant Usage Analytics
                  </h3>
                  <p className="text-[13px] text-slate-500 mt-0.5">Real-time statistics calculated from chat logs.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                    <span className="text-xs text-slate-550 block font-semibold">Total Conversations</span>
                    <span className="text-xl font-bold text-slate-900 mt-1 block">{chatUsageStats.totalChats}</span>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                    <span className="text-xs text-slate-550 block font-semibold">Questions Asked</span>
                    <span className="text-xl font-bold text-slate-900 mt-1 block">{chatUsageStats.totalQuestions}</span>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                    <span className="text-xs text-slate-550 block font-semibold">Last Query Date</span>
                    <span className="text-sm font-semibold text-slate-800 mt-1.5 block">{chatUsageStats.lastChatDate}</span>
                  </div>
                </div>
              </section>

              {/* Reports charts */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Weekly Report */}
                <section className="md:col-span-7 bg-white border border-slate-100 rounded-[16px] p-5 shadow-[0_2px_8px_rgba(0,0,0,.05)] flex flex-col justify-between">
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

                  <div className="mt-4 flex items-center justify-between text-[11px] text-slate-550 font-semibold uppercase">
                    <span>Base Target: 60 mins</span>
                    <span>Active Streak: {dbStats.streakDays} days</span>
                  </div>
                </section>

                {/* Monthly Report */}
                <section className="md:col-span-5 bg-white border border-slate-100 rounded-[16px] p-5 shadow-[0_2px_8px_rgba(0,0,0,.05)] flex flex-col justify-between">
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

          {/* TAB 3: Team Leaderboard & Manager View */}
          {activeTab === "team" && (
            <div>
              {allUsersCount <= 1 ? (
                <div className="bg-white border border-slate-100 rounded-[16px] p-8 text-center max-w-lg mx-auto shadow-[0_2px_8px_rgba(0,0,0,.05)]">
                  <Users className="mx-auto text-slate-300 mb-3" size={36} />
                  <h3 className="text-[14px] font-bold text-slate-800 leading-snug">
                    Team analytics will become available once additional users join the platform.
                  </h3>
                  <p className="text-[13px] text-slate-500 mt-1.5">Waiting for team activity.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fadeIn">
                  
                  {/* Leaderboard */}
                  <section className="lg:col-span-7 bg-white border border-slate-100 rounded-[16px] p-5 shadow-[0_2px_8px_rgba(0,0,0,.05)]">
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
                                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5 block">
                                  🔥 {member.streak}d streak
                                </span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="inline-flex rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-800 shadow-xs">
                                {member.xp} XP
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  {/* Manager Insights Console */}
                  <section className="lg:col-span-5 bg-white border border-slate-100 rounded-[16px] p-5 shadow-[0_2px_8px_rgba(0,0,0,.05)] space-y-6">
                    <div>
                      <h3 className="text-[20px] font-semibold text-slate-900 tracking-tight">Manager View</h3>
                      <p className="text-[13px] text-slate-500 mt-0.5">Overall analytics tracking for the marketing department.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-center">
                        <span className="text-[13px] font-semibold text-slate-500 block">Total Active Users</span>
                        <p className="mt-1 text-[24px] font-bold text-slate-900">{teamMembers.filter(m => m.xp > 0).length}</p>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-center">
                        <span className="text-[13px] font-semibold text-slate-500 block">Top Learner</span>
                        <p className="mt-1 text-[16px] font-bold text-amber-500 truncate">{teamMembers[0]?.name || "—"}</p>
                      </div>
                    </div>

                    <div className="space-y-4 pt-2 border-t border-slate-150">
                      <div>
                        <span className="text-[13px] font-semibold text-slate-500 block mb-2">Team Statistics</span>
                        <div className="space-y-2">
                          {teamMembers.map((member, idx) => (
                            <div key={member.name} className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/10 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="text-xs font-bold text-emerald-600">{idx + 1}</span>
                                <h4 className="text-xs font-bold text-slate-900 truncate">{member.name}</h4>
                              </div>
                              <span className="text-xs font-bold text-emerald-600 shrink-0">{member.xp} XP</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>

                </div>
              )}
            </div>
          )}

          {/* TAB 4: AI Assistant */}
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

                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
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
                                <Pin size={11} className="text-amber-500 fill-amber-500 shrink-0" />
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
                                >
                                  {thread.title}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
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
                                className="text-slate-400 hover:text-blue-505 p-0.5 bg-transparent border-0 cursor-pointer"
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
                        className={`rounded-lg border border-slate-200 bg-white p-1.5 hover:text-amber-550 transition cursor-pointer border-0 ${
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
                  <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/20">
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
                          className={`flex flex-col max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-xs leading-relaxed ${
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
        </>
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
                  {currentUser?.name || "John Doe (You)"}
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
                </div>

                <div className="text-center sm:text-right">
                  <span className="block font-serif font-semibold text-sm text-indigo-950">
                    {new Date().toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                  </span>
                  <div className="h-px w-28 bg-slate-300 my-1 mx-auto sm:mx-0" />
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Date of Qualification</span>
                </div>
              </div>

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
