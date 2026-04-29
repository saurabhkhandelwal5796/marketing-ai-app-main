"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import SuggestionsPanel from "./SuggestionsPanel";
import ThinkingDisplay from "./ThinkingDisplay";
import {
  AtSign,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardCopy,
  ChevronLeft,
  ChevronRight,
  Globe,
  Info,
  Mail,
  Link,
  MessageSquarePlus,
  MoreVertical,
  Pencil,
  Phone,
  Sparkles,
  Trash2,
  X,
  Users,
  Wand2,
} from "lucide-react";
import CreatePostPage from "../app/create-post/page";
import { getCurrentSessionId, getCurrentUserId } from "../lib/getCurrentUserId";
import Avatar from "./Avatar";

const TABS = [
  { id: "plan", label: "Marketing Plan", icon: ClipboardCopy },
  { id: "details", label: "Selected Marketing Plans", icon: Sparkles },
  { id: "milestones", label: "Create Milestones", icon: Wand2 },
  { id: "tasks", label: "Task Assignment", icon: ClipboardCopy },
  { id: "audience", label: "Target Audience", icon: Users },
];

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const STATUSES = ["To Do", "In Progress", "Done"];
const FILTER_TAGS = ["Messaging", "Branding", "Channels", "Competitive"];
const TASK_TYPES = [
  "Generic Task",
  "LinkedIn Post",
  "Social Media Post",
  "Blog Post",
  "Marketing Video",
  "Cold Email Campaign",
  "Company Research",
  "Email Newsletter",
  "Campaign Analysis",
  "Sales Coordination",
];
const TRACKER_RETURN_CONTEXT_KEY = "campaign.trackerDrawerReturnContext";

// Teams intentionally removed from assignee dropdown (People only).

const TEMPLATE_GROUPS = [
  {
    label: "PROSPECTING",
    items: [
      { title: "Research 50 target companies", task_type: "Company Research", priority: "Medium" },
      { title: "Build prospect list from LinkedIn", task_type: "LinkedIn Post", priority: "Medium" },
    ],
  },
  {
    label: "CONTENT",
    items: [
      { title: "Write LinkedIn post for campaign", task_type: "LinkedIn Post", priority: "High" },
      { title: "Write blog post draft", task_type: "Blog Post", priority: "Medium" },
      { title: "Create marketing video script", task_type: "Marketing Video", priority: "High" },
      { title: "Write email newsletter", task_type: "Email Newsletter", priority: "Medium" },
    ],
  },
  {
    label: "OUTREACH",
    items: [
      { title: "Send 30 cold emails to prospects", task_type: "Cold Email Campaign", priority: "High" },
      { title: "Follow up with warm leads", task_type: "Generic Task", priority: "Urgent" },
    ],
  },
  {
    label: "ANALYSIS",
    items: [
      { title: "Analyze last campaign results", task_type: "Campaign Analysis", priority: "Medium" },
      { title: "Weekly marketing report", task_type: "Generic Task", priority: "Medium" },
    ],
  },
  {
    label: "COORDINATION",
    items: [
      { title: "Sync with sales team on leads", task_type: "Sales Coordination", priority: "Medium" },
      { title: "Review and approve social posts", task_type: "Social Media Post", priority: "Low" },
    ],
  },
];

const CHANNEL_TAG_OPTIONS = [
  "Email",
  "LinkedIn",
  "Instagram",
  "Facebook",
  "Twitter",
  "Blog",
  "WhatsApp",
  "YouTube",
  "SMS",
];

function ymd(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function parseJsonResponse(res, fallbackMessage) {
  const raw = await res.text();
  let data = null;

  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch (_) {
      throw new Error(`${fallbackMessage} Server returned an invalid response format.`);
    }
  }

  if (!res.ok || data?.error) {
    throw new Error(data?.error || `${fallbackMessage} (HTTP ${res.status})`);
  }

  return data || {};
}

function normalizeTags(tags) {
  return Array.isArray(tags) ? tags.filter((t) => typeof t === "string") : [];
}

function hasFilterTag(detailTags, filter) {
  const tags = normalizeTags(detailTags).map((t) => t.toLowerCase());
  const f = (filter || "").toLowerCase();
  if (!f) return true;
  return tags.some((t) => t.includes(f));
}

function hasAnyFilterTag(detailTags, filters = []) {
  if (!Array.isArray(filters) || filters.length === 0) return true;
  const tags = normalizeTags(detailTags).map((t) => t.toLowerCase());
  const wanted = filters.map((f) => String(f || "").toLowerCase()).filter(Boolean);
  if (!wanted.length) return true;
  return wanted.some((f) => tags.some((t) => t.includes(f)));
}

function buildGeneratePostRichContext({
  campaignBriefDescription,
  company,
  campaign,
  website,
  marketingPlan,
  selectedStepIds,
  marketingDetails,
}) {
  const lines = [];
  lines.push("=== Campaign overview ===");
  if (String(company || "").trim()) lines.push(`Company name: ${String(company).trim()}`);
  if (String(campaign || "").trim()) lines.push(`Campaign goal: ${String(campaign).trim()}`);
  if (String(website || "").trim()) lines.push(`Website: ${String(website).trim()}`);
  const brief = String(campaignBriefDescription || "").trim();
  if (brief) {
    lines.push("");
    lines.push("=== Campaign description (brief field) ===");
    lines.push(brief);
  }

  lines.push("");
  lines.push("=== Marketing Plan (checked steps) ===");
  const plan = Array.isArray(marketingPlan) ? marketingPlan : [];
  const checked = plan.filter((step) => step?.id != null && selectedStepIds.includes(step.id));
  if (!checked.length) {
    lines.push("(No plan steps selected.)");
  } else {
    checked.forEach((step, i) => {
      const title = String(step?.title || `Step ${i + 1}`).trim();
      const body = String(step?.description || step?.explanation || "").trim();
      lines.push(`${i + 1}. ${title}`);
      if (body) lines.push(body);
      if (Array.isArray(step?.channels) && step.channels.length) {
        lines.push(`Channels: ${step.channels.join(", ")}`);
      }
      lines.push("");
    });
  }

  lines.push("=== Selected Marketing Plans (all analysis points / current copy) ===");
  const details = Array.isArray(marketingDetails) ? marketingDetails : [];
  if (!details.length) {
    lines.push("(No marketing analysis points yet — generate analysis first.)");
  } else {
    details.forEach((d, i) => {
      const title = String(d?.title || `Point ${i + 1}`).trim();
      const explanation = String(d?.explanation || "").trim();
      lines.push(`${i + 1}. ${title}`);
      if (explanation) lines.push(explanation);
      const tags = normalizeTags(d?.tags);
      if (tags.length) lines.push(`Tags: ${tags.join(", ")}`);
      lines.push("");
    });
  }

  return lines.join("\n").trim();
}

function tasksToExportText(tasks) {
  const lines = [];
  tasks.forEach((t, idx) => {
    const assignee = t.assignee_id ? t.assignee_id : "";
    lines.push(
      `${idx + 1}. [${t.status}] (${t.priority}) ${t.title}` +
        (assignee ? ` — ${assignee}` : "") +
        (t.due_date ? ` — Due: ${t.due_date}` : "")
    );
    if (t.description) lines.push(`   ${t.description}`);
    if (t.channel_tags?.length) lines.push(`   Tags: ${t.channel_tags.join(", ")}`);
    lines.push("");
  });
  return lines.join("\n").trim();
}

function getOutreach(company) {
  const email = typeof company?.email === "string" ? company.email.trim() : "";
  const phone = typeof company?.phone === "string" ? company.phone.trim() : "";
  const linkedin = typeof company?.linkedin === "string" ? company.linkedin.trim() : "";
  const website = typeof company?.website === "string" ? company.website.trim() : "";

  return { email, phone, linkedin, website };
}

function getEmployeeOutreach(employee, companyOutreach = null) {
  const email = typeof employee?.email === "string" ? employee.email.trim() : "";
  const phone = typeof employee?.phone === "string" ? employee.phone.trim() : "";
  const linkedin = typeof employee?.linkedin === "string" ? employee.linkedin.trim() : "";
  const website = typeof employee?.website === "string" ? employee.website.trim() : "";

  return {
    email: email || companyOutreach?.email || "",
    phone: phone || companyOutreach?.phone || "",
    linkedin: linkedin || companyOutreach?.linkedin || "",
    website: website || companyOutreach?.website || "",
  };
}

function buildEmployeeChannelPrompt(channel, employee) {
  const name = employee?.name || "this contact";
  const title = employee?.title || "their role";
  const company = employee?.company || "their company";
  if (channel === "email") {
    return `Write a cold email for ${name}, ${title} at ${company}`;
  }
  if (channel === "call") {
    return `Write a call script for reaching out to ${name}, ${title} at ${company}`;
  }
  return `Write a LinkedIn connection message for ${name}, ${title} at ${company}`;
}

function getLinkedinSearchUrl(name, company) {
  const keywords = [name, company].filter(Boolean).join(" ").trim();
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keywords)}`;
}

function resolveLinkedinUrl(rawUrl, name, company) {
  const url = String(rawUrl || "").trim();
  const isValidProfileUrl =
    /^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9\-_%]+\/?(\?.*)?$/i.test(url) && !/404/i.test(url);
  if (isValidProfileUrl) return url;
  return getLinkedinSearchUrl(name, company);
}

function parseEmailFromAssistantResponse(answer, fallbackSubject) {
  const text = String(answer || "").replace(/\r\n/g, "\n").trim();
  if (!text) return { subject: fallbackSubject, body: "" };

  const withoutFences = text.replace(/```[\s\S]*?```/g, (match) => match.replace(/```/g, "").trim());
  const subjectMatch = withoutFences.match(/^Subject:\s*(.+)$/im);
  const subject = subjectMatch?.[1]?.trim() || fallbackSubject;

  let body = withoutFences.replace(/^Subject:\s*.+$/im, "").trim();
  const dearIndex = body.search(/^Dear\b/im);
  if (dearIndex >= 0) body = body.slice(dearIndex).trim();

  return { subject, body };
}

function toCsvCell(value) {
  if (value == null) return "";
  const asString =
    typeof value === "object"
      ? JSON.stringify(value)
      : String(value);
  return `"${asString.replace(/"/g, '""')}"`;
}

function toCsvString(rows) {
  const safeRows = Array.isArray(rows) ? rows : [];
  if (!safeRows.length) return "";
  const columns = [];
  safeRows.forEach((row) => {
    if (!row || typeof row !== "object") return;
    Object.keys(row).forEach((key) => {
      if (!columns.includes(key)) columns.push(key);
    });
  });
  const header = columns.map((col) => toCsvCell(col)).join(",");
  const lines = safeRows.map((row) =>
    columns.map((col) => toCsvCell(row?.[col])).join(",")
  );
  return [header, ...lines].join("\n");
}

function limitWords(text, maxWords) {
  const value = String(text || "").trim();
  if (!value || !Number.isFinite(maxWords) || maxWords <= 0) return value;
  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length <= maxWords) return value;
  return parts.slice(0, maxWords).join(" ").trim();
}

function initials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "NA";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function audienceNameKey(value) {
  return String(value || "").trim().toLowerCase();
}

function employeeKey(employee) {
  return `${audienceNameKey(employee?.name)}::${audienceNameKey(employee?.company)}::${audienceNameKey(employee?.title)}`;
}

function templateKey(tpl) {
  const title = String(tpl?.title || "").trim().toLowerCase();
  const type = String(tpl?.task_type || "").trim().toLowerCase();
  return `${title}::${type}`;
}

function normalizeMilestoneStatus(status) {
  const value = String(status || "").trim();
  if (["Completed", "In Progress", "Overdue", "Not Started"].includes(value)) return value;
  return "Not Started";
}

function milestoneNodeStyles(status) {
  const normalized = normalizeMilestoneStatus(status);
  if (normalized === "Completed") return "border-emerald-200 bg-emerald-500 text-white";
  if (normalized === "In Progress") return "border-blue-200 bg-blue-500 text-white";
  if (normalized === "Overdue") return "border-red-200 bg-red-500 text-white";
  return "border-slate-300 bg-white text-slate-500";
}

function milestoneLineStyles(status) {
  const normalized = normalizeMilestoneStatus(status);
  if (normalized === "Completed") return "bg-emerald-400";
  if (normalized === "In Progress") return "bg-blue-400";
  if (normalized === "Overdue") return "bg-red-400";
  return "bg-slate-300";
}

