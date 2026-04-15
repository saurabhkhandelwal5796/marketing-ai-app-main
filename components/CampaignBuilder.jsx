"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CircleHelp, ChevronDown, ChevronUp, Paperclip } from "lucide-react";
import Image from "next/image";
import ChatBox from "./ChatBox";
import SuggestionsPanel from "./SuggestionsPanel";
import NextBestActions from "./NextBestActions";
import OutputCard from "./OutputCard";
import SendModal from "./SendModal";
import MarketingAnalysisOutput from "./MarketingAnalysisOutput";

const DEFAULT_ACTIONS = ["LinkedIn", "Email", "WhatsApp", "Instagram", "Blog", "SMS"];

const DEFAULT_MARKETING_PLAN = [
  {
    id: "step-1",
    title: "Step 1: Define Target Audience",
    description:
      "Identify ideal candidate persona, industry segments, and role seniority. Prioritize audience quality to improve conversion from impression to application.",
    channels: ["LinkedIn", "Email"],
  },
  {
    id: "step-2",
    title: "Step 2: Build Content Strategy",
    description:
      "Create channel-specific messaging pillars like salary transparency, growth path, and project exposure. Keep content concise and role-focused.",
    channels: ["LinkedIn", "Instagram", "Blog", "Email"],
  },
  {
    id: "step-3",
    title: "Step 3: Execute Outreach",
    description:
      "Run outbound and inbound outreach through targeted shortlists and warm leads. Use personalized communication and clear call-to-action.",
    channels: ["Email", "WhatsApp", "Naukri"],
  },
  {
    id: "step-4",
    title: "Step 4: Retarget and Optimize",
    description:
      "Retarget engaged users with reminder touchpoints and proof points. Iterate weekly using response trends and channel-level performance.",
    channels: ["LinkedIn", "Instagram", "SMS"],
  },
];

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
  const [chatOpen, setChatOpen] = useState(false);

  const [company, setCompany] = useState("Cloud Certitude");
  const [campaign, setCampaign] = useState("Hiring experienced MuleSoft developers");
  const [website, setWebsite] = useState("https://www.cloudcertitude.com");
  const [attachmentName, setAttachmentName] = useState("");
  const [description, setDescription] = useState(
    "We want to hire experienced MuleSoft developers in India within 30 days. Focus on strong reach and quality applicants."
  );
  const [chatMessages, setChatMessages] = useState(defaultChatMessages);
  const [marketingPlan, setMarketingPlan] = useState(DEFAULT_MARKETING_PLAN);
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
        setCampaign(record.goal || "Untitled Campaign");
        setWebsite(record.website || "");
        setAttachmentName(record.attachment_name || "");
        setDescription(record.description || "");
        setChatMessages(Array.isArray(record.chat_messages) && record.chat_messages.length ? record.chat_messages : defaultChatMessages());
        setMarketingPlan(Array.isArray(record.marketing_plan) && record.marketing_plan.length ? record.marketing_plan : DEFAULT_MARKETING_PLAN);
        setSelectedStepIds(Array.isArray(record.selected_step_ids) ? record.selected_step_ids : []);
        setRecommendedActions(Array.isArray(record.recommended_actions) ? record.recommended_actions : []);
        setSelectedActions(Array.isArray(record.selected_actions) ? record.selected_actions : []);
        setOutputs(record.outputs && typeof record.outputs === "object" ? record.outputs : {});
        lastSavedPayloadRef.current = JSON.stringify({
          company: record.company || "Cloud Certitude",
          goal: record.goal || "Untitled Campaign",
          website: record.website || "",
          attachment_name: record.attachment_name || "",
          description: record.description || "",
          chat_messages: Array.isArray(record.chat_messages) && record.chat_messages.length ? record.chat_messages : defaultChatMessages(),
          marketing_plan: Array.isArray(record.marketing_plan) && record.marketing_plan.length ? record.marketing_plan : DEFAULT_MARKETING_PLAN,
          selected_step_ids: Array.isArray(record.selected_step_ids) ? record.selected_step_ids : [],
          recommended_actions: Array.isArray(record.recommended_actions) ? record.recommended_actions : [],
          selected_actions: Array.isArray(record.selected_actions) ? record.selected_actions : [],
          outputs: record.outputs && typeof record.outputs === "object" ? record.outputs : {},
          name: record.goal || "Untitled Campaign",
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
      name: campaign || "Untitled Campaign",
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

      const nextPlan = Array.isArray(data?.marketingPlan) && data.marketingPlan.length
        ? data.marketingPlan
        : DEFAULT_MARKETING_PLAN;
      setMarketingPlan(nextPlan);
      setSelectedStepIds(nextPlan.slice(0, 2).map((item) => item.id));
      setRecommendedActions(Array.isArray(data?.recommendedActions) ? data.recommendedActions : []);

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
      <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-950 to-slate-800 p-4 text-white">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-white/20 bg-white/95 p-1.5">
              <Image
                src="/ai-workflow-logo.png"
                alt="AI Marketing Workflow Studio logo"
                width={240}
                height={80}
                className="h-12 w-auto object-contain sm:h-14"
                priority
              />
            </div>
            <div>
              <h1 className="text-xl font-semibold sm:text-2xl">AI Marketing Workflow Studio</h1>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-300">Plan · Create · Publish · Grow</p>
            </div>
          </div>
          <div className="text-right text-xs text-slate-300">
            <p>{campaignRecord?.name || campaign || "Campaign"}</p>
            <p>{savingCampaign ? "Saving..." : "All changes saved"}</p>
          </div>
        </div>
      </section>

      <section>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <div className="space-y-4 xl:col-span-1">
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
                  <div className="grid grid-cols-1 gap-2">
                    <div className="grid grid-cols-1 gap-2">
                      <label className="block text-xs font-semibold text-slate-700">
                        <span className="inline-flex items-center">
                          Company
                          <HelpIcon text="Enter your company or brand name as it should appear in generated content." />
                        </span>
                        <input
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                      </label>

                      <label className="block text-xs font-semibold text-slate-700">
                        <span className="inline-flex items-center">
                          Goal
                          <HelpIcon text="Describe the outcome you want, like hiring, lead generation, or product awareness." />
                        </span>
                        <input
                          value={campaign}
                          onChange={(e) => setCampaign(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      <label className="block text-xs font-semibold text-slate-700">
                        <span className="inline-flex items-center">
                          Website
                          <HelpIcon text="Add your website, job post, or landing page URL for better context." />
                        </span>
                        <input
                          value={website}
                          onChange={(e) => setWebsite(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                      </label>
                    </div>

                    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-700">File</p>
                        <p className="truncate text-xs text-slate-500">
                          {attachmentName ? `Attached: ${attachmentName}` : "Optional brief/JD"}
                        </p>
                      </div>
                      <label
                        className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        title="Upload file"
                      >
                        <Paperclip size={14} />
                        Upload
                        <input type="file" onChange={handleAttachmentChange} className="hidden" />
                      </label>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <button
                onClick={() => setChatOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">Description Chat</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {chatOpen ? "Expanded" : "Collapsed"} (click to toggle)
                  </p>
                </div>
                <span className="rounded-lg border border-slate-300 p-1.5 text-slate-600">
                  {chatOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </span>
              </button>
              {chatOpen ? (
                <div className="border-t border-slate-200">
                  <ChatBox messages={chatMessages} onSend={handleAskAi} loading={askLoading} />
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-5 xl:col-span-4">
            <MarketingAnalysisOutput
              campaignId={campaignId}
              company={company}
              campaign={campaign}
              website={website}
              description={latestUserMessage}
              attachmentName={attachmentName}
            />

            <SuggestionsPanel marketingPlan={marketingPlan} selectedStepIds={selectedStepIds} onToggleStep={handleToggleStep} loading={askLoading} />

            <NextBestActions actions={renderedActions} selectedActions={selectedActions} onToggle={handleToggleAction} onGenerate={() => handleGenerateContent()} loading={generateLoading} />

            {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
            {sendSuccess ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{sendSuccess}</div> : null}

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
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">Select one or more actions to render output cards.</div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <SendModal open={sendModalOpen} channel={sendTarget.channel} content={sendTarget.content} campaignName={campaign} sending={sendLoading} onClose={() => setSendModalOpen(false)} onSubmit={handleSubmitSend} />
    </main>
  );
}
