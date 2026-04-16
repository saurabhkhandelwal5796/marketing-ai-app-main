"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CircleHelp, ChevronDown, ChevronUp, Paperclip } from "lucide-react";
import NextBestActions from "./NextBestActions";
import OutputCard from "./OutputCard";
import SendModal from "./SendModal";
import MarketingAnalysisOutput from "./MarketingAnalysisOutput";

const DEFAULT_ACTIONS = ["LinkedIn", "Email", "WhatsApp", "Instagram", "Blog", "SMS"];

const getId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const defaultChatMessages = () => [
  {
    id: getId(),
    role: "assistant",
    content:
      "Share your campaign brief here. I will build a detailed marketing plan, suggest channels, and generate content.",
  },
];

const deriveActionsFromPlanSteps = (steps, selectedIds) => {
  const selected = steps.filter((step) => selectedIds.includes(step.id));
  return Array.from(new Set(selected.flatMap((step) => step.channels || [])));
};

const toActionResponseMap = (raw) => {
  if (!raw || typeof raw !== "object") return {};
  return raw.outputs && typeof raw.outputs === "object" ? { ...raw.outputs } : {};
};

const generateCampaignTitle = ({ plan = [], aiMessage = "", campaign = "", company = "" }) => {
  const firstPlan = Array.isArray(plan) ? plan[0] : null;
  const source = String(firstPlan?.title || firstPlan?.description || aiMessage || "").trim();
  const cleaned = source
    .replace(/\s+/g, " ")
    .replace(/^step\s*\d+\s*[:.\-]\s*/i, "")
    .replace(/^\d+\s*[:.\-]\s*/i, "")
    .replace(/^\(?\d+\)?\s*/i, "")
    .replace(/^this campaign focuses on\s*/i, "")
    .replace(/^campaign focuses on\s*/i, "")
    .replace(/^marketing plan for\s*/i, "");
  const sentence = cleaned
    .split(/[.!?]/)
    .map((part) => part.trim())
    .find(Boolean);
  const fallback = `Regarding ${campaign || "campaign"} - ${company || "company"}`;
  const words = String(sentence || fallback).split(/\s+/).filter(Boolean);
  return words.slice(0, 10).join(" ") || fallback;
};

function HelpIcon({ text }) {
  return (
    <span className="group relative ml-1 inline-flex align-middle">
      <CircleHelp size={14} className="text-slate-400" />
      <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-56 -translate-x-1/2 rounded-md bg-slate-900 px-2.5 py-2 text-xs font-normal text-white shadow-lg group-hover:block">
        {text}
      </span>
    </span>
  );
}