function formatMilestoneDate(value) {
  if (!value) return "-";
  const date = new Date(String(value).includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function MarketingAnalysisOutput({
  campaignId,
  company,
  campaign,
  website,
  description,
  /** Raw campaign description from the left-panel textarea (not only the latest chat line). */
  campaignBriefDescription = "",
  attachmentName,
  marketingPlan = [],
  selectedStepIds = [],
  onTogglePlanStep = () => {},
  planLoading = false,
  onGeneratePlan = null,
  initialMarketingDetails = null,
  initialTargetAudience = null,
  initialAiMessage = "",
  auditUserId = null,
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("plan");
  const campaignAuditPageName = useMemo(() => {
    const tab = TABS.find((t) => t.id === activeTab);
    return tab ? `Campaign — ${tab.label}` : "Campaign";
  }, [activeTab]);
  const postAuditAction = useCallback(async (actionName, pageName, details = null) => {
    const uid = auditUserId || (await getCurrentUserId());
    fetch("/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: uid || "anonymous",
        event_type: "action",
        page_name: pageName,
        action_name: actionName,
        details: details == null ? null : typeof details === "string" ? details : JSON.stringify(details),
        session_id: getCurrentSessionId(),
      }),
    }).catch(() => {});
  }, [auditUserId]);

  useEffect(() => {
    const startTime = Date.now();
    return () => {
      const timeSpent = Date.now() - startTime;
      if (timeSpent > 10000) {
        (async () => {
          const uid = auditUserId || (await getCurrentUserId());
          fetch("/api/audit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: uid || "anonymous",
              event_type: "page_visit",
              page_name: campaignAuditPageName,
              time_spent_ms: timeSpent,
              details: `Spent ${Math.round(timeSpent / 1000)} seconds on ${campaignAuditPageName} page`,
              session_id: getCurrentSessionId(),
            }),
          }).catch(() => {});
        })();
      }
    };
  }, [auditUserId, campaignAuditPageName]);

  useEffect(() => {
    if (activeTab !== "audience") return;
    postAuditAction(
      "Viewed Target Audience",
      "Campaign — Target Audience",
      `Viewed target audience suggestions for ${company || "company"} - ${campaign || "campaign"}`
    );
  }, [activeTab, campaign, company, postAuditAction]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [aiMessage, setAiMessage] = useState("");
  const [marketingDetails, setMarketingDetails] = useState([]);
  const [targetAudience, setTargetAudience] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [audienceView, setAudienceView] = useState("companies"); // companies | employees
  const [audienceLoading, setAudienceLoading] = useState(false);
  const [moreAudienceLoading, setMoreAudienceLoading] = useState(false);
  const audienceAbortRef = useRef(null);
  const audienceTimerRef = useRef(null);
  const prevPlanLoadingRef = useRef(planLoading);
  const didMountRef = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const [tabOverflowOpen, setTabOverflowOpen] = useState(false);
  const tabOverflowRef = useRef(null);

  const [selectedDetailIds, setSelectedDetailIds] = useState(() => new Set());
  const [persistedSelectedContentByPointId, setPersistedSelectedContentByPointId] = useState({});
  const [activeTagFilters, setActiveTagFilters] = useState([]);

  const [threadsByPointId, setThreadsByPointId] = useState({});
  const [threadDraftsByPointId, setThreadDraftsByPointId] = useState({});
  const [threadLoadingByPointId, setThreadLoadingByPointId] = useState({});

  const [tasks, setTasks] = useState([]);
  const [taskAssignTab, setTaskAssignTab] = useState("template"); // template | task
  const [taskGenerationReady, setTaskGenerationReady] = useState(false);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskModalMode, setTaskModalMode] = useState("create"); // create | edit
  const [taskModalSaving, setTaskModalSaving] = useState(false);
  const [taskModalError, setTaskModalError] = useState("");
  const [toast, setToast] = useState(null); // {type, message}

  const [formId, setFormId] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formTaskType, setFormTaskType] = useState("");
  const [formPriority, setFormPriority] = useState("Medium");
  const [formAssigneeId, setFormAssigneeId] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formDueReason, setFormDueReason] = useState("");
  const [formCampaignId, setFormCampaignId] = useState("");
  const [formCampaignName, setFormCampaignName] = useState("");
  const [formChannelTags, setFormChannelTags] = useState([]);
  const [formCampaignContext, setFormCampaignContext] = useState("");

  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [companyModalLoading, setCompanyModalLoading] = useState(false);
  const [companyModalError, setCompanyModalError] = useState("");
  const [companyModalData, setCompanyModalData] = useState(null);
  const [activeCompany, setActiveCompany] = useState(null);

  const [generatePostOpen, setGeneratePostOpen] = useState(false);
  const [generatePostSessionKey, setGeneratePostSessionKey] = useState(0);
  const [generatePostPrefill, setGeneratePostPrefill] = useState("");

  // Per-company AI assistant state (lives only inside the company detail modal).
  const [companyAssistantInput, setCompanyAssistantInput] = useState("");
  const [companyAssistantLoading, setCompanyAssistantLoading] = useState(false);
  const [companyAssistantError, setCompanyAssistantError] = useState("");
  const [companyAssistantMessages, setCompanyAssistantMessages] = useState([]); // [{ role: "user"|"assistant", content: string }]

  const selectedCount = selectedDetailIds.size;
  const anySelected = selectedCount > 0;
  const anyTaskSourceSelected =
    anySelected || (Array.isArray(selectedStepIds) && selectedStepIds.length > 0);

  const selectedItems = useMemo(() => {
    const idSet = selectedDetailIds;
    return marketingDetails.filter((item) => idSet.has(item.id));
  }, [marketingDetails, selectedDetailIds]);

  const filteredDetails = useMemo(() => {
    return marketingDetails.filter((d) => hasAnyFilterTag(d.tags, activeTagFilters));
  }, [marketingDetails, activeTagFilters]);
  const filterCounts = useMemo(() => {
    const counts = {};
    FILTER_TAGS.forEach((tag) => {
      counts[tag] = marketingDetails.filter((d) => hasFilterTag(d.tags, tag)).length;
    });
    return counts;
  }, [marketingDetails]);
  const activeFilterSet = useMemo(() => new Set(activeTagFilters), [activeTagFilters]);
  const toggleActiveFilter = (tag) => {
    setActiveTagFilters((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };
  const clearAllFilters = () => setActiveTagFilters([]);

  const campaignContext = useMemo(() => {
    const parts = [company, campaign].filter(Boolean);
    return parts.join(" — ");
  }, [company, campaign]);

  const companyOutreachByName = useMemo(() => {
    const map = {};
    targetAudience.forEach((c) => {
      const key = String(c?.name || "")
        .trim()
        .toLowerCase();
      if (!key) return;
      map[key] = getOutreach(c);
    });
    return map;
  }, [targetAudience]);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [campaignMilestones, setCampaignMilestones] = useState([]);
  const [milestonesLoading, setMilestonesLoading] = useState(false);
  const [selectedCampaignMilestoneId, setSelectedCampaignMilestoneId] = useState("");
  const [trackerDrawerMilestoneId, setTrackerDrawerMilestoneId] = useState("");
  const [trackerTaskAssigningId, setTrackerTaskAssigningId] = useState("");
  const [trackerAssignNoticeByTaskId, setTrackerAssignNoticeByTaskId] = useState({});
  const [milestoneTrackerOffset, setMilestoneTrackerOffset] = useState(0);
  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false);
  const [milestoneModalSaving, setMilestoneModalSaving] = useState(false);
  const [milestoneAiLoading, setMilestoneAiLoading] = useState(false);
  const [milestoneModalError, setMilestoneModalError] = useState("");
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneStartDate, setMilestoneStartDate] = useState("");
  const [milestoneEndDate, setMilestoneEndDate] = useState("");
  const [milestoneAssigneeId, setMilestoneAssigneeId] = useState("");
  const [milestoneDescription, setMilestoneDescription] = useState("");
  const [milestoneSuggestedTasks, setMilestoneSuggestedTasks] = useState([]);
  const [milestoneReviewMilestones, setMilestoneReviewMilestones] = useState([]);
  const [milestoneChatMessages, setMilestoneChatMessages] = useState([]);
  const [milestoneChatInput, setMilestoneChatInput] = useState("");
  const [milestoneChatLoading, setMilestoneChatLoading] = useState(false);
  const [milestonePlanConfirmed, setMilestonePlanConfirmed] = useState(false);
  const [expandedMilestoneIds, setExpandedMilestoneIds] = useState(new Set());
  const [planUpdatedFlash, setPlanUpdatedFlash] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
