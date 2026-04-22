"use client";

import { useEffect, useMemo, useState } from "react";
import { trackAction } from "../lib/auditTracker";
import { useAuditPageVisit, useAuditSessionUserId } from "../lib/useAuditPageVisit";
import { BriefcaseBusiness, Camera, ChevronDown, ChevronUp, FileText, Mail, MessageCircle, Megaphone, Send, Sparkles } from "lucide-react";

const LS_AUTO_KEY = "autoGeneratePostContent";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

const PLATFORM_META = {
  linkedin_post: { label: "LinkedIn", Icon: BriefcaseBusiness, color: "text-blue-700" },
  instagram_post: { label: "Instagram", Icon: Camera, color: "text-pink-600" },
  email_campaign: { label: "Email", Icon: Mail, color: "text-slate-700" },
  newsletter: { label: "Newsletter", Icon: FileText, color: "text-indigo-600" },
  ad_copy: { label: "Ad Copy", Icon: Megaphone, color: "text-orange-600" },
  blog_post: { label: "Blog", Icon: FileText, color: "text-emerald-700" },
  whatsapp_message: { label: "WhatsApp", Icon: MessageCircle, color: "text-green-600" },
};

/**
 * @param {{ initialInput?: string; embedded?: boolean }} props
 * - `embedded`: opened inside another overlay (e.g. campaign modal); skips localStorage bootstrap and uses `initialInput`.
 * - Standalone `/create-post` reads `localStorage` key `autoGeneratePostContent` once on mount when not embedded.
 */
