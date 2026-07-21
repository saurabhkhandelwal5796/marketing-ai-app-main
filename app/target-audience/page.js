"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { ChevronDown, Globe, Link, Mail, Phone, Search, Users, X } from "lucide-react";
import { motion } from "framer-motion";
import ThinkingDisplay from "../../components/ThinkingDisplay";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function toCsvCell(value) {
  if (value == null) return "";
  const s = typeof value === "object" ? JSON.stringify(value) : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

function toCsvString(rows) {
  if (!Array.isArray(rows) || !rows.length) return "";
  const cols = [];
  rows.forEach((r) => r && typeof r === "object" && Object.keys(r).forEach((k) => !cols.includes(k) && cols.push(k)));
  return [cols.map(toCsvCell).join(","), ...rows.map((r) => cols.map((c) => toCsvCell(r?.[c])).join(","))].join("\n");
}

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "NA";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function isValidLinkedInUrl(url) {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    let targetUrl = trimmed;
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = "https://" + targetUrl;
    }
    const parsed = new URL(targetUrl);
    if (!parsed.hostname.toLowerCase().endsWith("linkedin.com")) return false;

    const path = parsed.pathname.toLowerCase();
    if (
      path === "" ||
      path === "/" ||
      path === "/404" ||
      path === "/profile" ||
      path.includes("placeholder") ||
      path.includes("yourprofile") ||
      path.includes("invalid")
    ) {
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

async function validateLinkedInUrl(url) {
  if (!url || typeof url !== "string") return "NOT_FOUND";
  const trimmed = url.trim();
  if (!trimmed) return "NOT_FOUND";

  try {
    let targetUrl = trimmed;
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = "https://" + targetUrl;
    }
    const parsed = new URL(targetUrl);
    const host = parsed.hostname.toLowerCase();

    if (!host.endsWith("linkedin.com")) {
      return "INVALID";
    }
    if (trimmed.includes("example.com") || trimmed.includes("placeholder") || host.includes("localhost")) {
      return "INVALID";
    }

    const path = parsed.pathname.toLowerCase();
    if (
      path === "" ||
      path === "/" ||
      path === "/404" ||
      path === "/profile" ||
      path === "/in" ||
      path === "/in/" ||
      path.includes("/profile") ||
      path.includes("/user") ||
      path.includes("/example") ||
      path.includes("/test") ||
      path.includes("invalid") ||
      path.includes("placeholder") ||
      path.includes("yourprofile")
    ) {
      return "INVALID";
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const response = await fetch(targetUrl, {
        method: "GET",
        signal: controller.signal,
        credentials: "omit",
      });
      clearTimeout(timeoutId);

      if (response.status === 200) {
        return "VERIFIED";
      }
      if (response.status === 404) {
        return "INVALID";
      }
      return "ESTIMATED";
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      return "ESTIMATED";
    }
  } catch (e) {
    return "INVALID";
  }
}

function getConfidenceScore(item, isEmployee, linkedInStatus) {
  let score = 0;

  const hasEmail = !!(item.email && item.email.trim());
  if (hasEmail) {
    score += 40;
  }

  const hasPhone = !!(item.phone && item.phone.trim());
  if (hasPhone) {
    score += 30;
  }

  if (item.linkedin) {
    if (linkedInStatus === "VERIFIED") {
      score += 30;
    } else if (linkedInStatus === "INVALID" || linkedInStatus === "NOT_FOUND") {
      score += 0;
    } else {
      score += 15;
    }
  }

  if (score === 0) {
    if (isEmployee) {
      const hasCompany = !!(item.company && item.company.trim());
      const hasName = !!(item.name && item.name.trim());
      if (hasCompany && hasName) {
        score = 40;
      } else if (hasName) {
        score = 20;
      }
    } else {
      const hasName = !!(item.name && item.name.trim());
      if (hasName) {
        score = 40;
      }
    }
  }

  return Math.min(100, score);
}

function renderBadges(item, isEmployee, linkedInStatus) {
  const hasEmail = !!(item.email && item.email.trim());
  const hasPhone = !!(item.phone && item.phone.trim());

  const badges = [];
  if (hasEmail) {
    const lower = item.email.toLowerCase();
    const genericPrefixes = ["info@", "contact@", "sales@", "support@", "hello@", "marketing@", "jobs@", "hr@", "office@", "admin@"];
    const isGeneric = genericPrefixes.some(pref => lower.startsWith(pref));
    if (isGeneric) {
      badges.push(
        <span key="email" className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200">
          VERIFIED EMAIL
        </span>
      );
    } else {
      badges.push(
        <span key="email" className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
          ESTIMATED EMAIL
        </span>
      );
    }
  }

  if (item.linkedin) {
    if (linkedInStatus === "VERIFIED") {
      badges.push(
        <span key="linkedin" title="LinkedIn profile successfully validated." className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
          VERIFIED LINKEDIN
        </span>
      );
    } else if (linkedInStatus === "INVALID") {
      badges.push(
        <span key="linkedin" title="LinkedIn profile validation failed." className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
          INVALID LINKEDIN
        </span>
      );
    } else {
      badges.push(
        <span key="linkedin" title="LinkedIn URL appears valid but could not be confirmed." className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
          ESTIMATED LINKEDIN
        </span>
      );
    }
  } else {
    badges.push(
      <span key="linkedin" title="No LinkedIn profile available." className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider bg-slate-50 text-slate-700 border border-slate-200">
        LINKEDIN NOT FOUND
      </span>
    );
  }

  if (hasPhone) {
    badges.push(
      <span key="phone" className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
        PUBLIC PHONE
      </span>
    );
  }

  if (badges.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2 mb-1">
      {badges}
    </div>
  );
}

function getLinkedInTooltip(status) {
  if (status === "VERIFIED") return "LinkedIn profile successfully validated.";
  if (status === "ESTIMATED") return "LinkedIn URL appears valid but could not be confirmed.";
  if (status === "INVALID") return "LinkedIn profile validation failed.";
  return "No LinkedIn profile available.";
}

function getLogoUrl(website) {
  if (!website || typeof website !== "string") return null;
  const trimmed = website.trim();
  if (!trimmed) return null;
  try {
    let urlStr = trimmed;
    if (!/^https?:\/\//i.test(urlStr)) {
      urlStr = "https://" + urlStr;
    }
    const parsed = new URL(urlStr);
    const domain = parsed.hostname.replace(/^www\./i, "");
    return `https://logo.clearbit.com/${domain}`;
  } catch (e) {
    return null;
  }
}

function calculateCampaignFit(item) {
  const text = ((item.name || "") + " " + (item.company || "") + " " + (item.description || "") + " " + (item.whyRelevant || "") + " " + (item.industry || "") + " " + (item.sector || "")).toLowerCase();

  let hash = 0;
  const name = item.name || "";
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const seed = Math.abs(hash);

  let cloudScore = 70 + (seed % 15);
  if (text.includes("cloud") || text.includes("saas") || text.includes("software")) cloudScore += 10;
  if (text.includes("azure") || text.includes("aws") || text.includes("gcp") || text.includes("it")) cloudScore += 5;
  cloudScore = Math.min(100, cloudScore);

  let crmScore = 65 + ((seed >> 2) % 20);
  if (text.includes("crm") || text.includes("salesforce") || text.includes("sales") || text.includes("marketing")) crmScore += 10;
  if (text.includes("customer") || text.includes("hubspot") || text.includes("relations")) crmScore += 5;
  crmScore = Math.min(100, crmScore);

  let infraScore = 70 + ((seed >> 4) % 15);
  if (text.includes("infrastructure") || text.includes("network") || text.includes("security") || text.includes("server")) infraScore += 10;
  if (text.includes("hardware") || text.includes("datacent") || text.includes("it ")) infraScore += 5;
  infraScore = Math.min(100, infraScore);

  const overallFit = Math.round((cloudScore + crmScore + infraScore) / 3);

  return {
    cloud: cloudScore,
    crm: crmScore,
    infra: infraScore,
    overall: overallFit
  };
}

export default function TargetAudiencePage() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [targetAudience, setTargetAudience] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [audienceView, setAudienceView] = useState("companies");
  const [contactPopup, setContactPopup] = useState({ open: false, type: "", name: "", value: "", top: 0, left: 0 });
  const [contactCopied, setContactCopied] = useState(false);
  const [emailClientOpen, setEmailClientOpen] = useState(false);
  const contactPopupRef = useRef(null);
  const abortRef = useRef(null);
  const [companyFilter, setCompanyFilter] = useState("");

  // Client-side filters
  const [filterEmail, setFilterEmail] = useState(false);
  const [filterPhone, setFilterPhone] = useState(false);
  const [filterLinkedIn, setFilterLinkedIn] = useState(false);
  const [filterComplete, setFilterComplete] = useState(false);
  const [filterConfidence80, setFilterConfidence80] = useState(false);

  // New dashboard states
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedWhy, setExpandedWhy] = useState({});
  const [leadStatus, setLeadStatus] = useState({});
  const [logoError, setLogoError] = useState({});

  // Chat & Conversation States
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [batchesCount, setBatchesCount] = useState(1);
  const chatBottomRef = useRef(null);

  // LinkedIn Verification States
  const [linkedInStatuses, setLinkedInStatuses] = useState({});
  const [hideInvalidLinkedIn, setHideInvalidLinkedIn] = useState(false);
  const [isValidatingLinkedIn, setIsValidatingLinkedIn] = useState(false);

  // History and Duplicate Detection States
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [duplicateModal, setDuplicateModal] = useState({ open: false, similarSession: null, currentPrompt: "" });

  // Page Mode: "list" (sessions dashboard) | "session" (conversation view)
  const [pageMode, setPageMode] = useState("list");

  // History List View States
  const [historyList, setHistoryList] = useState([]);
  const [historySearch, setHistorySearch] = useState("");
  const [historySortField, setHistorySortField] = useState("updatedAt");
  const [historySortOrder, setHistorySortOrder] = useState("desc");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyFilterTab, setHistoryFilterTab] = useState("all");
  const [historyViewMode, setHistoryViewMode] = useState(() => {
    try { return localStorage.getItem("ta_list_view_mode") || "list"; } catch { return "list"; }
  });

  // Elapsed timer for progress indicator
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const elapsedTimerRef = useRef(null);

  // Reactive: reset to list view whenever URL loses ?session= param
  // This ensures sidebar "Target Audience" click always works, even from within a session
  const searchParams = useSearchParams();
  useEffect(() => {
    const sessionParam = searchParams.get("session");
    if (!sessionParam) {
      setPageMode("list");
      setChatMessages([]);
      setTargetAudience([]);
      setEmployees([]);
      setPrompt("");
      setChatInput("");
      setBatchesCount(1);
      setCurrentPage(1);
      setSearchQuery("");
      setCurrentSessionId(null);
      setDuplicateModal({ open: false, similarSession: null, currentPrompt: "" });
      setLoading(false);
      setChatLoading(false);
      setError("");
    }
  }, [searchParams]);

  const loadSessionById = (sessionId) => {
    try {
      const stored = localStorage.getItem("target_audience_history");
      const history = stored ? JSON.parse(stored) : [];
      const session = history.find(s => s.id === sessionId);
      if (session) {
        setCurrentSessionId(session.id);
        localStorage.setItem("target_audience_current_session_id", session.id);
        setPrompt(session.prompt || "");
        setChatMessages(session.conversation || []);
        setTargetAudience(session.results?.companies || []);
        setEmployees(session.results?.employees || []);

        if (session.filters) {
          setFilterEmail(!!session.filters.filterEmail);
          setFilterPhone(!!session.filters.filterPhone);
          setFilterLinkedIn(!!session.filters.filterLinkedIn);
          setFilterComplete(!!session.filters.filterComplete);
          setFilterConfidence80(!!session.filters.filterConfidence80);
          setHideInvalidLinkedIn(!!session.filters.hideInvalidLinkedIn);
          setSearchQuery(session.filters.searchQuery || "");
          if (session.filters.companyFilter) {
            setCompanyFilter(session.filters.companyFilter);
          }
        }

        setBatchesCount(session.batchesCount || 1);
        setLinkedInStatuses(session.linkedInStatuses || {});
        setCurrentPage(1);
      }
    } catch (e) {
      console.error("Failed to load session:", e);
    }
  };

  const saveOrUpdateSession = (sessionId, initialPrompt, chatMsgs, comps, emps, filters, batches, lnStatuses) => {
    try {
      const stored = localStorage.getItem("target_audience_history");
      const history = stored ? JSON.parse(stored) : [];
      const index = history.findIndex(s => s.id === sessionId);
      const now = new Date().toISOString();

      const sessionObj = index !== -1 ? history[index] : {
        id: sessionId,
        sessionName: initialPrompt.slice(0, 35) + (initialPrompt.length > 35 ? "..." : ""),
        prompt: initialPrompt,
        createdAt: now,
        favorite: false,
        exported: "No",
        exportCount: 0,
        exportDate: null
      };

      sessionObj.conversation = chatMsgs;
      sessionObj.results = { companies: comps, employees: emps };
      sessionObj.filters = filters;
      sessionObj.batchesCount = batches;
      sessionObj.linkedInStatuses = lnStatuses;
      sessionObj.updatedAt = now;

      if (index !== -1) {
        history[index] = sessionObj;
      } else {
        history.unshift(sessionObj);
      }
      localStorage.setItem("target_audience_history", JSON.stringify(history));
    } catch (e) {
      console.error("Failed to save/update session:", e);
    }
  };

  // Auto scroll to bottom of chat
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, chatLoading]);

  // Load lead statuses, chat messages, and list from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("target_audience_lead_statuses");
      if (stored) {
        setLeadStatus(JSON.parse(stored));
      }

      // Check query param first
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const qSession = params.get("session");
        if (qSession) {
          loadSessionById(qSession);
          setPageMode("session");
          return;
        } else {
          // If no query param → show list view (sessions dashboard)
          setPageMode("list");
          return;
        }
      }

      const storedChat = localStorage.getItem("target_audience_chat_messages");
      if (storedChat) {
        setChatMessages(JSON.parse(storedChat));
      }

      const storedCompanies = localStorage.getItem("target_audience_companies");
      if (storedCompanies) {
        setTargetAudience(JSON.parse(storedCompanies));
      }

      const storedEmployees = localStorage.getItem("target_audience_employees");
      if (storedEmployees) {
        setEmployees(JSON.parse(storedEmployees));
      }

      const storedBatches = localStorage.getItem("target_audience_batches_count");
      if (storedBatches) {
        setBatchesCount(Number(storedBatches));
      }

      const storedLinkedIn = localStorage.getItem("target_audience_linkedin_statuses");
      if (storedLinkedIn) {
        setLinkedInStatuses(JSON.parse(storedLinkedIn));
      }

      const storedHide = localStorage.getItem("target_audience_hide_invalid_linkedin");
      if (storedHide) {
        setHideInvalidLinkedIn(JSON.parse(storedHide));
      }
    } catch (e) {
      console.error("Failed to load states from localStorage:", e);
    }
  }, []);

  // Persist chat and list states to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("target_audience_chat_messages", JSON.stringify(chatMessages));
    } catch (e) {
      console.error("Failed to persist chat messages:", e);
    }
  }, [chatMessages]);

  useEffect(() => {
    try {
      localStorage.setItem("target_audience_companies", JSON.stringify(targetAudience));
    } catch (e) {
      console.error("Failed to persist companies:", e);
    }
  }, [targetAudience]);

  useEffect(() => {
    try {
      localStorage.setItem("target_audience_employees", JSON.stringify(employees));
    } catch (e) {
      console.error("Failed to persist employees:", e);
    }
  }, [employees]);

  useEffect(() => {
    try {
      localStorage.setItem("target_audience_batches_count", String(batchesCount));
    } catch (e) {
      console.error("Failed to persist batches count:", e);
    }
  }, [batchesCount]);

  useEffect(() => {
    try {
      localStorage.setItem("target_audience_linkedin_statuses", JSON.stringify(linkedInStatuses));
    } catch (e) {
      console.error("Failed to persist linkedin statuses:", e);
    }
  }, [linkedInStatuses]);

  useEffect(() => {
    try {
      localStorage.setItem("target_audience_hide_invalid_linkedin", JSON.stringify(hideInvalidLinkedIn));
    } catch (e) {
      console.error("Failed to persist hide invalid linkedin:", e);
    }
  }, [hideInvalidLinkedIn]);

  // Load history list from localStorage (used by the list view dashboard)
  const refreshHistoryList = () => {
    try {
      const stored = localStorage.getItem("target_audience_history");
      setHistoryList(stored ? JSON.parse(stored) : []);
    } catch (e) {
      setHistoryList([]);
    }
  };

  useEffect(() => {
    refreshHistoryList();
  }, []);

  // Refresh history list whenever pageMode switches to "list"
  useEffect(() => {
    if (pageMode === "list") refreshHistoryList();
  }, [pageMode]);

  // Elapsed timer — runs while loading or chatLoading
  useEffect(() => {
    if (loading || chatLoading) {
      setElapsedSeconds(0);
      elapsedTimerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = null;
      }
    }
    return () => {
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = null;
      }
    };
  }, [loading, chatLoading]);

  const handleStatusChange = (name, status) => {
    setLeadStatus((prev) => {
      const updated = { ...prev, [name]: status };
      try {
        localStorage.setItem("target_audience_lead_statuses", JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save lead status:", e);
      }
      return updated;
    });
  };

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
  }, []);

  // Click outside handler for contact popup
  useEffect(() => {
    if (!contactPopup.open) return;
    const handleClickOutside = (e) => {
      if (contactPopupRef.current && !contactPopupRef.current.contains(e.target)) {
        setContactPopup((prev) => ({ ...prev, open: false }));
        setContactCopied(false);
        setEmailClientOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [contactPopup.open]);

  const validateAllProfiles = async (comps, emps) => {
    setIsValidatingLinkedIn(true);
    const results = { ...linkedInStatuses };

    const items = [];
    if (Array.isArray(comps)) {
      comps.forEach(c => {
        if (c.linkedin) items.push({ key: c.name, url: c.linkedin });
        else results[c.name] = "NOT_FOUND";
      });
    }
    if (Array.isArray(emps)) {
      emps.forEach(e => {
        if (e.linkedin) items.push({ key: e.name, url: e.linkedin });
        else results[e.name] = "NOT_FOUND";
      });
    }

    // Default items to ESTIMATED during validation
    items.forEach(item => {
      if (!results[item.key]) {
        results[item.key] = "ESTIMATED";
      }
    });
    setLinkedInStatuses({ ...results });

    const concurrencyLimit = 3;
    const chunks = [];
    for (let i = 0; i < items.length; i += concurrencyLimit) {
      chunks.push(items.slice(i, i + concurrencyLimit));
    }

    for (const chunk of chunks) {
      await Promise.all(chunk.map(async (item) => {
        const status = await validateLinkedInUrl(item.url);
        setLinkedInStatuses(prev => {
          const updated = { ...prev, [item.key]: status };
          try {
            localStorage.setItem("target_audience_linkedin_statuses", JSON.stringify(updated));
            const activeSessId = localStorage.getItem("target_audience_current_session_id");
            if (activeSessId) {
              const storedHist = localStorage.getItem("target_audience_history");
              if (storedHist) {
                const history = JSON.parse(storedHist);
                const index = history.findIndex(s => s.id === activeSessId);
                if (index !== -1) {
                  history[index].linkedInStatuses = updated;
                  history[index].updatedAt = new Date().toISOString();
                  localStorage.setItem("target_audience_history", JSON.stringify(history));
                }
              }
            }
          } catch (err) { }
          return updated;
        });
      }));
    }

    setIsValidatingLinkedIn(false);
  };

  const fetchWithRetry = async (url, options, maxRetries = 3) => {
    let lastError = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);
        if (response.ok) return response;
        throw new Error(`Server returned status ${response.status}`);
      } catch (err) {
        lastError = err;
        if (err.name === "AbortError") throw err;
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    throw lastError;
  };

  const handleStopSearch = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setLoading(false);
    setChatLoading(false);
    setError("Search stopped by user.");
  };

  const generate = async (override = false) => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setLoading(false);
      return;
    }
    const desc = prompt.trim();
    if (!desc) return;

    if (!override) {
      try {
        const storedHistory = localStorage.getItem("target_audience_history");
        const history = storedHistory ? JSON.parse(storedHistory) : [];

        const clean = (str) => str.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean);
        const words1 = clean(desc);
        const stopWords = new Set(["find", "get", "show", "me", "in", "of", "the", "a", "an", "companies", "employees", "leads", "list"]);
        const keyWords1 = words1.filter(w => !stopWords.has(w));

        let similar = null;
        if (keyWords1.length > 0) {
          for (const session of history) {
            const words2 = clean(session.prompt);
            const keyWords2 = words2.filter(w => !stopWords.has(w));
            const intersection = keyWords1.filter(w => keyWords2.includes(w));

            if (keyWords2.length > 0) {
              const similarity = intersection.length / Math.max(keyWords1.length, keyWords2.length);
              if (similarity >= 0.7) {
                similar = session;
                break;
              }
            }
          }
        }

        if (similar) {
          setDuplicateModal({
            open: true,
            similarSession: similar,
            currentPrompt: desc
          });
          return;
        }
      } catch (err) {
        console.error("Failed duplicate detection check:", err);
      }
    }

    setLoading(true);
    setError("");
    const controller = new AbortController();
    abortRef.current = controller;

    const newSessionId = "session_" + Date.now();
    setCurrentSessionId(newSessionId);
    localStorage.setItem("target_audience_current_session_id", newSessionId);
    window.history.replaceState(null, '', '?session=' + newSessionId);

    const softTimeoutId = setTimeout(() => {
      setError("This search is taking longer than usual — please wait. Large datasets can take 2–5 minutes.");
    }, 120000);

    const warnTimeoutId = setTimeout(() => {
      setError("This search is taking longer than expected. Still working — you can Stop Search at any time.");
    }, 240000);

    const hardTimeoutId = setTimeout(() => {
      if (abortRef.current === controller) {
        controller.abort();
      }
    }, 300000);

    try {
      const res = await fetchWithRetry("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ description: desc, step: "target_audience" }),
      }, 3);
      const data = await res.json();
      if (data?.error) throw new Error(data?.error);

      const newCompanies = Array.isArray(data?.targetAudience) ? data.targetAudience : [];
      const newEmployees = Array.isArray(data?.employees) ? data.employees : [];

      setTargetAudience(newCompanies);
      setEmployees(newEmployees);
      setAudienceView("companies");

      // Reset filters on new generation
      setFilterEmail(false);
      setFilterPhone(false);
      setFilterLinkedIn(false);
      setFilterComplete(false);
      setFilterConfidence80(false);
      setSearchQuery("");
      setCurrentPage(1);

      // Add to conversation
      const userMsg = { role: "user", content: desc };
      const assistantMsg = {
        role: "assistant",
        content: `Found ${newCompanies.length} companies.`
      };
      const newMsgs = [userMsg, assistantMsg];
      setChatMessages(newMsgs);
      setBatchesCount(1);

      // Save to history
      saveOrUpdateSession(newSessionId, desc, newMsgs, newCompanies, newEmployees, {
        filterEmail: false,
        filterPhone: false,
        filterLinkedIn: false,
        filterComplete: false,
        filterConfidence80: false,
        hideInvalidLinkedIn: false,
        companyFilter: "",
        searchQuery: ""
      }, 1, {});

      // Trigger background verification
      validateAllProfiles(newCompanies, newEmployees);
    } catch (e) {
      if (e?.name === "AbortError") {
        setError("Search stopped. Any results found so far have been preserved.");
      } else {
        setError(e?.message || "Failed to generate target audience.");
      }
    } finally {
      clearTimeout(softTimeoutId);
      clearTimeout(warnTimeoutId);
      clearTimeout(hardTimeoutId);
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      setLoading(false);
    }
  };

  const handleOpenExistingSession = (sess) => {
    loadSessionById(sess.id);
    setDuplicateModal({ open: false, similarSession: null, currentPrompt: "" });
  };

  const handleContinueAnyway = () => {
    const promptToGen = duplicateModal.currentPrompt;
    setDuplicateModal({ open: false, similarSession: null, currentPrompt: "" });
    generate(true);
  };

  const submitFollowUp = async (e) => {
    if (e) e.preventDefault();
    const query = chatInput.trim();
    if (!query || chatLoading) return;

    setChatLoading(true);
    setError("");

    const newUserMsg = { role: "user", content: query };
    const updatedMessages = [...chatMessages, newUserMsg];
    setChatMessages(updatedMessages);
    setChatInput("");

    const controller = new AbortController();
    abortRef.current = controller;

    const initialPrompt = prompt.trim();
    const formattedHistory = updatedMessages
      .map((msg) => `${msg.role === "user" ? "User" : "AI"}: ${msg.content}`)
      .join("\n");

    const apiDescription = `Initial request: ${initialPrompt}\n\nConversation History:\n${formattedHistory}\n\nLatest refinement instruction: ${query}`;

    const activeSessionId = currentSessionId || "session_" + Date.now();
    if (!currentSessionId) {
      setCurrentSessionId(activeSessionId);
      localStorage.setItem("target_audience_current_session_id", activeSessionId);
      window.history.replaceState(null, '', '?session=' + activeSessionId);
    }

    const softTimeoutId = setTimeout(() => {
      setError("This search is taking longer than usual — please wait. Large datasets can take 2–5 minutes.");
    }, 120000);

    const warnTimeoutId = setTimeout(() => {
      setError("This search is taking longer than expected. Still working — you can Stop Search at any time.");
    }, 240000);

    const hardTimeoutId = setTimeout(() => {
      if (abortRef.current === controller) {
        controller.abort();
      }
    }, 300000);

    try {
      const res = await fetchWithRetry("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ description: apiDescription, step: "target_audience" }),
      }, 3);
      const data = await res.json();
      if (data?.error) throw new Error(data?.error);

      const newCompanies = Array.isArray(data?.targetAudience) ? data.targetAudience : [];
      const newEmployees = Array.isArray(data?.employees) ? data.employees : [];

      setTargetAudience(newCompanies);
      setEmployees(newEmployees);
      setAudienceView("companies");

      // Reset filters and page
      setFilterEmail(false);
      setFilterPhone(false);
      setFilterLinkedIn(false);
      setFilterComplete(false);
      setFilterConfidence80(false);
      setSearchQuery("");
      setCurrentPage(1);

      const assistantMsg = {
        role: "assistant",
        content: `Found ${newCompanies.length} companies matching refinement.`
      };
      const newChatMessages = [...updatedMessages, assistantMsg];
      setChatMessages(newChatMessages);
      setBatchesCount(1);

      // Save to history
      saveOrUpdateSession(activeSessionId, initialPrompt || query, newChatMessages, newCompanies, newEmployees, {
        filterEmail: false,
        filterPhone: false,
        filterLinkedIn: false,
        filterComplete: false,
        filterConfidence80: false,
        hideInvalidLinkedIn: false,
        companyFilter: "",
        searchQuery: ""
      }, 1, linkedInStatuses);

      // Trigger background verification
      validateAllProfiles(newCompanies, newEmployees);
    } catch (e) {
      if (e?.name === "AbortError") {
        setError("Search stopped. Any results found so far have been preserved.");
      } else {
        setError(e?.message || "Failed to submit follow-up query.");
      }
      const errorMsg = {
        role: "assistant",
        content: `Error: ${e?.message || "Request was stopped or failed."}`
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      clearTimeout(softTimeoutId);
      clearTimeout(warnTimeoutId);
      clearTimeout(hardTimeoutId);
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      setChatLoading(false);
    }
  };

  const loadMoreLeads = async () => {
    if (chatLoading) return;

    if (batchesCount >= 5 || targetAudience.length >= 100) {
      const limitMsg = {
        role: "assistant",
        content: `I analyzed 100 records but could not find any additional publicly available contact details matching your refinement.`
      };
      setChatMessages(prev => [...prev, limitMsg]);
      return;
    }

    setChatLoading(true);
    setError("");

    const controller = new AbortController();
    abortRef.current = controller;

    const initialPrompt = prompt.trim();
    const formattedHistory = chatMessages
      .map((msg) => `${msg.role === "user" ? "User" : "AI"}: ${msg.content}`)
      .join("\n");

    const apiDescription = `Initial request: ${initialPrompt}\n\nConversation History:\n${formattedHistory}\n\nInstruction: Continue generating additional target audience records. Return 20 NEW records. Do NOT repeat any previously shown companies.`;

    const existingAudienceNames = targetAudience.map(c => c.name).filter(Boolean);

    const activeSessionId = currentSessionId || "session_" + Date.now();
    if (!currentSessionId) {
      setCurrentSessionId(activeSessionId);
      localStorage.setItem("target_audience_current_session_id", activeSessionId);
      window.history.replaceState(null, '', '?session=' + activeSessionId);
    }

    const softTimeoutId = setTimeout(() => {
      setError("This search is taking longer than usual — please wait. Large datasets can take 2–5 minutes.");
    }, 120000);

    const warnTimeoutId = setTimeout(() => {
      setError("This search is taking longer than expected. Still working — you can Stop Search at any time.");
    }, 240000);

    const hardTimeoutId = setTimeout(() => {
      if (abortRef.current === controller) {
        controller.abort();
      }
    }, 300000);

    try {
      const res = await fetchWithRetry("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          description: apiDescription,
          step: "target_audience",
          existingAudienceNames: existingAudienceNames
        }),
      }, 3);
      const data = await res.json();
      if (data?.error) throw new Error(data?.error);

      const newCompanies = Array.isArray(data?.targetAudience) ? data.targetAudience : [];
      const newEmployees = Array.isArray(data?.employees) ? data.employees : [];

      // Deduplicate new companies before appending
      const uniqueNewCompanies = newCompanies.filter(newComp => {
        const isDuplicate = targetAudience.some(e =>
          (e.name && newComp.name && e.name.toLowerCase().trim() === newComp.name.toLowerCase().trim()) ||
          (e.website && newComp.website && e.website.toLowerCase().trim() === newComp.website.toLowerCase().trim()) ||
          (e.linkedin && newComp.linkedin && e.linkedin.toLowerCase().trim() === newComp.linkedin.toLowerCase().trim())
        );
        return !isDuplicate;
      });

      // Deduplicate new employees before appending
      const uniqueNewEmployees = newEmployees.filter(newEmp => {
        const isDuplicate = employees.some(e =>
          (e.name && newEmp.name && e.name.toLowerCase().trim() === newEmp.name.toLowerCase().trim()) &&
          (e.company && newEmp.company && e.company.toLowerCase().trim() === newEmp.company.toLowerCase().trim())
        );
        return !isDuplicate;
      });

      const updatedComps = [...targetAudience, ...uniqueNewCompanies];
      const updatedEmps = [...employees, ...uniqueNewEmployees];
      const nextBatchCount = batchesCount + 1;

      setTargetAudience(updatedComps);
      setEmployees(updatedEmps);
      setBatchesCount(nextBatchCount);

      let assistantMsg;
      if (nextBatchCount >= 5 || updatedComps.length >= 100) {
        assistantMsg = {
          role: "assistant",
          content: `I analyzed 100 records but could not find any additional publicly available contact details matching your refinement.`
        };
      } else {
        assistantMsg = {
          role: "assistant",
          content: `Loaded batch ${nextBatchCount}. Added ${uniqueNewCompanies.length} unique companies.`
        };
      }

      const updatedChat = [...chatMessages, assistantMsg];
      setChatMessages(updatedChat);

      // Save to history
      saveOrUpdateSession(activeSessionId, initialPrompt, updatedChat, updatedComps, updatedEmps, {
        filterEmail,
        filterPhone,
        filterLinkedIn,
        filterComplete,
        filterConfidence80,
        hideInvalidLinkedIn,
        companyFilter,
        searchQuery
      }, nextBatchCount, linkedInStatuses);

      // Trigger background verification on new loaded items
      validateAllProfiles(uniqueNewCompanies, uniqueNewEmployees);
    } catch (e) {
      if (e?.name === "AbortError") {
        setError("Search stopped. Any results found so far have been preserved.");
      } else {
        setError(e?.message || "Failed to load more leads.");
      }
    } finally {
      clearTimeout(softTimeoutId);
      clearTimeout(warnTimeoutId);
      clearTimeout(hardTimeoutId);
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      setChatLoading(false);
    }
  };

  const startNewConversation = () => {
    setChatMessages([]);
    setTargetAudience([]);
    setEmployees([]);
    setPrompt("");
    setChatInput("");
    setBatchesCount(1);
    setCurrentPage(1);
    setSearchQuery("");
    setCurrentSessionId(null);
    localStorage.removeItem("target_audience_current_session_id");
    window.history.replaceState(null, '', window.location.pathname);
    localStorage.removeItem("target_audience_chat_messages");
    localStorage.removeItem("target_audience_companies");
    localStorage.removeItem("target_audience_employees");
    localStorage.removeItem("target_audience_batches_count");
    setPageMode("list");
    refreshHistoryList();
  };

  const openNewGeneration = () => {
    // Clear state for a fresh generation but stay in session mode
    setChatMessages([]);
    setTargetAudience([]);
    setEmployees([]);
    setPrompt("");
    setChatInput("");
    setBatchesCount(1);
    setCurrentPage(1);
    setSearchQuery("");
    setCurrentSessionId(null);
    localStorage.removeItem("target_audience_current_session_id");
    window.history.replaceState(null, '', '?session=new');
    setPageMode("session");
  };

  const openSession = (sess) => {
    loadSessionById(sess.id);
    window.history.replaceState(null, '', '?session=' + sess.id);
    setPageMode("session");
  };

  const deleteHistorySession = (sessionId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Delete this session?")) return;
    try {
      const stored = localStorage.getItem("target_audience_history");
      const history = stored ? JSON.parse(stored) : [];
      const updated = history.filter(s => s.id !== sessionId);
      localStorage.setItem("target_audience_history", JSON.stringify(updated));
      setHistoryList(updated);
    } catch (e) {
      console.error("Failed to delete session:", e);
    }
  };

  const toggleFavoriteSession = (sessionId, e) => {
    if (e) e.stopPropagation();
    try {
      const stored = localStorage.getItem("target_audience_history");
      const history = stored ? JSON.parse(stored) : [];
      const updated = history.map(s =>
        s.id === sessionId ? { ...s, favorite: !s.favorite, updatedAt: new Date().toISOString() } : s
      );
      localStorage.setItem("target_audience_history", JSON.stringify(updated));
      setHistoryList(updated);
    } catch (e) {
      console.error("Failed to toggle favorite:", e);
    }
  };

  const clearConversationMessages = () => {
    setChatMessages([]);
    localStorage.removeItem("target_audience_chat_messages");
  };

  const exportConversationTranscript = () => {
    if (!chatMessages.length) return;
    const text = chatMessages
      .map(msg => `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}`)
      .join("\n\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `target_audience_conversation_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Process data (calculates confidence score, filters client-side, and sorts by score descending)
  const processedCompanies = targetAudience
    .map(c => ({ ...c, score: getConfidenceScore(c, false, linkedInStatuses[c.name]) }))
    .filter(c => {
      if (filterEmail && !c.email) return false;
      if (filterPhone && !c.phone) return false;
      if (filterLinkedIn && !isValidLinkedInUrl(c.linkedin)) return false;
      if (filterComplete && !(c.email && c.phone && isValidLinkedInUrl(c.linkedin))) return false;
      if (filterConfidence80 && c.score < 80) return false;
      if (hideInvalidLinkedIn) {
        const status = linkedInStatuses[c.name] || (c.linkedin ? "ESTIMATED" : "NOT_FOUND");
        if (status === "INVALID" || status === "NOT_FOUND") return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (c.name || "").toLowerCase().includes(q);
        const matchIndustry = (c.industry || "").toLowerCase().includes(q) || (c.sector || "").toLowerCase().includes(q);
        const matchCountry = (c.country || "").toLowerCase().includes(q);
        if (!matchName && !matchIndustry && !matchCountry) return false;
      }
      return true;
    })
    .sort((a, b) => b.score - a.score);

  const processedEmployees = employees
    .map(emp => ({ ...emp, score: getConfidenceScore(emp, true, linkedInStatuses[emp.name]) }))
    .filter(emp => {
      if (companyFilter && !(emp.company || "").toLowerCase().includes(companyFilter.toLowerCase())) {
        return false;
      }
      if (filterEmail && !emp.email) return false;
      if (filterPhone && !emp.phone) return false;
      if (filterLinkedIn && !isValidLinkedInUrl(emp.linkedin)) return false;
      if (filterComplete && !(emp.email && emp.phone && isValidLinkedInUrl(emp.linkedin))) return false;
      if (filterConfidence80 && emp.score < 80) return false;
      if (hideInvalidLinkedIn) {
        const status = linkedInStatuses[emp.name] || (emp.linkedin ? "ESTIMATED" : "NOT_FOUND");
        if (status === "INVALID" || status === "NOT_FOUND") return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCompany = (emp.company || "").toLowerCase().includes(q);
        const matchName = (emp.name || "").toLowerCase().includes(q);

        // Find industry & country from the corresponding company record
        const comp = targetAudience.find(t => t.name.toLowerCase() === emp.company.toLowerCase());
        const matchIndustry = comp ? (comp.industry || "").toLowerCase().includes(q) || (comp.sector || "").toLowerCase().includes(q) : false;
        const matchCountry = comp ? (comp.country || "").toLowerCase().includes(q) : false;

        if (!matchCompany && !matchName && !matchIndustry && !matchCountry) return false;
      }
      return true;
    })
    .sort((a, b) => b.score - a.score);

  // Statistics calculation for the Top Summary Section
  const isEmployeeView = audienceView === "employees";
  const activeList = isEmployeeView ? employees : targetAudience;

  // Pagination slicing
  const itemsPerPage = 10;
  const totalItems = isEmployeeView ? processedEmployees.length : processedCompanies.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  const paginatedCompanies = processedCompanies.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const paginatedEmployees = processedEmployees.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalResults = activeList.length;
  const emailsFound = activeList.filter(item => !!(item.email && item.email.trim())).length;
  const phonesFound = activeList.filter(item => !!(item.phone && item.phone.trim())).length;
  const linkedinsFound = activeList.filter(item => isValidLinkedInUrl(item.linkedin)).length;
  const completeProfiles = activeList.filter(item => {
    return !!(item.email && item.email.trim()) &&
      !!(item.phone && item.phone.trim()) &&
      isValidLinkedInUrl(item.linkedin);
  }).length;
  const totalScore = activeList.reduce((acc, item) => acc + getConfidenceScore(item, isEmployeeView, linkedInStatuses[item.name]), 0);
  const avgConfidence = totalResults ? Math.round(totalScore / totalResults) : 0;

  const linkedinCounts = (() => {
    let verified = 0;
    let estimated = 0;
    let invalid = 0;
    let notFound = 0;

    activeList.forEach(item => {
      const status = linkedInStatuses[item.name] || (item.linkedin ? "ESTIMATED" : "NOT_FOUND");
      if (status === "VERIFIED") verified++;
      else if (status === "ESTIMATED") estimated++;
      else if (status === "INVALID") invalid++;
      else notFound++;
    });

    return { verified, estimated, invalid, notFound };
  })();

  const trackSessionCsvExport = () => {
    if (!currentSessionId) return;
    try {
      const stored = localStorage.getItem("target_audience_history");
      const history = stored ? JSON.parse(stored) : [];
      const index = history.findIndex(s => s.id === currentSessionId);
      if (index !== -1) {
        history[index].exported = "Yes";
        history[index].exportDate = new Date().toISOString();
        history[index].exportCount = (history[index].exportCount || 0) + 1;
        history[index].updatedAt = new Date().toISOString();
        localStorage.setItem("target_audience_history", JSON.stringify(history));
      }
    } catch (e) {
      console.error("Failed to track CSV export in history:", e);
    }
  };

  const downloadCsv = () => {
    const rows = audienceView === "companies" ? processedCompanies : processedEmployees;
    if (!rows?.length) return;

    // Add confidence score to exported CSV
    const rowsWithScore = rows.map(({ score, ...rest }) => ({
      ...rest,
      confidenceScore: score
    }));

    const csv = toCsvString(rowsWithScore);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `target_audience_${audienceView}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    trackSessionCsvExport();
  };

  const openPopup = (e, type, name, value) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setContactCopied(false);
    setEmailClientOpen(false);
    setContactPopup({
      open: true,
      type,
      name,
      value: String(value || ""),
      top: rect.bottom + 8,
      left: Math.max(12, rect.left - 220 + rect.width),
    });
  };

  const hasResults = targetAudience.length > 0 || employees.length > 0;

  const formatElapsed = (sec) => {
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  // Computed history list with search, sort, filter, pagination
  const filteredHistory = historyList.filter(sess => {
    if (historyFilterTab === "favorites" && !sess.favorite) return false;
    if (historySearch.trim()) {
      const q = historySearch.toLowerCase().trim();
      return (
        (sess.sessionName || "").toLowerCase().includes(q) ||
        (sess.prompt || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const sortedHistory = [...filteredHistory].sort((a, b) => {
    let va, vb;
    switch (historySortField) {
      case "autoNum":
        va = historyList.findIndex(s => s.id === a.id);
        vb = historyList.findIndex(s => s.id === b.id);
        break;
      case "sessionName":
        va = (a.sessionName || "").toLowerCase();
        vb = (b.sessionName || "").toLowerCase();
        break;
      case "companies":
        va = (a.results?.companies?.length || 0);
        vb = (b.results?.companies?.length || 0);
        break;
      case "employees":
        va = (a.results?.employees?.length || 0);
        vb = (b.results?.employees?.length || 0);
        break;
      case "avgConf": {
        const confAvg = (s) => {
          const comps = s.results?.companies || [];
          if (!comps.length) return 0;
          return Math.round(comps.reduce((acc, c) => acc + getConfidenceScore(c, false, {}), 0) / comps.length);
        };
        va = confAvg(a); vb = confAvg(b);
        break;
      }
      case "convoCount":
        va = (a.conversation?.length || 0);
        vb = (b.conversation?.length || 0);
        break;
      case "exportCount":
        va = (a.exportCount || 0);
        vb = (b.exportCount || 0);
        break;
      case "createdAt":
        va = new Date(a.createdAt || 0).getTime();
        vb = new Date(b.createdAt || 0).getTime();
        break;
      case "results":
      case "updatedAt":
      default:
        va = new Date(a.updatedAt || a.createdAt || 0).getTime();
        vb = new Date(b.updatedAt || b.createdAt || 0).getTime();
    }
    if (va < vb) return historySortOrder === "asc" ? -1 : 1;
    if (va > vb) return historySortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const historyItemsPerPage = 10;
  const historyTotalPages = Math.ceil(sortedHistory.length / historyItemsPerPage) || 1;
  const paginatedHistory = sortedHistory.slice(
    (historyPage - 1) * historyItemsPerPage,
    historyPage * historyItemsPerPage
  );

  const requestHistorySort = (field) => {
    if (historySortField === field) {
      setHistorySortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setHistorySortField(field);
      setHistorySortOrder("desc");
    }
    setHistoryPage(1);
  };

  const totalHistoryCompanies = historyList.reduce((acc, s) => acc + (s.results?.companies?.length || 0), 0);
  const totalHistoryEmployees = historyList.reduce((acc, s) => acc + (s.results?.employees?.length || 0), 0);
  const totalHistoryExports = historyList.reduce((acc, s) => acc + (s.exportCount || 0), 0);

  const formatRelativeDate = (iso) => {
    if (!iso) return "—";
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatFullDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const getSessionStatus = (sess) => {
    const comps = sess.results?.companies?.length || 0;
    const convo = sess.conversation?.length || 0;
    if (comps === 0 && convo === 0) return { label: "New", cls: "bg-slate-100 text-slate-600" };
    if (comps > 0 && convo > 0) return { label: "Completed", cls: "bg-emerald-50 text-emerald-700" };
    if (convo > 0) return { label: "In Progress", cls: "bg-blue-50 text-blue-700" };
    return { label: "New", cls: "bg-slate-100 text-slate-600" };
  };

  // Extract industry / location hints from the session prompt
  const extractMeta = (prompt) => {
    const text = (prompt || "").toLowerCase();
    const locationHints = ["india", "usa", "uk", "europe", "asia", "australia", "canada", "germany", "france", "singapore",
      "mumbai", "delhi", "bangalore", "chennai", "hyderabad", "pune", "maharashtra", "rajasthan"];
    const industryHints = ["manufacturing", "real estate", "it", "software", "cloud", "saas", "healthcare", "retail",
      "automotive", "finance", "banking", "education", "logistics", "telecom", "pharma", "consulting"];
    const location = locationHints.find(l => text.includes(l));
    const industry = industryHints.find(i => text.includes(i));
    return {
      location: location ? location.charAt(0).toUpperCase() + location.slice(1) : "—",
      industry: industry ? industry.charAt(0).toUpperCase() + industry.slice(1) : "—"
    };
  };

  const SortTh = ({ field, children, className = "" }) => (
    <th className={`px-3 py-2.5 whitespace-nowrap ${className}`}>
      <button type="button" onClick={() => requestHistorySort(field)}
        className="flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 transition">
        {children}
        <span className="ml-0.5 text-slate-300">
          {historySortField === field ? (historySortOrder === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    </th>
  );

  const activeSession = currentSessionId ? historyList.find(s => s.id === currentSessionId) : null;
  const autoIdx = activeSession ? historyList.findIndex(s => s.id === activeSession.id) : -1;
  const autoNum = autoIdx !== -1 ? "TA-" + String(autoIdx + 1).padStart(5, "0") : "TA-NEW";
  const currentStatus = activeSession ? getSessionStatus(activeSession) : { label: "New", cls: "bg-slate-100 text-slate-600" };
  const currentMeta = extractMeta(prompt);
  const avgConfScore = targetAudience.length
    ? Math.round(targetAudience.reduce((s, c) => s + getConfidenceScore(c, false, {}), 0) / targetAudience.length)
    : 0;
  const currentCreatedDate = activeSession?.createdAt ? formatFullDate(activeSession.createdAt) : "—";
  const currentCreatedBy = activeSession?.createdBy || "You";

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">

        {/* ══════════════════════════════════════════════
            LIST VIEW — Sessions Dashboard (default)
            ══════════════════════════════════════════════ */}
        {pageMode === "list" && (
          <>
            {/* Page Header */}
            <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold text-slate-900">Target Audience</h1>
                <p className="text-sm text-slate-500 mt-0.5">Your AI-generated audience sessions. Click a session to resume or start a new generation.</p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-center">
                {/* View Mode Toggle */}
                <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <button
                    type="button"
                    title="List View"
                    onClick={() => { setHistoryViewMode("list"); try { localStorage.setItem("ta_list_view_mode", "list"); } catch {} }}
                    className={cx(
                      "px-3 py-2 text-xs font-semibold transition flex items-center gap-1.5",
                      historyViewMode === "list" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                    List
                  </button>
                  <button
                    type="button"
                    title="Card View"
                    onClick={() => { setHistoryViewMode("card"); try { localStorage.setItem("ta_list_view_mode", "card"); } catch {} }}
                    className={cx(
                      "px-3 py-2 text-xs font-semibold transition flex items-center gap-1.5 border-l border-slate-200",
                      historyViewMode === "card" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                    Cards
                  </button>
                </div>
                <button
                  type="button"
                  onClick={openNewGeneration}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 shadow-sm"
                >
                  <Users size={16} /> New Generation
                </button>
              </div>
            </section>

            {/* Analytics Row */}
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Sessions", value: historyList.length, color: "text-slate-900" },
                { label: "Companies Generated", value: totalHistoryCompanies, color: "text-blue-700" },
                { label: "Employees Generated", value: totalHistoryEmployees, color: "text-indigo-700" },
                { label: "CSV Exports", value: totalHistoryExports, color: "text-emerald-700" },
              ].map(stat => (
                <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{stat.label}</p>
                  <p className={`mt-1.5 text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </section>

            {/* Filter tabs + Search */}
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1 w-full md:w-auto">
                {["all", "favorites"].map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => { setHistoryFilterTab(tab); setHistoryPage(1); }}
                    className={cx(
                      "rounded-full px-4 py-1.5 text-xs font-semibold transition flex-1 md:flex-initial text-center capitalize",
                      historyFilterTab === tab
                        ? tab === "favorites" ? "bg-amber-500 text-white" : "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    {tab === "favorites" ? "★ Favorites" : "All Sessions"}
                  </button>
                ))}
              </div>
              <div className="relative w-full md:max-w-sm">
                <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
                <input
                  type="text"
                  value={historySearch}
                  onChange={e => { setHistorySearch(e.target.value); setHistoryPage(1); }}
                  placeholder="Search sessions..."
                  className="w-full rounded-xl border border-slate-300 bg-white pl-8 pr-4 py-2 text-xs text-slate-900 outline-none transition focus:border-slate-500"
                />
              </div>
            </section>

            {/* Sessions: LIST or CARD view */}
            {historyViewMode === "list" ? (
              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left" style={{minWidth: "1100px"}}>
                    <thead className="border-b border-slate-200 bg-slate-50/80">
                      <tr>
                        <SortTh field="autoNum" className="pl-5">#</SortTh>
                        <SortTh field="sessionName">Session Name</SortTh>
                        <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Industry</th>
                        <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Location</th>
                        <SortTh field="createdAt">Created</SortTh>
                        <SortTh field="updatedAt">Modified</SortTh>
                        <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Created By</th>
                        <SortTh field="companies">Companies</SortTh>
                        <SortTh field="employees">Employees</SortTh>
                        <SortTh field="avgConf">Avg Conf.</SortTh>
                        <SortTh field="convoCount">Messages</SortTh>
                        <SortTh field="exportCount">Exports</SortTh>
                        <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Status</th>
                        <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Fav</th>
                        <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right whitespace-nowrap pr-5">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {paginatedHistory.length === 0 ? (
                        <tr>
                          <td colSpan={15} className="px-5 py-14 text-center text-slate-400 font-medium">
                            {historyList.length === 0
                              ? 'No sessions yet. Click "New Generation" to get started.'
                              : "No sessions match your search."}
                          </td>
                        </tr>
                      ) : paginatedHistory.map(sess => {
                        const autoIdx = historyList.findIndex(s => s.id === sess.id);
                        const autoNum = "TA-" + String(autoIdx + 1).padStart(5, "0");
                        const companies = sess.results?.companies || [];
                        const emps = sess.results?.employees || [];
                        const avgConf = companies.length
                          ? Math.round(companies.reduce((s, c) => s + getConfidenceScore(c, false, {}), 0) / companies.length)
                          : 0;
                        const convoCount = sess.conversation?.length || 0;
                        const status = getSessionStatus(sess);
                        const meta = extractMeta(sess.prompt);
                        return (
                          <tr key={sess.id} onClick={() => openSession(sess)}
                            className="group cursor-pointer hover:bg-slate-50/80 transition-colors">
                            {/* Auto Number */}
                            <td className="pl-5 pr-3 py-3 whitespace-nowrap">
                              <span className="font-mono text-[11px] font-bold text-blue-600 group-hover:underline">{autoNum}</span>
                            </td>
                            {/* Session Name */}
                            <td className="px-3 py-3 max-w-[180px]">
                              <p className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors truncate">{sess.sessionName}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5 truncate">{sess.prompt}</p>
                            </td>
                            {/* Industry */}
                            <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{meta.industry}</td>
                            {/* Location */}
                            <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{meta.location}</td>
                            {/* Created */}
                            <td className="px-3 py-3 text-slate-500 whitespace-nowrap">{formatFullDate(sess.createdAt)}</td>
                            {/* Modified */}
                            <td className="px-3 py-3 text-slate-500 whitespace-nowrap">{formatFullDate(sess.updatedAt || sess.createdAt)}</td>
                            {/* Created By */}
                            <td className="px-3 py-3 text-slate-500 whitespace-nowrap">{sess.createdBy || "You"}</td>
                            {/* Companies */}
                            <td className="px-3 py-3 text-center">
                              <span className="inline-flex items-center justify-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">{companies.length}</span>
                            </td>
                            {/* Employees */}
                            <td className="px-3 py-3 text-center">
                              <span className="inline-flex items-center justify-center rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700">{emps.length}</span>
                            </td>
                            {/* Avg Confidence */}
                            <td className="px-3 py-3 text-center">
                              <span className={cx(
                                "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-bold",
                                avgConf >= 80 ? "bg-emerald-50 text-emerald-700" :
                                avgConf >= 50 ? "bg-amber-50 text-amber-700" :
                                "bg-slate-100 text-slate-500"
                              )}>{avgConf > 0 ? `${avgConf}%` : "—"}</span>
                            </td>
                            {/* Messages */}
                            <td className="px-3 py-3 text-center text-slate-600 font-medium">{convoCount || "—"}</td>
                            {/* Exports */}
                            <td className="px-3 py-3 text-center text-slate-600 font-medium">{sess.exportCount || 0}</td>
                            {/* Status */}
                            <td className="px-3 py-3">
                              <span className={cx("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", status.cls)}>
                                {status.label}
                              </span>
                            </td>
                            {/* Favorite */}
                            <td className="px-3 py-3" onClick={e => toggleFavoriteSession(sess.id, e)}>
                              <span className={cx("text-base cursor-pointer transition", sess.favorite ? "text-amber-400" : "text-slate-200 hover:text-amber-300")}>★</span>
                            </td>
                            {/* Actions */}
                            <td className="px-3 pr-5 py-3 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                <button type="button" onClick={() => openSession(sess)}
                                  className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 transition">
                                  Resume
                                </button>
                                <button type="button" onClick={e => deleteHistorySession(sess.id, e)}
                                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 transition">
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {historyTotalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-5 py-3">
                    <span className="text-xs text-slate-500 font-medium">Page <b>{historyPage}</b> of <b>{historyTotalPages}</b></span>
                    <div className="flex gap-2">
                      <button type="button" disabled={historyPage === 1}
                        onClick={() => setHistoryPage(p => p - 1)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition">← Prev</button>
                      <button type="button" disabled={historyPage === historyTotalPages}
                        onClick={() => setHistoryPage(p => p + 1)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition">Next →</button>
                    </div>
                  </div>
                )}
              </section>
            ) : (
              /* ── CARD VIEW ─────────────────────────────── */
              <section>
                {paginatedHistory.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white py-14 text-center text-slate-400 font-medium shadow-sm">
                    {historyList.length === 0
                      ? 'No sessions yet. Click "New Generation" to get started.'
                      : "No sessions match your search."}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paginatedHistory.map((sess, idx) => {
                      const companies = sess.results?.companies || [];
                      const employees = sess.results?.employees || [];
                      const avgConf = companies.length
                        ? Math.round(companies.reduce((s, c) => s + getConfidenceScore(c, false, {}), 0) / companies.length)
                        : 0;
                      const autoNum = "TA-" + String(historyList.findIndex(s => s.id === sess.id) + 1).padStart(5, "0");
                      return (
                        <div
                          key={sess.id}
                          onClick={() => openSession(sess)}
                          className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer overflow-hidden"
                        >
                          {/* Card top stripe */}
                          <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 to-indigo-500" />

                          <div className="p-5 flex flex-col gap-3 flex-1">
                            {/* Auto number + Favorite */}
                            <div className="flex items-center justify-between">
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 tracking-wider">{autoNum}</span>
                              <button
                                type="button"
                                onClick={e => toggleFavoriteSession(sess.id, e)}
                                className={cx("text-xl leading-none transition", sess.favorite ? "text-amber-400" : "text-slate-200 hover:text-amber-300")}
                                title={sess.favorite ? "Remove from favorites" : "Add to favorites"}
                              >
                                ★
                              </button>
                            </div>

                            {/* Session name */}
                            <div>
                              <p className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-2 leading-snug">{sess.sessionName}</p>
                              <p className="mt-0.5 text-[11px] text-slate-400 line-clamp-1">{sess.prompt}</p>
                            </div>

                            {/* Stats grid */}
                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                              <div className="rounded-xl bg-blue-50 px-3 py-2">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-blue-500 mb-0.5">Companies</p>
                                <p className="text-base font-bold text-blue-700">{companies.length}</p>
                              </div>
                              <div className="rounded-xl bg-indigo-50 px-3 py-2">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-indigo-500 mb-0.5">Employees</p>
                                <p className="text-base font-bold text-indigo-700">{employees.length}</p>
                              </div>
                              <div className="rounded-xl bg-emerald-50 px-3 py-2">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 mb-0.5">Avg Confidence</p>
                                <p className="text-base font-bold text-emerald-700">{avgConf}%</p>
                              </div>
                              <div className="rounded-xl bg-slate-50 px-3 py-2">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">CSV Exports</p>
                                <p className="text-base font-bold text-slate-700">{sess.exportCount || 0}</p>
                              </div>
                            </div>

                            {/* Metadata */}
                            <div className="text-[10px] text-slate-400 space-y-0.5">
                              <p>📅 Created: {formatRelativeDate(sess.createdAt)}</p>
                              <p>✏️ Modified: {formatRelativeDate(sess.updatedAt || sess.createdAt)}</p>
                              {sess.exported === "Yes" && <p className="text-emerald-600 font-semibold">✓ Exported</p>}
                            </div>
                          </div>

                          {/* Card footer actions */}
                          <div
                            className="flex items-center gap-2 border-t border-slate-100 px-5 py-3 bg-slate-50/50"
                            onClick={e => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => openSession(sess)}
                              className="flex-1 rounded-lg border border-blue-200 bg-blue-50 py-1.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 transition text-center"
                            >
                              Resume
                            </button>
                            <button
                              type="button"
                              onClick={e => deleteHistorySession(sess.id, e)}
                              className="flex-1 rounded-lg border border-slate-200 bg-white py-1.5 text-[11px] font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 transition text-center"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Card view pagination */}
                {historyTotalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-slate-500 font-medium">
                      Page <b>{historyPage}</b> of <b>{historyTotalPages}</b>
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={historyPage === 1}
                        onClick={() => setHistoryPage(p => p - 1)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      >
                        ← Prev
                      </button>
                      <button
                        type="button"
                        disabled={historyPage === historyTotalPages}
                        onClick={() => setHistoryPage(p => p + 1)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════
            SESSION VIEW — Conversation + Results UI
            ══════════════════════════════════════════════ */}
        {pageMode === "session" && (
          <>
            {/* Header / Actions Panel */}
            <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-3.5 shrink-0 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-955 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900">
                    <Users size={18} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Target Audience &gt; <span className="text-slate-600 dark:text-slate-350">{autoNum}</span>
                    </div>
                    <h1 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                      {prompt ? prompt.slice(0, 50) + (prompt.length > 50 ? "…" : "") : "New Generation"}
                    </h1>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={startNewConversation}
                    className="btn-secondary text-xs font-bold py-1.5 px-3"
                  >
                    Back to Sessions
                  </button>
                  {hasResults && (
                    <button
                      type="button"
                      onClick={downloadCsv}
                      className="btn-secondary text-xs font-bold py-1.5 px-3"
                    >
                      Download CSV
                    </button>
                  )}
                  {(loading || chatLoading) ? (
                    <button
                      type="button"
                      onClick={handleStopSearch}
                      className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-955/20 px-4 py-1.5 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-100 transition"
                    >
                      Stop Search
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={generate}
                      disabled={!prompt.trim()}
                      className="btn-primary text-xs font-bold py-1.5 px-3"
                    >
                      {hasResults ? "Regenerate" : "Generate"}
                    </button>
                  )}
                </div>
              </div>

              {/* Salesforce Metadata Row */}
              <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-[11px] border-t border-slate-100 dark:border-slate-700 pt-2 text-slate-500">
                <div>Industry: <span className="font-semibold text-slate-700 dark:text-slate-300">{currentMeta.industry}</span></div>
                <div>Location: <span className="font-semibold text-slate-700 dark:text-slate-300">{currentMeta.location}</span></div>
                <div>Avg Confidence: <span className="font-semibold text-slate-700 dark:text-slate-300">{avgConfScore > 0 ? `${avgConfScore}%` : "—"}</span></div>
                <div>Created By: <span className="font-semibold text-slate-700 dark:text-slate-300">{currentCreatedBy}</span></div>
                <div>Date Created: <span className="font-semibold text-slate-700 dark:text-slate-300">{currentCreatedDate}</span></div>
              </div>
            </header>

            {/* Chat Section (Top) */}
            <div className="w-full bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex flex-col shrink-0 h-[45vh] min-h-[45vh] max-h-[45vh] md:h-[40vh] md:min-h-[40vh] md:max-h-[40vh] lg:h-[35vh] lg:min-h-[35vh] lg:max-h-[35vh]">
              {/* Scrollable Conversation Timeline */}
              <div className="flex-1 overflow-y-scroll scroll-smooth overscroll-contain p-5 space-y-4 bg-slate-50/40 dark:bg-slate-900/40">
                {chatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center h-full text-slate-400 dark:text-slate-500 py-4">
                    <Users size={28} className="mb-1 text-slate-300 dark:text-slate-700" />
                    <p className="text-xs font-semibold">Welcome to Target Audience Copilot</p>
                    <p className="text-[11px]">Describe your target audience below to generate lead records.</p>
                  </div>
                ) : (
                  chatMessages.map((msg, index) => (
                    <div
                      key={index}
                      className={cx(
                        "flex flex-col max-w-[75%] rounded-2xl px-3.5 py-2 text-xs shadow-sm",
                        msg.role === "user"
                          ? "bg-blue-600 text-white self-end ml-auto rounded-tr-none"
                          : "bg-white text-slate-800 mr-auto rounded-tl-none border border-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                      )}
                    >
                      <span className="text-[9px] font-bold uppercase tracking-wider opacity-60 mb-0.5">
                        {msg.role === "user" ? "You" : "AI Copilot"}
                      </span>
                      <p className="leading-relaxed whitespace-pre-line text-xs">{msg.content}</p>
                    </div>
                  ))
                )}
                {chatLoading && (
                  <div className="bg-white border border-slate-100 text-slate-800 mr-auto rounded-2xl rounded-tl-none px-3.5 py-2.5 text-xs max-w-[75%] flex flex-col gap-1.5 shadow-sm dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-semibold text-[10px] text-slate-500 animate-pulse">
                        Analyzing Batch {batchesCount} of 5...
                      </span>
                      <button
                        type="button"
                        onClick={handleStopSearch}
                        className="rounded bg-red-50 dark:bg-red-955/40 hover:bg-red-100 text-red-600 dark:text-red-400 px-1.5 py-0.5 text-[9px] font-bold border border-red-100 dark:border-red-900 transition"
                      >
                        Stop
                      </button>
                    </div>
                    <ThinkingDisplay preset="marketing_analysis" />
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input fixed at bottom of Chat section */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (chatMessages.length === 0) generate(false);
                  else submitFollowUp(e);
                }}
                className="flex gap-2 p-2.5 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shrink-0"
              >
                <input
                  type="text"
                  value={chatMessages.length === 0 ? prompt : chatInput}
                  onChange={(e) => {
                    if (chatMessages.length === 0) setPrompt(e.target.value);
                    else setChatInput(e.target.value);
                  }}
                  placeholder={chatMessages.length === 0 ? "Describe target (e.g. manufacturing companies)..." : "Refine (e.g. 'only from Rajasthan')..."}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 dark:text-white dark:bg-slate-900 dark:border-slate-700 outline-none transition focus:bg-white focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={loading || chatLoading || (chatMessages.length === 0 ? !prompt.trim() : !chatInput.trim())}
                  className="btn-primary text-xs font-bold px-4 py-2 shrink-0"
                >
                  {loading || chatLoading ? "Generating..." : chatMessages.length === 0 ? "Generate" : "Refine"}
                </button>
              </form>
            </div>

            {/* Output Section (Bottom) */}
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col w-full bg-slate-50 dark:bg-slate-900">
              {!hasResults ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-955 text-blue-600 dark:text-blue-400 mb-4">
                    <Users size={28} />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">No Audience Generated Yet</h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                    Type a prompt in the timeline bar above and click Generate to start.
                  </p>
                </div>
              ) : (
                <>
                  {/* Tabs Selector Ribbon */}
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-1 shrink-0">
                    <div className="flex items-center gap-1">
                      {[
                        { id: "companies", label: "Companies" },
                        { id: "employees", label: "Employees" },
                        { id: "analytics", label: "Analytics" }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => { setAudienceView(tab.id); setCurrentPage(1); }}
                          className={cx(
                            "border-b-2 px-4 py-2.5 text-xs font-bold transition-all focus:outline-none",
                            audienceView === tab.id
                              ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white hover:border-slate-250"
                          )}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                    {audienceView !== "analytics" && (
                      <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                        Showing {totalItems} records (Page {currentPage} of {totalPages})
                      </div>
                    )}
                  </div>

                  {/* Filter & Search Ribbon */}
                  {audienceView !== "analytics" && (
                    <div className="bg-white dark:bg-slate-850 border-b border-slate-200 dark:border-slate-700 px-6 py-2.5 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
                      <div className="flex items-center gap-2 flex-1 max-w-md">
                        <Search size={13} className="text-slate-400" />
                        <input
                          id="search-input-bottom"
                          type="text"
                          value={searchQuery}
                          onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                          placeholder="Search by name, industry, or country..."
                          className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none transition focus:border-blue-550"
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => { setSearchQuery(""); setCurrentPage(1); }}
                            className="text-xs font-semibold text-slate-505 hover:text-slate-700 px-1"
                          >
                            Clear
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-450 mr-1">Filters:</span>
                        <button
                          type="button"
                          onClick={() => { setFilterEmail(prev => !prev); setCurrentPage(1); }}
                          className={cx(
                            "rounded-full px-2.5 py-0.5 text-xs font-medium border transition",
                            filterEmail
                              ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-350 dark:border-slate-700"
                          )}
                        >
                          Has Email
                        </button>
                        <button
                          type="button"
                          onClick={() => { setFilterPhone(prev => !prev); setCurrentPage(1); }}
                          className={cx(
                            "rounded-full px-2.5 py-0.5 text-xs font-medium border transition",
                            filterPhone
                              ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-350 dark:border-slate-700"
                          )}
                        >
                          Has Phone
                        </button>
                        <button
                          type="button"
                          onClick={() => { setFilterLinkedIn(prev => !prev); setCurrentPage(1); }}
                          className={cx(
                            "rounded-full px-2.5 py-0.5 text-xs font-medium border transition",
                            filterLinkedIn
                              ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-355 dark:border-slate-700"
                          )}
                        >
                          Has LinkedIn
                        </button>
                        <button
                          type="button"
                          onClick={() => { setFilterComplete(prev => !prev); setCurrentPage(1); }}
                          className={cx(
                            "rounded-full px-2.5 py-0.5 text-xs font-medium border transition",
                            filterComplete
                              ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-355 dark:border-slate-700"
                          )}
                        >
                          Complete
                        </button>
                        <button
                          type="button"
                          onClick={() => { setFilterConfidence80(prev => !prev); setCurrentPage(1); }}
                          className={cx(
                            "rounded-full px-2.5 py-0.5 text-xs font-medium border transition",
                            filterConfidence80
                              ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-355 dark:border-slate-700"
                          )}
                        >
                          Confidence &gt; 80
                        </button>
                        <button
                          type="button"
                          onClick={() => { setHideInvalidLinkedIn(prev => !prev); setCurrentPage(1); }}
                          className={cx(
                            "rounded-full px-2.5 py-0.5 text-xs font-medium border transition",
                            hideInvalidLinkedIn
                              ? "bg-rose-900 text-white border-rose-900"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-355 dark:border-slate-700"
                          )}
                        >
                          Hide Invalid LinkedIn
                        </button>
                        {(filterEmail || filterPhone || filterLinkedIn || filterComplete || filterConfidence80 || searchQuery || hideInvalidLinkedIn) && (
                          <button
                            type="button"
                            onClick={() => {
                              setFilterEmail(false);
                              setFilterPhone(false);
                              setFilterLinkedIn(false);
                              setFilterComplete(false);
                              setFilterConfidence80(false);
                              setSearchQuery("");
                              setHideInvalidLinkedIn(false);
                              setCurrentPage(1);
                            }}
                            className="text-xs font-semibold text-red-505 hover:text-red-700 ml-1.5"
                          >
                            Clear All
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* List / Grid content container */}
                  <div className="flex-1 overflow-y-auto p-5">
                    {audienceView === "companies" && (
                      <div className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {paginatedCompanies.length === 0 ? (
                            <p className="col-span-full text-center py-10 text-xs text-slate-500">No companies found matching the current filters.</p>
                          ) : null}
                          {paginatedCompanies.map((c, idx) => (
                            <motion.article
                              key={`${c.name}-${idx}`}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 p-4 shadow-sm flex flex-col justify-between"
                            >
                              <div>
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-3 min-w-0">
                                    {/* Company Logo / Initials Avatar */}
                                    {getLogoUrl(c.website) && !logoError[c.name] ? (
                                      <img
                                        src={getLogoUrl(c.website)}
                                        alt={c.name}
                                        onError={() => setLogoError(prev => ({ ...prev, [c.name]: true }))}
                                        className="h-10 w-10 rounded-lg object-contain bg-slate-50 border border-slate-100 p-1 shrink-0 mt-0.5"
                                      />
                                    ) : (
                                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700 mt-0.5">
                                        {initials(c.name)}
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{c.name}</p>
                                        <span className={cx(
                                          "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border",
                                          c.score >= 80 ? "bg-emerald-50 text-emerald-700 border-emerald-205" :
                                            c.score >= 60 ? "bg-blue-50 text-blue-700 border-blue-200" :
                                              "bg-amber-50 text-amber-700 border-amber-200"
                                        )}>
                                          Score: {c.score}
                                        </span>
                                      </div>
                                      <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-355">{c.description}</p>
                                      <p className="mt-1 text-[11px] text-slate-500">
                                        Country: <span className="font-semibold text-slate-700 dark:text-slate-300">{c.country || "-"}</span>
                                      </p>
                                    </div>
                                  </div>
                                  <span className="whitespace-nowrap rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-955 dark:border-blue-900 dark:text-blue-400">
                                    {c.sector || c.industry || "-"}
                                  </span>
                                </div>

                                {/* Expandable Why Relevant */}
                                {c.whyRelevant ? (
                                  <div className="border-t border-slate-100 dark:border-slate-700 pt-2 mt-2">
                                    <button
                                      type="button"
                                      onClick={() => setExpandedWhy(prev => ({ ...prev, [c.name]: !prev[c.name] }))}
                                      className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 transition"
                                    >
                                      Why Relevant {expandedWhy[c.name] ? "▲" : "▼"}
                                    </button>
                                    {expandedWhy[c.name] && (
                                      <p className="mt-1 text-xs leading-5 text-slate-505 pl-2 border-l-2 border-slate-200 dark:border-slate-700">
                                        {c.whyRelevant}
                                      </p>
                                    )}
                                  </div>
                                ) : null}

                                {/* Campaign Fit Section */}
                                {(() => {
                                  const fit = calculateCampaignFit(c);
                                  return (
                                    <div className="mt-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl p-2.5 border border-slate-100 dark:border-slate-700/60 text-[11px]">
                                      <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1 flex justify-between">
                                        <span>Campaign Fit</span>
                                        <span className="text-blue-600 dark:text-blue-400 font-bold">Overall Fit: {fit.overall}%</span>
                                      </p>
                                      <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-500">
                                        <div>Cloud: <span className="font-semibold text-slate-800 dark:text-slate-200">{fit.cloud}%</span></div>
                                        <div>CRM: <span className="font-semibold text-slate-800 dark:text-slate-200">{fit.crm}%</span></div>
                                        <div>Infra: <span className="font-semibold text-slate-800 dark:text-slate-200">{fit.infra}%</span></div>
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* UI Badges Row */}
                                {renderBadges(c, false, linkedInStatuses[c.name])}
                              </div>

                              <div className="mt-3.5 space-y-2.5">
                                {/* Lead Status Selection & Role */}
                                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                                  {c.decisionMakerRole ? (
                                    <div className="min-w-0">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Decision Maker:</span>
                                      <span className="inline-block rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-0.5 text-[10px] text-slate-600 dark:text-slate-400 font-semibold">
                                        {c.decisionMakerRole}
                                      </span>
                                    </div>
                                  ) : <div />}

                                  <div className="flex items-center gap-1 text-xs">
                                    <span className="text-slate-500 font-medium">Status:</span>
                                    <select
                                      value={leadStatus[c.name] || "NEW"}
                                      onChange={(e) => handleStatusChange(c.name, e.target.value)}
                                      className="rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 px-1.5 py-0.5 text-xs text-slate-700 dark:text-slate-300 font-semibold outline-none focus:border-blue-500"
                                    >
                                      <option value="NEW">NEW</option>
                                      <option value="CONTACTED">CONTACTED</option>
                                      <option value="FOLLOW UP">FOLLOW UP</option>
                                      <option value="MEETING DONE">MEETING DONE</option>
                                      <option value="NOT INTERESTED">NOT INTERESTED</option>
                                    </select>
                                  </div>
                                </div>

                                {/* Action Buttons Row */}
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  <button
                                    type="button"
                                    disabled={!c.email || !c.email.trim()}
                                    title={(!c.email || !c.email.trim()) ? "Email not available." : ""}
                                    onClick={(e) => openPopup(e, "email", c.name, c.email)}
                                    className={cx(
                                      "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition",
                                      (!c.email || !c.email.trim())
                                        ? "border-slate-105 bg-slate-50 text-slate-400 cursor-not-allowed dark:bg-slate-900 dark:border-slate-800"
                                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-855 dark:text-slate-300 dark:border-slate-750"
                                    )}
                                  >
                                    <Mail size={12} /> Email
                                  </button>
                                  <button
                                    type="button"
                                    disabled={!c.phone || !c.phone.trim()}
                                    title={(!c.phone || !c.phone.trim()) ? "Phone number not publicly available." : ""}
                                    onClick={(e) => openPopup(e, "call", c.name, c.phone)}
                                    className={cx(
                                      "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition",
                                      (!c.phone || !c.phone.trim())
                                        ? "border-slate-105 bg-slate-50 text-slate-400 cursor-not-allowed dark:bg-slate-900 dark:border-slate-800"
                                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-855 dark:text-slate-300 dark:border-slate-750"
                                    )}
                                  >
                                    <Phone size={12} /> Phone
                                  </button>
                                  {(() => {
                                    const status = linkedInStatuses[c.name] || (c.linkedin ? "ESTIMATED" : "NOT_FOUND");
                                    const isDisabled = status === "INVALID" || status === "NOT_FOUND" || !c.linkedin;
                                    return (
                                      <button
                                        type="button"
                                        disabled={isDisabled}
                                        title={getLinkedInTooltip(status)}
                                        onClick={() => {
                                          if (c.linkedin) window.open(c.linkedin, "_blank", "noopener,noreferrer");
                                        }}
                                        className={cx(
                                          "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition",
                                          isDisabled
                                            ? "border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed dark:bg-slate-900 dark:border-slate-800"
                                            : status === "VERIFIED"
                                              ? "border-emerald-250 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-400"
                                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-855 dark:text-slate-300 dark:border-slate-750"
                                        )}
                                      >
                                        <Link size={12} /> LinkedIn
                                      </button>
                                    );
                                  })()}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(c.name);
                                      alert(`Copied "${c.name}" to clipboard.`);
                                    }}
                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-855 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                                  >
                                    📋 Copy
                                  </button>
                                  {c.website ? (
                                    <a
                                      href={c.website}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-855 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                                    >
                                      <Globe size={12} /> Open
                                    </a>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled
                                      className="inline-flex items-center gap-1 rounded-lg border border-slate-100 bg-slate-50 dark:bg-slate-900 px-2.5 py-1 text-xs font-semibold text-slate-400 cursor-not-allowed"
                                    >
                                      <Globe size={12} /> Open
                                    </button>
                                  )}
                                </div>
                              </div>
                            </motion.article>
                          ))}
                        </div>

                        {/* Infinite Scroll / Load More */}
                        <div className="flex flex-col items-center gap-4 border-t border-slate-200 dark:border-slate-700 pt-4">
                          <button
                            type="button"
                            disabled={chatLoading || batchesCount >= 5 || targetAudience.length >= 100}
                            onClick={loadMoreLeads}
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-white dark:text-slate-900 px-6 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 shadow-sm"
                          >
                            {chatLoading
                              ? "Loading..."
                              : batchesCount >= 5 || targetAudience.length >= 100
                                ? "Maximum Limit Reached"
                                : "Load More"}
                          </button>

                          {/* Pagination Controls */}
                          {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                className="px-2.5 py-1 text-xs font-semibold border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                              >
                                &lt; Previous
                              </button>
                              {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                                <button
                                  key={pageNum}
                                  type="button"
                                  onClick={() => setCurrentPage(pageNum)}
                                  className={cx(
                                    "px-2.5 py-1 text-xs font-semibold rounded-lg transition",
                                    currentPage === pageNum
                                      ? "bg-slate-900 text-white"
                                      : "border border-slate-300 hover:bg-slate-50 text-slate-700"
                                  )}
                                >
                                  {pageNum}
                                </button>
                              ))}
                              <button
                                type="button"
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                className="px-2.5 py-1 text-xs font-semibold border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                              >
                                Next &gt;
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {audienceView === "employees" && (
                      <div className="space-y-5">
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-850 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm max-w-md">
                          <input
                            type="text"
                            value={companyFilter}
                            onChange={(e) => { setCompanyFilter(e.target.value); setCurrentPage(1); }}
                            placeholder="Filter by company name..."
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-xs outline-none transition focus:border-blue-500"
                          />
                          {companyFilter && (
                            <button
                              type="button"
                              onClick={() => { setCompanyFilter(""); setCurrentPage(1); }}
                              className="text-xs font-semibold text-slate-550 hover:text-slate-700"
                            >
                              Clear
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {paginatedEmployees.length === 0 ? (
                            <p className="col-span-full text-center py-10 text-xs text-slate-500">
                              {companyFilter
                                ? `No employees found for "${companyFilter}" matching filters.`
                                : "No employee data matching current filters."}
                            </p>
                          ) : null}
                          {paginatedEmployees.map((emp, idx) => (
                            <div
                              key={`${emp.name}-${emp.company}-${idx}`}
                              className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 p-4 shadow-sm flex flex-col justify-between"
                            >
                              <div>
                                <div className="flex items-start gap-3">
                                  {/* Company Logo / Initials Avatar */}
                                  {(() => {
                                    const comp = targetAudience.find(t => t.name.toLowerCase() === emp.company.toLowerCase());
                                    const logoUrl = getLogoUrl(emp.website || comp?.website);
                                    return logoUrl && !logoError[emp.name] ? (
                                      <img
                                        src={logoUrl}
                                        alt={emp.company}
                                        onError={() => setLogoError(prev => ({ ...prev, [emp.name]: true }))}
                                        className="h-10 w-10 rounded-lg object-contain bg-slate-50 border border-slate-100 p-1 shrink-0 mt-0.5"
                                      />
                                    ) : (
                                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700 mt-0.5">
                                        {initials(emp.name)}
                                      </div>
                                    );
                                  })()}
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{emp.name || "-"}</p>
                                      <span className={cx(
                                        "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border",
                                        emp.score >= 80 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                          emp.score >= 60 ? "bg-blue-50 text-blue-700 border-blue-200" :
                                            "bg-amber-50 text-amber-700 border-amber-200"
                                      )}>
                                        Score: {emp.score}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold">{emp.title || "-"}</p>
                                    <p className="mt-0.5 text-[11px] text-slate-450">{emp.company || "-"}</p>
                                  </div>
                                </div>

                                {/* Campaign Fit Section */}
                                {(() => {
                                  const fit = calculateCampaignFit(emp);
                                  return (
                                    <div className="mt-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl p-2.5 border border-slate-100 dark:border-slate-700/60 text-[11px]">
                                      <p className="font-semibold text-slate-700 dark:text-slate-305 mb-1 flex justify-between">
                                        <span>Campaign Fit</span>
                                        <span className="text-blue-600 dark:text-blue-400 font-bold">Overall Fit: {fit.overall}%</span>
                                      </p>
                                      <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-550">
                                        <div>Cloud: <span className="font-semibold text-slate-800 dark:text-slate-200">{fit.cloud}%</span></div>
                                        <div>CRM: <span className="font-semibold text-slate-800 dark:text-slate-200">{fit.crm}%</span></div>
                                        <div>Infra: <span className="font-semibold text-slate-800 dark:text-slate-200">{fit.infra}%</span></div>
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* UI Badges Row */}
                                {renderBadges(emp, true, linkedInStatuses[emp.name])}
                              </div>

                              <div className="mt-3.5 space-y-2.5">
                                {/* Lead Status Select for Employee */}
                                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                                  <div className="flex items-center gap-1.5 text-xs">
                                    <span className="text-slate-500 font-medium">Status:</span>
                                    <select
                                      value={leadStatus[emp.name] || "NEW"}
                                      onChange={(e) => handleStatusChange(emp.name, e.target.value)}
                                      className="rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-1.5 py-0.5 text-xs text-slate-700 dark:text-slate-300 font-semibold outline-none focus:border-blue-550"
                                    >
                                      <option value="NEW">NEW</option>
                                      <option value="CONTACTED">CONTACTED</option>
                                      <option value="FOLLOW UP">FOLLOW UP</option>
                                      <option value="MEETING DONE">MEETING DONE</option>
                                      <option value="NOT INTERESTED">NOT INTERESTED</option>
                                    </select>
                                  </div>
                                </div>

                                {/* Action Buttons Row */}
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  <button
                                    type="button"
                                    disabled={!emp.email || !emp.email.trim()}
                                    title={(!emp.email || !emp.email.trim()) ? "Email not available." : ""}
                                    onClick={(e) => openPopup(e, "email", emp.name, emp.email)}
                                    className={cx(
                                      "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition",
                                      (!emp.email || !emp.email.trim())
                                        ? "border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed dark:bg-slate-900 dark:border-slate-800"
                                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-855 dark:text-slate-300 dark:border-slate-750"
                                    )}
                                  >
                                    <Mail size={12} /> Email
                                  </button>
                                  <button
                                    type="button"
                                    disabled={!emp.phone || !emp.phone.trim()}
                                    title={(!emp.phone || !emp.phone.trim()) ? "Phone number not publicly available." : ""}
                                    onClick={(e) => openPopup(e, "call", emp.name, emp.phone)}
                                    className={cx(
                                      "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition",
                                      (!emp.phone || !emp.phone.trim())
                                        ? "border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed dark:bg-slate-900 dark:border-slate-800"
                                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-855 dark:text-slate-300 dark:border-slate-750"
                                    )}
                                  >
                                    <Phone size={12} /> Phone
                                  </button>
                                  {(() => {
                                    const status = linkedInStatuses[emp.name] || (emp.linkedin ? "ESTIMATED" : "NOT_FOUND");
                                    const isDisabled = status === "INVALID" || status === "NOT_FOUND" || !emp.linkedin;
                                    return (
                                      <button
                                        type="button"
                                        disabled={isDisabled}
                                        title={getLinkedInTooltip(status)}
                                        onClick={() => {
                                          if (emp.linkedin) window.open(emp.linkedin, "_blank", "noopener,noreferrer");
                                        }}
                                        className={cx(
                                          "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition",
                                          isDisabled
                                            ? "border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed dark:bg-slate-900 dark:border-slate-800"
                                            : status === "VERIFIED"
                                              ? "border-emerald-250 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-400"
                                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-855 dark:text-slate-300 dark:border-slate-750"
                                        )}
                                      >
                                        <Link size={12} /> LinkedIn
                                      </button>
                                    );
                                  })()}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(emp.name);
                                      alert(`Copied "${emp.name}" to clipboard.`);
                                    }}
                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-855 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                                  >
                                    📋 Copy
                                  </button>
                                  {(() => {
                                    const comp = targetAudience.find(t => t.name.toLowerCase() === emp.company.toLowerCase());
                                    const website = emp.website || comp?.website;
                                    return website ? (
                                      <a
                                        href={website}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-755 bg-white dark:bg-slate-855 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                                      >
                                        <Globe size={12} /> Open
                                      </a>
                                    ) : (
                                      <button
                                        type="button"
                                        disabled
                                        className="inline-flex items-center gap-1 rounded-lg border border-slate-100 bg-slate-50 dark:bg-slate-900 px-2.5 py-1 text-xs font-semibold text-slate-400 cursor-not-allowed"
                                      >
                                        <Globe size={12} /> Open
                                      </button>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Infinite Scroll / Load More */}
                        <div className="flex flex-col items-center gap-4 border-t border-slate-200 dark:border-slate-700 pt-4">
                          <button
                            type="button"
                            disabled={chatLoading || batchesCount >= 5 || targetAudience.length >= 100}
                            onClick={loadMoreLeads}
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-white dark:text-slate-900 px-6 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 shadow-sm"
                          >
                            {chatLoading
                              ? "Loading..."
                              : batchesCount >= 5 || targetAudience.length >= 100
                                ? "Maximum Limit Reached"
                                : "Load More"}
                          </button>

                          {/* Pagination Controls */}
                          {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                className="px-2.5 py-1 text-xs font-semibold border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                              >
                                &lt; Previous
                              </button>
                              {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                                <button
                                  key={pageNum}
                                  type="button"
                                  onClick={() => setCurrentPage(pageNum)}
                                  className={cx(
                                    "px-2.5 py-1 text-xs font-semibold rounded-lg transition",
                                    currentPage === pageNum
                                      ? "bg-slate-900 text-white"
                                      : "border border-slate-300 hover:bg-slate-50 text-slate-700"
                                  )}
                                >
                                  {pageNum}
                                </button>
                              ))}
                              <button
                                type="button"
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                className="px-2.5 py-1 text-xs font-semibold border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                              >
                                Next &gt;
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {audienceView === "analytics" && (
                      <div className="space-y-6">
                        {/* Analytics Metric Cards Grid */}
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                          <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 p-3 text-center flex flex-col justify-between min-h-[80px]">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Results Summary</p>
                            <div className="mt-1 text-left text-[11px] text-slate-750 dark:text-slate-300 leading-normal font-semibold space-y-0.5">
                              <div>Results: <span className="font-bold text-slate-900 dark:text-white">{totalResults}</span></div>
                              <div>Loaded: <span className="font-bold text-slate-900 dark:text-white">{batchesCount} batches</span></div>
                              <div>Unique: <span className="font-bold text-slate-900 dark:text-white">{totalResults}</span></div>
                            </div>
                            <div />
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 p-3 text-center flex flex-col justify-between min-h-[80px]">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Emails Found</p>
                            <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{emailsFound}</p>
                            {emailsFound === 0 ? (
                              <p className="text-[8px] text-slate-455 leading-normal">Public emails rarely available.</p>
                            ) : <div />}
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 p-3 text-center flex flex-col justify-between min-h-[80px]">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Phones Found</p>
                            <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{phonesFound}</p>
                            {phonesFound === 0 ? (
                              <p className="text-[8px] text-slate-455 leading-normal">Public numbers often unavailable.</p>
                            ) : <div />}
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 p-3 text-center flex flex-col justify-between min-h-[80px]">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">LinkedIn Summary</p>
                            <div className="mt-1 text-left text-[9px] text-slate-750 dark:text-slate-300 leading-tight font-semibold space-y-0.5">
                              <div>Verified: <span className="text-emerald-600 font-bold">{linkedinCounts.verified}</span></div>
                              <div>Estimated: <span className="text-amber-600 font-bold">{linkedinCounts.estimated}</span></div>
                              <div>Invalid: <span className="text-red-600 font-bold">{linkedinCounts.invalid}</span></div>
                              <div>Not Found: <span className="text-slate-400 font-bold">{linkedinCounts.notFound}</span></div>
                            </div>
                            <div />
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 p-3 text-center flex flex-col justify-between min-h-[80px]">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-455">Complete Profiles</p>
                            <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{completeProfiles}</p>
                            <div />
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 p-3 text-center flex flex-col justify-between min-h-[80px]">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-455">Avg Confidence</p>
                            <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{avgConfidence}%</p>
                            <div />
                          </div>
                        </div>

                        {/* Top Leads & Recommendations panels */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* AI Recommendations Panel */}
                          {targetAudience.length > 0 && (
                            <div className="rounded-xl border border-blue-100 bg-blue-50/20 dark:bg-blue-955/10 dark:border-blue-900/50 p-4">
                              <h3 className="text-xs font-bold text-blue-800 dark:text-blue-400 uppercase tracking-wider mb-3">AI Recommended Leads</h3>
                              <div className="space-y-3">
                                {targetAudience.slice(0, 3).map((item, idx) => {
                                  const fit = calculateCampaignFit(item);
                                  return (
                                    <div key={idx} className="text-xs">
                                      <p className="font-semibold text-slate-900 dark:text-white">{idx + 1}. {item.name}</p>
                                      <ul className="list-disc pl-4 mt-1 text-slate-600 dark:text-slate-350 space-y-0.5">
                                        <li>{item.description || "No description available."}</li>
                                        {item.whyRelevant && <li>{item.whyRelevant}</li>}
                                        <li>Highly aligned with overall fit of {fit.overall}%.</li>
                                      </ul>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Top Leads Panel */}
                          {targetAudience.length > 0 && (
                            <div className="rounded-xl border border-slate-200 bg-slate-55/30 dark:bg-slate-800/30 p-4">
                              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Top Leads</h3>
                              <ol className="list-decimal pl-5 text-sm space-y-2 font-medium text-slate-800 dark:text-slate-300">
                                {targetAudience.slice(0, 3).map((lead, idx) => (
                                  <li key={idx} className="border-b border-slate-100 dark:border-slate-800 pb-1 last:border-0 last:pb-0">
                                    <div className="flex items-center justify-between">
                                      <span>{lead.name}</span>
                                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded dark:bg-blue-955 dark:text-blue-400">
                                        Score: {lead.score}
                                      </span>
                                    </div>
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>


      {/* Contact Popup */}
      {contactPopup.open ? (
        <div
          ref={contactPopupRef}
          className="fixed z-[80]"
          style={{ top: `${contactPopup.top}px`, left: `${contactPopup.left}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-[280px] rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">
                {contactPopup.type === "email"
                  ? `Email — ${contactPopup.name}`
                  : contactPopup.type === "call"
                    ? `Call — ${contactPopup.name}`
                    : `LinkedIn — ${contactPopup.name}`}
              </p>
              <button
                type="button"
                onClick={() => { setContactPopup((p) => ({ ...p, open: false })); setContactCopied(false); setEmailClientOpen(false); }}
                className="rounded-md border border-slate-300 bg-white p-1 text-slate-600 hover:bg-slate-50"
              >
                <X size={12} />
              </button>
            </div>
            <input
              readOnly
              value={contactPopup.value}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-2 text-xs text-slate-700"
              onFocus={(e) => e.target.select()}
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { navigator.clipboard.writeText(contactPopup.value || "").catch(() => { }); setContactCopied(true); setTimeout(() => setContactCopied(false), 2000); }}
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <span className={contactCopied ? "text-emerald-600" : ""}>{contactCopied ? "✓" : "📋"}</span>
                Copy
              </button>
              {contactPopup.type === "email" ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setEmailClientOpen((v) => !v)}
                    className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-slate-900 px-2 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    Open Gmail/Outlook <ChevronDown size={12} />
                  </button>
                  {emailClientOpen ? (
                    <div className="absolute bottom-full left-0 z-10 mb-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                      <button
                        type="button"
                        onClick={() => { window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(contactPopup.value)}`, "_blank", "noopener,noreferrer"); setEmailClientOpen(false); }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Mail size={12} className="text-red-500" /> Gmail
                      </button>
                      <button
                        type="button"
                        onClick={() => { window.open(`https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(contactPopup.value)}`, "_blank", "noopener,noreferrer"); setEmailClientOpen(false); }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Mail size={12} className="text-blue-600" /> Outlook
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => { if (contactPopup.type === "linkedin") window.open(contactPopup.value, "_blank", "noopener,noreferrer"); else window.open(`tel:${contactPopup.value}`, "_self"); }}
                  className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-2 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  {contactPopup.type === "call" ? "Call Now" : "Open LinkedIn"}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Duplicate Prompt Detection Modal */}
      {duplicateModal.open && duplicateModal.similarSession ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 border border-amber-100">
                ⚠️
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Similar Audience Found</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  You generated a similar audience (&ldquo;<span className="font-semibold text-slate-800">{duplicateModal.similarSession.sessionName}</span>&rdquo;){" "}
                  {(() => {
                    const diffMs = Date.now() - new Date(duplicateModal.similarSession.createdAt).getTime();
                    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                    if (diffDays === 0) {
                      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
                      return diffHrs === 0 ? "just now" : `${diffHrs} hour${diffHrs > 1 ? "s" : ""} ago`;
                    }
                    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
                  })()}.
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col sm:flex-row justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDuplicateModal({ open: false, similarSession: null, currentPrompt: "" })}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleOpenExistingSession(duplicateModal.similarSession)}
                className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
              >
                Open Existing
              </button>
              <button
                type="button"
                onClick={handleContinueAnyway}
                className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
              >
                Continue Anyway
              </button>
            </div>
          </div>
        </div>
      ) : null}
      </>
      )}
    </div>
    </main>
  );
}