const [editingMilestoneTmpId, setEditingMilestoneTmpId] = useState(null);
const [editingMilestoneTitleDraft, setEditingMilestoneTitleDraft] = useState("");

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [assistantChannelContext, setAssistantChannelContext] = useState("");
  const [employeePrompt, setEmployeePrompt] = useState("");
  const [contactPopup, setContactPopup] = useState({
    open: false,
    type: "",
    employeeName: "",
    value: "",
    top: 0,
    left: 0,
  });
  const [contactCopied, setContactCopied] = useState(false);
  const contactPopupRef = useRef(null);
  const [employeeAssistantLoading, setEmployeeAssistantLoading] = useState(false);
  const [employeeAssistantData, setEmployeeAssistantData] = useState({
    answer: "",
    suggestedChannels: [],
    channelMessages: { email: null, linkedin: null, call: null },
  });
  const [outreachComposerOpen, setOutreachComposerOpen] = useState(false);
  const [outreachChannel, setOutreachChannel] = useState("Email");
  const [outreachTo, setOutreachTo] = useState("");
  const [outreachSubject, setOutreachSubject] = useState("");
  const [outreachBody, setOutreachBody] = useState("");
  const [outreachSending, setOutreachSending] = useState(false);
  //Added
  const [linkedinComposerOpen, setLinkedinComposerOpen] = useState(false);
  const [linkedinRecipient, setLinkedinRecipient] = useState("");
  const [linkedinMessage, setLinkedinMessage] = useState("");
  const [linkedinSending, setLinkedinSending] = useState(false);
  //Added


  const hasMarketingPlan = Array.isArray(marketingPlan) && marketingPlan.length > 0;
  const assistantAnswer = String(employeeAssistantData?.answer || "");
  const selectedEmployeeOutreach = useMemo(() => {
    if (!selectedEmployee) return { email: "", phone: "", linkedin: "", website: "" };
    const companyKey = String(selectedEmployee?.company || "")
      .trim()
      .toLowerCase();
    return getEmployeeOutreach(selectedEmployee, companyOutreachByName[companyKey] || null);
  }, [selectedEmployee, companyOutreachByName]);
  const createdTemplateKeys = useMemo(() => {
    const set = new Set();
    tasks.forEach((t) => {
      if (!t) return;
      if ((t.campaign_id || "") !== (campaignId || "")) return;
      set.add(templateKey({ title: t.title, task_type: t.task_type }));
    });
    return set;
  }, [campaignId, tasks]);
  const sortedCampaignMilestones = useMemo(() => {
    const rows = Array.isArray(campaignMilestones) ? [...campaignMilestones] : [];
    rows.sort((a, b) => {
      const ad = new Date(a?.start_date || a?.created_at || 0).getTime();
      const bd = new Date(b?.start_date || b?.created_at || 0).getTime();
      return ad - bd;
    });
    return rows;
  }, [campaignMilestones]);

  const trackerMilestones = useMemo(() => {
    const offset = Number.isFinite(milestoneTrackerOffset) ? milestoneTrackerOffset : 0;
    return sortedCampaignMilestones.slice(offset, offset + 5);
  }, [sortedCampaignMilestones, milestoneTrackerOffset]);

  useEffect(() => {
    const total = sortedCampaignMilestones.length;
    const maxOffset = Math.max(0, total - 5);
    setMilestoneTrackerOffset((prev) => Math.min(Math.max(prev, 0), maxOffset));
  }, [sortedCampaignMilestones.length]);

  const selectedCampaignMilestone = useMemo(() => {
    return (
      campaignMilestones.find((milestone) => milestone.id === selectedCampaignMilestoneId) ||
      sortedCampaignMilestones[0] ||
      null
    );
  }, [campaignMilestones, selectedCampaignMilestoneId, sortedCampaignMilestones]);
  const visibleTabs = useMemo(() => {
    const base = TABS.slice(0, 3);
    if (base.some((tab) => tab.id === activeTab)) return base;
    const active = TABS.find((tab) => tab.id === activeTab);
    if (!active) return base;
    return [...base.slice(0, 2), active];
  }, [activeTab]);
  const overflowTabs = useMemo(() => {
    const visibleIds = new Set(visibleTabs.map((tab) => tab.id));
    return TABS.filter((tab) => !visibleIds.has(tab.id));
  }, [visibleTabs]);

  useEffect(() => {
    if (!anySelected) setTaskGenerationReady(false);
  }, [anySelected]);

  const trackerDrawerMilestone = useMemo(() => {
    if (!trackerDrawerMilestoneId) return null;
    return campaignMilestones.find((milestone) => milestone.id === trackerDrawerMilestoneId) || null;
  }, [campaignMilestones, trackerDrawerMilestoneId]);

  useEffect(() => {
    if (!selectedCampaignMilestoneId) return;
    const idx = sortedCampaignMilestones.findIndex((m) => m.id === selectedCampaignMilestoneId);
    if (idx === -1) return;

    const visibleStart = milestoneTrackerOffset;
    const visibleEnd = milestoneTrackerOffset + 4;
    const maxOffset = Math.max(0, sortedCampaignMilestones.length - 5);

    if (idx < visibleStart) setMilestoneTrackerOffset(Math.min(Math.max(0, idx), maxOffset));
    else if (idx > visibleEnd)
      setMilestoneTrackerOffset(Math.min(Math.max(0, idx - 4), maxOffset));
  }, [selectedCampaignMilestoneId, sortedCampaignMilestones, milestoneTrackerOffset]);

  useEffect(() => {
    if (Array.isArray(initialMarketingDetails)) setMarketingDetails(initialMarketingDetails);
  }, [initialMarketingDetails]);

  useEffect(() => {
    if (Array.isArray(initialTargetAudience)) setTargetAudience(initialTargetAudience);
  }, [initialTargetAudience]);

  useEffect(() => {
    if (typeof initialAiMessage === "string") setAiMessage(initialAiMessage);
  }, [initialAiMessage]);

  const generateTargetAudience = async ({ reason = "", append = false } = {}) => {
    const desc = String(description || "").trim();
    if (!desc) return;

    const planSteps = Array.isArray(marketingPlan)
      ? marketingPlan
          .filter((s) => selectedStepIds.includes(s.id))
          .map((s) => `${s.title || ""}: ${s.description || ""}`.trim())
          .filter(Boolean)
      : [];

    const selectedDetails = Array.isArray(marketingDetails)
      ? marketingDetails
          .filter((d) => selectedDetailIds.has(d.id))
          .map((d) => `${d.title || ""}: ${d.explanation || ""}`.trim())
          .filter(Boolean)
      : [];

    if (audienceAbortRef.current) {
      try {
        audienceAbortRef.current.abort();
      } catch (_) {
        // ignore
      }
    }
    const controller = new AbortController();
    audienceAbortRef.current = controller;

    const existingAudienceNames = append
      ? targetAudience.map((item) => String(item?.name || "").trim()).filter(Boolean)
      : [];

    if (append) setMoreAudienceLoading(true);
    else setAudienceLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          company,
          campaign,
          website,
          description: desc,
          attachmentName,
          step: "target_audience",
          selectedPlanSteps: planSteps,
          selectedDetails,
          existingAudienceNames,
          responseContext: reason,
        }),
      });
      const data = await parseJsonResponse(res, "Failed to generate target audience.");
      const nextAudience = Array.isArray(data?.targetAudience) ? data.targetAudience : [];
      const nextEmployees = Array.isArray(data?.employees) ? data.employees : [];

      if (append) {
        const seenAudience = new Set(targetAudience.map((item) => audienceNameKey(item?.name)).filter(Boolean));
        const audienceAdditions = nextAudience.filter((item) => {
          const key = audienceNameKey(item?.name);
          if (!key || seenAudience.has(key)) return false;
          seenAudience.add(key);
          return true;
        });
        const newCompanyKeys = new Set(audienceAdditions.map((item) => audienceNameKey(item?.name)).filter(Boolean));
        const employeesForNewCompanies = nextEmployees.filter((employee) =>
          newCompanyKeys.has(audienceNameKey(employee?.company))
        );
        const employeeAdditions = employeesForNewCompanies.length ? employeesForNewCompanies : nextEmployees;

        setTargetAudience((prev) => [...prev, ...audienceAdditions]);
        setEmployees((prev) => {
          const seenEmployees = new Set(prev.map(employeeKey).filter(Boolean));
          const additions = employeeAdditions.filter((employee) => {
            const key = employeeKey(employee);
            if (!key || seenEmployees.has(key)) return false;
            seenEmployees.add(key);
            return true;
          });
          return [...prev, ...additions];
        });
      } else {
        setTargetAudience(nextAudience);
        setEmployees(nextEmployees);
      }
      setAudienceView("companies");
    } catch (e) {
      if (e?.name === "AbortError") return;
      setError(e?.message || "Failed to generate target audience.");
    } finally {
      if (append) setMoreAudienceLoading(false);
      else setAudienceLoading(false);
    }
  };

  const scheduleAudienceRefresh = ({ reason = "" } = {}) => {
    if (audienceTimerRef.current) clearTimeout(audienceTimerRef.current);
    audienceTimerRef.current = setTimeout(() => {
      generateTargetAudience({ reason });
    }, 650);
  };

  // useEffect(() => {
  //   // Ask AI finished (planLoading true -> false) -> refresh audience
  //   const prev = !!prevPlanLoadingRef.current;
  //   const next = !!planLoading;
  //   prevPlanLoadingRef.current = next;
  //   if (prev && !next) scheduleAudienceRefresh({ reason: "ask_ai" });
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [planLoading]);

  // useEffect(() => {
  //   // Selecting marketing plan steps -> refresh audience
  //   if (!String(description || "").trim()) return;
  //   if (!didMountRef.current) return;
  //   scheduleAudienceRefresh({ reason: "plan_points_changed" });
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [selectedStepIds, description, marketingPlan]);

  // useEffect(() => {
  //   // Selecting detailed points -> refresh audience
  //   if (!String(description || "").trim()) return;
  //   if (!didMountRef.current) return;
  //   scheduleAudienceRefresh({ reason: "detail_points_changed" });
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [selectedDetailIds]);

  useEffect(() => {
    didMountRef.current = true;
    return () => {
      if (audienceTimerRef.current) clearTimeout(audienceTimerRef.current);
      if (audienceAbortRef.current) {
        try {
          audienceAbortRef.current.abort();
        } catch (_) {
          // ignore
        }
      }
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e) => {
      if (!menuRef.current) return;
      if (menuRef.current.contains(e.target)) return;
      setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  useEffect(() => {
    if (!tabOverflowOpen) return;
    const onDoc = (e) => {
      if (!tabOverflowRef.current) return;
      if (tabOverflowRef.current.contains(e.target)) return;
      setTabOverflowOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [tabOverflowOpen]);

  useEffect(() => {
    if (!contactPopup.open) return;
    const onDocClick = (e) => {
      if (contactPopupRef.current?.contains(e.target)) return;
      setContactPopup((prev) => ({ ...prev, open: false }));
      setContactCopied(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [contactPopup.open]);

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to load users.");
      setUsers(Array.isArray(data.users) ? data.users : []);
    } finally {
      setUsersLoading(false);
    }
  };

  const loadTasks = async () => {
    setTasksLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (campaignId) params.set("campaignId", campaignId);
      const query = params.toString();
      const res = await fetch(`/api/tasks${query ? `?${query}` : ""}`);
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to load tasks.");
      setTasks(Array.isArray(data.tasks) ? data.tasks : []);
    } catch (e) {
      setError(e?.message || "Failed to load tasks.");
    } finally {
      setTasksLoading(false);
    }
  };

  const loadMilestones = async () => {
    if (!campaignId) {
      setCampaignMilestones([]);
      return;
    }
    setMilestonesLoading(true);
    try {
      const res = await fetch(`/api/milestones?campaignId=${encodeURIComponent(campaignId)}`);
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to load milestones.");
      const rows = Array.isArray(data?.milestones) ? data.milestones : [];
      setCampaignMilestones(rows);
      setSelectedCampaignMilestoneId((prev) => prev || rows[0]?.id || "");
    } catch (e) {
      setError(e?.message || "Failed to load milestones.");
    } finally {
      setMilestonesLoading(false);
    }
  };

  const openTrackerDetailDrawer = (milestoneId) => {
    if (!milestoneId) return;
    setTrackerDrawerMilestoneId(milestoneId);
  };

  const closeTrackerDetailDrawer = () => {
    setTrackerDrawerMilestoneId("");
  };

  const assignMilestoneTrackerTask = async (milestone, task, assigneeIdValue) => {
    if (!milestone?.id || !task?.id) return;
    const assignee_id = assigneeIdValue || null;
    const selectedUser = assignee_id ? users.find((u) => u.id === assignee_id) : null;

    setTrackerTaskAssigningId(task.id);
    setTrackerAssignNoticeByTaskId((prev) => ({ ...prev, [task.id]: "" }));

    setCampaignMilestones((prev) =>
      prev.map((m) =>
        m.id !== milestone.id
          ? m
          : {
              ...m,
              tasks: (m.tasks || []).map((t) =>
                t.id !== task.id
                  ? t
                  : {
                      ...t,
                      assignee_id,
                      assignee_name: selectedUser?.name || "-",
                    }
              ),
            }
      )
    );

    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(`milestone:${task.id}`)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignee_id,
          milestone_id: milestone.id,
          campaign_id: milestone.campaign_id || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to assign milestone task.");

      if (auditUserId && assignee_id) {
        postAuditAction(
          `Assigned Task to ${selectedUser?.name || "User"}`,
          "Campaign — Marketing Plan",
          `Assigned task "${task?.title || "Untitled task"}" to ${selectedUser?.name || "User"} in milestone "${milestone?.title || "Milestone"}"`
        );
      }

      setCampaignMilestones((prev) =>
        prev.map((m) =>
          m.id !== milestone.id
            ? m
            : {
                ...m,
                tasks: (m.tasks || []).map((t) => (t.id === task.id ? { ...t, ...data.task } : t)),
              }
        )
      );
      setTrackerAssignNoticeByTaskId((prev) => ({ ...prev, [task.id]: "Assigned" }));
      setTimeout(() => {
        setTrackerAssignNoticeByTaskId((prev) => ({ ...prev, [task.id]: "" }));
      }, 1200);
    } catch (e) {
      setError(e?.message || "Failed to assign milestone task.");
    } finally {
      setTrackerTaskAssigningId("");
    }
  };

  const loadPersistedSelectedPoints = async () => {
    if (!campaignId) {
      setSelectedDetailIds(new Set());
      setPersistedSelectedContentByPointId({});
      return;
    }

    try {
      const res = await fetch(`/api/campaign-selected-points?campaignId=${encodeURIComponent(campaignId)}`);
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to load selected points.");

      const points = Array.isArray(data?.points) ? data.points : [];
      setSelectedDetailIds(new Set(points.map((p) => p?.point_id).filter(Boolean)));

      const map = {};
      points.forEach((p) => {
        const key = String(p?.point_id || "").trim();
        if (!key) return;
        map[key] = p?.content || {};
      });
      setPersistedSelectedContentByPointId(map);
    } catch (_) {
      // If this fails we keep the current in-memory selection.
    }
  };

  useEffect(() => {
    loadUsers();
    loadTasks();
    loadMilestones();
    loadPersistedSelectedPoints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#tracker-detail") return;
    try {
      const raw = window.sessionStorage.getItem(TRACKER_RETURN_CONTEXT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || String(parsed.campaignId || "") !== String(campaignId || "")) return;
      const milestoneId = String(parsed.milestoneId || "").trim();
      if (milestoneId) setTrackerDrawerMilestoneId(milestoneId);
      window.sessionStorage.removeItem(TRACKER_RETURN_CONTEXT_KEY);
    } catch {
      // ignore bad storage payloads
    }
  }, [campaignId]);

  const openCompanyModal = async (companyObj) => {
    setActiveCompany(companyObj);
    setCompanyModalOpen(true);
    setCompanyModalError("");
    setCompanyModalData(null);
    setCompanyModalLoading(true);
    // Reset the AI assistant so each company has independent chat context.
    setCompanyAssistantInput("");
    setCompanyAssistantMessages([]);
    setCompanyAssistantError("");
    setCompanyAssistantLoading(false);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "company_detail",
          company,
          campaign,
          website,
          description,
          companyName: companyObj?.name || "",
          companyPayload: companyObj,
        }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to generate company details.");
      setCompanyModalData(data);
    } catch (e) {
      setCompanyModalError(e?.message || "Failed to generate company details.");
    } finally {
      setCompanyModalLoading(false);
    }
  };

  const showToast = (type, message, position = "bottom", tone = "default") => {
    setToast({ type, message, position, tone });
    setTimeout(() => setToast(null), 1800);
  };

  const submitCompanyAssistant = async () => {
    const question = String(companyAssistantInput || "").trim();
    if (!question || companyAssistantLoading) return;

    setCompanyAssistantError("");
    setCompanyAssistantLoading(true);

    // Keep prior context (not including the current question) for the prompt transcript.
    const priorThread = companyAssistantMessages;

    // Update UI immediately with the user's question.
    setCompanyAssistantMessages((prev) => [...prev, { role: "user", content: question }]);
    setCompanyAssistantInput("");

    try {
      const safeCompanyName = String(activeCompany?.name || "").trim();
      const safeCountry = String(activeCompany?.country || "").trim();
      const safeSector = String(activeCompany?.sector || activeCompany?.industry || "").trim();

      const companyData = {
        ...(activeCompany || {}),
        companyModalData: companyModalData || null,
      };

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "company_assistant",
          companyName: safeCompanyName,
          country: safeCountry,
          sector: safeSector,
          question,
          threadMessages: priorThread,
          companyPayload: companyData,
        }),
      });

      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to ask AI.");

      const answer = typeof data?.answer === "string" ? data.answer : "";
      setCompanyAssistantMessages((prev) => [...prev, { role: "assistant", content: answer }]);
    } catch (e) {
      setCompanyAssistantError(e?.message || "Failed to ask AI.");
    } finally {
      setCompanyAssistantLoading(false);
    }
  };

  const openMilestoneModal = async () => {
    setMilestoneModalError("");
    setMilestoneReviewMilestones([]);
    setMilestoneAiLoading(true);
    setMilestoneModalSaving(false);
    setMilestoneModalOpen(true);
    setMilestoneChatMessages([]);
    setMilestoneChatInput("");
    setMilestoneChatLoading(false);
    setMilestonePlanConfirmed(false);
    setExpandedMilestoneIds(new Set());
    setPlanUpdatedFlash(false);
    setEditingTaskId(null);
    setEditingMilestoneTmpId(null);


    try {
      if (!campaignId) throw new Error("Campaign is required to generate milestones.");

      const marketingPlanSelectedSteps = Array.isArray(marketingPlan)
        ? marketingPlan
            .filter((p) => selectedStepIds.includes(p?.id))
            .map((p) => ({
              id: p?.id,
              title: String(p?.title || ""),
              explanation: String(p?.explanation || p?.description || ""),
              tags: Array.isArray(p?.tags) ? p.tags : [],
            }))
        : [];

      const selectedMarketingPlansSelectedSteps = Array.from(selectedDetailIds).map((pointId) => {
        const detail = marketingDetails.find((d) => String(d?.id || "") === String(pointId)) || null;
        const saved = persistedSelectedContentByPointId[pointId] || null;
        return {
          id: pointId,
          title: String(detail?.title || saved?.title || ""),
          explanation: String(detail?.explanation || saved?.explanation || ""),
          tags: Array.isArray(detail?.tags) ? detail.tags : Array.isArray(saved?.tags) ? saved.tags : [],
        };
      });

      // Deduplicate by point id, keeping Selected Marketing Plans content if present (user-edited version).
      const selectedPlanStepsById = new Map();
      for (const p of marketingPlanSelectedSteps) {
        if (!p?.id) continue;
        selectedPlanStepsById.set(String(p.id), p);
      }
      for (const p of selectedMarketingPlansSelectedSteps) {
        if (!p?.id) continue;
        selectedPlanStepsById.set(String(p.id), p);
      }
      const selectedPlanSteps = Array.from(selectedPlanStepsById.values());

      // Provide a stable start_date; AI decides duration/end_date itself.
      const start = ymd(new Date());

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "milestone_plan_generate",
          company,
          campaign,
          website,
          description,
          selectedPlanSteps,
          today: start,
        }),
      });

      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to generate milestone plan with AI.");

      const defaultAssigneeId = users?.[0]?.id || "";
      const generated = Array.isArray(data?.milestones) ? data.milestones : [];

      setMilestoneReviewMilestones(
        generated.map((m, idx) => ({
          tmpId: `${Date.now()}-${idx}`,
          title: String(m?.title || `Milestone ${idx + 1}`),
          description: String(m?.description || ""),
          start_date: m?.start_date || "",
          end_date: m?.end_date || "",
          assignee_id: defaultAssigneeId,
          tasks: Array.isArray(m?.tasks)
            ? m.tasks.map((t, tIdx) => ({
                tmpId: `${Date.now()}-${idx}-${tIdx}`,
                title: String(t?.title || `Task ${tIdx + 1}`),
                task_type: String(t?.task_type || t?.taskType || "Generic Task"),
              }))
            : [],
        }))
      );
    } catch (e) {
      setMilestoneModalError(e?.message || "Failed to generate milestone plan with AI.");
    } finally {
      setMilestoneAiLoading(false);
    }
  };

  const submitMilestoneChatRefine = async () => {
    const userMessage = String(milestoneChatInput || "").trim();
    if (!userMessage || milestoneChatLoading) return;

    setMilestoneChatLoading(true);
    setMilestoneModalError("");

    const priorMessages = milestoneChatMessages;
    setMilestoneChatMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setMilestoneChatInput("");

    try {
      const currentPlan = milestoneReviewMilestones.map((m) => ({
        title: m.title,
        description: m.description,
        start_date: m.start_date,
        end_date: m.end_date,
        tasks: (m.tasks || []).map((t) => ({ title: t.title, task_type: t.task_type })),
      }));

      // Build selected plan steps context for full AI context (FIX 4)
      const selectedPlanStepsPayload = Array.isArray(marketingPlan)
        ? marketingPlan
            .filter((p) => selectedStepIds.includes(p?.id))
            .map((p) => ({
              id: p?.id,
              title: String(p?.title || ""),
              explanation: String(p?.explanation || p?.description || ""),
            }))
        : [];

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "milestone_plan_refine",
          company,
          campaign,
          website,
          description,
          currentPlan,
          userMessage,
          chatHistory: [...priorMessages, { role: "user", content: userMessage }],
          selectedPlanSteps: selectedPlanStepsPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to refine plan.");

      const aiMessage = data?.ai_message || "Plan updated.";
      setMilestoneChatMessages((prev) => [...prev, { role: "assistant", content: aiMessage }]);

      const defaultAssigneeId = users?.[0]?.id || "";
      const generated = Array.isArray(data?.milestones) ? data.milestones : [];

      setMilestoneReviewMilestones(
        generated.map((m, idx) => ({
          tmpId: `${Date.now()}-${idx}`,
          title: String(m?.title || `Milestone ${idx + 1}`),
          description: String(m?.description || ""),
          start_date: m?.start_date || "",
          end_date: m?.end_date || "",
          assignee_id: defaultAssigneeId,
          tasks: Array.isArray(m?.tasks)
            ? m.tasks.map((t, tIdx) => ({
                tmpId: `${Date.now()}-${idx}-${tIdx}`,
                title: String(t?.title || `Task ${tIdx + 1}`),
                task_type: String(t?.task_type || t?.taskType || "Generic Task"),
              }))
            : [],
        }))
      );

      // Show "Plan updated" flash (FIX 1)
      setPlanUpdatedFlash(true);
      setTimeout(() => setPlanUpdatedFlash(false), 2500);
    } catch (e) {
      setMilestoneChatMessages((prev) => [...prev, { role: "assistant", content: `Error: ${e?.message || "Failed to refine plan."}` }]);
    } finally {
      setMilestoneChatLoading(false);
    }
  };

  const createCampaignMilestonesFromReview = async () => {
    if (!campaignId) {
      setMilestoneModalError("Campaign is required.");
      return;
    }
    if (!milestoneReviewMilestones.length) {
      setMilestoneModalError("No AI milestones found to save.");
      return;
    }

    setMilestoneModalError("");
    setMilestoneModalSaving(true);

    const createdIds = [];

    try {
      // Save each generated milestone, then its tasks.
      for (const m of milestoneReviewMilestones) {
        const milestoneRes = await fetch("/api/milestones", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: m?.title || "",
            description: m?.description || "",
            campaign_id: campaignId,
            assignee_id: m?.assignee_id || null,
            start_date: m?.start_date || null,
            end_date: m?.end_date || null,
          }),
        });

        const milestoneData = await milestoneRes.json();
        if (!milestoneRes.ok || milestoneData?.error) {
          throw new Error(milestoneData?.error || "Failed to create milestone.");
        }

        const created = milestoneData?.milestone;
        if (!created?.id) throw new Error("Milestone creation response was invalid.");
        createdIds.push(created.id);

        // Create the tasks inside the milestone.
        const assigneeId = m?.assignee_id || null;
        const tasks = Array.isArray(m?.tasks) ? m.tasks : [];
        for (const t of tasks) {
          const title = String(t?.title || "").trim();
          if (!title) continue;
          const taskRes = await fetch(`/api/milestones/${created.id}/tasks`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title,
              task_type: String(t?.task_type || "Generic Task"),
              assignee_id: assigneeId,
              status: "Not Started",
            }),
          });
          const taskData = await taskRes.json();
          if (!taskRes.ok || taskData?.error) {
            throw new Error(taskData?.error || "Failed to create milestone task.");
          }
        }
      }

      await loadMilestones();
      if (createdIds.length) setSelectedCampaignMilestoneId(createdIds[0]);
      setMilestoneModalOpen(false);
      showToast("success", "Milestones created successfully.");
      if (auditUserId) {
        const count = createdIds.length;
        postAuditAction(
          "Created Milestone",
          "Campaign — Marketing Plan",
          `Created ${count} milestone${count === 1 ? "" : "s"} for campaign ${campaign || "Marketing Campaign"}`
        );
      }
    } catch (e) {
      setMilestoneModalError(e?.message || "Failed to save milestones.");
    } finally {
      setMilestoneModalSaving(false);
    }
  };

  const resetTaskForm = () => {
    setFormId("");
    setFormTitle("");
    setFormDescription("");
    setFormTaskType("");
    setFormPriority("Medium");
    setFormAssigneeId("");
    setFormDueDate("");
    setFormDueReason("");
    setFormCampaignId("");
    setFormCampaignName("");
    setFormChannelTags([]);
    setFormCampaignContext(campaignContext);
  };

  const openCreateTaskModal = (prefill = null) => {
    setTaskModalMode("create");
    setTaskModalError("");
    resetTaskForm();
    setFormCampaignId(campaignId || "");
    setFormCampaignName(String(campaign || "").trim());
    if (prefill) {
      if (typeof prefill.title === "string") setFormTitle(prefill.title);
      if (typeof prefill.task_type === "string") setFormTaskType(prefill.task_type);
      if (typeof prefill.priority === "string") setFormPriority(prefill.priority);
    }
    setTaskModalOpen(true);
  };

  const openEditTaskModal = (t) => {
    setTaskModalMode("edit");
    setTaskModalError("");
    setFormId(t.id);
    setFormTitle(t.title || "");
    setFormDescription(t.description || "");
    setFormTaskType(t.task_type || "");
    setFormPriority(t.priority || "Medium");
    setFormAssigneeId(t.assignee_id || "");
    setFormDueDate(t.due_date || "");
    setFormDueReason("");
    setFormCampaignId(t.campaign_id || "");
    setFormCampaignName("");
    setFormChannelTags(Array.isArray(t.channel_tags) ? t.channel_tags : []);
    setFormCampaignContext(t.campaign_context || "");
    setTaskModalOpen(true);
  };

  const buildCampaignContext = () => {
    const base = String(formCampaignContext || "").trim();
    const camp = String(formCampaignName || "").trim();
    const header = camp ? `Campaign: ${camp}` : "";
    if (!header) return base || "";
    if (!base) return header;
    if (base.startsWith("Campaign: ")) return base; // already has header
    return `${header}\n${base}`;
  };

  const aiSuggestDueDate = async (title, taskType, priority) => {
    const today = ymd(new Date());
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        step: "due_date_suggest",
        today,
        title,
        taskType,
        priority,
      }),
    });
    const data = await res.json();
    if (!res.ok || data?.error) throw new Error(data?.error || "Failed to suggest due date.");
    return data;
  };

  const submitTaskModal = async () => {
    setTaskModalError("");
    const title = String(formTitle || "").trim();
    if (!title) {
      setTaskModalError("Task Title is required.");
      return;
    }
    if (!String(formTaskType || "").trim()) {
      setTaskModalError("Task Type is required.");
      return;
    }

    setTaskModalSaving(true);
    try {
      const payload = {
        title,
        description: formDescription || "",
        assignee_id: formAssigneeId || null,
        assignee_team: null,
        priority: formPriority,
        status: "To Do",
        task_type: formTaskType,
        due_date: formDueDate || null,
        channel_tags: formChannelTags,
        campaign_context: buildCampaignContext(),
        campaign_id: formCampaignId || null,
      };

      if (taskModalMode === "create") {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || data?.error) throw new Error(data?.error || "Failed to create task.");
        setTaskModalOpen(false);
        showToast("success", "Task created successfully.", "top-center", "salesforce");
        if (auditUserId) {
          const assigned = users.find((u) => u.id === formAssigneeId)?.name || "Unassigned";
          postAuditAction(
            "Created Task",
            "Campaign — Task Assignment",
            `Created task "${title || "Untitled task"}" and assigned to ${assigned}`
          );
        }
        await loadTasks();
      } else {
        const res = await fetch(`/api/tasks/${formId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || data?.error) throw new Error(data?.error || "Failed to update task.");
        setTaskModalOpen(false);
        showToast("success", "Task updated successfully");
        if (auditUserId && formAssigneeId) {
          const selected = users.find((u) => u.id === formAssigneeId);
          postAuditAction(
            `Assigned Task to ${selected?.name || "User"}`,
            "Campaign — Task Assignment",
            `Assigned task "${formTitle || "Untitled task"}" to ${selected?.name || "User"}`
          );
        }
        await loadTasks();
      }
    } catch (e) {
      setTaskModalError(e?.message || "Failed to save task.");
      showToast("error", e?.message || "Failed to save task.");
    } finally {
      setTaskModalSaving(false);
    }
  };

  const createTaskFromTemplate = async (tpl) => {
    // Template click opens task creation UI with prefilled values
    openCreateTaskModal({ title: tpl.title, task_type: tpl.task_type, priority: tpl.priority });
  };

  const toggleSelected = (id) => {
    const isCurrentlySelected = selectedDetailIds.has(id);
    const willSelect = !isCurrentlySelected;

    const detail =
      marketingDetails.find((d) => String(d?.id || "") === String(id)) || persistedSelectedContentByPointId[id] || null;

    const content = detail
      ? {
          title: String(detail?.title || ""),
          explanation: String(detail?.explanation || ""),
          tags: Array.isArray(detail?.tags) ? detail.tags : [],
        }
      : { title: "", explanation: "", tags: [] };

    if (campaignId) {
      (async () => {
        try {
          if (willSelect) {
            await fetch("/api/campaign-selected-points", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ campaign_id: campaignId, point_id: id, content }),
            });
          } else {
            await fetch("/api/campaign-selected-points", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ campaign_id: campaignId, point_id: id }),
            });
          }
        } catch (_) {
          // Ignore persistence failures; local selection still updates.
        }
      })();
    }

    setSelectedDetailIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

    if (willSelect) {
      setPersistedSelectedContentByPointId((prev) => ({ ...prev, [id]: content }));
    } else {
      setPersistedSelectedContentByPointId((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    }
  };

  const selectAllVisible = () => {
    const points = Array.isArray(filteredDetails) ? filteredDetails : [];
    const toSelect = points.map((d) => d?.id).filter(Boolean);

    setSelectedDetailIds((prev) => {
      const next = new Set(prev);
      points.forEach((d) => next.add(d.id));
      return next;
    });

    if (campaignId && toSelect.length) {
      (async () => {
        try {
          await Promise.all(
            points.map((d) =>
              fetch("/api/campaign-selected-points", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  campaign_id: campaignId,
                  point_id: d.id,
                  content: {
                    title: d.title || "",
                    explanation: d.explanation || "",
                    tags: Array.isArray(d.tags) ? d.tags : [],
                  },
                }),
              })
            )
          );
        } catch (_) {
          // ignore
        }
      })();
    }
  };

  const deselectAll = () => {
    const existing = Array.from(selectedDetailIds);
    setSelectedDetailIds(new Set());

    if (campaignId && existing.length) {
      (async () => {
        try {
          await Promise.all(
            existing.map((pointId) =>
              fetch("/api/campaign-selected-points", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ campaign_id: campaignId, point_id: pointId }),
              })
            )
          );
        } catch (_) {
          // ignore
        }
      })();
    }
  };

  const selectTop10Visible = () => {
    const points = Array.isArray(filteredDetails) ? filteredDetails.slice(0, 10) : [];
    const toSelect = points.map((d) => d?.id).filter(Boolean);

    setSelectedDetailIds((prev) => {
      const next = new Set(prev);
      points.forEach((d) => next.add(d.id));
      return next;
    });

    if (campaignId && toSelect.length) {
      (async () => {
        try {
          await Promise.all(
            points.map((d) =>
              fetch("/api/campaign-selected-points", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  campaign_id: campaignId,
                  point_id: d.id,
                  content: {
                    title: d.title || "",
                    explanation: d.explanation || "",
                    tags: Array.isArray(d.tags) ? d.tags : [],
                  },
                }),
              })
            )
          );
        } catch (_) {
          // ignore
        }
      })();
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company,
          campaign,
          website,
          description,
          attachmentName,
          step: "analysis",
        }),
      });
      const data = await parseJsonResponse(res, "Failed to generate analysis.");

      setAiMessage(typeof data?.aiMessage === "string" ? data.aiMessage : "");
      setMarketingDetails(Array.isArray(data?.marketingDetails) ? data.marketingDetails : []);
      setTargetAudience(Array.isArray(data?.targetAudience) ? data.targetAudience : []);
      setEmployees(Array.isArray(data?.employees) ? data.employees : []);
      setAudienceView("companies");
      setSelectedEmployee(null);
      setEmployeePrompt("");
      setEmployeeAssistantData({
        answer: "",
        suggestedChannels: [],
        channelMessages: { email: null, linkedin: null },
      });
      setSelectedDetailIds(new Set());
      setTaskGenerationReady(false);
      setActiveTagFilters([]);
      setThreadsByPointId({});
      setThreadDraftsByPointId({});
      setThreadLoadingByPointId({});
      setTasks([]);
      setActiveTab("details");

      // Save generated plan + analysis to history
      try {
        await fetch("/api/campaign-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaign_id: campaignId,
            company,
            goal: campaign,
            website,
            description,
            marketing_details: Array.isArray(data?.marketingDetails) ? data.marketingDetails : [],
            target_audience: Array.isArray(data?.targetAudience) ? data.targetAudience : [],
            marketing_plan: Array.isArray(marketingPlan) ? marketingPlan : [],
          }),
        });
      } catch (_) {
        // ignore history failures
      }

      const meaningful =
        (typeof data?.aiMessage === "string" && data.aiMessage.trim()) ||
        (Array.isArray(data?.marketingDetails) && data.marketingDetails.length) ||
        (Array.isArray(data?.targetAudience) && data.targetAudience.length);
      if (auditUserId && meaningful) {
        postAuditAction(
          "Generated Marketing Plan",
          "Campaign — Selected Marketing Plans",
          `Generated marketing plan for ${company || "Company"} - ${campaign || "Campaign"}`
        );
      }
    } catch (err) {
      setError(err?.message || "Failed to generate analysis.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyTasks = async () => {
    try {
      await navigator.clipboard.writeText(tasksToExportText(tasks) || "");
    } catch (_) {
      // ignore
    }
  };

  const openThread = (pointId) => {
    setThreadsByPointId((prev) => {
      const next = { ...prev };
      const existing = next[pointId] || { open: false, messages: [] };
      next[pointId] = { ...existing, open: true };
      return next;
    });
  };

  const toggleThread = (pointId) => {
    setThreadsByPointId((prev) => {
      const next = { ...prev };
      const existing = next[pointId] || { open: false, messages: [] };
      next[pointId] = { ...existing, open: !existing.open };
      return next;
    });
  };

  const clearThread = (pointId) => {
    setThreadsByPointId((prev) => {
      const next = { ...prev };
      const existing = next[pointId] || { open: true, messages: [] };
      next[pointId] = { ...existing, messages: [] };
      return next;
    });
    setThreadDraftsByPointId((prev) => ({ ...prev, [pointId]: "" }));
  };

  const sendThreadMessage = async (detail) => {
    const pointId = detail.id;
    const draft = (threadDraftsByPointId[pointId] || "").trim();
    if (!draft) return;

    openThread(pointId);
    const userMsg = { id: uid(), role: "user", content: draft };

    setThreadsByPointId((prev) => {
      const next = { ...prev };
      const existing = next[pointId] || { open: true, messages: [] };
      next[pointId] = { ...existing, open: true, messages: [...(existing.messages || []), userMsg] };
      return next;
    });
    setThreadDraftsByPointId((prev) => ({ ...prev, [pointId]: "" }));

    setThreadLoadingByPointId((prev) => ({ ...prev, [pointId]: true }));
    setError("");
    try {
      const context = `Title: ${detail.title}\nExplanation: ${detail.explanation}\nTags: ${(detail.tags || []).join(
        ", "
      )}`;

      const thread = (threadsByPointId[pointId]?.messages || []).concat([userMsg]).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company,
          campaign,
          website,
          description,
          attachmentName,
          step: "analysis_followup",
          responseContext: context,
          question: draft,
          threadMessages: thread,
        }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Follow-up failed.");

      const assistantMsg = { id: uid(), role: "assistant", content: data?.answer || "" };
      setThreadsByPointId((prev) => {
        const next = { ...prev };
        const existing = next[pointId] || { open: true, messages: [] };
        next[pointId] = { ...existing, open: true, messages: [...(existing.messages || []), assistantMsg] };
        return next;
      });
    } catch (err) {
      setError(err?.message || "Follow-up failed.");
    } finally {
      setThreadLoadingByPointId((prev) => ({ ...prev, [pointId]: false }));
    }
  };

  const regeneratePoint = async (detail) => {
    if (!detail?.id) return;
    const pointId = detail.id;
    setThreadLoadingByPointId((prev) => ({ ...prev, [pointId]: true }));
    setError("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company,
          campaign,
          website,
          description,
          attachmentName,
          step: "analysis_regenerate_point",
          point: {
            id: detail.id,
            title: detail.title,
            explanation: detail.explanation,
            tags: normalizeTags(detail.tags),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Regenerate failed.");

      const updated = data?.point;
      if (!updated?.id) throw new Error("Invalid regenerated point.");
      setMarketingDetails((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err) {
      setError(err?.message || "Regenerate failed.");
    } finally {
      setThreadLoadingByPointId((prev) => ({ ...prev, [pointId]: false }));
    }
  };

  const addManualTask = () => {
    openCreateTaskModal();
  };

  const removeTask = async (task) => {
    if (!task?.id) return;
    setError("");
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to delete task.");
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    } catch (e) {
      setError(e?.message || "Failed to delete task.");
    }
  };

  const patchTask = async (taskId, patch) => {
    setError("");
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to update task.");
      setTasks((prev) => prev.map((t) => (t.id === taskId ? data.task : t)));
    } catch (e) {
      setError(e?.message || "Failed to update task.");
    }
  };

  const assignSelectedAsTasks = async () => {
    if (!selectedItems.length) return;
    setActiveTab("tasks");
    setTaskGenerationReady(false);
  };

  const handleGenerateTasksInTaskTab = () => {
    if (!anyTaskSourceSelected) return;
    setTaskGenerationReady(true);
    setTaskAssignTab("template");
  };

  const updateTaskLocal = (taskId, patch) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...patch } : t)));
  };

  // Task Assignment tab is intentionally a task creation interface (no list view).

  const applyEmployeeChannelContext = (employee, channel) => {
    setSelectedEmployee(employee);
    setAssistantChannelContext(channel);
    setEmployeePrompt(buildEmployeeChannelPrompt(channel, employee));
  };

  const downloadAudienceCsv = () => {
    const rows = audienceView === "companies" ? targetAudience : employees;
    if (!Array.isArray(rows) || rows.length === 0) {
      showToast("error", "No data available to download.");
      return;
    }
    const csv = toCsvString(rows);
    if (!csv) {
      showToast("error", "No data available to download.");
      return;
    }
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeCampaign = String(campaign || "campaign")
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_-]/g, "");
    const filePrefix = audienceView === "companies" ? "companies" : "employees";
    link.href = url;
    link.download = `${safeCampaign || "campaign"}_${filePrefix}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const openContactPopup = (e, type, employeeName, value) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setContactCopied(false);
    setContactPopup({
      open: true,
      type,
      employeeName,
      value: String(value || ""),
      top: rect.bottom + 8,
      left: Math.max(12, rect.left - 220 + rect.width),
    });
  };

  const openGeneratePostModal = () => {
    const combined = buildGeneratePostRichContext({
      campaignBriefDescription,
      company,
      campaign,
      website,
      marketingPlan,
      selectedStepIds,
      marketingDetails,
    });
    try {
      localStorage.setItem("autoGeneratePostContent", combined);
    } catch {
      // ignore
    }
    setGeneratePostPrefill(combined);
    setGeneratePostSessionKey((k) => k + 1);
    setGeneratePostOpen(true);
  };

  useEffect(() => {
    if (!generatePostOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [generatePostOpen]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      {toast ? (
        <div
          className={cx(
            "fixed z-[70] rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg",
            toast.position === "top-center"
              ? "left-1/2 top-4 -translate-x-1/2"
              : toast.position === "top"
              ? "right-4 top-4"
              : "right-4 bottom-4",
            toast.type === "success"
              ? toast.tone === "salesforce"
                ? "border-emerald-800 bg-emerald-700 text-white"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
              : toast.type === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-slate-200 bg-white text-slate-800"
          )}
        >
          {toast.message}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Marketing Analysis</h3>
          <p className="mt-1 text-sm text-slate-500">
            Generate detailed analysis, refine points with per-point threads, then assign tasks.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasMarketingPlan ? (
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {loading ? "Generating..." : marketingDetails.length ? "Regenerate" : "Generate"}
            </button>
          ) : null}

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-xl border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50"
              title="Menu"
              aria-label="Menu"
            >
              <MoreVertical size={18} />
            </button>
            {menuOpen ? (
              <div className="absolute right-0 top-full z-20 mt-2 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    router.push("/my-tasks");
                  }}
                  className="w-full px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  View My Tasks
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    router.push("/saved-plans");
                  }}
                  className="w-full px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Campaign History
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {loading && activeTab !== "details" ? (
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
          <ThinkingDisplay preset="marketing_analysis" />
        </div>
      ) : null}

      <div className="max-h-[720px] overflow-y-auto">
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 py-3 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
              {visibleTabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cx(
                      "inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition",
                      active
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-white text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
              {overflowTabs.length ? (
                <div className="relative" ref={tabOverflowRef}>
                  <button
                    type="button"
                    onClick={() => setTabOverflowOpen((prev) => !prev)}
                    className={cx(
                      "no-hover-lift inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold",
                      overflowTabs.some((tab) => tab.id === activeTab)
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-white text-slate-700"
                    )}
                    aria-label="More tabs"
                    title="More tabs"
                  >
                    <MoreVertical size={16} />
                  </button>
                  {tabOverflowOpen ? (
                    <div className="absolute right-0 top-full z-20 mt-2 min-w-[200px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                      {overflowTabs.map((tab) => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => {
                              setActiveTab(tab.id);
                              setTabOverflowOpen(false);
                            }}
                            className={cx(
                              "flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold transition",
                              active ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"
                            )}
                          >
                            <Icon size={14} />
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={openGeneratePostModal}
              className="ml-1 inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              <Sparkles size={16} className="shrink-0 opacity-95" aria-hidden />
              Create Post
            </button>
          </div>
        </div>

        <div className="px-5 py-4">
          {aiMessage ? (
            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {aiMessage}
            </div>
          ) : null}
          {error ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {activeTab === "plan" || activeTab === "milestones" ? (
            <div className="space-y-4">
              {activeTab === "milestones" ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                  <div className="flex flex-wrap items-center gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Campaign Milestones</p>
                      <p className="mt-1 text-xs text-slate-500">Track key delivery checkpoints for this campaign.</p>
                    </div>
                  </div>
                  {!milestonesLoading && sortedCampaignMilestones.length === 0 ? (
                    <div className="mt-3 flex justify-center">
                      <button
                        type="button"
                        onClick={openMilestoneModal}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        <Wand2 size={16} />
                        Create Milestone with AI
                      </button>
                    </div>
                  ) : null}

                  {milestonesLoading ? (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Loading milestones...</div>
                  ) : trackerMilestones.length === 0 ? (
                    <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                      No milestones created for this campaign yet.
                    </div>
                  ) : (
                    <div className="mt-4 space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setMilestoneTrackerOffset((prev) => Math.max(0, prev - 5))}
                          disabled={sortedCampaignMilestones.length <= 5 || milestoneTrackerOffset <= 0}
                          className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          aria-label="Previous milestones"
                        >
                          <ChevronLeft size={16} />
                        </button>

                        <div className="flex min-w-[420px] flex-1 items-start justify-between gap-0 relative">
                          {trackerMilestones.map((milestone, idx) => {
                            const active = selectedCampaignMilestone?.id === milestone.id;
                            const globalIndex = milestoneTrackerOffset + idx;
                            const shortTitle = String(milestone.title || "")
                              .split(/\s+/)
                              .filter(Boolean)
                              .slice(0, 2)
                              .join(" ");

                            const selectedSortedIndex = sortedCampaignMilestones.findIndex((m) => m.id === milestone.id);
                            return (
                              <button
                                key={milestone.id}
                                type="button"
                                onClick={() => {
                                  setSelectedCampaignMilestoneId((prev) => prev === milestone.id ? null : milestone.id);
                                  if (selectedSortedIndex === -1) return;
                                  if (selectedSortedIndex < milestoneTrackerOffset) {
                                    setMilestoneTrackerOffset(selectedSortedIndex);
                                  } else if (selectedSortedIndex > milestoneTrackerOffset + 4) {
                                    setMilestoneTrackerOffset(selectedSortedIndex - 4);
                                  }
                                }}
                                className="flex flex-1 items-center text-left"
                              >
                                <div className="flex flex-col items-center">
                                  <div
                                    className={cx(
                                      "flex h-11 w-11 items-center justify-center rounded-full border text-sm font-semibold shadow-sm transition cursor-pointer hover:scale-110 hover:shadow-md",
                                      milestoneNodeStyles(milestone.status),
                                      active ? "ring-2 ring-blue-400 scale-110" : ""
                                    )}
                                  >
                                    {String(globalIndex + 1).padStart(2, "0")}
                                  </div>
                                  <p className="mt-3 max-w-[110px] text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                    {shortTitle || "-"}
                                  </p>
                                </div>
                                {idx < trackerMilestones.length - 1 ? (
                                  <div className={cx("mx-3 h-1 flex-1 rounded-full", milestoneLineStyles(milestone.status))} />
                                ) : null}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={() => setMilestoneTrackerOffset((prev) => Math.min(sortedCampaignMilestones.length - 5, prev + 5))}
                          disabled={sortedCampaignMilestones.length <= 5 || milestoneTrackerOffset + 5 >= sortedCampaignMilestones.length}
                          className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          aria-label="Next milestones"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>

                      {selectedCampaignMilestone ? (
                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-lg" style={{ animation: "fadeIn 0.25s ease-out" }}>
                          <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-900">{selectedCampaignMilestone.title}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                {formatMilestoneDate(selectedCampaignMilestone.start_date)} to{" "}
                                {formatMilestoneDate(selectedCampaignMilestone.end_date)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={cx(
                                  "rounded-full border px-3 py-1 text-xs font-semibold",
                                  selectedCampaignMilestone.status === "Completed"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : selectedCampaignMilestone.status === "In Progress"
                                    ? "border-blue-200 bg-blue-50 text-blue-700"
                                    : selectedCampaignMilestone.status === "Overdue"
                                    ? "border-red-200 bg-red-50 text-red-700"
                                    : "border-slate-300 bg-white text-slate-700"
                                )}
                              >
                                {selectedCampaignMilestone.status}
                              </span>
                              <button
                                type="button"
                                onClick={() => setSelectedCampaignMilestoneId(null)}
                                className="rounded-lg border border-slate-200 bg-white p-1 text-slate-500 hover:bg-slate-50"
                                title="Close"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>

                          {selectedCampaignMilestone.description ? (
                            <p className="mt-3 text-sm leading-6 text-slate-700">
                              {selectedCampaignMilestone.description}
                            </p>
                          ) : null}

                          <div className="mt-3">
                            <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                              <span>Progress</span>
                              <span>{selectedCampaignMilestone.progress || 0}%</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={cx(
                                  "h-full rounded-full transition-all duration-500",
                                  selectedCampaignMilestone.status === "Completed" ? "bg-emerald-500"
                                    : selectedCampaignMilestone.status === "In Progress" ? "bg-blue-500"
                                    : selectedCampaignMilestone.status === "Overdue" ? "bg-red-500"
                                    : "bg-slate-400"
                                )}
                                style={{ width: `${selectedCampaignMilestone.progress || 0}%` }}
                              />
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                            <span>
                              Tasks done: {selectedCampaignMilestone.tasks_done || 0}/{selectedCampaignMilestone.task_count || 0}
                            </span>
                            <span>Owner: {selectedCampaignMilestone.assignee_name || "-"}</span>
                          </div>

                          {Array.isArray(selectedCampaignMilestone.tasks) && selectedCampaignMilestone.tasks.length > 0 ? (
                            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
                              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Tasks</p>
                              <div className="space-y-1.5">
                                {selectedCampaignMilestone.tasks.map((task) => {
                                  const isDone = task.status === "Completed";
                                  return (
                                    <div key={task.id} className="flex items-center gap-2.5 rounded-lg border border-slate-100 bg-white px-3 py-2">
                                      <span className={cx("flex-1 text-xs", isDone ? "text-slate-400 line-through" : "text-slate-700")}>
                                        {task.title}
                                      </span>
                                      {task.task_type ? (
                                        <span className="shrink-0 rounded-full border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">
                                          {task.task_type}
                                        </span>
                                      ) : null}
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="mt-3 flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => openTrackerDetailDrawer(selectedCampaignMilestone.id)}
                                  className="rounded-md border border-blue-300 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
                                >
                                  View in Detail
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              ) : !hasMarketingPlan ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                  <p className="text-base font-semibold text-slate-900">
                    {planLoading ? "Generating your marketing plan" : "Generate Your Marketing Plan"}
                  </p>
                  <div className="mt-3 flex justify-center">
                    {planLoading ? <ThinkingDisplay preset="marketing_analysis" className="justify-center" /> : null}
                  </div>
                  {!planLoading ? (
                    <p className="mt-1 text-sm text-slate-500">click on ask ai for marketing plan</p>
                  ) : null}
                </div>
              ) : (
                <SuggestionsPanel
                  marketingPlan={marketingPlan}
                  selectedStepIds={selectedStepIds}
                  onToggleStep={onTogglePlanStep}
                  loading={planLoading}
                />
              )}
            </div>
          ) : null}

          {activeTab === "details" ? (
            <div className="space-y-3">
              {loading ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <ThinkingDisplay preset="marketing_analysis" />
                </div>
              ) : null}
              {marketingDetails.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  Click Generate to create a detailed marketing analysis (20+ points).
                </div>
              ) : null}

              {marketingDetails.length ? (
                <div className="sticky top-20 z-10 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      {FILTER_TAGS.map((t) => {
                        const active = activeFilterSet.has(t);
                        return (
                          <button
                            key={t}
                            onClick={() => toggleActiveFilter(t)}
                            className={cx(
                              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200",
                              active
                                ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                                : "border-slate-300 bg-slate-50 text-slate-700 hover:border-slate-400 hover:bg-white"
                            )}
                          >
                            {t} ({filterCounts[t] || 0})
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={selectAllVisible}
                        className="rounded-lg border border-slate-300 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                      >
                        Select All
                      </button>
                      <button
                        onClick={deselectAll}
                        className="rounded-lg border border-slate-300 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                      >
                        Deselect All
                      </button>
                      <button
                        onClick={selectTop10Visible}
                        className="rounded-lg border border-slate-300 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                      >
                        Select Top 10
                      </button>
                    </div>
                  </div>
                  {activeTagFilters.length > 0 ? (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-xs font-semibold text-slate-700">
                        Showing {filteredDetails.length} results for: {activeTagFilters.join(", ")}
                      </p>
                      <button
                        type="button"
                        onClick={clearAllFilters}
                        className="rounded-md border border-slate-300 bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-800"
                      >
                        Clear All
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {marketingDetails.length > 0 && filteredDetails.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                  <p className="text-sm font-semibold text-slate-700">No results found. Try adjusting filters.</p>
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="mt-3 rounded-lg border border-slate-300 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : null}

              {filteredDetails.map((detail, idx) => {
                const checked = selectedDetailIds.has(detail.id);
                const pointThread = threadsByPointId[detail.id] || { open: false, messages: [] };
                const open = !!pointThread.open;
                const messages = Array.isArray(pointThread.messages) ? pointThread.messages : [];
                const draft = threadDraftsByPointId[detail.id] || "";
                const isBusy = !!threadLoadingByPointId[detail.id];

                return (
                  <motion.article
                    key={detail.id || idx}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                    className={cx(
                      "rounded-2xl border bg-white p-4 shadow-sm transition",
                      checked ? "border-blue-500 bg-blue-50/50" : "border-slate-200"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelected(detail.id)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900">
                              {idx + 1}. {detail.title}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-slate-700">
                              {detail.explanation}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => regeneratePoint(detail)}
                              disabled={isBusy}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                              title="Regenerate this point"
                            >
                              <Wand2 size={14} />
                              Regenerate
                            </button>
                            <div className="flex flex-wrap gap-1.5">
                              {normalizeTags(detail.tags)
                                .slice(0, 6)
                                .map((tag) => (
                                  <span
                                    key={`${detail.id}-${tag}`}
                                    className={cx(
                                      "rounded-full border px-2.5 py-1 text-xs",
                                      activeTagFilters.length > 0 &&
                                        activeTagFilters.some((f) =>
                                          String(tag || "").toLowerCase().includes(String(f || "").toLowerCase())
                                        )
                                        ? "border-slate-900 bg-slate-900 text-white"
                                        : "border-slate-300 bg-white text-slate-600"
                                    )}
                                  >
                                    {tag}
                                  </span>
                                ))}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                          <button
                            type="button"
                            onClick={() => toggleThread(detail.id)}
                            className="no-hover-lift flex w-full items-center justify-between gap-3 text-left"
                          >
                            <span className="text-xs font-semibold text-slate-700">
                              Ask more about this...
                            </span>
                            <span className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white">
                              {open ? "Hide" : "Show"}
                            </span>
                          </button>

                          {open ? (
                            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50">
                              <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                                <p className="text-xs font-semibold text-slate-700">Thread</p>
                                <button
                                  type="button"
                                  onClick={() => clearThread(detail.id)}
                                  className="rounded-lg border border-slate-300 bg-white p-1.5 text-slate-700 hover:bg-slate-50"
                                  title="Clear thread"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>

                              <div className="flex max-h-[200px] flex-col overflow-y-auto px-3 py-2">
                                {messages.length === 0 ? (
                                  <p className="py-2 text-xs text-slate-500">
                                    Ask a question to start a thread for this point.
                                  </p>
                                ) : null}
                                {messages.map((m) => {
                                  const isUser = m.role === "user";
                                  return (
                                    <div
                                      key={m.id}
                                      className={cx("mb-2 flex", isUser ? "justify-end" : "justify-start")}
                                    >
                                      <div
                                        className={cx(
                                          "max-w-[90%] rounded-2xl px-3 py-2 text-xs leading-5",
                                          isUser
                                            ? "rounded-br-md bg-blue-600 text-white"
                                            : "rounded-bl-md border border-slate-200 bg-white text-slate-700"
                                        )}
                                      >
                                        {m.content}
                                      </div>
                                    </div>
                                  );
                                })}
                                {isBusy ? (
                                  <div className="mb-2 flex justify-start">
                                    <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3 py-2">
                                      <ThinkingDisplay preset="milestone_refine" className="text-xs" />
                                    </div>
                                  </div>
                                ) : null}
                              </div>

                              <div className="border-t border-slate-200 bg-white p-2">
                                <div className="flex gap-2">
                                  <input
                                    value={draft}
                                    onChange={(e) =>
                                      setThreadDraftsByPointId((prev) => ({
                                        ...prev,
                                        [detail.id]: e.target.value,
                                      }))
                                    }
                                    placeholder="Type a follow-up..."
                                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-black outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") sendThreadMessage(detail);
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => sendThreadMessage(detail)}
                                    disabled={isBusy || !draft.trim()}
                                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                                  >
                                    <MessageSquarePlus size={16} />
                                    Send
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          ) : null}

          {activeTab === "audience" ? (
            <div className="space-y-4">
              {/* <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white p-1">
                  <button
                    type="button"
                    onClick={() => setAudienceView("companies")}
                    className={cx(
                      "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                      audienceView === "companies" ? "bg-blue-500 text-white" : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    Companies
                  </button>
                  <button
                    type="button"
                    onClick={() => setAudienceView("employees")}
                    className={cx(
                      "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                      audienceView === "employees" ? "bg-blue-500 text-white" : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    Employees
                  </button>
                </div>
                <button
                  type="button"
                  onClick={downloadAudienceCsv}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Download CSV
                </button>
              </div> */}
              <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setAudienceView("companies")}
                  className={cx(
                    "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                    audienceView === "companies" ? "bg-blue-500 text-white" : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  Companies
                </button>
                <button
                  type="button"
                  onClick={() => setAudienceView("employees")}
                  className={cx(
                    "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                    audienceView === "employees" ? "bg-blue-500 text-white" : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  Employees
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={downloadAudienceCsv}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Download CSV
                </button>
                <button
                  type="button"
                  onClick={() => generateTargetAudience({ reason: "regenerate" })}
                  // disabled={audienceLoading || (!description?.trim() && !hasMarketingPlan && selectedStepIds.length === 0 && selectedDetailIds.size === 0)}
                  disabled={audienceLoading || targetAudience.length === 0 || (!description?.trim() && !hasMarketingPlan && selectedStepIds.length === 0 && selectedDetailIds.size === 0)}
                  className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {audienceLoading ? "Regenerating..." : "Regenerate"}
                </button>
              </div>
            </div>


              {audienceView === "companies" ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {/* {targetAudience.length === 0 ? (
                    <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                      {audienceLoading ? (
                        <ThinkingDisplay preset="marketing_analysis" />
                      ) : (
                        "Target audience will update when you Ask AI and when you select points."
                      )}
                    </div>
                  ) : null} */}
                  {targetAudience.length === 0 ? (
  <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
    <p className="text-base font-semibold text-slate-900">
      {audienceLoading ? "Generating target audience" : "Generate Target Audience"}
    </p>
    <div className="mt-3 flex justify-center">
      {audienceLoading ? (
        <ThinkingDisplay preset="marketing_analysis" className="justify-center" />
      ) : (
        <button
          type="button"
          onClick={() => generateTargetAudience({ reason: "manual_generate" })}
          // disabled={!hasMarketingPlan && selectedStepIds.length === 0 && selectedDetailIds.size === 0}
          disabled={!description?.trim() && !hasMarketingPlan && selectedStepIds.length === 0 && selectedDetailIds.size === 0}

          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <Users size={16} />
          Generate
        </button>
      )}
    </div>
    {!audienceLoading ? (
      <p className="mt-3 text-sm text-slate-500">
        Click Generate to view the target audience. This option becomes available upon giving input in description, selecting points from either the Marketing Plans or Selected Marketing Plans sections.
      </p>
    ) : null}
  </div>
) : null}

                  {targetAudience.map((c, idx) => (
                    <motion.article
                      key={`${c.name}-${idx}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="hover-lift cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:scale-[1.01] hover:border-blue-300 hover:bg-blue-50/30 hover:shadow-md"
                      onClick={() => openCompanyModal(c)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                          <p className="mt-1 text-sm leading-6 text-slate-700">{c.description}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            Country: <span className="font-semibold text-slate-700">{c.country || "-"}</span>
                          </p>
                        </div>
                        <span className="rounded-md whitespace-nowrap border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                          Sector: {c.sector || c.industry || "-"}
                        </span>
                      </div>

                      <div className="mt-3 space-y-3">
                        <div>
                          <p className="text-xs font-semibold text-slate-700">Why relevant</p>
                          <p className="mt-1 text-sm leading-6 text-slate-700">{c.whyRelevant}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-700">Decision maker role</p>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {c.decisionMakerRole ? (
                              <span className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-600">
                                {c.decisionMakerRole}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-500">—</span>
                            )}
                          </div>
                        </div>

                        {(() => {
                          const outreach = getOutreach(c);
                          const hasAny = !!outreach.email || !!outreach.phone || !!outreach.linkedin || !!outreach.website;
                          if (!hasAny) return null;
                          return (
                            // <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            //   <p className="text-xs font-semibold text-slate-700">Outreach Channels</p>
                            //   <div className="mt-2 flex flex-wrap gap-2">
                            //     {outreach.email ? (
                            //       <a
                            //         href={`mailto:${outreach.email}`}
                            //         className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            //         title={outreach.email}
                            //       >
                            //         <Mail size={14} />
                            //         Email
                            //       </a>
                            //     ) : null}
                            //     {outreach.phone ? (
                            //       <a
                            //         href={`tel:${outreach.phone}`}
                            //         className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            //         title={outreach.phone}
                            //       >
                            //         <Phone size={14} />
                            //         Phone
                            //       </a>
                            //     ) : null}
                            //     {outreach.linkedin ? (
                            //       <a
                            //         href={outreach.linkedin}
                            //         target="_blank"
                            //         rel="noreferrer"
                            //         className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            //         title="LinkedIn"
                            //       >
                            //         <Link size={14} />
                            //         LinkedIn
                            //       </a>
                            //     ) : null}
                            //     {outreach.website ? (
                            //       <a
                            //         href={outreach.website}
                            //         target="_blank"
                            //         rel="noreferrer"
                            //         className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            //         title="Website"
                            //       >
                            //         <Globe size={14} />
                            //         Website
                            //       </a>
                            //     ) : null}
                            //   </div>
                            // </div>
                           <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs font-semibold text-slate-700">Outreach Channels</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {/* Email Pill - Always show */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (outreach.email) {
                                    openContactPopup(e, "email", c.name || "company", outreach.email);
                                  } else {
                                    openContactPopup(e, "email", c.name || "company", "Email is not found");
                                  }
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                title={outreach.email || "Email not available"}
                              >
                                <Mail size={14} />
                                Email
                              </button>

                              {/* Contact No. Pill - Always show */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (outreach.phone) {
                                    openContactPopup(e, "call", c.name || "company", outreach.phone);
                                  } else {
                                    openContactPopup(e, "call", c.name || "company", "Contact no. is not found");
                                  }
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                title={outreach.phone || "Contact number not available"}
                              >
                                <Phone size={14} />
                                Contact No.
                              </button>

                              {/* LinkedIn Pill - Always show */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (outreach.linkedin) {
                                    window.open(outreach.linkedin, "_blank", "noopener,noreferrer");
                                  } else {
                                    openContactPopup(e, "linkedin", c.name || "company", "LinkedIn is not found");
                                  }
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                title={outreach.linkedin || "LinkedIn not available"}
                              >
                                <Link size={14} />
                                LinkedIn
                              </button>

                              {outreach.website ? (
                                <a
                                  href={outreach.website}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                  title="Website"
                                >
                                  <Globe size={14} />
                                  Website
                                </a>
                              ) : null}
                            </div>
                          </div>
 
                          );
                        })()}
                      </div>
                    </motion.article>
                  ))}

                  {targetAudience.length > 0 ? (
                    <div className="col-span-full flex justify-center pt-2">
                      <button
                        type="button"
                        onClick={() => generateTargetAudience({ reason: "more_audience", append: true })}
                        disabled={
                          audienceLoading ||
                          moreAudienceLoading ||
                          (!description?.trim() && !hasMarketingPlan && selectedStepIds.length === 0 && selectedDetailIds.size === 0)
                        }
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        <Users size={16} />
                        {moreAudienceLoading ? "Fetching more..." : "Get more audience"}
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                  <div className="space-y-3 xl:col-span-2">
                    {employees.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                        Generate analysis to see employee contacts.
                      </div>
                    ) : null}
                    {employees.map((emp, idx) => {
                      const isActive = selectedEmployee?.name === emp.name && selectedEmployee?.company === emp.company;
                      const companyKey = String(emp?.company || "")
                        .trim()
                        .toLowerCase();
                      const outreach = getEmployeeOutreach(emp, companyOutreachByName[companyKey] || null);
                      const linkedinUrl = resolveLinkedinUrl(outreach.linkedin, emp.name, emp.company);
                      const hasAnyOutreach =
                        !!outreach.linkedin || !!outreach.email || !!outreach.phone || !!outreach.website;
                      const defaultChannel = outreach.email ? "email" : outreach.phone ? "call" : "linkedin";
                      return (
                        <div
                          key={`${emp.name || "emp"}-${emp.company || "company"}-${idx}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedEmployee(emp)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelectedEmployee(emp);
                            }
                          }}
                          className={cx(
                            "w-full rounded-2xl border bg-white p-3 text-left shadow-sm transition",
                            isActive ? "border-blue-500 bg-blue-50/40" : "border-slate-200 hover:shadow-md"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                              {initials(emp.name)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-900">{emp.name || "-"}</p>
                              <p className="text-sm text-slate-700">{emp.title || "-"}</p>
                              <p className="mt-0.5 text-xs text-slate-500">{emp.company || "-"}</p>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                applyEmployeeChannelContext(emp, defaultChannel);
                              }}
                              className="shrink-0 rounded-full border border-blue-200 bg-blue-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-blue-700"
                            >
                              Channels
                            </button>
                            <span
                              title="Select channel context so AI Assistant auto-generates outreach in that channel format."
                              className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-blue-600"
                            >
                              <Info size={12} />
                            </span>
                          </div>
                          {/* {hasAnyOutreach ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {outreach.email ? (
                                <a
                                  href={`mailto:${outreach.email}`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    applyEmployeeChannelContext(emp, "email");
                                    openContactPopup(e, "email", emp.name || "employee", outreach.email);
                                  }}
                                  className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[11px] text-slate-700 hover:bg-slate-50"
                                  title={outreach.email}
                                >
                                  <Mail size={12} />
                                  Email
                                </a>
                              ) : null}
                              {outreach.phone ? (
                                <a
                                  href={`tel:${outreach.phone}`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    applyEmployeeChannelContext(emp, "call");
                                    openContactPopup(e, "call", emp.name || "employee", outreach.phone);
                                  }}
                                  className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[11px] text-slate-700 hover:bg-slate-50"
                                  title={outreach.phone}
                                >
                                  <Phone size={12} />
                                  Call
                                </a>
                              ) : null}
                              {outreach.linkedin ? (
                                <a
                                  href={linkedinUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    applyEmployeeChannelContext(emp, "linkedin");
                                    openContactPopup(e, "linkedin", emp.name || "employee", linkedinUrl);
                                  }}
                                  className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-600 px-2 py-0.5 text-[11px] text-white hover:bg-blue-700"
                                  title="Search on LinkedIn"
                                >
                                  <Link size={12} />
                                  LinkedIn
                                </a>
                              ) : null}
                            </div>
                          ) : (
                            <p className="mt-3 text-xs text-slate-500">No verified channels available.</p>
                          )} */}
                        <div className="mt-3 flex flex-wrap gap-2">
                        {/* Email Pill - Always show */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            applyEmployeeChannelContext(emp, "email");
                            if (outreach.email) {
                              openContactPopup(e, "email", emp.name || "employee", outreach.email);
                            } else {
                              openContactPopup(e, "email", emp.name || "employee", "Email is not found");
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[11px] text-slate-700 hover:bg-slate-50"
                          title={outreach.email || "Email not available"}
                        >
                          <Mail size={12} />
                          Email
                        </button>

                        {/* Contact No. Pill - Always show */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            applyEmployeeChannelContext(emp, "call");
                            if (outreach.phone) {
                              openContactPopup(e, "call", emp.name || "employee", outreach.phone);
                            } else {
                              openContactPopup(e, "call", emp.name || "employee", "Contact no. is not found");
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[11px] text-slate-700 hover:bg-slate-50"
                          title={outreach.phone || "Contact number not available"}
                        >
                          <Phone size={12} />
                          Contact No.
                        </button>

                        {/* LinkedIn Pill - Always show */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            applyEmployeeChannelContext(emp, "linkedin");
                            if (outreach.linkedin) {
                              openContactPopup(e, "linkedin", emp.name || "employee", linkedinUrl);
                            } else {
                              openContactPopup(e, "linkedin", emp.name || "employee", "LinkedIn is not found");
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-600 px-2 py-0.5 text-[11px] text-white hover:bg-blue-700"
                          title={outreach.linkedin || "LinkedIn not available"}
                        >
                          <Link size={12} />
                          LinkedIn
                        </button>
                      </div>


                        </div>
                      );
                    })}
                  </div>

                  <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">AI Assistant</p>
                      {selectedEmployee ? (
                        <span className="rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">
                          {selectedEmployee.name}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Select a channel from an employee card to auto-fill a campaign-aware outreach prompt.
                    </p>

                    <textarea
                      value={employeePrompt}
                      onChange={(e) => setEmployeePrompt(e.target.value)}
                      rows={5}
                      className="mt-3 w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      placeholder="Write a cold email for this person..."
                    />
                    <button
                      type="button"
                      disabled={employeeAssistantLoading || !employeePrompt.trim() || !selectedEmployee}
                      onClick={async () => {
                        if (!selectedEmployee || !employeePrompt.trim()) return;
                        setEmployeeAssistantLoading(true);
                        setError("");
                        try {
                          const res = await fetch("/api/generate", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              step: "employee_outreach",
                              company,
                              campaign,
                              website,
                              description,
                              employee: selectedEmployee,
                              question: employeePrompt,
                              preferredChannel: assistantChannelContext || null,
                            }),
                          });
                          const data = await res.json();
                          if (!res.ok || data?.error) throw new Error(data?.error || "Failed to generate outreach message.");
                          const normalizedChannel = assistantChannelContext === "call" ? "call" : assistantChannelContext;
                          const channelMessages =
                            data?.channelMessages && typeof data.channelMessages === "object"
                              ? data.channelMessages
                              : { email: null, linkedin: null, call: null };
                          const preferredMessage =
                            normalizedChannel === "linkedin"
                              ? limitWords(String(channelMessages?.linkedin?.message || "").trim(), 60)
                              : normalizedChannel === "call"
                              ? String(channelMessages?.call?.script || "").trim()
                              : normalizedChannel === "email"
                              ? String(channelMessages?.email?.body || "").trim()
                              : "";
                          setEmployeeAssistantData({
                            answer: preferredMessage || String(data?.answer || ""),
                            suggestedChannels: Array.isArray(data?.suggestedChannels) ? data.suggestedChannels : [],
                            channelMessages,
                          });
                        } catch (e) {
                          setError(e?.message || "Failed to generate outreach message.");
                        } finally {
                          setEmployeeAssistantLoading(false);
                        }
                      }}
                      className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {employeeAssistantLoading ? "Generating..." : "Ask AI Assistant"}
                    </button>

                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-semibold text-slate-700">Response</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                        {assistantAnswer || "AI response will appear here."}
                      </p>
                    </div>
                    {/* {assistantAnswer && assistantChannelContext ? (
                      <div className="mt-3 grid grid-cols-1 gap-2">
                        {assistantChannelContext === "email" ? (
                          <button
                            type="button"
                            onClick={() => {
                              const to = selectedEmployeeOutreach.email || "";
                              const fallbackSubject = `Regarding ${campaign || "your campaign"} - ${company || "our team"}`;
                              const structuredEmail = employeeAssistantData?.channelMessages?.email || null;
                              const parsedFromAnswer = parseEmailFromAssistantResponse(assistantAnswer, fallbackSubject);
                              const subject = String(structuredEmail?.subject || parsedFromAnswer.subject || fallbackSubject).trim();
                              const body = String(structuredEmail?.body || parsedFromAnswer.body || "").trim();
                              const mailtoUrl = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
                                body
                              )}`;
                              window.open(mailtoUrl, "_self");
                            }}
                            className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                          >
                            Open in Email
                          </button>
                        ) : null}
                        {assistantChannelContext === "call" ? (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(assistantAnswer || "").catch(() => {});
                              showToast("success", "Call script copied.");
                            }}
                            className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                          >
                            Copy Script
                          </button>
                        ) : null}
                        {assistantChannelContext === "linkedin" ? (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(assistantAnswer || "").catch(() => {});
                              showToast("success", "LinkedIn message copied.");
                            }}
                            className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                          >
                            Copy Message
                          </button>
                        ) : null}
                      </div>
                    ) : null}  */}

                    
                    {assistantChannelContext === "linkedin" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(assistantAnswer || "").catch(() => {});
                            showToast("success", "LinkedIn message copied.");
                          }}
                          className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          Copy Message
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const linkedinUrl = selectedEmployeeOutreach.linkedin || "";
                            if (linkedinUrl) {
                              navigator.clipboard.writeText(assistantAnswer || "").catch(() => {});
                              window.open(linkedinUrl, "_blank", "noopener,noreferrer");
                              showToast("success", "LinkedIn opened. Message copied to clipboard - paste it in the chat.");
                            } else {
                              showToast("error", "LinkedIn URL not available for this contact.");
                            }
                          }}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                        >
                          <Link size={16} />
                          Send via LinkedIn
                        </button>
                        {/* <button
                          type="button"
                          onClick={() => {
                            setLinkedinRecipient(selectedEmployee?.name || "");
                            setLinkedinMessage(assistantAnswer || "");
                            setLinkedinComposerOpen(true);
                          }}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                        >
                          <Link size={16} />
                          Send via LinkedIn
                        </button> */}

                      </>
                    ) : null}

                  </aside>
                </div>
              )}
            </div>
          ) : null}

          {activeTab === "tasks" ? (
            <div>
              {!anyTaskSourceSelected || !taskGenerationReady ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  <p>
                    Select points from Marketing Plan or Selected Marketing Plans to generate tasks and click on the
                    button &quot;Generate Tasks&quot; below to create tasks based on your selected marketing plan points.
                  </p>
                  <button
                    type="button"
                    onClick={handleGenerateTasksInTaskTab}
                    disabled={!anyTaskSourceSelected}
                    className="mx-auto mt-3 block rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    Generate Tasks
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white p-1">
                        <button
                          type="button"
                          onClick={() => setTaskAssignTab("template")}
                          className={cx(
                            "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                            taskAssignTab === "template"
                              ? "bg-blue-500 text-white"
                              : "text-slate-700 hover:bg-slate-50"
                          )}
                        >
                          Task Template
                        </button>
                        <button
                          type="button"
                          onClick={() => setTaskAssignTab("task")}
                          className={cx(
                            "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                            taskAssignTab === "task" ? "bg-blue-500 text-white" : "text-slate-700 hover:bg-slate-50"
                          )}
                        >
                          Task
                        </button>
                      </div>
                    </div>
                  </div>

                  {taskAssignTab === "task" ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={addManualTask}
                          className="rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          Create Task from Scratch
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {taskAssignTab === "template" ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                      <p className="text-sm font-semibold text-slate-900">Task Template</p>
                      <div className="mt-3 space-y-3">
                        {TEMPLATE_GROUPS.map((g) => (
                          <div key={g.label}>
                            <p className="text-xs font-semibold text-slate-700">{g.label}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {g.items.map((tpl) => (
                                (() => {
                                  const done = createdTemplateKeys.has(templateKey(tpl));
                                  return (
                                <button
                                  key={`${g.label}-${tpl.title}`}
                                  onClick={() => createTaskFromTemplate(tpl)}
                                  className={cx(
                                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                                    done
                                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                                  )}
                                >
                                  {done ? <Check size={12} /> : null}
                                  {tpl.title} ({tpl.task_type}, {tpl.priority})
                                </button>
                                  );
                                })()
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ) : null}

          {taskModalOpen ? (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-slate-900/40"
                onClick={() => (taskModalSaving ? null : setTaskModalOpen(false))}
              />
              <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
                  <div>
                    <p className="text-base font-semibold text-slate-900">
                      {taskModalMode === "create" ? "Create Task" : "Edit Task"}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-600">
                      Fill in details. Title and Task Type are required.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => (taskModalSaving ? null : setTaskModalOpen(false))}
                    className="rounded-xl border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50"
                    title="Close"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="overflow-y-auto px-5 py-4">
                {taskModalError ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
                    {taskModalError}
                  </div>
                ) : null}

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="block md:col-span-2">
                    <span className="text-xs font-semibold text-slate-700">Task Title*</span>
                    <input
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      style={{ color: "#000000" }}
                      placeholder="e.g., Draft 3 LinkedIn posts for product launch"
                    />
                  </label>

                  <label className="block md:col-span-2">
                    <span className="text-xs font-semibold text-slate-700">Description</span>
                    <textarea
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      rows={4}
                      className="mt-1 w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      style={{ color: "#000000" }}
                      placeholder='Describe what needs to be done, why it matters, and any important context...'
                    />
                  </label>

                  <div className="md:col-span-2">
                    <p className="text-xs font-semibold text-slate-700">Task Type*</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {TASK_TYPES.map((tt) => (
                        <button
                          key={`form-type-${tt}`}
                          type="button"
                          onClick={() => setFormTaskType(tt)}
                          className={cx(
                            "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                            formTaskType === tt
                              ? "border-blue-500 bg-blue-500 text-white"
                              : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                          )}
                        >
                          {tt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <p className="text-xs font-semibold text-slate-700">Priority*</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {PRIORITIES.map((p) => (
                        <button
                          key={`form-prio-${p}`}
                          type="button"
                          onClick={() => setFormPriority(p)}
                          className={cx(
                            "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                            formPriority === p
                              ? "border-blue-500 bg-blue-500 text-white"
                              : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                          )}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="block">
                    <span className="text-xs font-semibold text-slate-700">Assignee</span>
                    <select
                      value={formAssigneeId}
                      onChange={(e) => setFormAssigneeId(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">Unassigned</option>
                      <optgroup label="People">
                        {users.length === 0 ? (
                          <option value="" disabled>
                            No team members yet. Add from Users page.
                          </option>
                        ) : (
                          users.map((u) => (
                            <option key={`form-user-${u.id}`} value={u.id}>
                              {u.avatar || ""} {u.name} — {u.role || "—"}
                            </option>
                          ))
                        )}
                      </optgroup>
                    </select>
                  </label>

                  <div>
                    <div className="flex items-end justify-between gap-2">
                      <label className="block w-full">
                        <span className="text-xs font-semibold text-slate-700">Due Date</span>
                        <input
                          type="date"
                          value={formDueDate}
                          onChange={(e) => setFormDueDate(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const suggestion = await aiSuggestDueDate(formTitle, formTaskType, formPriority);
                            setFormDueDate(suggestion.suggested_date || "");
                            setFormDueReason(suggestion.reason || "");
                            showToast("success", "Suggested due date added");
                          } catch (e) {
                            showToast("error", e?.message || "Failed to suggest due date.");
                          }
                        }}
                        className="h-[42px] shrink-0 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        AI Suggest
                      </button>
                    </div>
                    {formDueReason ? <p className="mt-1 text-xs italic text-slate-500">{formDueReason}</p> : null}
                  </div>

                  <label className="block md:col-span-2">
                    <span className="text-xs font-semibold text-slate-700">Campaign</span>
                    <input
                      value={formCampaignName || "—"}
                      disabled
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      style={{ color: "#000000" }}
                      placeholder="Campaign"
                    />
                  </label>

                  <div className="md:col-span-2">
                    <p className="text-xs font-semibold text-slate-700">Channel Tags</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {CHANNEL_TAG_OPTIONS.map((tag) => {
                        const active = formChannelTags.includes(tag);
                        return (
                          <button
                            key={`chan-${tag}`}
                            type="button"
                            onClick={() => {
                              setFormChannelTags((prev) =>
                                prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                              );
                            }}
                            className={cx(
                              "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                              active
                                ? "border-blue-500 bg-blue-500 text-white"
                                : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                            )}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <label className="block md:col-span-2">
                    <span className="text-xs font-semibold text-slate-700">Campaign Context</span>
                    <textarea
                      value={formCampaignContext}
                      onChange={(e) => setFormCampaignContext(e.target.value)}
                      rows={3}
                      className="mt-1 w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      style={{ color: "#000000" }}
                      placeholder="Add any campaign background, target audience, or goals relevant to this task..."
                    />
                  </label>
                </div>

                <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
                  <button
                    type="button"
                    onClick={() => (taskModalSaving ? null : setTaskModalOpen(false))}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={taskModalSaving}
                    onClick={submitTaskModal}
                    className={cx(
                      "rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition",
                      taskModalSaving ? "opacity-70" : "hover:bg-slate-800"
                    )}
                  >
                    {taskModalSaving ? "Saving..." : taskModalMode === "create" ? "Create Task" : "Save Changes"}
                  </button>
                </div>
                </div>
              </div>
            </div>
          ) : null}

          {outreachComposerOpen ? (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-slate-900/40"
                onClick={() => (outreachSending ? null : setOutreachComposerOpen(false))}
              />
              <div className="relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
                  <div>
                    <p className="text-base font-semibold text-slate-900">Send {outreachChannel}</p>
                    <p className="mt-0.5 text-sm text-slate-600">
                      AI drafted this {outreachChannel.toLowerCase()} message. You can edit before sending.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => (outreachSending ? null : setOutreachComposerOpen(false))}
                    className="rounded-xl border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50"
                    title="Close"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="overflow-y-auto px-5 py-4">
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-700">
                      {outreachChannel === "LinkedIn" ? "LinkedIn URL" : "To"}
                    </span>
                    <input
                      value={outreachTo}
                      onChange={(e) => setOutreachTo(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                  {outreachChannel === "Email" ? (
                    <label className="mt-3 block">
                      <span className="text-xs font-semibold text-slate-700">Subject</span>
                      <input
                        value={outreachSubject}
                        onChange={(e) => setOutreachSubject(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>
                  ) : null}
                  <label className="mt-3 block">
                    <span className="text-xs font-semibold text-slate-700">
                      {outreachChannel === "LinkedIn" ? "Message" : "Body"}
                    </span>
                    <textarea
                      value={outreachBody}
                      onChange={(e) => setOutreachBody(e.target.value)}
                      rows={10}
                      className="mt-1 w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (outreachChannel === "Email") {
                        const url = `mailto:${encodeURIComponent(outreachTo)}?subject=${encodeURIComponent(
                          outreachSubject
                        )}&body=${encodeURIComponent(outreachBody)}`;
                        window.open(url, "_self");
                        return;
                      }
                      if (outreachChannel === "LinkedIn" && outreachTo) {
                        navigator.clipboard.writeText(outreachBody || "").catch(() => {});
                        window.open(outreachTo, "_blank", "noopener,noreferrer");
                      }
                    }}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {outreachChannel === "Email" ? "Open Mail App" : "Open LinkedIn & Copy Message"}
                  </button>
                  <button
                    type="button"
                    disabled={outreachSending || !outreachTo.trim() || !outreachBody.trim()}
                    onClick={async () => {
                      setOutreachSending(true);
                      setError("");
                      try {
                        const res = await fetch("/api/campaign-logs", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            campaign_id: campaignId || null,
                            campaign_name: campaign || company || "Campaign",
                            channel: outreachChannel,
                            recipients: outreachTo,
                            content:
                              outreachChannel === "Email"
                                ? `Subject: ${outreachSubject}\n\n${outreachBody}`
                                : outreachBody,
                            status: "sent",
                            sent_at: new Date().toISOString(),
                            opens: 0,
                            clicks: 0,
                          }),
                        });
                        const data = await res.json();
                        if (!res.ok || data?.error) throw new Error(data?.error || "Failed to send.");
                        showToast("success", `${outreachChannel} sent successfully.`);
                        setOutreachComposerOpen(false);
                      } catch (e) {
                        setError(e?.message || "Failed to send.");
                      } finally {
                        setOutreachSending(false);
                      }
                    }}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {outreachSending ? "Sending..." : "Send"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

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
                  ? `Send Email to ${contactPopup.employeeName}`
                  : contactPopup.type === "call"
                  ? `Call ${contactPopup.employeeName}`
                  : `Message ${contactPopup.employeeName} on LinkedIn`}
              </p>
              <button
                type="button"
                onClick={() => {
                  setContactPopup((prev) => ({ ...prev, open: false }));
                  setContactCopied(false);
                }}
                className="rounded-md border border-slate-300 bg-white p-1 text-slate-600 hover:bg-slate-50"
                title="Close"
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
                onClick={() => {
                  navigator.clipboard.writeText(contactPopup.value || "").catch(() => {});
                  setContactCopied(true);
                  setTimeout(() => setContactCopied(false), 2000);
                }}
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <span className={contactCopied ? "text-emerald-600" : ""}>{contactCopied ? "✓" : "📋"}</span>
                Copy
              </button>
              <button
                type="button"
                onClick={() => {
                  if (contactPopup.type === "email") {
                    window.open(`mailto:${contactPopup.value}`, "_blank", "noopener,noreferrer");
                    return;
                  }
                  if (contactPopup.type === "linkedin") {
                    window.open(contactPopup.value, "_blank", "noopener,noreferrer");
                    return;
                  }
                  window.open(`tel:${contactPopup.value}`, "_self");
                }}
                className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-2 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
              >
                {contactPopup.type === "email"
                  ? "Open Gmail"
                  : contactPopup.type === "call"
                  ? "Call Now"
                  : "Open LinkedIn"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "details" && anySelected ? (
        <div className="fixed bottom-4 right-4 z-[75]">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
            <p className="text-sm text-slate-700">
              <span className="font-semibold">{selectedCount}</span> selected
            </p>
            <button
              onClick={assignSelectedAsTasks}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Assign as Tasks
            </button>
          </div>
        </div>
      ) : null}

      {companyModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">{activeCompany?.name || "Company"}</p>
                <p className="mt-0.5 text-xs text-slate-500">Company detail (AI-generated)</p>
              </div>
              <button
                onClick={() => setCompanyModalOpen(false)}
                className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-y-auto px-5 py-4">
              {companyModalLoading ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  Loading...
                </div>
              ) : null}
              {companyModalError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {companyModalError}
                </div>
              ) : null}
              {companyModalData ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-700">Overview</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {companyModalData.overview}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-700">Why good target</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {companyModalData.whyGoodTarget}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-semibold text-slate-700">Estimated size</p>
                      <p className="mt-1 text-sm text-slate-700">{companyModalData.estimatedCompanySize}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-semibold text-slate-700">Decision maker role</p>
                      <p className="mt-1 text-sm text-slate-700">{companyModalData.decisionMakerRole}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-700">Talking points</p>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
                      {(companyModalData.talkingPoints || []).map((x, i) => (
                        <li key={`tp-${i}`}>{x}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-700">Pain points</p>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
                      {(companyModalData.painPoints || []).map((x, i) => (
                        <li key={`pp-${i}`}>{x}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-700">Suggested outreach method</p>
                    <p className="mt-1 text-sm text-slate-700">{companyModalData.suggestedOutreachMethod}</p>
                  </div>
                  {companyModalData.outreachChannels ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-semibold text-slate-700">Outreach channels</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {companyModalData.outreachChannels.email ? (
                          <a
                            href={`mailto:${companyModalData.outreachChannels.email}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <Mail size={14} /> Email
                          </a>
                        ) : null}
                        {companyModalData.outreachChannels.phone ? (
                          <a
                            href={`tel:${companyModalData.outreachChannels.phone}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <Phone size={14} /> Phone
                          </a>
                        ) : null}
                        {companyModalData.outreachChannels.linkedin ? (
                          <a
                            href={companyModalData.outreachChannels.linkedin}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <Link size={14} /> LinkedIn
                          </a>
                        ) : null}
                        {companyModalData.outreachChannels.website ? (
                          <a
                            href={companyModalData.outreachChannels.website}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <Globe size={14} /> Website
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">AI Assistant</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Ask anything about this company. You can ask follow-up questions too.
                    </p>
                  </div>
                </div>

                <div className="mt-3">
                  <textarea
                    value={companyAssistantInput}
                    onChange={(e) => setCompanyAssistantInput(e.target.value)}
                    rows={3}
                    placeholder="Ask anything about this company..."
                    className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        submitCompanyAssistant();
                      }
                    }}
                  />
                  <div className="mt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={submitCompanyAssistant}
                      disabled={companyAssistantLoading || !String(companyAssistantInput || "").trim()}
                      className={cx(
                        "rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800",
                        companyAssistantLoading ? "cursor-not-allowed opacity-70" : "hover:bg-slate-800"
                      )}
                    >
                      {companyAssistantLoading ? "Asking AI..." : "Ask AI"}
                    </button>
                  </div>

                  {companyAssistantError ? (
                    <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
                      {companyAssistantError}
                    </div>
                  ) : null}

                  <div className="mt-3 space-y-3">
                    {companyAssistantMessages.length ? (
                      companyAssistantMessages.map((m, idx) => (
                        <div key={`${m.role}-${idx}`} className={cx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                          <div
                            className={cx(
                              "max-w-[92%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-xs leading-5",
                              m.role === "user"
                                ? "bg-blue-600 text-white"
                                : "rounded-bl-md border border-slate-200 bg-white text-slate-700"
                            )}
                          >
                            {m.content}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">Response will appear here after you ask.</p>
                    )}

                    {companyAssistantLoading ? (
                      <div className="flex justify-start">
                        <div className="max-w-[92%] rounded-2xl border border-slate-200 bg-white px-3 py-2">
                          <ThinkingDisplay preset="marketing_analysis" className="text-xs" />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {trackerDrawerMilestone ? (
        <div className="fixed inset-0 z-[72]">
          <button
            type="button"
            aria-label="Close milestone detail drawer"
            onClick={closeTrackerDetailDrawer}
            className="absolute inset-0 bg-slate-900/45"
          />
          <div className="absolute inset-y-0 right-0 w-full max-w-[480px] border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-out">
            <div className="flex h-full flex-col" style={{ animation: "slideInFromRight 0.28s ease-out" }}>
              <style>{`@keyframes slideInFromRight { from { opacity: 0; transform: translateX(28px); } to { opacity: 1; transform: translateX(0); } }`}</style>
              <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-4">
                <div>
                  <p className="text-lg font-bold text-slate-900">{trackerDrawerMilestone.title || "-"}</p>
                  <div className="mt-2 inline-flex items-center gap-2">
                    <span
                      className={cx(
                        "rounded-full border px-3 py-1 text-xs font-semibold",
                        trackerDrawerMilestone.status === "Completed"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : trackerDrawerMilestone.status === "In Progress"
                          ? "border-blue-200 bg-blue-50 text-blue-700"
                          : trackerDrawerMilestone.status === "Overdue"
                          ? "border-red-200 bg-red-50 text-red-700"
                          : "border-slate-300 bg-white text-slate-700"
                      )}
                    >
                      {trackerDrawerMilestone.status || "Not Started"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeTrackerDetailDrawer}
                  className="rounded-lg border border-slate-300 bg-white p-1.5 text-slate-500 hover:bg-slate-50"
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Start Date</p>
                    <p className="mt-1 text-sm text-slate-700">{formatMilestoneDate(trackerDrawerMilestone.start_date)}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Due Date</p>
                    <p className="mt-1 text-sm text-slate-700">{formatMilestoneDate(trackerDrawerMilestone.end_date)}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Owner</p>
                    <div className="mt-1 inline-flex items-center gap-2 text-sm text-slate-700">
                      <Avatar
                        name={trackerDrawerMilestone.assignee_name || "Unassigned"}
                        imageUrl={trackerDrawerMilestone.assignee_avatar}
                        size="sm"
                      />
                      {trackerDrawerMilestone.assignee_name || "Unassigned"}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Description</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {trackerDrawerMilestone.description || "-"}
                    </p>
                  </div>
                </div>

                <div className="my-4 h-px w-full bg-slate-200" />

                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    TASKS ({Array.isArray(trackerDrawerMilestone.tasks) ? trackerDrawerMilestone.tasks.length : 0})
                  </p>
                  <div className="space-y-2">
                    {(Array.isArray(trackerDrawerMilestone.tasks) ? trackerDrawerMilestone.tasks : []).map((task, idx) => (
                      // <div
                      //   key={`drawer-task-${task.id}`}
                      //   role="button"
                      //   tabIndex={0}
                      //   onClick={() => {
                      //     const returnTo = `${
                      //       typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : `/campaigns/${campaignId}`
                      //     }#tracker-detail`;
                      //     if (typeof window !== "undefined") {
                      //       window.sessionStorage.setItem(
                      //         TRACKER_RETURN_CONTEXT_KEY,
                      //         JSON.stringify({ campaignId, milestoneId: trackerDrawerMilestone.id })
                      //       );
                      //     }
                      //     router.push(
                      //       `/tasks/milestone:${task.id}?returnTo=${encodeURIComponent(returnTo)}`
                      //     );

                      //   }}
                      //   onKeyDown={(e) => {
                      //     if (e.key === "Enter" || e.key === " ") {
                      //       e.preventDefault();
                      //       const returnTo = `${
                      //         typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : `/campaigns/${campaignId}`
                      //       }#tracker-detail`;
                      //       if (typeof window !== "undefined") {
                      //         window.sessionStorage.setItem(
                      //           TRACKER_RETURN_CONTEXT_KEY,
                      //           JSON.stringify({ campaignId, milestoneId: trackerDrawerMilestone.id })
                      //         );
                      //       }
                      //       router.push(
                      //         `/tasks/milestone:${task.id}?returnTo=${encodeURIComponent(returnTo)}`
                      //       );

                      //     }
                      //   }}
                      //   className={cx(
                      //     "rounded-lg border border-slate-200 px-3 py-2 cursor-pointer transition hover:shadow-md",
                      //     idx % 2 === 0 ? "bg-slate-50" : "bg-slate-100/50"
                      //   )}
                      // >

                      <div
  key={`drawer-task-${task.id}`}
  className={cx(
    "relative rounded-lg border border-slate-200 px-3 py-2 transition hover:shadow-md",
    idx % 2 === 0 ? "bg-slate-50" : "bg-slate-100/50"
  )}
>

                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-semibold text-slate-800">{task.title}</span>
                          <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] text-slate-600">
                            {task.task_type || "Generic Task"}
                          </span>
                          <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] text-slate-600">
                            Priority: {task.priority || "Medium"}
                          </span>
                          <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] text-slate-600">
                            Status: {task.status || "Not Started"}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <select
                            value={task.assignee_id || ""}
                            onChange={(e) => assignMilestoneTrackerTask(trackerDrawerMilestone, task, e.target.value)}
                            disabled={trackerTaskAssigningId === task.id}
                            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                          >
                            <option value="">Assign to...</option>
                            {users.map((u) => (
                              <option key={`drawer-user-${u.id}`} value={u.id}>
                                {u.name}
                              </option>
                            ))}
                          </select>
                          <span className="text-xs text-slate-600">
                            {task.assignee_name && task.assignee_name !== "-" ? task.assignee_name : "Unassigned"}
                          </span>
                          {trackerAssignNoticeByTaskId[task.id] ? (
                            <span className="text-[11px] font-semibold text-emerald-600">
                              {trackerAssignNoticeByTaskId[task.id]}
                            </span>
                          ) : null}
                        </div>
                        <button
  type="button"
  onClick={(e) => {
    e.stopPropagation();
    const returnTo = `${
      typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : `/campaigns/${campaignId}`
    }#tracker-detail`;
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        TRACKER_RETURN_CONTEXT_KEY,
        JSON.stringify({ campaignId, milestoneId: trackerDrawerMilestone.id })
      );
    }
    router.push(
      `/tasks/milestone:${task.id}?returnTo=${encodeURIComponent(returnTo)}`
    );
  }}
  className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-700 hover:scale-110"
  title="View task details"
>
  <ChevronRight size={14} />
</button>

                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {milestoneModalOpen ? (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-base font-semibold text-slate-900">Create Milestone with AI</p>
                <p className="mt-1 text-sm text-slate-500">AI will generate a milestone plan for your campaign.</p>
              </div>
              <button
                type="button"
                onClick={() => setMilestoneModalOpen(false)}
                className="rounded-xl border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50"
              >
                <X size={16} />
              </button>
            </div>

            <div className="max-h-[80vh] overflow-y-auto px-5 py-4">
              {milestoneModalError ? (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
                  {milestoneModalError}
                </div>
              ) : null}

              {/* AI Loading State with typing indicator */}
              {milestoneAiLoading ? (
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <p className="text-sm font-semibold text-slate-900 text-center">Generating milestone plan</p>
                  <div className="mt-3 flex justify-center">
                    <ThinkingDisplay preset="milestone_generate" className="justify-center" />
                  </div>
                </div>
              ) : milestoneReviewMilestones.length ? (
                <div className="space-y-4" style={{ animation: "fadeIn 0.4s ease-out" }}>
                  <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>

                  {/* Plan updated flash */}
                  {planUpdatedFlash && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 text-center" style={{ animation: "fadeIn 0.3s ease-out" }}>
                      ✓ Plan updated successfully
                    </div>
                  )}

                  {/* AI Plan Summary Card — expandable */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900 mb-3">Here is what I have planned:</p>
                    <div className="space-y-2">
                      {milestoneReviewMilestones.map((m, idx) => {
                        const borderColors = ["border-l-blue-500", "border-l-purple-500", "border-l-violet-500", "border-l-indigo-500", "border-l-teal-500", "border-l-cyan-500", "border-l-sky-500", "border-l-emerald-500"];
                        const borderColor = idx === 0 ? "border-l-blue-500" : idx === milestoneReviewMilestones.length - 1 ? "border-l-teal-500" : borderColors[Math.min(idx, borderColors.length - 1)];
                        const isExpanded = expandedMilestoneIds.has(m.tmpId);
                        return (
                          <div key={m.tmpId} className={`rounded-lg border border-slate-200 border-l-4 ${borderColor} bg-white overflow-hidden transition-all`}>
                            {/* Clickable header */}
                            <div
                              className="flex items-center justify-between gap-2 px-4 py-3 cursor-pointer hover:bg-slate-50/50 transition-colors"
                              onClick={() => {
                                setExpandedMilestoneIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(m.tmpId)) next.delete(m.tmpId);
                                  else next.add(m.tmpId);
                                  return next;
                                });
                              }}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  {/* <span className="text-xs font-bold text-slate-400">{String(idx + 1).padStart(2, "0")}.</span> */}
                                  {/* <span className="text-sm font-semibold text-slate-900">{m.title}</span> */}
                                  <div className="flex items-center gap-2">
  <span className="text-xs font-bold text-slate-400">{String(idx + 1).padStart(2, "0")}.</span>
  {editingMilestoneTmpId === m.tmpId ? (
    <input
      autoFocus
      value={editingMilestoneTitleDraft}
      onChange={(e) => setEditingMilestoneTitleDraft(e.target.value)}
      onBlur={() => {
        const val = editingMilestoneTitleDraft.trim();
        if (val) setMilestoneReviewMilestones((prev) =>
          prev.map((ms) => ms.tmpId === m.tmpId ? { ...ms, title: val } : ms)
        );
        setEditingMilestoneTmpId(null);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") setEditingMilestoneTmpId(null);
      }}
      onClick={(e) => e.stopPropagation()}
      className="rounded-md border border-blue-400 px-2 py-0.5 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-100"
    />
  ) : (
    <>
      <span className="text-sm font-semibold text-slate-900">{m.title}</span>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setEditingMilestoneTmpId(m.tmpId); setEditingMilestoneTitleDraft(m.title); }}
        className="rounded p-0.5 text-slate-400 hover:text-slate-700 shrink-0"
        title="Edit milestone title"
      >
        <Pencil size={12} />
      </button>
    </>
  )}
</div>

                                </div>
                                <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                                  <span>{formatMilestoneDate(m.start_date)} → {formatMilestoneDate(m.end_date)}</span>
                                  <span>•</span>
                                  <span>{m.tasks?.length || 0} tasks</span>
                                </div>
                              </div>
                              {isExpanded ? <ChevronUp size={14} className="text-slate-400 shrink-0" /> : <ChevronDown size={14} className="text-slate-400 shrink-0" />}
                            </div>

                            {/* Expanded tasks list */}
                            {isExpanded && (
                              <div className="border-t border-slate-100 px-4 py-3 space-y-1.5" style={{ animation: "fadeIn 0.2s ease-out" }}>
                                {(m.tasks || []).map((t) => {
                                  const isEditing = editingTaskId === t.tmpId;
                                  return (
                                    <div key={t.tmpId} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 group">
                                      <div className="h-1.5 w-1.5 rounded-full bg-slate-300 shrink-0" />
                                      {isEditing ? (
                                        <input
                                          autoFocus
                                          defaultValue={t.title}
                                          onBlur={(e) => {
                                            const newTitle = e.target.value.trim();
                                            if (newTitle && newTitle !== t.title) {
                                              setMilestoneReviewMilestones((prev) =>
                                                prev.map((ms) =>
                                                  ms.tmpId === m.tmpId
                                                    ? { ...ms, tasks: ms.tasks.map((tk) => (tk.tmpId === t.tmpId ? { ...tk, title: newTitle } : tk)) }
                                                    : ms
                                                )
                                              );
                                            }
                                            setEditingTaskId(null);
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") e.target.blur();
                                            if (e.key === "Escape") setEditingTaskId(null);
                                          }}
                                          className="flex-1 rounded-md border border-blue-300 bg-white px-2 py-1 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-100"
                                        />
                                      ) : (
                                        <>
                                          <span className="flex-1 text-xs text-slate-700">{t.title}</span>
                                          <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); setEditingTaskId(t.tmpId); }}
                                            className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-slate-400 hover:text-blue-500 transition"
                                            title="Edit task title"
                                          >
                                            <Pencil size={12} />
                                          </button>
                                        </>
                                      )}
                                      <span className="shrink-0 rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">{t.task_type}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                      <span>📅 {milestoneReviewMilestones.length} milestones</span>
                      <span>•</span>
                      <span>{formatMilestoneDate(milestoneReviewMilestones[0]?.start_date)} → {formatMilestoneDate(milestoneReviewMilestones[milestoneReviewMilestones.length - 1]?.end_date)}</span>
                    </div>

                    {!milestonePlanConfirmed && (
                      <p className="mt-3 text-xs text-slate-500 italic">Click a milestone to see tasks. Use the chat below to refine the plan.</p>
                    )}
                  </div>

                  {/* Conversation Panel — only shown before confirm */}
                  {!milestonePlanConfirmed && (
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Refine the plan</p>

                      {/* Chat messages */}
                      {milestoneChatMessages.length > 0 && (
                        <div className="mb-3 max-h-48 overflow-y-auto space-y-2 rounded-lg bg-slate-50 p-3">
                          {milestoneChatMessages.map((m, idx) => (
                            <div key={`chat-${idx}`} className={cx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                              <div
                                className={cx(
                                  "max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-5",
                                  m.role === "user"
                                    ? "bg-slate-900 text-white"
                                    : "border border-slate-200 bg-white text-slate-700"
                                )}
                              >
                                {m.content}
                              </div>
                            </div>
                          ))}

                          {milestoneChatLoading && (
                            <div className="flex justify-start">
                              <div className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-3.5 py-2">
                                <ThinkingDisplay preset="milestone_refine" className="text-xs" />
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Chat input */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={milestoneChatInput}
                          onChange={(e) => setMilestoneChatInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitMilestoneChatRefine(); } }}
                          placeholder="Tell me what to change..."
                          disabled={milestoneChatLoading}
                          className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                        />
                        <button
                          type="button"
                          onClick={submitMilestoneChatRefine}
                          disabled={milestoneChatLoading || !String(milestoneChatInput || "").trim()}
                          className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-slate-900 px-3 py-2.5 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Regenerate Milestone"
                        >
                          <Wand2 size={16} />
                          <span className="text-xs font-semibold">Regenerate Milestone</span>
                        </button>
                      </div>

                      {/* Confirm button */}
                      <button
                        type="button"
                        onClick={() => setMilestonePlanConfirmed(true)}
                        className="mt-3 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                      >
                        Looks good, create milestones →
                      </button>
                    </div>
                  )}


                  {/* Assignee selection — only shown after confirm */}
                  {milestonePlanConfirmed && (
                    <div className="rounded-xl border border-slate-200 bg-white p-4" style={{ animation: "fadeIn 0.3s ease-out" }}>
                      <p className="text-sm font-semibold text-slate-900 mb-3">Assign owners to each milestone:</p>
                      <div className="space-y-3">
                        {milestoneReviewMilestones.map((m, idx) => (
                          // <div key={m.tmpId} className="flex items-center gap-3">
                          // <div key={m.tmpId} className="flex items-center justify-between gap-3">
                             <div key={m.tmpId} className="flex items-center justify-between gap-3">

                            <span className="text-xs font-bold text-slate-400 w-8">{String(idx + 1).padStart(2, "0")}.</span>
                            <p className="flex-1 text-sm font-medium text-slate-700 truncate">{m.title}</p>
                          
{/* <div className="min-w-0 flex-1">
  {editingMilestoneTmpId === m.tmpId ? (
    <input
      autoFocus
      value={editingMilestoneTitleDraft}
      onChange={(e) => setEditingMilestoneTitleDraft(e.target.value)}
      onBlur={() => {
        const val = editingMilestoneTitleDraft.trim();
        if (val) setMilestoneReviewMilestones((prev) =>
          prev.map((ms) => ms.tmpId === m.tmpId ? { ...ms, title: val } : ms)
        );
        setEditingMilestoneTmpId(null);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") setEditingMilestoneTmpId(null);
      }}
      className="w-full rounded-lg border border-blue-400 px-2 py-0.5 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-100"
    />
  ) : (
    <div className="flex items-center gap-1.5">
      <p className="text-sm font-semibold text-slate-900 truncate">{m.title}</p>
      <button
        type="button"
        // onClick={() => { setEditingMilestoneTmpId(m.tmpId); setEditingMilestoneTitleDraft(m.title); }}
         onClick={(e) => { e.stopPropagation(); setEditingMilestoneTmpId(m.tmpId); setEditingMilestoneTitleDraft(m.title); }}
        className="rounded p-0.5 text-slate-400 hover:text-slate-700 shrink-0"
        title="Edit milestone title"
      >
        <Pencil size={13} />
      </button>
    </div>
  )}
</div> */}



                            <select
                              value={m.assignee_id}
                              onChange={(e) =>
                                setMilestoneReviewMilestones((prev) =>
                                  prev.map((x) => (x.tmpId === m.tmpId ? { ...x, assignee_id: e.target.value } : x))
                                )
                              }
                              // className="w-44 rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                              className="w-44 shrink-0 rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                              disabled={usersLoading}
                            >
                              <option value="">{usersLoading ? "Loading..." : "Select assignee"}</option>
                              {users.map((user) => (
                                <option key={`milestone-user-${user.id}`} value={user.id}>
                                  {user.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Start Over */}
                  <button
                    type="button"
                    onClick={() => {
                      setMilestoneReviewMilestones([]);
                      setMilestoneModalError("");
                      setMilestonePlanConfirmed(false);
                      setMilestoneChatMessages([]);
                      openMilestoneModal();
                    }}
                    className="text-xs font-medium text-slate-500 hover:text-slate-900 transition underline underline-offset-2"
                  >
                    Start over — regenerate plan
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                  No milestones were generated. Try again.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={() => setMilestoneModalOpen(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={milestoneModalSaving || milestoneAiLoading || !milestoneReviewMilestones.length || !milestonePlanConfirmed}
                onClick={createCampaignMilestonesFromReview}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {milestoneAiLoading ? (
                  <>
                    <ThinkingDisplay preset="milestone_generate" className="text-sm text-white" />
                  </>
                ) : milestoneModalSaving ? "Saving..." : "Save All Milestones"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {generatePostOpen ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/60 p-3"
          role="dialog"
          aria-modal="true"
          aria-labelledby="generate-post-modal-title"
        >
          <div
            className="flex max-h-[85vh] max-w-[96vw] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            style={{ width: "80vw", height: "85vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <h2 id="generate-post-modal-title" className="text-base font-semibold text-slate-900">
                Create Post
              </h2>
              <button
                type="button"
                onClick={() => setGeneratePostOpen(false)}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50">
              <CreatePostPage key={generatePostSessionKey} embedded initialInput={generatePostPrefill} />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

