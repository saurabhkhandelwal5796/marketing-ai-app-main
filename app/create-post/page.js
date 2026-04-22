"use client";

import { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, Camera, ChevronDown, ChevronUp, FileText, Mail, MessageCircle, Megaphone, Send, Sparkles, Pencil, Copy } from "lucide-react";

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

function LoadingSpinner({ size = "h-4 w-4" }) {
  return <span className={`inline-block animate-spin rounded-full border-2 border-white/35 border-t-white ${size}`} />;
}

export default function CreatePostPage() {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
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
  const [linkedinConnectedAccount, setLinkedinConnectedAccount] = useState("");
  const [checkingLinkedinStatus, setCheckingLinkedinStatus] = useState(false);

  const needsRecipients = useMemo(
    () => selectedTypes.some((type) => type === "email_campaign" || type === "newsletter"),
    [selectedTypes]
  );

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
          setLinkedinConnectedAccount(String(data?.connectedAccount || ""));
        }
      } catch {
        if (mounted) {
          setLinkedinConnected(false);
          setLinkedinConnectedAccount("");
        }
      } finally {
        if (mounted) setCheckingLinkedinStatus(false);
      }
    };
    loadLinkedinStatus();
    return () => {
      mounted = false;
    };
  }, []);

  const generateStrategy = async () => {
    if (!input.trim()) return;
    const isRefresh = suggestions.length > 0;
    setGeneratingSuggestions(true);
    setMessage("");
    
    try {
      const res = await fetch("/api/create-post/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input,
          refresh: isRefresh,
          previousSuggestionIds: suggestions.map((item) => item.id),
        }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to generate suggestions.");
      
      const suggestedList = data.suggestions || [];
      setSuggestions(suggestedList);
      // Strategy generation should only refresh suggestions.
      // Platform selection and content generation happen after explicit confirmation.
      setSelectedTypes([]);
      setActiveType("");
      setContentByType({});
      setImagePrompt(input.trim());
      setMessage(isRefresh ? "Platform strategy updated with fresh suggestions." : "");
    } catch (e) {
      setMessage(e?.message || "Failed to generate strategy.");
    } finally {
      setGeneratingSuggestions(false);
    }
  };

  const regenerateActiveContent = async () => {
    if (!input.trim() || !activeType) return;
    setGeneratingContent(true);
    setMessage("");
    try {
      const res2 = await fetch("/api/create-post/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, selectedTypes: [activeType] }),
      });
      const data2 = await res2.json();
      if (!res2.ok || data2?.error) throw new Error(data2?.error || "Failed to regenerate content.");
      const next = { ...contentByType };
      (data2.contents || []).forEach((item) => {
        const hashtagsText = Array.isArray(item.hashtags) && item.hashtags.length ? `\n\n${item.hashtags.join(" ")}` : "";
        next[item.typeId] = {
          typeLabel: item.typeLabel,
          content: `${item.main || ""}${hashtagsText}`.trim(),
          subject: item.subject || "",
          imageUrl: contentByType[item.typeId]?.imageUrl || "",
        };
      });
      setContentByType(next);
    } catch (e) {
      setMessage(e?.message || "Failed to regenerate.");
    } finally {
      setGeneratingContent(false);
    }
  };

  const generateContentForSelectedTypes = async () => {
    if (!input.trim() || selectedTypes.length === 0) return;
    setGeneratingContent(true);
    setMessage("");
    try {
      const res2 = await fetch("/api/create-post/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, selectedTypes }),
      });
      const data2 = await res2.json();
      if (!res2.ok || data2?.error) throw new Error(data2?.error || "Failed to generate content.");

      const next = { ...contentByType };
      (data2.contents || []).forEach((item) => {
        const hashtagsText = Array.isArray(item.hashtags) && item.hashtags.length ? `\n\n${item.hashtags.join(" ")}` : "";
        next[item.typeId] = {
          typeLabel: item.typeLabel,
          content: `${item.main || ""}${hashtagsText}`.trim(),
          subject: item.subject || "",
          imageUrl: contentByType[item.typeId]?.imageUrl || "",
        };
      });
      setContentByType(next);
      if (!selectedTypes.includes(activeType)) {
         setActiveType(selectedTypes[0] || "");
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

  const removeRecipient = (emailToRemove) => {
    if (recipientEmails.includes(emailToRemove)) {
      removeManualRecipient(emailToRemove);
      return;
    }
    const matchingUser = users.find((u) => normalizeEmail(u.email) === emailToRemove);
    if (matchingUser) {
      updateSelectedUsers(matchingUser.id, false);
      return;
    }
    syncDrafts(allRecipients.filter((email) => email !== emailToRemove), baseEmailSubject, baseEmailBody);
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

  const handleLinkedinConnect = () => {
    if (linkedinConnected) return;
    window.location.href = "/api/linkedin/connect";
  };

  return (
    <main className="min-h-full bg-[#F8FAFC] p-6 lg:p-8">
      {message && (
        <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-700 shadow-sm transition-all">
          {message}
        </div>
      )}

      <div className="mx-auto flex max-w-[1400px] flex-col gap-6 lg:flex-row">
        {/* LEFT SIDE (65%) */}
        <div className="flex w-full flex-col gap-6 lg:w-[65%]">
           
           {/* A. Creative Input Card */}
           <section className="group relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md">
             <h2 className="text-lg font-semibold text-slate-900">Campaign Goal</h2>
             <textarea
               value={input}
               onChange={(e) => setInput(e.target.value)}
               rows={4}
               placeholder="Describe your campaign goal..."
               className="mt-3 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition-all focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
             />
             <p className="mt-2 text-xs text-slate-400">AI Hint: Be specific about your target audience and key messaging.</p>
             
             <div className="mt-4 flex flex-col justify-between gap-4 border-t border-slate-100 pt-4 sm:flex-row sm:items-center">
                <div className="flex flex-wrap gap-2">
                   <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">Professional</span>
                   <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">Omnichannel</span>
                </div>
                <button
                   onClick={generateStrategy}
                   disabled={generatingSuggestions || generatingContent || !input.trim()}
                   className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:scale-[0.98] hover:bg-indigo-700 hover:shadow-md disabled:opacity-50 sm:w-auto"
                >
                   {generatingSuggestions || generatingContent ? <LoadingSpinner /> : <Sparkles size={16} />}
                   {suggestions.length > 0 ? "Update Strategy" : "Generate Strategy"}
                </button>
             </div>
           </section>

           {/* B. AI Strategy / Platform Suggestions */}
           <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md">
             <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Platform Strategy</h2>
                {suggestions.length > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200"><Sparkles size={12} /> AI Optimized</span>}
             </div>
             <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
               {suggestions.length > 0 ? suggestions.map(item => {
                   const meta = PLATFORM_META[item.id] || { label: item.id, Icon: Sparkles, color: "text-slate-600" };
                   const Icon = meta.Icon;
                   const selected = selectedTypes.includes(item.id);
                   return (
                     <button
                       key={item.id}
                       onClick={() => toggleType(item.id)}
                       className={`group relative flex flex-col items-start rounded-xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                         selected ? "border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600/20" : "border-slate-200 bg-white hover:border-slate-300"
                       }`}
                     >
                       <div className="flex w-full items-start justify-between">
                         <div className={`rounded-lg p-2 ${selected ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"}`}>
                           <Icon size={18} className={selected ? "text-indigo-700" : meta.color} />
                         </div>
                         <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                           92% Match
                         </span>
                       </div>
                       <p className="mt-3 text-sm font-semibold text-slate-900">{item.label}</p>
                       <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.hint}</p>
                     </button>
                   );
               }) : (
                 [1, 2, 3].map(i => (
                   <div key={i} className="flex flex-col items-start rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 opacity-60">
                     <div className="h-8 w-8 rounded-lg bg-slate-200"></div>
                     <div className="mt-3 h-4 w-20 rounded bg-slate-200"></div>
                     <div className="mt-1 h-3 w-full rounded bg-slate-200"></div>
                   </div>
                 ))
               )}
             </div>
             {suggestions.length > 0 && (
               <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
                 <button
                   onClick={generateContentForSelectedTypes}
                   disabled={generatingContent || selectedTypes.length === 0}
                   className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 hover:shadow-md disabled:opacity-50"
                 >
                  {generatingContent ? <LoadingSpinner /> : null}
                  {generatingContent ? "Generating..." : "Confirm Platforms & Generate"}
                 </button>
               </div>
             )}
           </section>

           {/* C. Content Editor */}
           <section className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 ${Object.keys(contentByType).length > 0 ? "opacity-100 hover:shadow-md" : "pointer-events-none opacity-50"}`}>
             <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
               <div className="flex items-center gap-3">
                 <h2 className="text-lg font-semibold text-slate-900">Generated Content</h2>
                 {activeType && contentByType[activeType] && (
                   <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200">
                      <Sparkles size={12} /> High engagement potential
                   </span>
                 )}
               </div>
               {activeType && contentByType[activeType] && (
                 <button
                   onClick={() => {
                     const isEmail = activeType === "email_campaign" || activeType === "newsletter";
                     const subject = contentByType[activeType]?.subject;
                     const body = contentByType[activeType]?.content || "";
                     const textToCopy = isEmail && subject ? `Subject: ${subject}\n\n${body}` : body;
                     navigator.clipboard.writeText(textToCopy);
                     setMessage("Content copied to clipboard.");
                   }}
                   className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                 >
                   <Copy size={14} className="text-slate-500" />
                   Copy
                 </button>
               )}
             </div>
             
             {/* Tabs */}
             <div className="mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {selectedTypes.length > 0 ? selectedTypes.map(typeId => {
                  const meta = PLATFORM_META[typeId] || { label: typeId, Icon: FileText, color: "text-slate-600" };
                  const Icon = meta.Icon;
                  return (
                     <button
                       key={typeId}
                       onClick={() => setActiveType(typeId)}
                       className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                         activeType === typeId ? "bg-slate-900 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                       }`}
                     >
                       <Icon size={14} className={activeType === typeId ? "text-white" : meta.color} />
                       {meta.label}
                     </button>
                  )
                }) : (
                  <div className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-400">
                     No platform selected
                  </div>
                )}
             </div>

             {/* Editor Area */}
             <div className="mt-4 flex flex-col rounded-xl border border-slate-200 bg-slate-50 p-3">
                {activeType && contentByType[activeType] ? (
                  <>
                    {(activeType === "email_campaign" || activeType === "newsletter") && (
                      <input
                        value={contentByType[activeType].subject}
                        onChange={(e) => setContentByType(prev => ({...prev, [activeType]: {...prev[activeType], subject: e.target.value}}))}
                        placeholder="Email Subject"
                        className="mb-2 w-full rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-400"
                      />
                    )}
                    <textarea
                      value={contentByType[activeType].content}
                      onChange={(e) => setContentByType(prev => ({...prev, [activeType]: {...prev[activeType], content: e.target.value}}))}
                      rows={14}
                      className="w-full resize-none bg-transparent px-2 py-1 text-sm text-slate-800 outline-none"
                    />
                  </>
                ) : (
                  <div className="flex h-72 items-center justify-center text-sm font-medium text-slate-400">
                    Content will appear here...
                  </div>
                )}
             </div>
           </section>
        </div>

        {/* RIGHT SIDE (35%) */}
        <div className="flex w-full flex-col gap-6 lg:w-[35%]">
           {/* E. Predictive Performance Card */}
           <section className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-white p-5 shadow-sm">
             <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 shadow-inner">
                   <Sparkles size={20} />
                </div>
                <div>
                   <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Predicted Performance</p>
                   <p className="text-sm font-bold text-indigo-700">Top 5% Engagement Rate</p>
                </div>
             </div>
           </section>

           {/* D. AI Image Generator Card */}
           <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 ${activeType ? "opacity-100" : "pointer-events-none opacity-50"}`}>
             <h2 className="text-base font-semibold text-slate-900">Visual Assets</h2>
             <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {activeType && contentByType[activeType]?.imageUrl ? (
                   // eslint-disable-next-line @next/next/no-img-element
                   <img src={contentByType[activeType].imageUrl} alt="Generated asset" className="h-[240px] w-full object-cover" />
                ) : (
                   <div className="flex h-[240px] flex-col items-center justify-center gap-2 text-slate-400">
                      <Camera size={32} className="opacity-40" />
                      <span className="text-xs font-medium">No visual generated</span>
                   </div>
                )}
             </div>
             <div className="mt-4 space-y-3">
                <div className="relative">
                   <input
                     value={imagePrompt}
                     onChange={(e) => setImagePrompt(e.target.value)}
                     placeholder="Describe the image..."
                     className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 pr-8 text-sm outline-none transition-all focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                   />
                   <Pencil size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                   <span onClick={() => setImagePrompt("Minimalistic, clean layout, corporate")} className="shrink-0 cursor-pointer rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-50">Minimal</span>
                   <span onClick={() => setImagePrompt("Professional corporate setting, high quality")} className="shrink-0 cursor-pointer rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-50">Corporate</span>
                   <span onClick={() => setImagePrompt("Futuristic tech background, glowing lights")} className="shrink-0 cursor-pointer rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-50">Futuristic</span>
                </div>
                <button
                   onClick={generateImageForActiveType}
                   disabled={generatingImageForType === activeType || !activeType}
                   className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:scale-[0.98] disabled:opacity-50"
                >
                   <span className="inline-flex items-center gap-2">
                    {activeType && generatingImageForType === activeType ? <LoadingSpinner /> : null}
                    {activeType && generatingImageForType === activeType ? "Generating Image..." : "Generate Image"}
                   </span>
                </button>
             </div>
           </section>

           {/* F. Quick Actions Panel */}
           <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 ${activeType && contentByType[activeType] ? "opacity-100" : "pointer-events-none opacity-50"}`}>
             <h2 className="mb-4 text-base font-semibold text-slate-900">Quick Actions</h2>
             <div className="flex flex-col gap-2.5">
                <button 
                   onClick={regenerateActiveContent}
                   disabled={generatingContent}
                   className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50"
                >
                   {generatingContent ? (
                     <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
                   ) : (
                     <Sparkles size={16} className="text-indigo-600" />
                   )}
                   {generatingContent ? "Regenerating..." : "Regenerate Text"}
                </button>
                
                <div className="my-1 border-t border-slate-100"></div>

                {activeType === "linkedin_post" && (
                   <>
                     <button
                        onClick={() => submitPostAction("post_linkedin")}
                        disabled={submittingPost || checkingLinkedinStatus || !linkedinConnected}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:scale-[0.98] hover:bg-blue-700 hover:shadow-md disabled:opacity-50"
                     >
                        <Send size={16} />
                        Post on LinkedIn
                     </button>
                     <button
                        onClick={handleLinkedinConnect}
                        disabled={checkingLinkedinStatus || linkedinConnected}
                        className={`flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold shadow-sm transition-all disabled:opacity-70 ${
                          linkedinConnected
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                     >
                        <BriefcaseBusiness size={16} />
                        {linkedinConnected ? "LinkedIn Connected" : "Connect LinkedIn"}
                     </button>
                     <p className="text-xs text-slate-500">
                        {linkedinConnected
                          ? `Connected account: ${linkedinConnectedAccount || "LinkedIn profile"}`
                          : "No LinkedIn account connected."}
                     </p>
                   </>
                )}
                
                {activeType === "instagram_post" && (
                   <button
                      onClick={() => submitPostAction("post_instagram")}
                      disabled={submittingPost}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-pink-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:scale-[0.98] hover:bg-pink-700 hover:shadow-md disabled:opacity-50"
                   >
                      <Send size={16} />
                      Post on Instagram
                   </button>
                )}

                {(activeType === "email_campaign" || activeType === "newsletter") && (
                   <button
                      onClick={openEmailPopup}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:scale-[0.98] hover:bg-slate-800 hover:shadow-md"
                   >
                      <Mail size={16} />
                      Configure Email Campaign
                   </button>
                )}

                {/* Generic publish fallback for other platforms */}
                {activeType && activeType !== "linkedin_post" && activeType !== "instagram_post" && activeType !== "email_campaign" && activeType !== "newsletter" && (
                   <button
                      onClick={() => submitPostAction(`post_${activeType}`)}
                      disabled={submittingPost}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:scale-[0.98] hover:bg-slate-800 hover:shadow-md disabled:opacity-50"
                   >
                      <Send size={16} />
                      Publish Content
                   </button>
                )}

             </div>
           </section>
        </div>
      </div>

      {showEmailPopup ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="flex h-full max-h-[90vh] w-full max-w-6xl flex-col space-y-3 rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-semibold text-slate-900">Email Campaign Setup</h3>
              <button onClick={() => setShowEmailPopup(false)} className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-800">
                Close
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={async () => {
                    await preparePostData();
                    setShowUsersPanel((prev) => !prev);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
                >
                  {showUsersPanel ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  Select Users
                </button>
                <div className="relative w-full max-w-md">
                   <input
                     value={recipientInput}
                     onChange={(e) => setRecipientInput(e.target.value)}
                     onKeyDown={(e) => {
                       if (e.key === "Enter") {
                         e.preventDefault();
                         addRecipientEmail();
                       }
                     }}
                     placeholder="Add email manually..."
                     className="w-full rounded-lg border border-slate-300 px-4 py-2 pr-16 text-sm outline-none transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                   />
                   <button
                     onClick={addRecipientEmail}
                     className="absolute right-1 top-1 rounded-md bg-slate-900 px-3 py-1 text-xs font-semibold text-white transition-all hover:bg-slate-800"
                   >
                     Add
                   </button>
                </div>
              </div>
              {recipientEmails.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {recipientEmails.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm"
                    >
                      {email}
                      <button
                        onClick={() => removeManualRecipient(email)}
                        className="font-bold text-slate-400 transition-colors hover:text-red-500"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}

              {showUsersPanel ? (
                <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <input
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search users by name or email..."
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-sm outline-none transition-all focus:border-indigo-400 focus:bg-white"
                  />
                  <div className="max-h-56 overflow-y-auto pr-2">
                    <div className="space-y-2">
                      {filteredUsers.map((u) => (
                        <label key={u.id} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-100 p-3 transition-colors hover:bg-slate-50">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{u.name}</p>
                            <p className="text-xs text-slate-500">{u.email}</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={selectedUserRecipients.includes(u.id)}
                            onChange={(e) => updateSelectedUsers(u.id, e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-12">
              <div className="flex flex-col rounded-xl border border-slate-200 bg-slate-50 p-4 lg:col-span-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Selected Recipients</p>
                <div className="flex-1 overflow-y-auto pr-1 space-y-1.5">
                  {allRecipients.length ? (
                    allRecipients.map((email) => (
                      <div
                        key={email}
                        className={`group flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-all ${
                          activeRecipient === email 
                          ? "border-indigo-200 bg-indigo-50 text-indigo-800 shadow-sm" 
                          : "border-transparent bg-white text-slate-600 hover:border-slate-200 hover:shadow-sm"
                        }`}
                      >
                        <button
                          onClick={() => setActiveRecipient(email)}
                          className="min-w-0 flex-1 text-left font-medium"
                        >
                          <span className="block truncate">{email}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeRecipient(email)}
                          className="ml-2 rounded p-1 text-slate-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                        >
                          ×
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-400">
                      No recipients selected
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 lg:col-span-8 shadow-sm">
                <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                   <p className="text-sm font-semibold text-slate-800">
                     {activeRecipient ? (
                        <>Editing email for <span className="text-indigo-600">{activeRecipient}</span></>
                     ) : "Select a recipient to personalize"}
                   </p>
                </div>
                
                <div className="space-y-4">
                   <div>
                     <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Subject</label>
                     <input
                       disabled={!activeRecipient}
                       value={activeRecipient ? recipientDrafts[activeRecipient]?.subject ?? baseEmailSubject : ""}
                       onChange={(e) => updateRecipientDraft(activeRecipient, { subject: e.target.value })}
                       className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100 disabled:opacity-60"
                     />
                   </div>
                   
                   <div className="flex-1">
                     <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Email Body</label>
                     <textarea
                       rows={12}
                       disabled={!activeRecipient}
                       value={activeRecipient ? recipientDrafts[activeRecipient]?.body ?? baseEmailBody : ""}
                       onChange={(e) => updateRecipientDraft(activeRecipient, { body: e.target.value })}
                       className="w-full resize-none rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100 disabled:opacity-60"
                     />
                   </div>
                </div>

                <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                     <Sparkles size={16} className="text-indigo-600" />
                     <p className="text-xs font-bold uppercase tracking-wider text-indigo-900">AI Personalization</p>
                  </div>
                  <div className="flex gap-3">
                    <input
                      value={aiPromptForRecipient}
                      onChange={(e) => setAiPromptForRecipient(e.target.value)}
                      placeholder="e.g., Make it more formal, emphasize Q3 goals..."
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                    />
                    <button
                      onClick={rewriteRecipientEmailWithAI}
                      disabled={!activeRecipient || !aiPromptForRecipient.trim() || aiEditingRecipient}
                      className="whitespace-nowrap rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 disabled:opacity-50"
                    >
                      <span className="inline-flex items-center gap-2">
                        {aiEditingRecipient ? <LoadingSpinner /> : null}
                        {aiEditingRecipient ? "Applying..." : "Apply AI Edit"}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                   <button
                     onClick={saveDraftForRecipient}
                     disabled={!activeRecipient || savingRecipientDraft}
                     className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-50"
                   >
                     {savingRecipientDraft ? "Saving..." : "Save Draft"}
                   </button>
                </div>
              </div>
            </div>

            <div className="pt-2">
               <button
                 onClick={() => submitPostAction("send_all")}
                 disabled={submittingPost || allRecipients.length === 0}
                 className="w-full rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:scale-[0.99] hover:bg-indigo-700 hover:shadow-lg disabled:opacity-50"
               >
                 {submittingPost ? "Sending Campaign..." : `Send to ${allRecipients.length} Recipient${allRecipients.length !== 1 ? 's' : ''}`}
               </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