export default function CreatePostPage({ initialInput = "", embedded = false }) {
  const auditUserId = useAuditSessionUserId();
  useAuditPageVisit(embedded ? null : auditUserId, "Create & Post");

  const [input, setInput] = useState(() => (embedded ? String(initialInput || "") : ""));
  const [suggestions, setSuggestions] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [hasSubmittedInput, setHasSubmittedInput] = useState(false);
  const [hasSubmittedPlatforms, setHasSubmittedPlatforms] = useState(false);
  const [generatingSuggestions, setGeneratingSuggestions] = useState(false);
  const [generatingContent, setGeneratingContent] = useState(false);
  const [activeType, setActiveType] = useState("");
  const [contentByType, setContentByType] = useState({});
  const [message, setMessage] = useState("");
  const [users, setUsers] = useState([]);
  const [recipientEmails, setRecipientEmails] = useState([]);
  const [recipientInput, setRecipientInput] = useState("");
  const [selectedUserRecipients, setSelectedUserRecipients] = useState([]);
  const [submittingPost, setSubmittingPost] = useState(false);
  const [showEmailPopup, setShowEmailPopup] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [generatingImageForType, setGeneratingImageForType] = useState("");
  const [showUsersPanel, setShowUsersPanel] = useState(false);
  const [activeRecipient, setActiveRecipient] = useState("");
  const [recipientDrafts, setRecipientDrafts] = useState({});
  const [userSearch, setUserSearch] = useState("");
  const [savingRecipientDraft, setSavingRecipientDraft] = useState(false);
  const [aiPromptForRecipient, setAiPromptForRecipient] = useState("");
  const [aiEditingRecipient, setAiEditingRecipient] = useState(false);
  const [linkedinConnected, setLinkedinConnected] = useState(false);
  const [checkingLinkedinStatus, setCheckingLinkedinStatus] = useState(false);

  const selectedUserEmails = useMemo(
    () => users.filter((u) => selectedUserRecipients.includes(u.id)).map((u) => normalizeEmail(u.email)),
    [users, selectedUserRecipients]
  );
  const allRecipients = useMemo(() => [...new Set([...recipientEmails, ...selectedUserEmails])], [recipientEmails, selectedUserEmails]);

  const baseEmailType = contentByType.email_campaign ? "email_campaign" : contentByType.newsletter ? "newsletter" : "";
  const baseEmailSubject = baseEmailType ? contentByType[baseEmailType].subject || "" : "";
  const baseEmailBody = baseEmailType ? contentByType[baseEmailType].content || "" : "";
  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    if (!query) return users;
    return users.filter(
      (u) =>
        String(u?.name || "").toLowerCase().includes(query) ||
        String(u?.email || "").toLowerCase().includes(query)
    );
  }, [users, userSearch]);

  const syncDrafts = (recipients, subject, body) => {
    setRecipientDrafts((prev) => {
      const next = { ...prev };
      recipients.forEach((email) => {
        next[email] = prev[email] || { subject, body };
      });
      return next;
    });
    setActiveRecipient((prev) => (prev && recipients.includes(prev) ? prev : recipients[0] || ""));
  };

  useEffect(() => {
    let mounted = true;
    const loadLinkedinStatus = async () => {
      setCheckingLinkedinStatus(true);
      try {
        const res = await fetch("/api/linkedin/status");
        const data = await res.json();
        if (mounted) {
          setLinkedinConnected(!!data?.connected);
        }
      } catch {
        if (mounted) setLinkedinConnected(false);
      } finally {
        if (mounted) setCheckingLinkedinStatus(false);
      }
    };
    loadLinkedinStatus();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (embedded) {
      setInput(String(initialInput || ""));
      return;
    }
    try {
      const v = localStorage.getItem(LS_AUTO_KEY);
      if (v) {
        setInput(v);
        localStorage.removeItem(LS_AUTO_KEY);
      }
    } catch {
      // ignore
    }
  }, [embedded, initialInput]);

  const generateSuggestions = async () => {
    if (!input.trim()) return;
    setGeneratingSuggestions(true);
    setMessage("");
    setHasSubmittedInput(false);
    setHasSubmittedPlatforms(false);
    setSuggestions([]);
    setSelectedTypes([]);
    setContentByType({});
    setActiveType("");
    try {
      const res = await fetch("/api/create-post/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to generate suggestions.");
      setSuggestions(data.suggestions || []);
      setSelectedTypes(data.preselected || []);
      setHasSubmittedInput(true);
    } catch (e) {
      setMessage(e?.message || "Failed to generate suggestions.");
    } finally {
      setGeneratingSuggestions(false);
    }
  };

  const submitPlatforms = async () => {
    if (selectedTypes.length === 0) return;
    setGeneratingContent(true);
    setMessage("");
    try {
      const res = await fetch("/api/create-post/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, selectedTypes }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to generate content.");

      const next = {};
      (data.contents || []).forEach((item) => {
        const hashtagsText = Array.isArray(item.hashtags) && item.hashtags.length ? `\n\n${item.hashtags.join(" ")}` : "";
        next[item.typeId] = {
          typeLabel: item.typeLabel,
          content: `${item.main || ""}${hashtagsText}`.trim(),
          subject: item.subject || "",
          imageUrl: "",
        };
      });
      setContentByType(next);
      const first = selectedTypes[0] || "";
      setActiveType(first);
      setImagePrompt(input.trim());
      setHasSubmittedPlatforms(true);
      if (auditUserId) {
        trackAction(auditUserId, "Generated Post", embedded ? "Campaign" : "Create & Post", {
          types: selectedTypes,
        });
      }
    } catch (e) {
      setMessage(e?.message || "Failed to generate content.");
    } finally {
      setGeneratingContent(false);
    }
  };

  const generateImageForActiveType = async () => {
    if (!activeType) return;
    const prompt = imagePrompt.trim() || contentByType[activeType]?.content || input;
    if (!prompt) return;
    setGeneratingImageForType(activeType);
    try {
      const mediaRes = await fetch("/api/create-post/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, count: 1 }),
      });
      const mediaData = await mediaRes.json();
      if (!mediaRes.ok || mediaData?.error) throw new Error(mediaData?.error || "Failed to generate image.");
      setContentByType((prev) => ({
        ...prev,
        [activeType]: {
          ...prev[activeType],
          imageUrl: mediaData?.media?.[0]?.url || "",
        },
      }));
    } catch (e) {
      setMessage(e?.message || "Failed to generate image.");
    } finally {
      setGeneratingImageForType("");
    }
  };

  const toggleType = (typeId) => {
    setSelectedTypes((prev) => (prev.includes(typeId) ? prev.filter((id) => id !== typeId) : [...prev, typeId]));
  };

  const preparePostData = async () => {
    if (users.length === 0) {
      const res = await fetch("/api/meetings/users");
      const data = await res.json();
      setUsers(Array.isArray(data?.users) ? data.users : []);
    }
  };

  const addRecipientEmail = () => {
    const email = normalizeEmail(recipientInput);
    if (!isEmail(email)) return;
    const nextRecipients = [...new Set([...recipientEmails, email])];
    setRecipientEmails(nextRecipients);
    setRecipientInput("");
    syncDrafts([...new Set([...nextRecipients, ...selectedUserEmails])], baseEmailSubject, baseEmailBody);
  };

  const removeManualRecipient = (emailToRemove) => {
    const nextRecipients = recipientEmails.filter((email) => email !== emailToRemove);
    setRecipientEmails(nextRecipients);
    syncDrafts([...new Set([...nextRecipients, ...selectedUserEmails])], baseEmailSubject, baseEmailBody);
  };

  const updateSelectedUsers = (userId, checked) => {
    const next = checked ? [...selectedUserRecipients, userId] : selectedUserRecipients.filter((id) => id !== userId);
    setSelectedUserRecipients(next);
    const emails = users.filter((u) => next.includes(u.id)).map((u) => normalizeEmail(u.email));
    syncDrafts([...new Set([...recipientEmails, ...emails])], baseEmailSubject, baseEmailBody);
  };

  const openEmailPopup = async () => {
    await preparePostData();
    syncDrafts(allRecipients, baseEmailSubject, baseEmailBody);
    setShowEmailPopup(true);
  };

  const updateRecipientDraft = (email, patch) => {
    setRecipientDrafts((prev) => ({
      ...prev,
      [email]: {
        subject: prev[email]?.subject ?? baseEmailSubject,
        body: prev[email]?.body ?? baseEmailBody,
        ...patch,
      },
    }));
  };

  const saveDraftForRecipient = async () => {
    if (!activeRecipient) return;
    setSavingRecipientDraft(true);
    setMessage("");
    try {
      const draft = recipientDrafts[activeRecipient] || { subject: baseEmailSubject, body: baseEmailBody };
      const res = await fetch("/api/create-post/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "save_draft",
          selectedTypes: ["email_campaign"],
          recipients: [activeRecipient],
          recipientDrafts: { [activeRecipient]: draft },
        }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to save draft.");
      setMessage(`Draft saved for ${activeRecipient}.`);
    } catch (e) {
      setMessage(e?.message || "Failed to save draft.");
    } finally {
      setSavingRecipientDraft(false);
    }
  };

  const rewriteRecipientEmailWithAI = async () => {
    if (!activeRecipient) return;
    const prompt = aiPromptForRecipient.trim();
    if (!prompt) return;
    setAiEditingRecipient(true);
    setMessage("");
    try {
      const current = recipientDrafts[activeRecipient] || { subject: baseEmailSubject, body: baseEmailBody };
      const aiInput = `${prompt}\n\nCurrent subject: ${current.subject}\nCurrent email body:\n${current.body}\n\nRewrite for recipient: ${activeRecipient}`;
      const res = await fetch("/api/create-post/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: aiInput, selectedTypes: ["email_campaign"] }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "AI edit failed.");
      const generated = data?.contents?.[0];
      if (!generated) throw new Error("AI did not return updated email.");
      updateRecipientDraft(activeRecipient, {
        subject: generated.subject || current.subject,
        body: generated.main || current.body,
      });
      setAiPromptForRecipient("");
      setMessage(`AI updated email for ${activeRecipient}.`);
    } catch (e) {
      setMessage(e?.message || "Failed to update email with AI.");
    } finally {
      setAiEditingRecipient(false);
    }
  };

  const submitPostAction = async (mode) => {
    setSubmittingPost(true);
    setMessage("");
    try {
      const res = await fetch("/api/create-post/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          selectedTypes,
          recipients: allRecipients,
          contentByType,
          recipientDrafts,
        }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) {
        if (data?.connectRequired && data?.connectUrl) {
          setMessage("Please connect your LinkedIn account first.");
          window.location.href = data.connectUrl;
          return;
        }
        throw new Error(data?.error || "Action failed.");
      }
      if (mode === "post_linkedin") setLinkedinConnected(true);
      setMessage(data.message || "Done.");
    } catch (e) {
      setMessage(e?.message || "Failed to process request.");
    } finally {
      setSubmittingPost(false);
    }
  };

  const emailOverlayZ = embedded ? "z-[110]" : "z-50";

  return (
    <main className="space-y-5 p-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">Create & Post</h1>
        <p className="mt-1 text-sm text-slate-500">
          Describe your requirement, get AI platform suggestions, generate content, then post or send.
        </p>
        {message ? <p className="mt-3 text-sm text-slate-700">{message}</p> : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Input</h2>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={5}
          placeholder="I want a LinkedIn post for our product launch..."
          className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm"
        />
        <button
          onClick={generateSuggestions}
          disabled={generatingSuggestions || !input.trim()}
          className="mt-3 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {generatingSuggestions ? "Submitting..." : "Submit"}
        </button>
      </section>

      {hasSubmittedInput ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Platform Suggestions</h2>
          <p className="mt-1 text-sm text-slate-500">Select one or more suggested platforms, then submit to continue.</p>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {suggestions.map((item) => {
              const meta = PLATFORM_META[item.id];
              const Icon = meta?.Icon;
              const selected = selectedTypes.includes(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => toggleType(item.id)}
                  className={`rounded-xl border p-4 text-left transition ${
                    selected ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {Icon ? <Icon size={16} className={meta.color} /> : null}
                    <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{item.hint}</p>
                </button>
              );
            })}
          </div>
          <button
            onClick={submitPlatforms}
            disabled={generatingContent || selectedTypes.length === 0}
            className="mt-4 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {generatingContent ? "Submitting..." : "Submit Platform Selection"}
          </button>
        </section>
      ) : null}

      {hasSubmittedPlatforms ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Generated Platform Content</h2>
          {selectedTypes.length === 0 || !activeType || !contentByType[activeType] ? (
            <p className="mt-3 text-sm text-slate-500">Select suggestions and click &quot;Create Content&quot; to continue.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
                {selectedTypes.map((typeId) => {
                  const meta = PLATFORM_META[typeId];
                  const Icon = meta?.Icon;
                  return (
                    <button
                      key={typeId}
                      onClick={() => setActiveType(typeId)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                        activeType === typeId ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        {Icon ? <Icon size={14} className={meta.color} /> : null}
                        {contentByType[typeId]?.typeLabel || meta?.label || typeId}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 p-3">
                {activeType === "email_campaign" || activeType === "newsletter" ? (
                  <>
                    <label className="block text-sm font-medium text-slate-700">
                      Subject
                      <input
                        value={contentByType[activeType].subject}
                        onChange={(e) =>
                          setContentByType((prev) => ({
                            ...prev,
                            [activeType]: { ...prev[activeType], subject: e.target.value },
                          }))
                        }
                        className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="mt-3 block text-sm font-medium text-slate-700">
                      Email Body
                      <textarea
                        rows={10}
                        value={contentByType[activeType].content}
                        onChange={(e) =>
                          setContentByType((prev) => ({
                            ...prev,
                            [activeType]: { ...prev[activeType], content: e.target.value },
                          }))
                        }
                        className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <div className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-white p-2">
                      {contentByType[activeType].imageUrl ? (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={contentByType[activeType].imageUrl}
                            alt={`${contentByType[activeType].typeLabel} generated visual`}
                            className="h-[420px] w-full rounded-lg object-contain"
                          />
                        </div>
                      ) : (
                        <div className="flex h-[420px] items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-500">
                          No image generated yet.
                        </div>
                      )}
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                          value={imagePrompt}
                          onChange={(e) => setImagePrompt(e.target.value)}
                          placeholder="Enter image prompt (e.g. campaign hero visual for this email)"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                        <button
                          onClick={generateImageForActiveType}
                          disabled={generatingImageForType === activeType}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
                        >
                          {generatingImageForType === activeType ? "Generating..." : "Generate Image"}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-slate-900">{contentByType[activeType].typeLabel} Post</p>
                    <div className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-white p-2">
                      {contentByType[activeType].imageUrl ? (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={contentByType[activeType].imageUrl}
                            alt={`${contentByType[activeType].typeLabel} generated visual`}
                            className="h-[420px] w-full rounded-lg object-contain"
                          />
                        </div>
                      ) : (
                        <div className="flex h-[420px] items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-500">
                          No image generated yet.
                        </div>
                      )}
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                          value={imagePrompt}
                          onChange={(e) => setImagePrompt(e.target.value)}
                          placeholder="Enter image prompt (e.g. modern product launch visual)"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                        <button
                          onClick={generateImageForActiveType}
                          disabled={generatingImageForType === activeType}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
                        >
                          {generatingImageForType === activeType ? "Generating..." : "Generate Image"}
                        </button>
                      </div>
                    </div>
                    <textarea
                      rows={10}
                      value={contentByType[activeType].content}
                      onChange={(e) =>
                        setContentByType((prev) => ({
                          ...prev,
                          [activeType]: { ...prev[activeType], content: e.target.value },
                        }))
                      }
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={submitPlatforms}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                  >
                    <Sparkles size={14} className="mr-1 inline" />
                    Regenerate
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(contentByType[activeType].content || "");
                      setMessage("Content copied.");
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                  >
                    Copy
                  </button>
                  {activeType === "linkedin_post" ? (
                    <button
                      onClick={() => submitPostAction("post_linkedin")}
                      disabled={submittingPost}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      <Send size={14} className="mr-1 inline" />
                      Post LinkedIn
                    </button>
                  ) : null}
                  {activeType === "linkedin_post" ? (
                    <button
                      onClick={() => {
                        window.location.href = "/api/linkedin/connect";
                      }}
                      className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700"
                    >
                      {checkingLinkedinStatus ? "Checking..." : linkedinConnected ? "Reconnect LinkedIn" : "Connect LinkedIn"}
                    </button>
                  ) : null}
                  {activeType === "instagram_post" ? (
                    <button
                      onClick={() => submitPostAction("post_instagram")}
                      disabled={submittingPost}
                      className="rounded-lg bg-pink-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      <Send size={14} className="mr-1 inline" />
                      Post Instagram
                    </button>
                  ) : null}
                  {activeType === "email_campaign" || activeType === "newsletter" ? (
                    <button
                      onClick={openEmailPopup}
                      className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      <Mail size={14} className="mr-1 inline" />
                      Open Email Popup
                    </button>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </section>
      ) : null}

      {showEmailPopup ? (
        <div className={`fixed inset-0 ${emailOverlayZ} bg-slate-900/40 p-4`}>
          <div className="mx-auto flex h-[calc(100vh-2rem)] w-full max-w-6xl flex-col space-y-3 rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Email Popup</h3>
              <button onClick={() => setShowEmailPopup(false)} className="text-sm text-slate-500">
                Close
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={async () => {
                    await preparePostData();
                    setShowUsersPanel((prev) => !prev);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                >
                  {showUsersPanel ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  Users
                </button>
                <input
                  value={recipientInput}
                  onChange={(e) => setRecipientInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addRecipientEmail();
                    }
                  }}
                  placeholder="Add email manually"
                  className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <button
                  onClick={addRecipientEmail}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                >
                  Add
                </button>
              </div>
              {recipientEmails.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {recipientEmails.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs text-slate-700"
                    >
                      {email}
                      <button
                        onClick={() => removeManualRecipient(email)}
                        className="font-semibold text-slate-500 hover:text-red-600"
                        title="Remove recipient"
                      >
                        x
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}

              {showUsersPanel ? (
                <div className="mt-3 space-y-2">
                  <input
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search users by name or email"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-200 p-2">
                    <div className="space-y-2">
                      {filteredUsers.map((u) => (
                        <label key={u.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                          <div>
                            <p className="font-medium text-slate-800">{u.name}</p>
                            <p className="text-xs text-slate-500">{u.email}</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={selectedUserRecipients.includes(u.id)}
                            onChange={(e) => updateSelectedUsers(u.id, e.target.checked)}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-12">
              <div className="rounded-xl border border-slate-200 p-3 lg:col-span-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected Recipients</p>
                <div className="mt-2 max-h-[42vh] space-y-1 overflow-y-auto pr-1">
                  {allRecipients.length ? (
                    allRecipients.map((email) => (
                      <button
                        key={email}
                        onClick={() => setActiveRecipient(email)}
                        className={`w-full rounded-lg px-2.5 py-2 text-left text-sm ${
                          activeRecipient === email ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50"
                        }`}
                      >
                        {email}
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No recipients selected.</p>
                  )}
                </div>
              </div>

              <div className="overflow-y-auto rounded-xl border border-slate-200 p-3 lg:col-span-8">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {activeRecipient ? `Editing email for ${activeRecipient}` : "Select a recipient to edit email"}
                </p>
                <label className="block text-sm font-medium text-slate-700">
                  Subject
                  <input
                    disabled={!activeRecipient}
                    value={activeRecipient ? recipientDrafts[activeRecipient]?.subject ?? baseEmailSubject : ""}
                    onChange={(e) => updateRecipientDraft(activeRecipient, { subject: e.target.value })}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-60"
                  />
                </label>
                <label className="mt-3 block text-sm font-medium text-slate-700">
                  Email Body
                  <textarea
                    rows={10}
                    disabled={!activeRecipient}
                    value={activeRecipient ? recipientDrafts[activeRecipient]?.body ?? baseEmailBody : ""}
                    onChange={(e) => updateRecipientDraft(activeRecipient, { body: e.target.value })}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-60"
                  />
                </label>
                <div className="mt-3 rounded-lg border border-slate-200 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">AI Edit</p>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={aiPromptForRecipient}
                      onChange={(e) => setAiPromptForRecipient(e.target.value)}
                      placeholder="e.g. Make it more formal and concise"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <button
                      onClick={rewriteRecipientEmailWithAI}
                      disabled={!activeRecipient || !aiPromptForRecipient.trim() || aiEditingRecipient}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
                    >
                      {aiEditingRecipient ? "Applying..." : "AI"}
                    </button>
                  </div>
                </div>
                <button
                  onClick={saveDraftForRecipient}
                  disabled={!activeRecipient || savingRecipientDraft}
                  className="mt-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
                >
                  {savingRecipientDraft ? "Saving..." : "Save as Draft"}
                </button>
              </div>
            </div>

            <button
              onClick={() => submitPostAction("send_all")}
              disabled={submittingPost || allRecipients.length === 0}
              className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              Send All
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
