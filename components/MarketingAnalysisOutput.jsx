"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  AtSign,
  ClipboardCopy,
  Globe,
  Mail,
  Link,
  MessageSquarePlus,
  Phone,
  Sparkles,
  Trash2,
  X,
  Users,
  Wand2,
} from "lucide-react";

const TABS = [
  { id: "details", label: "Marketing Details", icon: Sparkles },
  { id: "audience", label: "Target Audience", icon: Users },
  { id: "tasks", label: "Task Assignment", icon: ClipboardCopy },
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

function normalizeTags(tags) {
  return Array.isArray(tags) ? tags.filter((t) => typeof t === "string") : [];
}

function hasFilterTag(detailTags, filter) {
  const tags = normalizeTags(detailTags).map((t) => t.toLowerCase());
  const f = (filter || "").toLowerCase();
  if (!f) return true;
  return tags.some((t) => t.includes(f));
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

export default function MarketingAnalysisOutput({
  campaignId,
  company,
  campaign,
  website,
  description,
  attachmentName,
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("details");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [aiMessage, setAiMessage] = useState("");
  const [marketingDetails, setMarketingDetails] = useState([]);
  const [targetAudience, setTargetAudience] = useState([]);

  const [selectedDetailIds, setSelectedDetailIds] = useState(() => new Set());
  const [tagFilter, setTagFilter] = useState("");

  const [threadsByPointId, setThreadsByPointId] = useState({});
  const [threadDraftsByPointId, setThreadDraftsByPointId] = useState({});
  const [threadLoadingByPointId, setThreadLoadingByPointId] = useState({});

  const [tasks, setTasks] = useState([]);
  const [templatesOpen, setTemplatesOpen] = useState(false);

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

  const selectedCount = selectedDetailIds.size;
  const anySelected = selectedCount > 0;

  const selectedItems = useMemo(() => {
    const idSet = selectedDetailIds;
    return marketingDetails.filter((item) => idSet.has(item.id));
  }, [marketingDetails, selectedDetailIds]);

  const filteredDetails = useMemo(() => {
    if (!tagFilter) return marketingDetails;
    return marketingDetails.filter((d) => hasFilterTag(d.tags, tagFilter));
  }, [marketingDetails, tagFilter]);

  const campaignContext = useMemo(() => {
    const parts = [company, campaign].filter(Boolean);
    return parts.join(" — ");
  }, [company, campaign]);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);

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
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to load tasks.");
      setTasks(Array.isArray(data.tasks) ? data.tasks : []);
    } catch (e) {
      setError(e?.message || "Failed to load tasks.");
    } finally {
      setTasksLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCompanyModal = async (companyObj) => {
    setActiveCompany(companyObj);
    setCompanyModalOpen(true);
    setCompanyModalError("");
    setCompanyModalData(null);
    setCompanyModalLoading(true);
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

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 1800);
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
        showToast("success", "Task created successfully");
        const uid = payload.assignee_id || "";
        router.push(uid ? `/my-tasks?userId=${encodeURIComponent(uid)}` : "/my-tasks");
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
    setTemplatesOpen(false);
    openCreateTaskModal({ title: tpl.title, task_type: tpl.task_type, priority: tpl.priority });
  };

  const toggleSelected = (id) => {
    setSelectedDetailIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedDetailIds((prev) => {
      const next = new Set(prev);
      filteredDetails.forEach((d) => next.add(d.id));
      return next;
    });
  };

  const deselectAll = () => {
    setSelectedDetailIds(new Set());
  };

  const selectTop10Visible = () => {
    setSelectedDetailIds((prev) => {
      const next = new Set(prev);
      filteredDetails.slice(0, 10).forEach((d) => next.add(d.id));
      return next;
    });
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
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to generate analysis.");

      setAiMessage(typeof data?.aiMessage === "string" ? data.aiMessage : "");
      setMarketingDetails(Array.isArray(data?.marketingDetails) ? data.marketingDetails : []);
      setTargetAudience(Array.isArray(data?.targetAudience) ? data.targetAudience : []);
      setSelectedDetailIds(new Set());
      setTagFilter("");
      setThreadsByPointId({});
      setThreadDraftsByPointId({});
      setThreadLoadingByPointId({});
      setTasks([]);
      setActiveTab("details");
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
    setError("");
    try {
      const existingTitles = new Set(
        tasks
          .filter((t) => t.campaign_context === campaignContext)
          .map((t) => String(t.title || "").trim())
          .filter(Boolean)
      );
      for (const p of selectedItems) {
        const title = String(p.title || "").trim();
        if (!title || existingTitles.has(title)) continue;
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description: p.explanation || "",
            assignee_id: null,
            assignee_team: null,
            priority: "Medium",
            status: "To Do",
            task_type: "Generic Task",
            due_date: null,
            channel_tags: normalizeTags(p.tags).slice(0, 10),
            campaign_context: campaignContext,
          }),
        });
        const data = await res.json();
        if (!res.ok || data?.error) throw new Error(data?.error || "Failed to create task.");
        existingTitles.add(title);
        setTasks((prev) => [data.task, ...prev]);
      }
      setActiveTab("tasks");
    } catch (e) {
      setError(e?.message || "Failed to assign tasks.");
    }
  };

  const updateTaskLocal = (taskId, patch) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...patch } : t)));
  };

  // Task Assignment tab is intentionally a task creation interface (no list view).

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      {toast ? (
        <div
          className={cx(
            "fixed bottom-4 right-4 z-[70] rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg",
            toast.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
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
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {loading ? "Generating..." : marketingDetails.length ? "Regenerate" : "Generate"}
        </button>
      </div>

      {aiMessage ? (
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-700">
          {aiMessage}
        </div>
      ) : null}

      <div className="max-h-[720px] overflow-y-auto">
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 py-3 backdrop-blur">
          <div className="flex flex-wrap gap-2">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cx(
                    "inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition",
                    active
                      ? "border-blue-500 bg-blue-500 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                  )}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-5 py-4">
          {error ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {activeTab === "details" ? (
            <div className="space-y-3">
              {marketingDetails.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  Click Generate to create a detailed marketing analysis (20+ points).
                </div>
              ) : null}

              {marketingDetails.length ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      {FILTER_TAGS.map((t) => {
                        const active = tagFilter === t;
                        return (
                          <button
                            key={t}
                            onClick={() => setTagFilter((prev) => (prev === t ? "" : t))}
                            className={cx(
                              "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                              active
                                ? "border-blue-500 bg-blue-500 text-white"
                                : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                            )}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={selectAllVisible}
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Select All
                      </button>
                      <button
                        onClick={deselectAll}
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Deselect All
                      </button>
                      <button
                        onClick={selectTop10Visible}
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Select Top 10
                      </button>
                    </div>
                  </div>
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
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
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
                                    className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-600"
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
                            className="flex w-full items-center justify-between gap-3 text-left"
                          >
                            <span className="text-xs font-semibold text-slate-700">
                              Ask more about this...
                            </span>
                            <span className="text-xs font-semibold text-slate-500">
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
                                    <div className="w-36 animate-pulse rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
                                      AI is thinking...
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
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {targetAudience.length === 0 ? (
                <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  Generate analysis to see target audience segments.
                </div>
              ) : null}
              {targetAudience.map((c, idx) => (
                <motion.article
                  key={`${c.name}-${idx}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
                  onClick={() => openCompanyModal(c)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-700">{c.description}</p>
                    </div>
                    {c.industry ? (
                      <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                        {c.industry}
                      </span>
                    ) : null}
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
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <p className="text-xs font-semibold text-slate-700">Outreach Channels</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {outreach.email ? (
                              <a
                                href={`mailto:${outreach.email}`}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                title={outreach.email}
                              >
                                <Mail size={14} />
                                Email
                              </a>
                            ) : null}
                            {outreach.phone ? (
                              <a
                                href={`tel:${outreach.phone}`}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                title={outreach.phone}
                              >
                                <Phone size={14} />
                                Phone
                              </a>
                            ) : null}
                            {outreach.linkedin ? (
                              <a
                                href={outreach.linkedin}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                title="LinkedIn"
                              >
                                <Link size={14} />
                                LinkedIn
                              </a>
                            ) : null}
                            {outreach.website ? (
                              <a
                                href={outreach.website}
                                target="_blank"
                                rel="noreferrer"
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
            </div>
          ) : null}

          {activeTab === "tasks" ? (
            <div>
              {!anySelected ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  Select points from Marketing Details to generate tasks
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={addManualTask}
                        className="rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        + Add Task
                      </button>
                      <button
                        onClick={() => setTemplatesOpen((v) => !v)}
                        className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Templates
                      </button>
                    </div>
                  </div>

                  {templatesOpen ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                      <p className="text-sm font-semibold text-slate-900">Templates</p>
                      <div className="mt-3 space-y-3">
                        {TEMPLATE_GROUPS.map((g) => (
                          <div key={g.label}>
                            <p className="text-xs font-semibold text-slate-700">{g.label}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {g.items.map((tpl) => (
                                <button
                                  key={`${g.label}-${tpl.title}`}
                                  onClick={() => createTaskFromTemplate(tpl)}
                                  className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                  {tpl.title} ({tpl.task_type}, {tpl.priority})
                                </button>
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
              <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
                <div className="flex items-start justify-between gap-3">
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

                {taskModalError ? (
                  <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
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

                <div className="mt-5 flex items-center justify-end gap-2">
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
          ) : null}
        </div>
      </div>

      {activeTab === "details" && anySelected ? (
        <div className="sticky bottom-0 z-10 border-t border-slate-200 bg-white/95 px-5 py-3 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-700">
              <span className="font-semibold">{selectedCount}</span> items selected →{" "}
              <span className="font-semibold">Assign as Tasks</span>
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
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