export default function CampaignBuilder({ campaignId }) {
  const [campaignRecord, setCampaignRecord] = useState(null);
  const [loadingCampaign, setLoadingCampaign] = useState(true);
  const [savingCampaign, setSavingCampaign] = useState(false);

  const [inputsOpen, setInputsOpen] = useState(true);

  const [company, setCompany] = useState("Cloud Certitude");
  const [campaign, setCampaign] = useState("Marketing Campaign");
  const [website, setWebsite] = useState("https://www.cloudcertitude.com/");
  const [attachmentName, setAttachmentName] = useState("");
  const [description, setDescription] = useState(
    "You are a senior marketing strategist. Create a complete marketing plan based on: Campaign Name: Get new projects Company: Cloud Certitude Website: CloudCertitude.com Target Audience: New Companies of any domain for which we work and experience like, real estate, interior, manufacturing and many more, details can be fetched from our company website Goal: Need new projects Industry: IT consultancy Provide: 1. Strategy Overview 2. Channel Plan 3. Weekly Execution Plan (4 weeks) 4. Content Ideas 5. Sample LinkedIn post 6. Sample Email Campaign 7. Tools to use"
  );
  const [isFocused, setIsFocused] = useState(false);
  const [isLeftPanelExpanded, setIsLeftPanelExpanded] = useState(false);
  const [chatMessages, setChatMessages] = useState(defaultChatMessages);
  const [marketingPlan, setMarketingPlan] = useState([]);
  const [selectedStepIds, setSelectedStepIds] = useState([]);
  const [recommendedActions, setRecommendedActions] = useState([]);
  const [selectedActions, setSelectedActions] = useState([]);
  const [outputs, setOutputs] = useState({});
  const [askLoading, setAskLoading] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [regeneratingAction, setRegeneratingAction] = useState("");
  const [error, setError] = useState("");
  const [sendSuccess, setSendSuccess] = useState("");
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendTarget, setSendTarget] = useState({ channel: "", content: "" });

  const lastSavedPayloadRef = useRef("");
  const hydratedRef = useRef(false);
  const leftPanelRef = useRef(null);

  const [historyMarketingDetails, setHistoryMarketingDetails] = useState(null);
  const [historyTargetAudience, setHistoryTargetAudience] = useState(null);
  const [historyAiMessage, setHistoryAiMessage] = useState("");

  const latestUserMessage = useMemo(() => {
    const msg = [...chatMessages].reverse().find((item) => item.role === "user");
    return msg?.content || description;
  }, [chatMessages, description]);

  const dynamicActions = useMemo(
    () => deriveActionsFromPlanSteps(marketingPlan, selectedStepIds),
    [marketingPlan, selectedStepIds]
  );

  useEffect(() => {
    setSelectedActions((prev) => prev.filter((item) => dynamicActions.includes(item)));
  }, [dynamicActions]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!leftPanelRef.current) return;
      if (!leftPanelRef.current.contains(event.target)) {
        setIsLeftPanelExpanded(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    const loadCampaign = async () => {
      setLoadingCampaign(true);
      setError("");
      try {
        const res = await fetch(`/api/campaigns/${campaignId}`);
        const data = await res.json();
        if (!res.ok || data?.error) throw new Error(data?.error || "Failed to load campaign.");

        const record = data.campaign || {};
        setCampaignRecord(record);
        setCompany(record.company || "Cloud Certitude");
        setCampaign(record.goal || "Marketing Campaign");
        setWebsite(record.website || "https://www.cloudcertitude.com/");
        setAttachmentName(record.attachment_name || "");
        setDescription(
          record.description ||
            "You are a senior marketing strategist. Create a complete marketing plan based on: Campaign Name: Get new projects Company: Cloud Certitude Website: CloudCertitude.com Target Audience: New Companies of any domain for which we work and experience like, real estate, interior, manufacturing and many more, details can be fetched from our company website Goal: Need new projects Industry: IT consultancy Provide: 1. Strategy Overview 2. Channel Plan 3. Weekly Execution Plan (4 weeks) 4. Content Ideas 5. Sample LinkedIn post 6. Sample Email Campaign 7. Tools to use"
        );
        setChatMessages(Array.isArray(record.chat_messages) && record.chat_messages.length ? record.chat_messages : defaultChatMessages());
        setMarketingPlan(Array.isArray(record.marketing_plan) ? record.marketing_plan : []);
        setSelectedStepIds(Array.isArray(record.selected_step_ids) ? record.selected_step_ids : []);
        setRecommendedActions(Array.isArray(record.recommended_actions) ? record.recommended_actions : []);
        setSelectedActions(Array.isArray(record.selected_actions) ? record.selected_actions : []);
        setOutputs(record.outputs && typeof record.outputs === "object" ? record.outputs : {});
        lastSavedPayloadRef.current = JSON.stringify({
          company: record.company || "Cloud Certitude",
          goal: record.goal || "Marketing Campaign",
          website: record.website || "https://www.cloudcertitude.com/",
          attachment_name: record.attachment_name || "",
          description:
            record.description ||
            "You are a senior marketing strategist. Create a complete marketing plan based on: Campaign Name: Get new projects Company: Cloud Certitude Website: CloudCertitude.com Target Audience: New Companies of any domain for which we work and experience like, real estate, interior, manufacturing and many more, details can be fetched from our company website Goal: Need new projects Industry: IT consultancy Provide: 1. Strategy Overview 2. Channel Plan 3. Weekly Execution Plan (4 weeks) 4. Content Ideas 5. Sample LinkedIn post 6. Sample Email Campaign 7. Tools to use",
          chat_messages: Array.isArray(record.chat_messages) && record.chat_messages.length ? record.chat_messages : defaultChatMessages(),
          marketing_plan: Array.isArray(record.marketing_plan) ? record.marketing_plan : [],
          selected_step_ids: Array.isArray(record.selected_step_ids) ? record.selected_step_ids : [],
          recommended_actions: Array.isArray(record.recommended_actions) ? record.recommended_actions : [],
          selected_actions: Array.isArray(record.selected_actions) ? record.selected_actions : [],
          outputs: record.outputs && typeof record.outputs === "object" ? record.outputs : {},
        });
      } catch (err) {
        setError(err.message || "Unable to load campaign.");
      } finally {
        hydratedRef.current = true;
        setLoadingCampaign(false);
      }
    };

    loadCampaign();
  }, [campaignId]);

  useEffect(() => {
    const historyId =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("historyId") : "";
    if (!historyId) return;
    let mounted = true;
    const loadHistory = async () => {
      try {
        const res = await fetch(`/api/campaign-history?id=${encodeURIComponent(historyId)}`);
        const data = await res.json();
        if (!res.ok || data?.error) throw new Error(data?.error || "Failed to load history record.");
        const rec = data.record || {};
        if (!mounted) return;
        setCompany(rec.company || "Cloud Certitude");
        setCampaign(rec.goal || "Marketing Campaign");
        setWebsite(rec.website || "https://www.cloudcertitude.com/");
        setDescription(rec.description || description);
        setMarketingPlan(Array.isArray(rec.marketing_plan) ? rec.marketing_plan : []);
        setSelectedStepIds([]);
        setRecommendedActions([]);
        setSelectedActions([]);
        setOutputs({});
        setHistoryMarketingDetails(Array.isArray(rec.marketing_details) ? rec.marketing_details : []);
        setHistoryTargetAudience(Array.isArray(rec.target_audience) ? rec.target_audience : []);
        setHistoryAiMessage("");
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Failed to load history record.");
      }
    };
    loadHistory();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  const persistPayload = useMemo(
    () => ({
      company,
      goal: campaign,
      website,
      attachment_name: attachmentName,
      description,
      chat_messages: chatMessages,
      marketing_plan: marketingPlan,
      selected_step_ids: selectedStepIds,
      recommended_actions: recommendedActions,
      selected_actions: selectedActions,
      outputs,
    }),
    [
      attachmentName,
      campaign,
      chatMessages,
      company,
      description,
      marketingPlan,
      outputs,
      recommendedActions,
      selectedActions,
      selectedStepIds,
      website,
    ]
  );

  useEffect(() => {
    if (!hydratedRef.current || loadingCampaign) return;
    const nextPayload = JSON.stringify(persistPayload);
    if (nextPayload === lastSavedPayloadRef.current) return;

    const timer = setTimeout(async () => {
      setSavingCampaign(true);
      try {
        const res = await fetch(`/api/campaigns/${campaignId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: nextPayload,
        });
        const data = await res.json();
        if (!res.ok || data?.error) throw new Error(data?.error || "Failed to save campaign changes.");
        lastSavedPayloadRef.current = nextPayload;
      } catch (err) {
        setError(err.message || "Failed to auto-save campaign.");
      } finally {
        setSavingCampaign(false);
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [campaignId, loadingCampaign, persistPayload]);

  const handleAttachmentChange = (e) => {
    const file = e.target.files?.[0];
    setAttachmentName(file?.name || "");
  };

  const handleAskAi = async (text) => {
    setIsLeftPanelExpanded(false);
    setError("");
    setSendSuccess("");
    const userMsg = { id: getId(), role: "user", content: text };
    setChatMessages((prev) => [...prev, userMsg]);
    setDescription(text);
    setAskLoading(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company,
          campaign,
          website,
          description: text,
          attachmentName,
          step: "suggestions",
          chatMessages: [...chatMessages, userMsg],
        }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Plan generation failed.");
      const nextPlan = Array.isArray(data?.marketingPlan) && data.marketingPlan.length ? data.marketingPlan : null;
      if (!nextPlan) throw new Error("AI did not return a marketing plan. Please try again.");
      setMarketingPlan(nextPlan);
      setSelectedStepIds(nextPlan.slice(0, 2).map((item) => item.id));
      setRecommendedActions(Array.isArray(data?.recommendedActions) ? data.recommendedActions : []);
      const nextTitle = generateCampaignTitle({
        plan: nextPlan,
        aiMessage: data?.aiMessage || "",
        campaign,
        company,
      });
      setCampaignRecord((prev) => ({ ...(prev || {}), name: nextTitle }));
      await fetch(`/api/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nextTitle }),
      });

      setChatMessages((prev) => [
        ...prev,
        {
          id: getId(),
          role: "assistant",
          content:
            data?.aiMessage ||
            "Marketing Plan is ready. Select steps, pick channels in Next Best Actions, then generate content.",
        },
      ]);
    } catch (err) {
      setError(err.message || "Unable to ask AI right now.");
    } finally {
      setAskLoading(false);
    }
  };
  const handleAskAI = () => handleAskAi(description);

  const handleToggleStep = (stepId) => {
    setSelectedStepIds((prev) =>
      prev.includes(stepId) ? prev.filter((id) => id !== stepId) : [...prev, stepId]
    );
  };

  const handleToggleAction = (action) => {
    setSelectedActions((prev) =>
      prev.includes(action) ? prev.filter((item) => item !== action) : [...prev, action]
    );
  };

  const handleGenerateContent = async (actionsToGenerate = selectedActions) => {
    if (!actionsToGenerate.length) return;
    setGenerateLoading(true);
    setError("");
    setSendSuccess("");

    const selectedPlanSteps = marketingPlan
      .filter((step) => selectedStepIds.includes(step.id))
      .map((step) => `${step.title}: ${step.description}`);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company,
          campaign,
          website,
          description: latestUserMessage,
          selectedPlanSteps,
          selectedActions: actionsToGenerate,
          step: "content",
          chatMessages,
          attachmentName,
        }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Content generation failed.");
      setOutputs((prev) => ({ ...prev, ...toActionResponseMap(data) }));
    } catch (err) {
      setError(err.message || "Unable to generate content right now.");
    } finally {
      setGenerateLoading(false);
      setRegeneratingAction("");
    }
  };

  const renderedActions =
    dynamicActions.length > 0 ? dynamicActions : recommendedActions.length > 0 ? recommendedActions : DEFAULT_ACTIONS;

  const handleOpenSendModal = (channel) => {
    setSendTarget({ channel, content: outputs[channel] || "" });
    setSendModalOpen(true);
    setSendSuccess("");
  };

  const handleSubmitSend = async ({ campaignName, channel, recipients, content }) => {
    setSendLoading(true);
    setError("");
    setSendSuccess("");
    try {
      const res = await fetch("/api/campaign-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: campaignId,
          campaign_name: campaignName || campaign,
          channel,
          recipients,
          content,
          status: "sent",
          sent_at: new Date().toISOString(),
          opens: 0,
          clicks: 0,
        }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to save send log.");
      setSendSuccess(`Dummy send logged for ${channel}.`);
      setSendModalOpen(false);
    } catch (err) {
      setError(err.message || "Failed to save send log.");
    } finally {
      setSendLoading(false);
    }
  };

  if (loadingCampaign) {
    return (
      <main className="p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Loading campaign...
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-6 p-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-900">{campaignRecord?.name || "Generating title..."}</p>
          <p className="text-xs text-slate-500">{savingCampaign ? "Saving..." : "All changes saved"}</p>
        </div>
      </section>

      <section>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <div
            ref={leftPanelRef}
            onClick={() => setIsLeftPanelExpanded(true)}
            className={`space-y-4 transition-all duration-300 ease-in-out ${
              isLeftPanelExpanded ? "xl:col-span-2" : "xl:col-span-1"
            }`}
          >
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <button
                onClick={() => setInputsOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Campaign Inputs</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Compact setup panel</p>
                </div>
                <span className="rounded-lg border border-slate-300 p-1.5 text-slate-600">
                  {inputsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </span>
              </button>

              {inputsOpen ? (
                <div className="border-t border-slate-200 px-4 py-4">
                  <div className="max-h-[calc(100vh-260px)] overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
                    <div className="grid grid-cols-1 gap-[6px]">
                      <div className="grid grid-cols-1 gap-[6px]">
                        <label className="block text-[10px] font-semibold uppercase tracking-[0.5px] text-slate-500">
                        <span className="inline-flex items-center">
                          Company
                          <HelpIcon text="Enter your company or brand name as it should appear in generated content." />
                        </span>
                        <input
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                          onFocus={(e) => {
                            e.target.style.borderColor = "#2563eb";
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = "#e5e7eb";
                          }}
                          className="mt-1 w-full outline-none"
                          style={{
                            border: "1.5px solid #e5e7eb",
                            borderRadius: "10px",
                            padding: "8px 12px",
                            fontSize: "13px",
                            color: "#111111",
                            background: "#ffffff",
                            width: "100%",
                          }}
                        />
                      </label>

                      <label className="block text-[10px] font-semibold uppercase tracking-[0.5px] text-slate-500">
                        <span className="inline-flex items-center">
                          Goal
                          <HelpIcon text="Describe the outcome you want, like hiring, lead generation, or product awareness." />
                        </span>
                        <input
                          value={campaign}
                          onChange={(e) => setCampaign(e.target.value)}
                          onFocus={(e) => {
                            e.target.style.borderColor = "#2563eb";
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = "#e5e7eb";
                          }}
                          className="mt-1 w-full outline-none"
                          style={{
                            border: "1.5px solid #e5e7eb",
                            borderRadius: "10px",
                            padding: "8px 12px",
                            fontSize: "13px",
                            color: "#111111",
                            background: "#ffffff",
                            width: "100%",
                          }}
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-1 gap-[6px]">
                      <label className="block text-[10px] font-semibold uppercase tracking-[0.5px] text-slate-500">
                        <span className="inline-flex items-center">
                          Website
                          <HelpIcon text="Add your website, job post, or landing page URL for better context." />
                        </span>
                        <input
                          value={website}
                          onChange={(e) => setWebsite(e.target.value)}
                          onFocus={(e) => {
                            e.target.style.borderColor = "#2563eb";
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = "#e5e7eb";
                          }}
                          className="mt-1 w-full outline-none"
                          style={{
                            border: "1.5px solid #e5e7eb",
                            borderRadius: "10px",
                            padding: "8px 12px",
                            fontSize: "13px",
                            color: "#111111",
                            background: "#ffffff",
                            width: "100%",
                          }}
                        />
                      </label>
                    </div>

                    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.5px] text-slate-500">File</p>
                        <p className="truncate text-[11px] text-slate-500">
                          {attachmentName ? `Attached: ${attachmentName}` : "Optional brief/JD"}
                        </p>
                      </div>
                      <label
                        className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50"
                        title="Upload file"
                      >
                        <Paperclip size={14} />
                        Upload
                        <input type="file" onChange={handleAttachmentChange} className="hidden" />
                      </label>
                    </div>

                    <div className="block text-[10px] font-semibold uppercase tracking-[0.5px] text-slate-500">
                      <p>Description</p>
                      <div
                        onFocus={() => setIsFocused(true)}
                        onBlur={(e) => {
                          if (!e.currentTarget.contains(e.relatedTarget)) {
                            setIsFocused(false);
                          }
                        }}
                        style={{
                          position: "relative",
                          background: "#ffffff",
                          border: `1.5px solid ${isFocused ? "#2563eb" : "#e5e7eb"}`,
                          borderRadius: "16px",
                          padding: "12px 14px",
                          boxShadow: isFocused ? "0 0 0 3px rgba(37,99,235,0.1)" : "0 2px 8px rgba(0,0,0,0.06)",
                          transition: "border-color 0.2s, box-shadow 0.2s",
                          marginTop: "8px",
                        }}
                      >
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Describe your campaign goals, audience, and constraints..."
                          rows={4}
                          style={{
                            width: "100%",
                            border: "none",
                            outline: "none",
                            resize: "none",
                            background: "transparent",
                            fontSize: "13px",
                            lineHeight: "1.6",
                            color: "#111111",
                            fontFamily: "inherit",
                            overflowY: "auto",
                            minHeight: "80px",
                            maxHeight: "160px",
                            display: "block",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                        />
                        <div
                          style={{
                            display: "flex",
                            justifyContent: isLeftPanelExpanded ? "space-between" : "flex-end",
                            alignItems: "center",
                            marginTop: "8px",
                            paddingTop: "8px",
                            borderTop: "1px solid #f3f4f6",
                          }}
                        >
                          {isLeftPanelExpanded ? (
                            <span
                              style={{
                                fontSize: "11px",
                                color: "#9ca3af",
                              }}
                            >
                              Describe your campaign
                            </span>
                          ) : null}
                          <button
                            type="button"
                            disabled={askLoading}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleAskAI();
                            }}
                            style={{
                              background: "#2563eb",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: "10px",
                              padding: "6px 14px",
                              fontSize: "12px",
                              fontWeight: "500",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              opacity: askLoading ? 0.7 : 1,
                            }}
                          >
                            {askLoading ? "Generating..." : "✦ Ask AI"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                </div>
              ) : null}
            </div>
          </div>

          <div
            className={`space-y-5 transition-all duration-300 ease-in-out ${
              isLeftPanelExpanded ? "xl:col-span-3" : "xl:col-span-4"
            }`}
          >
            <MarketingAnalysisOutput
              campaignId={campaignId}
              company={company}
              campaign={campaign}
              website={website}
              description={latestUserMessage}
              attachmentName={attachmentName}
              marketingPlan={marketingPlan}
              selectedStepIds={selectedStepIds}
              onTogglePlanStep={handleToggleStep}
              planLoading={askLoading}
              onGeneratePlan={() => handleAskAi(description)}
              initialMarketingDetails={historyMarketingDetails}
              initialTargetAudience={historyTargetAudience}
              initialAiMessage={historyAiMessage}
            />

            {/* Hidden per requirement: Next Best Actions card */}
            {false ? (
              <NextBestActions
                actions={renderedActions}
                selectedActions={selectedActions}
                onToggle={handleToggleAction}
                onGenerate={() => handleGenerateContent()}
                loading={generateLoading}
              />
            ) : null}

            {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
            {sendSuccess ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{sendSuccess}</div> : null}

            {/* Hidden per requirement: Generated Outputs card */}
            {false ? (
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-slate-900">Generated Outputs</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {selectedActions.map((action) => (
                    <OutputCard
                      key={action}
                      title={action}
                      content={outputs[action] || ""}
                      regenerating={regeneratingAction === action}
                      onRegenerate={async () => {
                        setRegeneratingAction(action);
                        await handleGenerateContent([action]);
                      }}
                      onSend={() => handleOpenSendModal(action)}
                    />
                  ))}
                </div>

                {selectedActions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
                    Select one or more actions to render output cards.
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <SendModal open={sendModalOpen} channel={sendTarget.channel} content={sendTarget.content} campaignName={campaign} sending={sendLoading} onClose={() => setSendModalOpen(false)} onSubmit={handleSubmitSend} />
    </main>
  );
}
