"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  BriefcaseBusiness,
  Camera,
  ChevronDown,
  ChevronUp,
  FileText,
  Mail,
  MessageCircle,
  Megaphone,
  Send,
  Sparkles,
  Pencil,
  Copy,
  Clock,
  Plus,
  Trash2,
  Bookmark,
  Star,
  FileDown,
  Download,
  FolderOpen
} from "lucide-react";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

async function parseRecipientFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const emails = [];
        
        // Parse CSV or text-based formats
        const lines = text.split(/\r?\n/);
        lines.forEach(line => {
          // Match email patterns in the line
          const emailMatches = line.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
          if (emailMatches) {
            emails.push(...emailMatches.map(e => normalizeEmail(e)));
          }
        });
        
        resolve([...new Set(emails)].filter(isEmail));
      } catch (err) {
        reject(new Error(`Failed to parse file: ${err.message}`));
      }
    };
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsText(file);
  });
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

// export default function CreatePostPage() {
export default function CreatePostPage({ initialInput = "", embedded = false }) {

  // const [input, setInput] = useState("");
  const [input, setInput] = useState(() => String(initialInput || ""));

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
  const [instagramConnected, setInstagramConnected] = useState(false);
  const [instagramConnectedAccount, setInstagramConnectedAccount] = useState("");
  const [facebookConnected, setFacebookConnected] = useState(false);
  const [facebookConnectedAccount, setFacebookConnectedAccount] = useState("");
  const [outlookConnected, setOutlookConnected] = useState(false);
  const [outlookConnectedAccount, setOutlookConnectedAccount] = useState("");
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailConnectedAccount, setGmailConnectedAccount] = useState("");
  const [configuredProviders, setConfiguredProviders] = useState({});

  const formatAccountLabel = (val) => {
    if (!val) return "";
    if (val.includes("@")) {
      const [local, domain] = val.split("@");
      if (local.length > 5) {
        return `${local.slice(0, 5)}...@${domain}`;
      }
    }
    if (val.length > 15) {
      return val.slice(0, 15) + "...";
    }
    return val;
  };

  const loadIntegrationsStatus = async () => {
    try {
      const res = await fetch("/api/integrations/status");
      const data = await res.json();
      if (data && !data.error) {
        setLinkedinConnected(!!data.connections.linkedin?.connected);
        setLinkedinConnectedAccount(data.connections.linkedin?.displayName || data.connections.linkedin?.emailAddress || "");
        
        setInstagramConnected(!!data.connections.instagram?.connected);
        setInstagramConnectedAccount(data.connections.instagram?.displayName || "");
        
        setFacebookConnected(!!data.connections.facebook?.connected);
        setFacebookConnectedAccount(data.connections.facebook?.displayName || data.connections.facebook?.emailAddress || "");
        
        setOutlookConnected(!!data.connections.outlook?.connected);
        setOutlookConnectedAccount(data.connections.outlook?.displayName || data.connections.outlook?.emailAddress || "");
        
        setGmailConnected(!!data.connections.gmail?.connected);
        setGmailConnectedAccount(data.connections.gmail?.displayName || data.connections.gmail?.emailAddress || "");
        
        setConfiguredProviders(data.configured || {});
      }
    } catch (e) {
      console.error("Failed to load integrations status:", e);
    }
  };

  const handleConnectProvider = (provider) => {
    if (!configuredProviders[provider]) {
      setMessage("Integration Not Configured");
      return;
    }
    window.location.href = `/api/integrations/connect?provider=${provider}`;
  };

  const handleDisconnectProvider = async (provider) => {
    try {
      const res = await fetch("/api/integrations/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json();
      if (data?.success) {
        await loadIntegrationsStatus();
        setMessage(`${provider.charAt(0).toUpperCase() + provider.slice(1)} account disconnected successfully.`);
      } else {
        setMessage(data?.error || `Failed to disconnect ${provider}.`);
      }
    } catch (e) {
      setMessage(e.message || `Failed to disconnect ${provider}.`);
    }
  };

  const handleSendEmail = (contentObj, recipientEmail = null) => {
    let toVal = "";
    let subjectVal = "";
    let bodyVal = "";

    if (recipientEmail) {
      const draft = recipientDrafts[recipientEmail] || { subject: baseEmailSubject, body: baseEmailBody };
      toVal = recipientEmail;
      subjectVal = draft.subject || "";
      bodyVal = draft.body || "";
    } else {
      toVal = allRecipients.join(outlookConnected ? "; " : ",");
      subjectVal = contentObj?.subject || baseEmailSubject || "";
      bodyVal = contentObj?.content || baseEmailBody || "";
    }

    if (outlookConnected) {
      const subject = encodeURIComponent(subjectVal);
      const body = encodeURIComponent(bodyVal);
      const to = encodeURIComponent(toVal);
      const url = `https://outlook.office.com/mail/deeplink/compose?to=${to}&subject=${subject}&body=${body}`;
      window.open(url, "_blank");
    } else if (gmailConnected) {
      const subject = encodeURIComponent(subjectVal);
      const body = encodeURIComponent(bodyVal);
      const to = encodeURIComponent(toVal);
      const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}&body=${body}`;
      window.open(url, "_blank");
    } else {
      setMessage("Please connect Outlook or Gmail.");
    }
  };

  //Added below 7 lines
  const [useTemplate, setUseTemplate] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const [matchedTemplateName, setMatchedTemplateName] = useState("");
  const [activeEditorTab, setActiveEditorTab] = useState("all");
  const [drafts, setDrafts] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loadingRecentActivity, setLoadingRecentActivity] = useState(false);
  const [draftViewMode, setDraftViewMode] = useState("list");
  const [draftStatusFilter, setDraftStatusFilter] = useState("all");
  const [editingDraftId, setEditingDraftId] = useState(null);
  const [editDraftName, setEditDraftName] = useState("");
  const [editDraftContent, setEditDraftContent] = useState("");
  const [editDraftSubject, setEditDraftSubject] = useState("");
  const attachmentInputRef = useRef(null);
  const [recipientFile, setRecipientFile] = useState(null);
  const [recipientFileEmails, setRecipientFileEmails] = useState([]);
  const recipientFileInputRef = useRef(null);
  const strategyAbortRef = useRef(null);
  const contentAbortRef = useRef(null);
  const imageAbortRef = useRef(null);
  const aiEditAbortRef = useRef(null);


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
  //Added 
  const findBestTemplateForInput = async (text) => {
  const search = String(text || "").trim();
  if (!search) return null;
  const STOP_WORDS = new Set(["want","some","plan","have","this","that","with","from","your","will","been","they","them","then","than","when","what","also","into","more","make","like","just","over","such","very","much","need","good","well","only","even","most","many","each","both","here","there","their","about","would","could","should","generate","create","including","business","marketing","campaign","email","send","write","help","give","provide","using","based","please"]);
  const keywords = search.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 3 && !STOP_WORDS.has(t));

  const bodyFallbacks = [];

  for (const keyword of keywords) {
    const res = await fetch(`/api/email-templates?search=${encodeURIComponent(keyword)}&page=1&pageSize=20`);
    const data = await res.json();
    if (!res.ok || data?.error) continue;
    const templates = Array.isArray(data?.templates) ? data.templates : [];
    // Name match is highest priority — return immediately
    const nameMatch = templates.find((tpl) => String(tpl?.name || "").toLowerCase().includes(keyword));
    if (nameMatch) return nameMatch;
    // Save body matches as fallback
    const bodyMatch = templates.find((tpl) =>
      `${tpl?.subject || ""} ${tpl?.body || ""}`.toLowerCase().includes(keyword)
    );
    if (bodyMatch) bodyFallbacks.push(bodyMatch);
  }

  return bodyFallbacks[0] || null;
};

 //Added
  useEffect(() => {
  fetch("/api/auth/session")
    .then((r) => r.json())
    .then((d) => { if (d?.user) setCurrentUser(d.user); })
    .catch(() => {});
}, []);

useEffect(() => {
  if (!useTemplate) return;
  fetch("/api/email-templates?pageSize=50")
    .then((r) => r.json())
    .then((d) => setEmailTemplates(Array.isArray(d?.templates) ? d.templates : []))
    .catch(() => {});
}, [useTemplate]);

  // Load drafts and recent activity from DB/LocalStorage on mount
  useEffect(() => {
    try {
      const storedDrafts = localStorage.getItem("create_post_drafts");
      if (storedDrafts) setDrafts(JSON.parse(storedDrafts));
    } catch {}
  }, []);

  const fetchRecentActivity = useCallback(async () => {
    setLoadingRecentActivity(true);
    try {
      const res = await fetch("/api/audit?limit=200");
      const data = await res.json();
      if (res.ok && Array.isArray(data.records)) {
        const filtered = data.records
          .filter(r => r.page_name === "Create & Post" && r.action_name === "Generated Content Archive")
          .map(r => {
            try {
              return {
                id: r.id,
                timestamp: r.created_at,
                ...JSON.parse(r.details)
              };
            } catch {
              return null;
            }
          })
          .filter(Boolean)
          .slice(0, 10);
        setRecentActivity(filtered);
      }
    } catch (e) {
      console.error("Failed to fetch recent activity:", e);
    } finally {
      setLoadingRecentActivity(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentActivity();
  }, [fetchRecentActivity]);

  const logGeneratedContentToDb = async (typeId, typeLabel, content, subject) => {
    try {
      const currentUserId = currentUser?.id || await getCurrentUserId();
      await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: currentUserId || "anonymous",
          event_type: "action",
          page_name: "Create & Post",
          action_name: "Generated Content Archive",
          details: JSON.stringify({
            typeId,
            typeLabel,
            content,
            subject,
            timestamp: new Date().toISOString()
          }),
          session_id: getCurrentSessionId()
        })
      });
      fetchRecentActivity();
    } catch (e) {
      console.error("Failed to log generated content:", e);
    }
  };

  const saveDraft = (typeId, contentObj) => {
    const formattedDate = new Date().toLocaleDateString();
    const defaultName = `Draft - ${PLATFORM_META[typeId]?.label || typeId} - ${formattedDate}`;
    const newDraft = {
      id: `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: defaultName,
      typeId,
      typeLabel: PLATFORM_META[typeId]?.label || typeId,
      subject: contentObj.subject || "",
      content: contentObj.content || "",
      imageUrl: contentObj.imageUrl || "",
      attachments: contentObj.attachments || [],
      createdAt: new Date().toLocaleString(),
      lastModified: new Date().toLocaleString(),
      createdBy: currentUser?.name || "User",
      status: "Active",
      favorite: false
    };
    const updatedDrafts = [newDraft, ...drafts];
    setDrafts(updatedDrafts);
    try {
      localStorage.setItem("create_post_drafts", JSON.stringify(updatedDrafts));
    } catch {}
    setMessage(`Draft "${newDraft.name}" saved successfully!`);
  };

  const duplicateContent = (typeId, contentObj) => {
    const formattedDate = new Date().toLocaleDateString();
    const defaultName = `Draft - ${PLATFORM_META[typeId]?.label || typeId} (Copy) - ${formattedDate}`;
    const newDraft = {
      id: `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: defaultName,
      typeId,
      typeLabel: `${PLATFORM_META[typeId]?.label || typeId} (Copy)`,
      subject: contentObj.subject ? `${contentObj.subject} (Copy)` : "",
      content: contentObj.content || "",
      imageUrl: contentObj.imageUrl || "",
      attachments: contentObj.attachments || [],
      createdAt: new Date().toLocaleString(),
      lastModified: new Date().toLocaleString(),
      createdBy: currentUser?.name || "User",
      status: "Active",
      favorite: false
    };
    const updatedDrafts = [newDraft, ...drafts];
    setDrafts(updatedDrafts);
    try {
      localStorage.setItem("create_post_drafts", JSON.stringify(updatedDrafts));
    } catch {}
    setMessage(`Duplicated ${PLATFORM_META[typeId]?.label || typeId} content to drafts!`);
  };

  const updateDraftInList = (draftId, updatedFields) => {
    const updated = drafts.map(d => {
      if (d.id === draftId) {
        return {
          ...d,
          ...updatedFields,
          lastModified: new Date().toLocaleString()
        };
      }
      return d;
    });
    setDrafts(updated);
    try {
      localStorage.setItem("create_post_drafts", JSON.stringify(updated));
    } catch {}
  };

  const handleDownloadTxt = (typeId, contentObj) => {
    const text = typeId === "email_campaign" || typeId === "newsletter"
      ? `Subject: ${contentObj.subject || ""}\n\n${contentObj.content || ""}`
      : contentObj.content || "";
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${typeId}_content.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const generateImageWithPreset = async (presetType) => {
    if (imageAbortRef.current) {
      imageAbortRef.current.abort();
      imageAbortRef.current = null;
      setGeneratingImageForType("");
      return;
    }
    if (!activeType) return;

    let presetSuffix = "";
    if (presetType === "banner") presetSuffix = "website banner size layout, professional header banner design";
    else if (presetType === "linkedin_cover") presetSuffix = "LinkedIn cover banner background, corporate branding layout, 1584x396 pixel ratio";
    else if (presetType === "instagram") presetSuffix = "Instagram feed post visual, square 1:1 format, premium styled graphic asset";
    else if (presetType === "newsletter_header") presetSuffix = "email newsletter header template, clean brand design";

    const basePrompt = imagePrompt.trim() || contentByType[activeType]?.content || input;
    const finalPrompt = `${basePrompt}, ${presetSuffix}`;

    setGeneratingImageForType(presetType);
    const controller = new AbortController();
    imageAbortRef.current = controller;
    try {
      const mediaRes = await fetch("/api/create-post/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ prompt: finalPrompt, count: 1 }),
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
      if (e?.name === "AbortError") return;
      setMessage(e?.message || "Failed to generate image.");
    } finally {
      if (imageAbortRef.current === controller) {
        imageAbortRef.current = null;
        setGeneratingImageForType("");
      }
    }
  };



  useEffect(() => {
    let mounted = true;
    
    const initStatus = async () => {
      await loadIntegrationsStatus();
      
      if (mounted) {
        const params = new URLSearchParams(window.location.search);
        const connectedProvider = params.get("connected");
        const errorMsg = params.get("error");

        if (connectedProvider) {
          setMessage(`${connectedProvider.charAt(0).toUpperCase() + connectedProvider.slice(1)} account connected successfully.`);
          window.history.replaceState({}, document.title, window.location.pathname);
        } else if (errorMsg) {
          if (errorMsg === "not_configured") {
            setMessage("Integration Not Configured");
          } else {
            setMessage(`Connection failed: ${decodeURIComponent(errorMsg)}`);
          }
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    };

    initStatus();
    
    return () => {
      mounted = false;
    };
  }, []);
  //Added
  useEffect(() => {
    if (!embedded || !initialInput) return;
    setInput(String(initialInput));
  }, [embedded, initialInput]);

  useEffect(() => {
    if (!embedded || !initialInput?.trim()) return;
    generateStrategy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedded]);
  //Added

  useEffect(() => {
    return () => {
      strategyAbortRef.current?.abort();
      contentAbortRef.current?.abort();
      imageAbortRef.current?.abort();
      aiEditAbortRef.current?.abort();
    };
  }, []);

  const generateStrategy = async () => {
    if (strategyAbortRef.current) {
      strategyAbortRef.current.abort();
      strategyAbortRef.current = null;
      setGeneratingSuggestions(false);
      return;
    }
    if (!input.trim()) return;
    const isRefresh = suggestions.length > 0;
    setGeneratingSuggestions(true);
    setMessage("");
    const controller = new AbortController();
    strategyAbortRef.current = controller;
    
    try {
      const res = await fetch("/api/create-post/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
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
      if (e?.name === "AbortError") return;
      setMessage(e?.message || "Failed to generate strategy.");
    } finally {
      if (strategyAbortRef.current === controller) {
        strategyAbortRef.current = null;
        setGeneratingSuggestions(false);
      }
    }
  };

  const regenerateActiveContent = async () => {
    if (contentAbortRef.current) {
      contentAbortRef.current.abort();
      contentAbortRef.current = null;
      setGeneratingContent(false);
      return;
    }
    if (!input.trim() || !activeType) return;
    setGeneratingContent(true);
    setMessage("");
    const controller = new AbortController();
    contentAbortRef.current = controller;
    try {
      const res2 = await fetch("/api/create-post/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ input, selectedTypes: [activeType] }),
      });
      const data2 = await res2.json();
      if (!res2.ok || data2?.error) throw new Error(data2?.error || "Failed to regenerate content.");
      const next = { ...contentByType };
      const nowTime = new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
      for (const item of (data2.contents || [])) {
        const hashtagsText = Array.isArray(item.hashtags) && item.hashtags.length ? `\n\n${item.hashtags.join(" ")}` : "";
        const finalContent = `${item.main || ""}${hashtagsText}`.trim();
        const finalSubject = item.subject || "";
        next[item.typeId] = {
          typeLabel: item.typeLabel,
          content: finalContent,
          subject: finalSubject,
          imageUrl: contentByType[item.typeId]?.imageUrl || "",
          generatedAt: contentByType[item.typeId]?.generatedAt || nowTime,
          lastModified: nowTime,
        };
        await logGeneratedContentToDb(item.typeId, item.typeLabel, finalContent, finalSubject);
      }
      setContentByType(next);
    } catch (e) {
      if (e?.name === "AbortError") return;
      setMessage(e?.message || "Failed to regenerate.");
    } finally {
      if (contentAbortRef.current === controller) {
        contentAbortRef.current = null;
        setGeneratingContent(false);
      }
    }
  };

  // const generateContentForSelectedTypes = async () => {
  //   if (!input.trim() || selectedTypes.length === 0) return;
  //   setGeneratingContent(true);
  //   setMessage("");
  //   try {
  //     const res2 = await fetch("/api/create-post/generate", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ input, selectedTypes }),
  //     });
  //     const data2 = await res2.json();
  //     if (!res2.ok || data2?.error) throw new Error(data2?.error || "Failed to generate content.");

  //     const next = { ...contentByType };
  //     (data2.contents || []).forEach((item) => {
  //       const hashtagsText = Array.isArray(item.hashtags) && item.hashtags.length ? `\n\n${item.hashtags.join(" ")}` : "";
  //       next[item.typeId] = {
  //         typeLabel: item.typeLabel,
  //         content: `${item.main || ""}${hashtagsText}`.trim(),
  //         subject: item.subject || "",
  //         imageUrl: contentByType[item.typeId]?.imageUrl || "",
  //       };
  //     });
  //     setContentByType(next);
  //     if (!selectedTypes.includes(activeType)) {
  //        setActiveType(selectedTypes[0] || "");
  //     }
  //   } catch (e) {
  //     setMessage(e?.message || "Failed to generate content.");
  //   } finally {
  //     setGeneratingContent(false);
  //   }
  // };  
  //Added
  const generateContentForSelectedTypes = async () => {
  if (contentAbortRef.current) {
    contentAbortRef.current.abort();
    contentAbortRef.current = null;
    setGeneratingContent(false);
    return;
  }
  if (!input.trim() || selectedTypes.length === 0) return;
  setGeneratingContent(true);
  setMessage("");
  setMatchedTemplateName("");
  const controller = new AbortController();
  contentAbortRef.current = controller;
  try {
    const emailSelected = selectedTypes.includes("email_campaign") || selectedTypes.includes("newsletter");
    // let matchedTemplate = null;
    // if (useTemplate && emailSelected) {
    //   matchedTemplate = await findBestTemplateForInput(input);
    // }
    let matchedTemplate = null;
if (useTemplate && emailSelected && selectedTemplateId) {
  matchedTemplate = emailTemplates.find((t) => t.id === selectedTemplateId) || null;
}


    const res2 = await fetch("/api/create-post/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      // body: JSON.stringify({ input, selectedTypes }),
      body: JSON.stringify({
          input,
          selectedTypes,
          senderName: currentUser?.name || "",
          senderEmail: currentUser?.email || "",
          senderCompany: currentUser?.company || "",
        }),

    });
    const data2 = await res2.json();
    if (!res2.ok || data2?.error) throw new Error(data2?.error || "Failed to generate content.");

    // const next = { ...contentByType };
    // (data2.contents || []).forEach((item) => {
    //   const hashtagsText = Array.isArray(item.hashtags) && item.hashtags.length ? `\n\n${item.hashtags.join(" ")}` : "";
    //   const isEmailType = item.typeId === "email_campaign" || item.typeId === "newsletter";
    //   const autoAttachments = matchedTemplate && isEmailType
    //     ? (Array.isArray(matchedTemplate.case_studies) ? matchedTemplate.case_studies : [])
    //         .map((f) => ({ name: String(f?.name || "").trim(), type: String(f?.type || "application/octet-stream"), size: Number(f?.size || 0), dataUrl: String(f?.dataUrl || "").trim(), fromTemplate: true }))
    //         .filter((f) => f.name && f.dataUrl)
    //     : [];
    //   next[item.typeId] = {
    //     typeLabel: item.typeLabel,
    //     content: `${item.main || ""}${hashtagsText}`.trim(),
    //     subject: item.subject || "",
    //     imageUrl: contentByType[item.typeId]?.imageUrl || "",
    //     attachments: autoAttachments,
    //   };
    // });
    //Added
    const next = {};  // ← Start fresh instead of spreading old contentByType
    const nowTime = new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    
    for (const item of (data2.contents || [])) {
      const hashtagsText = Array.isArray(item.hashtags) && item.hashtags.length ? `\n\n${item.hashtags.join(" ")}` : "";
      const isEmailType = item.typeId === "email_campaign" || item.typeId === "newsletter";
      const autoAttachments = matchedTemplate && isEmailType
        ? (Array.isArray(matchedTemplate.case_studies) ? matchedTemplate.case_studies : [])
            .map((f) => ({ name: String(f?.name || "").trim(), type: String(f?.type || "application/octet-stream"), size: Number(f?.size || 0), dataUrl: String(f?.dataUrl || "").trim(), fromTemplate: true }))
            .filter((f) => f.name && f.dataUrl)
        : [];
      
      const finalContent = `${item.main || ""}${hashtagsText}`.trim();
      const finalSubject = item.subject || "";
      
      next[item.typeId] = {
        typeLabel: item.typeLabel,
        content: finalContent,
        subject: finalSubject,
        imageUrl: contentByType[item.typeId]?.imageUrl || "",  // Keep image if exists
        attachments: autoAttachments,  // Fresh attachments from new template match
        generatedAt: nowTime,
        lastModified: nowTime,
      };
      
      // Log to database audit logs
      await logGeneratedContentToDb(item.typeId, item.typeLabel, finalContent, finalSubject);
    }
    
    setContentByType(next);
    if (matchedTemplate && emailSelected) setMatchedTemplateName(String(matchedTemplate.name || ""));
    if (!selectedTypes.includes(activeType)) setActiveType(selectedTypes[0] || "");
  } catch (e) {
    if (e?.name === "AbortError") return;
    setMessage(e?.message || "Failed to generate content.");
  } finally {
    if (contentAbortRef.current === controller) {
      contentAbortRef.current = null;
      setGeneratingContent(false);
    }
  }
};       //Added

  const generateImageForActiveType = async () => {
    if (imageAbortRef.current) {
      imageAbortRef.current.abort();
      imageAbortRef.current = null;
      setGeneratingImageForType("");
      return;
    }
    if (!activeType) return;
    const prompt = imagePrompt.trim() || contentByType[activeType]?.content || input;
    if (!prompt) return;
    setGeneratingImageForType(activeType);
    const controller = new AbortController();
    imageAbortRef.current = controller;
    try {
      const mediaRes = await fetch("/api/create-post/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
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
      if (e?.name === "AbortError") return;
      setMessage(e?.message || "Failed to generate image.");
    } finally {
      if (imageAbortRef.current === controller) {
        imageAbortRef.current = null;
        setGeneratingImageForType("");
      }
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

  const handleRecipientFileUpload = async (file) => {
    if (!file) return;
    
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ];
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(csv|xlsx|xls|txt)$/i)) {
      setMessage('Please upload a CSV, Excel, or text file.');
      return;
    }
    
    try {
      setMessage('Parsing recipient file...');
      const emails = await parseRecipientFile(file);
      
      if (emails.length === 0) {
        setMessage('No valid email addresses found in the file.');
        return;
      }
      
      setRecipientFile(file);
      setRecipientFileEmails(emails);
      
      // Add to recipient list
      const combined = [...new Set([...recipientEmails, ...emails])];
      setRecipientEmails(combined);
      syncDrafts([...new Set([...combined, ...selectedUserEmails])], baseEmailSubject, baseEmailBody);
      
      setMessage(`Added ${emails.length} email(s) from ${file.name}`);
    } catch (err) {
      setMessage(err.message || 'Failed to parse recipient file.');
    }
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
    if (aiEditAbortRef.current) {
      aiEditAbortRef.current.abort();
      aiEditAbortRef.current = null;
      setAiEditingRecipient(false);
      return;
    }
    if (!activeRecipient) return;
    const prompt = aiPromptForRecipient.trim();
    if (!prompt) return;
    setAiEditingRecipient(true);
    setMessage("");
    const controller = new AbortController();
    aiEditAbortRef.current = controller;
    try {
      const current = recipientDrafts[activeRecipient] || { subject: baseEmailSubject, body: baseEmailBody };
      const aiInput = `${prompt}\n\nCurrent subject: ${current.subject}\nCurrent email body:\n${current.body}\n\nRewrite for recipient: ${activeRecipient}`;
      const res = await fetch("/api/create-post/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
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
      if (e?.name === "AbortError") return;
      setMessage(e?.message || "Failed to update email with AI.");
    } finally {
      if (aiEditAbortRef.current === controller) {
        aiEditAbortRef.current = null;
        setAiEditingRecipient(false);
      }
    }
  };

  const updateWorkflowStatus = (typeId, newStatus) => {
    setContentByType(prev => {
      if (!prev[typeId]) return prev;
      return {
        ...prev,
        [typeId]: {
          ...prev[typeId],
          workflowStatus: newStatus,
          lastModified: new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
        }
      };
    });
  };

  const submitPostAction = async (mode) => {
    setSubmittingPost(true);
    setMessage("");
    const typeId = mode === "post_linkedin" ? "linkedin_post" : mode === "post_instagram" ? "instagram_post" : "";
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
      if (mode === "post_linkedin") {
        setLinkedinConnected(true);
        updateWorkflowStatus("linkedin_post", "Published");
      } else if (typeId) {
        updateWorkflowStatus(typeId, "Published");
      }
      setMessage(data.message || "Done.");
    } catch (e) {
      if (typeId) {
        updateWorkflowStatus(typeId, "Failed");
      }
      setMessage(e?.message || "Failed to process request.");
    } finally {
      setSubmittingPost(false);
    }
  };

  const handleLinkedinConnect = () => {
    handleConnectProvider("linkedin");
  };

  return (
    <main className="min-h-full bg-[#F8FAFC] p-6 lg:p-8">
      {/* Page Header with Omnichannel Integrations Status */}
      <div className="mx-auto max-w-[1400px] mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Create & Post</h1>
          <p className="text-xs text-slate-500 font-medium">Compose, optimize, approve, and schedule your omnichannel marketing content.</p>
        </div>
        
        {/* Connected Accounts indicator bar */}
        <div className="flex items-center flex-wrap gap-2 bg-white rounded-xl border border-slate-200 p-2 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider px-2">Integrations:</span>
          
          {/* LinkedIn */}
          {linkedinConnected ? (
            <div className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs font-bold divide-x divide-blue-200 shadow-2xs">
              <span className="px-2.5 py-1">
                LinkedIn ({formatAccountLabel(linkedinConnectedAccount)})
              </span>
              <button
                onClick={() => handleDisconnectProvider("linkedin")}
                className="px-2 py-1 hover:bg-blue-100 hover:text-blue-800 transition rounded-r-lg font-bold border-0 cursor-pointer text-[10px] bg-transparent"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleConnectProvider("linkedin")}
              className="bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer"
            >
              Connect LinkedIn
            </button>
          )}

          {/* Instagram */}
          {instagramConnected ? (
            <div className="inline-flex items-center rounded-lg border border-pink-200 bg-pink-50 text-pink-700 text-xs font-bold divide-x divide-pink-200 shadow-2xs">
              <span className="px-2.5 py-1">
                Instagram ({formatAccountLabel(instagramConnectedAccount)})
              </span>
              <button
                onClick={() => handleDisconnectProvider("instagram")}
                className="px-2 py-1 hover:bg-pink-100 hover:text-pink-800 transition rounded-r-lg font-bold border-0 cursor-pointer text-[10px] bg-transparent"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleConnectProvider("instagram")}
              className="bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer"
            >
              Connect Instagram
            </button>
          )}

          {/* Facebook */}
          {facebookConnected ? (
            <div className="inline-flex items-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-bold divide-x divide-indigo-200 shadow-2xs">
              <span className="px-2.5 py-1">
                Facebook ({formatAccountLabel(facebookConnectedAccount)})
              </span>
              <button
                onClick={() => handleDisconnectProvider("facebook")}
                className="px-2 py-1 hover:bg-indigo-100 hover:text-indigo-800 transition rounded-r-lg font-bold border-0 cursor-pointer text-[10px] bg-transparent"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleConnectProvider("facebook")}
              className="bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer"
            >
              Connect Facebook
            </button>
          )}

          {/* Outlook */}
          {outlookConnected ? (
            <div className="inline-flex items-center rounded-lg border border-sky-200 bg-sky-50 text-sky-700 text-xs font-bold divide-x divide-sky-200 shadow-2xs">
              <span className="px-2.5 py-1">
                Outlook ({formatAccountLabel(outlookConnectedAccount)})
              </span>
              <button
                onClick={() => handleDisconnectProvider("outlook")}
                className="px-2 py-1 hover:bg-sky-100 hover:text-sky-800 transition rounded-r-lg font-bold border-0 cursor-pointer text-[10px] bg-transparent"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleConnectProvider("outlook")}
              className="bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer"
            >
              Connect Outlook
            </button>
          )}

          {/* Gmail */}
          {gmailConnected ? (
            <div className="inline-flex items-center rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs font-bold divide-x divide-red-200 shadow-2xs">
              <span className="px-2.5 py-1">
                Gmail ({formatAccountLabel(gmailConnectedAccount)})
              </span>
              <button
                onClick={() => handleDisconnectProvider("gmail")}
                className="px-2 py-1 hover:bg-red-100 hover:text-red-800 transition rounded-r-lg font-bold border-0 cursor-pointer text-[10px] bg-transparent"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleConnectProvider("gmail")}
              className="bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer"
            >
              Connect Gmail
            </button>
          )}
        </div>
      </div>
      {message && (
        <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-700 shadow-sm transition-all flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage("")} className="text-indigo-400 hover:text-indigo-600 font-bold ml-2 bg-transparent border-0 cursor-pointer">×</button>
        </div>
      )}

      {/* Main Two-Column Row (Creative Input + AI Suggestions on Left, Visual Assets + Recent Activity on Right) */}
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
                   disabled={!generatingSuggestions && (generatingContent || !input.trim())}
                   className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:scale-[0.98] hover:bg-indigo-700 hover:shadow-md disabled:opacity-50 sm:w-auto"
                >
                   {generatingSuggestions || generatingContent ? <LoadingSpinner /> : <Sparkles size={16} />}
                   {generatingSuggestions ? "Stop" : suggestions.length > 0 ? "Update Strategy" : "Generate Strategy"}
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
                       className={`group relative flex flex-col items-start rounded-xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
                         selected ? "border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600/20" : "border-slate-200 bg-white hover:border-slate-300"
                       }`}
                     >
                       <div className="flex w-full items-start justify-between">
                         <div className={`rounded-lg p-2 ${selected ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"}`}>
                           <Icon size={18} className={selected ? "text-indigo-700" : meta.color} />
                         </div>
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
               <div className="mt-5 border-t border-slate-100 pt-4 flex items-center justify-between gap-3">
                 <div className="space-y-2">
                   <label className={`inline-flex cursor-pointer items-center gap-2 text-sm font-medium ${needsRecipients ? "text-slate-700" : "cursor-not-allowed text-slate-400"}`}>
                     <input
                       type="checkbox"
                       checked={useTemplate}
                       disabled={!needsRecipients}
                       onChange={(e) => { setUseTemplate(e.target.checked); setSelectedTemplateId(""); }}
                       className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                     />
                     Use Email Template
                   </label>
                   {useTemplate && needsRecipients && (
                     <select
                       value={selectedTemplateId}
                       onChange={(e) => setSelectedTemplateId(e.target.value)}
                       className="block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                     >
                       <option value="">Select template...</option>
                       {emailTemplates.map((t) => (
                         <option key={t.id} value={t.id}>{t.name}</option>
                       ))}
                     </select>
                   )}
                 </div>
                 <button
                   onClick={generateContentForSelectedTypes}
                   disabled={!generatingContent && (selectedTypes.length === 0 || (useTemplate && !selectedTemplateId))}
                   className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 hover:shadow-md disabled:opacity-50 border-0 cursor-pointer"
                 >
                   {generatingContent ? <LoadingSpinner /> : null}
                   {generatingContent ? "Stop" : "Confirm Platforms & Generate"}
                 </button>
               </div>
             )}
           </section>
        </div>

        {/* RIGHT SIDE (35%) */}
        <div className="flex w-full flex-col gap-6 lg:w-[35%]">
           
           {/* D. AI Image Generator Card (Visual Assets) */}
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
                     placeholder="Describe the image context (optional)..."
                     className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 pr-8 text-sm outline-none transition-all focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                   />
                   <Pencil size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                   <span onClick={() => setImagePrompt("Minimalistic, clean layout, corporate")} className="shrink-0 cursor-pointer rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-50">Minimal</span>
                   <span onClick={() => setImagePrompt("Professional corporate setting, high quality")} className="shrink-0 cursor-pointer rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-650 transition-colors hover:bg-slate-50">Corporate</span>
                   <span onClick={() => setImagePrompt("Futuristic tech background, glowing lights")} className="shrink-0 cursor-pointer rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-650 transition-colors hover:bg-slate-50">Futuristic</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => generateImageWithPreset("banner")}
                    disabled={!!generatingImageForType || !activeType}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-805 text-white text-xs font-semibold py-2.5 transition active:scale-[0.98] disabled:opacity-50 border-0 cursor-pointer"
                  >
                    {generatingImageForType === "banner" ? <LoadingSpinner /> : "Generate Banner"}
                  </button>
                  <button
                    onClick={() => generateImageWithPreset("linkedin_cover")}
                    disabled={!!generatingImageForType || !activeType}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-805 text-white text-xs font-semibold py-2.5 transition active:scale-[0.98] disabled:opacity-50 border-0 cursor-pointer"
                  >
                    {generatingImageForType === "linkedin_cover" ? <LoadingSpinner /> : "LinkedIn Cover"}
                  </button>
                  <button
                    onClick={() => generateImageWithPreset("instagram")}
                    disabled={!!generatingImageForType || !activeType}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-805 text-white text-xs font-semibold py-2.5 transition active:scale-[0.98] disabled:opacity-50 border-0 cursor-pointer"
                  >
                    {generatingImageForType === "instagram" ? <LoadingSpinner /> : "Instagram Post"}
                  </button>
                  <button
                    onClick={() => generateImageWithPreset("newsletter_header")}
                    disabled={!!generatingImageForType || !activeType}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-805 text-white text-xs font-semibold py-2.5 transition active:scale-[0.98] disabled:opacity-50 border-0 cursor-pointer"
                  >
                    {generatingImageForType === "newsletter_header" ? <LoadingSpinner /> : "Newsletter Header"}
                  </button>
                </div>
             </div>
           </section>

           {/* Recent Activity Panel */}
           <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
             <div className="flex items-center gap-2 mb-4">
               <Clock className="text-indigo-600" size={18} />
               <h2 className="text-base font-semibold text-slate-900">Recent Activity</h2>
             </div>
             
             {loadingRecentActivity ? (
               <p className="text-xs text-slate-400 italic py-4 text-center">Loading recent generations...</p>
             ) : recentActivity.length === 0 ? (
               <p className="text-xs text-slate-400 italic py-4 text-center">No generated history found in database.</p>
             ) : (
               <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                 {recentActivity.map((activity) => {
                   const meta = PLATFORM_META[activity.typeId] || { label: activity.typeLabel || activity.typeId, Icon: Sparkles, color: "text-slate-650" };
                   const Icon = meta.Icon;
                   return (
                     <div key={activity.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100/50 transition flex flex-col gap-2">
                       <div className="flex items-center justify-between gap-2">
                         <div className="flex items-center gap-1.5 min-w-0">
                           <Icon size={12} className={meta.color} />
                           <span className="text-xs font-bold text-slate-800 truncate">{meta.label}</span>
                         </div>
                         <span className="text-[10px] text-slate-400 font-medium">
                           {new Date(activity.timestamp).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                         </span>
                       </div>
                       <p className="text-xs text-slate-650 line-clamp-2 font-medium bg-white p-2 rounded-lg border border-slate-100">
                         {activity.content}
                       </p>
                       <div className="flex justify-end">
                         <button
                           onClick={() => {
                             // Restore to editor
                             const generatedTime = new Date(activity.timestamp).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
                             setContentByType(prev => ({
                               ...prev,
                               [activity.typeId]: {
                                 typeLabel: activity.typeLabel,
                                 content: activity.content,
                                 subject: activity.subject || "",
                                 imageUrl: "",
                                 attachments: [],
                                 generatedAt: generatedTime,
                                 lastModified: generatedTime
                               }
                             }));
                             if (!selectedTypes.includes(activity.typeId)) {
                               setSelectedTypes(prev => [...prev, activity.typeId]);
                             }
                             setActiveType(activity.typeId);
                             setActiveEditorTab(activity.typeId);
                             setMessage(`Restored ${meta.label} content from database history.`);
                           }}
                           className="text-[10px] font-bold text-[#2563EB] hover:underline bg-transparent border-0 cursor-pointer"
                         >
                           Restore to Editor
                         </button>
                       </div>
                     </div>
                   );
                 })}
               </div>
             )}
           </section>

        </div>
      </div>

      {/* FULL WIDTH ROW BELOW FOR CONTENT EDITOR */}
      <div className="mx-auto mt-6 max-w-[1400px] w-full">
        
        {/* C. Content Editor (Full Width! Premium!) */}
        <section className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 ${Object.keys(contentByType).length > 0 || activeEditorTab === "drafts" ? "opacity-100 hover:shadow-md" : "pointer-events-none opacity-50"}`}>
          
          {/* Header tabs bar */}
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Generated Workspaces</h2>
            
            {/* Custom Tab list */}
            <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
              {[
                { id: "all", label: "All Content" },
                { id: "linkedin_post", label: "LinkedIn" },
                { id: "instagram_post", label: "Instagram" },
                { id: "email_campaign", label: "Email" },
                { id: "newsletter", label: "Newsletter" },
                { id: "blog_post", label: "Blog" },
                { id: "drafts", label: "Drafts" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveEditorTab(tab.id);
                    if (tab.id !== "all" && tab.id !== "drafts") {
                      setActiveType(tab.id);
                    }
                  }}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all border-0 cursor-pointer ${
                    activeEditorTab === tab.id
                      ? "bg-white text-indigo-600 shadow-[0_2px_8px_rgba(0,0,0,0.05)] font-bold"
                      : "text-slate-500 hover:text-slate-800 bg-transparent font-semibold"
                  }`}
                >
                  {tab.label}
                  {tab.id === "drafts" && drafts.length > 0 && (
                    <span className="ml-1.5 bg-indigo-105 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded-full font-extrabold">
                      {drafts.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Workspaces */}
          <div className="mt-6">
                    {activeEditorTab === "drafts" ? (
              /* Drafts management workspace view */
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Bookmark className="text-indigo-650" size={16} />
                    <h3 className="text-sm font-semibold text-slate-800 font-sans">Saved Drafts Archive</h3>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
                      <button
                        onClick={() => setDraftViewMode("list")}
                        className={`px-2.5 py-1 rounded font-bold border-0 cursor-pointer ${draftViewMode === "list" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-500 hover:text-slate-805 bg-transparent"}`}
                      >
                        List View
                      </button>
                      <button
                        onClick={() => setDraftViewMode("card")}
                        className={`px-2.5 py-1 rounded font-bold border-0 cursor-pointer ${draftViewMode === "card" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-500 hover:text-slate-805 bg-transparent"}`}
                      >
                        Card View
                      </button>
                    </div>

                    <select
                      value={draftStatusFilter}
                      onChange={(e) => setDraftStatusFilter(e.target.value)}
                      className="rounded-lg border border-slate-350 bg-white px-2.5 py-1 text-xs text-slate-700 font-semibold outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-150 cursor-pointer"
                    >
                      <option value="all">All Statuses</option>
                      <option value="Active">Active Only</option>
                      <option value="Archived">Archived Only</option>
                      <option value="favorites">Favorites Only</option>
                    </select>
                  </div>
                </div>

                {/* Inline Editing Modal Dialog */}
                {editingDraftId !== null && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h3 className="text-base font-bold text-slate-900">Edit Draft Details</h3>
                        <button onClick={() => setEditingDraftId(null)} className="text-slate-450 hover:text-slate-700 bg-transparent border-0 cursor-pointer font-bold text-lg">×</button>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Draft Name</label>
                          <input
                            value={editDraftName}
                            onChange={(e) => setEditDraftName(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Platform Type</label>
                          <span className="inline-block rounded-md bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 font-bold">
                            {PLATFORM_META[drafts.find(d => d.id === editingDraftId)?.typeId]?.label || "Platform"}
                          </span>
                        </div>

                        {(drafts.find(d => d.id === editingDraftId)?.typeId === "email_campaign" || drafts.find(d => d.id === editingDraftId)?.typeId === "newsletter") && (
                          <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Email Subject</label>
                            <input
                              value={editDraftSubject}
                              onChange={(e) => setEditDraftSubject(e.target.value)}
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100"
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Content Body</label>
                          <textarea
                            value={editDraftContent}
                            onChange={(e) => setEditDraftContent(e.target.value)}
                            rows={10}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 resize-none font-sans"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                        <button
                          onClick={() => setEditingDraftId(null)}
                          className="rounded-lg border border-slate-205 bg-white px-4 py-2 text-xs font-semibold text-slate-700 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            updateDraftInList(editingDraftId, {
                              name: editDraftName,
                              content: editDraftContent,
                              subject: editDraftSubject
                            });
                            setEditingDraftId(null);
                            setMessage("Draft updated successfully.");
                          }}
                          className="rounded-lg bg-indigo-650 hover:bg-indigo-700 text-white px-4 py-2 text-xs font-semibold cursor-pointer border-0"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Draft list rendering logic */}
                {drafts.filter(d => {
                  if (draftStatusFilter === "Active") return d.status === "Active";
                  if (draftStatusFilter === "Archived") return d.status === "Archived";
                  if (draftStatusFilter === "favorites") return !!d.favorite;
                  return true;
                }).length === 0 ? (
                  <p className="text-xs text-slate-450 italic py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No drafts match the selected filters.
                  </p>
                ) : draftViewMode === "list" ? (
                  /* Table view */
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                          <th className="py-3 px-4 font-bold">Draft Name</th>
                          <th className="py-3 px-4 font-bold">Platform</th>
                          <th className="py-3 px-4 font-bold">Created Date</th>
                          <th className="py-3 px-4 font-bold">Last Modified</th>
                          <th className="py-3 px-4 font-bold">Created By</th>
                          <th className="py-3 px-4 font-bold">Status</th>
                          <th className="py-3 px-4 font-bold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {drafts.filter(d => {
                          if (draftStatusFilter === "Active") return d.status === "Active";
                          if (draftStatusFilter === "Archived") return d.status === "Archived";
                          if (draftStatusFilter === "favorites") return !!d.favorite;
                          return true;
                        }).map((draft) => {
                          const meta = PLATFORM_META[draft.typeId] || { label: draft.typeLabel || draft.typeId, Icon: Sparkles, color: "text-slate-650" };
                          const Icon = meta.Icon;
                          return (
                            <tr key={draft.id} className="hover:bg-slate-50/50 transition">
                              <td className="py-3.5 px-4 font-semibold text-slate-900 max-w-[200px] truncate">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => updateDraftInList(draft.id, { favorite: !draft.favorite })}
                                    className="bg-transparent border-0 p-0 cursor-pointer outline-none flex items-center"
                                  >
                                    <Star size={13} className={draft.favorite ? "fill-amber-400 text-amber-500" : "text-slate-300 hover:text-amber-400"} />
                                  </button>
                                  <span className="truncate">{draft.name}</span>
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 font-bold text-[10px] text-slate-700">
                                  <Icon size={10} className={meta.color} />
                                  {meta.label}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-slate-550 font-medium">{draft.createdAt}</td>
                              <td className="py-3.5 px-4 text-slate-550 font-medium">{draft.lastModified}</td>
                              <td className="py-3.5 px-4 text-slate-550 font-medium">{draft.createdBy}</td>
                              <td className="py-3.5 px-4">
                                <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold ${
                                  draft.status === "Active" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-slate-100 text-slate-600"
                                }`}>
                                  {draft.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                                <button
                                  onClick={() => {
                                    const generatedTime = new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
                                    setContentByType(prev => ({
                                      ...prev,
                                      [draft.typeId]: {
                                        typeLabel: draft.typeLabel,
                                        content: draft.content,
                                        subject: draft.subject,
                                        imageUrl: draft.imageUrl,
                                        attachments: draft.attachments,
                                        generatedAt: generatedTime,
                                        lastModified: generatedTime
                                      }
                                    }));
                                    if (!selectedTypes.includes(draft.typeId)) {
                                      setSelectedTypes(prev => [...prev, draft.typeId]);
                                    }
                                    setActiveType(draft.typeId);
                                    setActiveEditorTab(draft.typeId);
                                    setMessage(`Loaded draft "${draft.name}" into editor.`);
                                  }}
                                  className="text-[10px] font-bold text-indigo-650 hover:underline bg-transparent border-0 cursor-pointer"
                                >
                                  Load
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingDraftId(draft.id);
                                    setEditDraftName(draft.name);
                                    setEditDraftContent(draft.content);
                                    setEditDraftSubject(draft.subject || "");
                                  }}
                                  className="text-[10px] font-bold text-[#2563EB] hover:underline bg-transparent border-0 cursor-pointer"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => {
                                    updateDraftInList(draft.id, { status: draft.status === "Active" ? "Archived" : "Active" });
                                    setMessage(`Draft marked as ${draft.status === "Active" ? "Archived" : "Active"}.`);
                                  }}
                                  className="text-[10px] font-bold text-slate-505 hover:underline bg-transparent border-0 cursor-pointer"
                                >
                                  {draft.status === "Active" ? "Archive" : "Activate"}
                                </button>
                                <button
                                  onClick={() => {
                                    const conf = window.confirm("Are you sure you want to delete this draft?");
                                    if (!conf) return;
                                    const updated = drafts.filter(d => d.id !== draft.id);
                                    setDrafts(updated);
                                    try {
                                      localStorage.setItem("create_post_drafts", JSON.stringify(updated));
                                    } catch {}
                                    setMessage("Draft deleted successfully.");
                                  }}
                                  className="text-[10px] font-bold text-red-600 hover:underline bg-transparent border-0 cursor-pointer"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* Grid Card View */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {drafts.filter(d => {
                      if (draftStatusFilter === "Active") return d.status === "Active";
                      if (draftStatusFilter === "Archived") return d.status === "Archived";
                      if (draftStatusFilter === "favorites") return !!d.favorite;
                      return true;
                    }).map((draft) => {
                      const meta = PLATFORM_META[draft.typeId] || { label: draft.typeLabel || draft.typeId, Icon: Sparkles, color: "text-slate-650" };
                      const Icon = meta.Icon;
                      return (
                        <div key={draft.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs flex flex-col justify-between gap-3 hover:shadow-sm transition">
                          <div>
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <button
                                  onClick={() => updateDraftInList(draft.id, { favorite: !draft.favorite })}
                                  className="bg-transparent border-0 p-0 cursor-pointer outline-none flex items-center"
                                >
                                  <Star size={13} className={draft.favorite ? "fill-amber-400 text-amber-500" : "text-slate-300 hover:text-amber-400"} />
                                </button>
                                <span className="text-xs font-bold text-slate-900 truncate" title={draft.name}>{draft.name}</span>
                              </div>
                              <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 font-bold text-[9px] text-slate-700 gap-1 items-center shrink-0">
                                <Icon size={8} className={meta.color} />
                                {meta.label}
                              </span>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-450 font-medium mb-3">
                              <span>By: <strong className="text-slate-600 font-bold">{draft.createdBy}</strong></span>
                              <span>Modified: <strong className="text-slate-600 font-bold">{draft.lastModified.split(",")[0]}</strong></span>
                              <span className={`rounded-full px-1.5 py-0.2 text-[8px] font-extrabold ${
                                draft.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                              }`}>
                                {draft.status}
                              </span>
                            </div>

                            {draft.subject && (
                              <p className="text-xs font-bold text-slate-800 truncate mb-1">
                                Subject: {draft.subject}
                              </p>
                            )}
                            <p className="text-xs text-slate-605 whitespace-pre-wrap line-clamp-4 font-medium leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-100">
                              {draft.content}
                            </p>
                          </div>
                          
                          <div className="flex justify-end gap-2 border-t border-slate-100 pt-2.5 mt-1">
                            <button
                              onClick={() => {
                                const generatedTime = new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
                                setContentByType(prev => ({
                                  ...prev,
                                  [draft.typeId]: {
                                    typeLabel: draft.typeLabel,
                                    content: draft.content,
                                    subject: draft.subject,
                                    imageUrl: draft.imageUrl,
                                    attachments: draft.attachments,
                                    generatedAt: generatedTime,
                                    lastModified: generatedTime
                                  }
                                }));
                                if (!selectedTypes.includes(draft.typeId)) {
                                  setSelectedTypes(prev => [...prev, draft.typeId]);
                                }
                                setActiveType(draft.typeId);
                                setActiveEditorTab(draft.typeId);
                                setMessage(`Loaded draft "${draft.name}" into editor.`);
                              }}
                              className="inline-flex items-center gap-1 rounded bg-[#2563EB]/10 text-[#2563EB] hover:bg-[#2563EB] hover:text-white px-2.5 py-1.2 text-[10px] font-bold transition border-0 cursor-pointer"
                            >
                              <FolderOpen size={10} /> Load
                            </button>
                            <button
                              onClick={() => {
                                setEditingDraftId(draft.id);
                                setEditDraftName(draft.name);
                                setEditDraftContent(draft.content);
                                setEditDraftSubject(draft.subject || "");
                              }}
                              className="inline-flex items-center gap-1 rounded bg-slate-50 text-slate-700 hover:bg-slate-200 px-2.5 py-1.2 text-[10px] font-bold transition border border-slate-200 cursor-pointer"
                            >
                              <Pencil size={10} /> Edit
                            </button>
                            <button
                              onClick={() => {
                                updateDraftInList(draft.id, { status: draft.status === "Active" ? "Archived" : "Active" });
                                setMessage(`Draft marked as ${draft.status === "Active" ? "Archived" : "Active"}.`);
                              }}
                              className="inline-flex items-center gap-1 rounded bg-slate-50 text-slate-700 hover:bg-slate-200 px-2.5 py-1.2 text-[10px] font-bold transition border border-slate-200 cursor-pointer"
                            >
                              <Bookmark size={10} /> {draft.status === "Active" ? "Archive" : "Activate"}
                            </button>
                            <button
                              onClick={() => {
                                const conf = window.confirm("Are you sure you want to delete this draft?");
                                if (!conf) return;
                                const updated = drafts.filter(d => d.id !== draft.id);
                                setDrafts(updated);
                                try {
                                  localStorage.setItem("create_post_drafts", JSON.stringify(updated));
                                } catch {}
                                setMessage("Draft deleted successfully.");
                              }}
                              className="inline-flex items-center gap-1 rounded bg-red-50 text-red-655 hover:bg-red-650 hover:text-white px-2.5 py-1.2 text-[10px] font-bold transition border-0 cursor-pointer"
                            >
                              <Trash2 size={10} /> Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : activeEditorTab === "all" ? (
              /* All generated content items stacked workspace */
              <div className="space-y-6">
                {Object.keys(contentByType).length === 0 ? (
                  <div className="flex h-72 items-center justify-center text-sm font-medium text-slate-400">
                    Content will appear here...
                  </div>
                ) : (
                  Object.entries(contentByType).map(([typeId, contentObj]) => {
                    const meta = PLATFORM_META[typeId] || { label: typeId, Icon: FileText, color: "text-slate-600" };
                    const Icon = meta.Icon;
                    
                    const wordCount = (contentObj.content || "").trim().split(/\s+/).filter(Boolean).length;
                    const charCount = (contentObj.content || "").length;
                    const generatedTime = contentObj.generatedAt || "N/A";
                    const lastModified = contentObj.lastModified || "N/A";

                    return (
                      <div key={typeId} className="border border-slate-200 rounded-2xl p-5 bg-white shadow-xs relative">
                        {/* Inner card header */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-4">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                              <Icon size={14} className={meta.color} />
                            </div>
                            <h3 className="text-sm font-bold text-slate-900">{meta.label} Workspace</h3>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                const subject = contentObj.subject || "";
                                const body = contentObj.content || "";
                                const textToCopy = (typeId === "email_campaign" || typeId === "newsletter") && subject
                                  ? `Subject: ${subject}\n\n${body}`
                                  : body;
                                navigator.clipboard.writeText(textToCopy);
                                setMessage("Copied content to clipboard.");
                              }}
                              className="inline-flex items-center gap-1 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 text-[11px] font-bold cursor-pointer transition"
                              title="Copy"
                            >
                              <Copy size={11} /> Copy
                            </button>
                            <button
                              onClick={() => saveDraft(typeId, contentObj)}
                              className="inline-flex items-center gap-1 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 text-[11px] font-bold cursor-pointer transition"
                              title="Save Draft"
                            >
                              <Bookmark size={11} /> Save Draft
                            </button>
                            <button
                              onClick={() => duplicateContent(typeId, contentObj)}
                              className="inline-flex items-center gap-1 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 text-[11px] font-bold cursor-pointer transition"
                              title="Duplicate"
                            >
                              <Plus size={11} /> Duplicate
                            </button>
                            <button
                              onClick={() => handleDownloadTxt(typeId, contentObj)}
                              className="inline-flex items-center gap-1 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 text-[11px] font-bold cursor-pointer transition"
                              title="Download TXT"
                            >
                              <Download size={11} /> Download TXT
                            </button>
                            {(typeId === "email_campaign" || typeId === "newsletter") && (
                              <button
                                onClick={() => handleSendEmail(contentObj)}
                                className="inline-flex items-center gap-1 rounded bg-indigo-600 hover:bg-indigo-750 border border-indigo-650 text-white px-2.5 py-1 text-[11px] font-bold cursor-pointer transition shadow-2xs"
                                title="Send Email"
                              >
                                <Send size={11} /> Send Email
                              </button>
                            )}
                          </div>
                        </div>
                        {/* Real Metadata bar */}
                        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 bg-slate-50 border border-slate-150 rounded-xl p-3 mb-4 text-xs font-semibold">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Content Type</span>
                            <span className="font-bold text-slate-800 mt-0.5">{meta.label} Post</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Generated Time</span>
                            <span className="font-bold text-slate-800 mt-0.5">{generatedTime}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Word Count</span>
                            <span className="font-bold text-slate-800 mt-0.5">{wordCount} words</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Character Count</span>
                            <span className="font-bold text-slate-800 mt-0.5">{charCount} chars</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Last Modified</span>
                            <span className="font-bold text-slate-800 mt-0.5">{lastModified}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Status</span>
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold mt-0.5 justify-center ${
                              (contentObj.workflowStatus || "Draft") === "Draft" ? "bg-slate-100 text-slate-700" :
                              (contentObj.workflowStatus || "Draft") === "Pending Approval" ? "bg-amber-50 text-amber-700 ring-1 ring-amber-150" :
                              (contentObj.workflowStatus || "Draft") === "Approved" ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-150" :
                              (contentObj.workflowStatus || "Draft") === "Published" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" :
                              "bg-red-50 text-red-700 ring-1 ring-red-150"
                            }`}>
                              {contentObj.workflowStatus || "Draft"}
                            </span>
                          </div>
                        </div>

                        {/* Editor inputs */}
                        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                          {(typeId === "email_campaign" || typeId === "newsletter") && (
                            <input
                              value={contentObj.subject}
                              onChange={(e) => {
                                setContentByType(prev => ({
                                  ...prev,
                                  [typeId]: {
                                    ...prev[typeId],
                                    subject: e.target.value,
                                    lastModified: new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
                                  }
                                }));
                              }}
                              placeholder="Email Subject"
                              className="mb-2 w-full rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-400"
                            />
                          )}
                          <textarea
                            value={contentObj.content}
                            onChange={(e) => {
                              setContentByType(prev => ({
                                ...prev,
                                [typeId]: {
                                  ...prev[typeId],
                                  content: e.target.value,
                                  lastModified: new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
                                }
                              }));
                            }}
                            rows={8}
                            className="w-full resize-none bg-transparent px-2 py-1 text-sm text-slate-800 outline-none"
                          />
                        </div>

                        {/* Email Campaign Attachments integration if applicable */}
                        {(typeId === "email_campaign" || typeId === "newsletter") && (
                          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-slate-900">Attachments</p>
                              <button
                                type="button"
                                onClick={() => attachmentInputRef.current?.click()}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                              >
                                + Add from computer
                              </button>
                            </div>
                            {(contentObj.attachments || []).length > 0 ? (
                              <div className="mt-2 space-y-1.5">
                                {contentObj.attachments.map((file, idx) => (
                                  <div key={`${file.name}-${idx}`} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
                                    <span className="truncate text-xs font-medium text-slate-700">{file.name}</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setContentByType(prev => ({
                                          ...prev,
                                          [typeId]: {
                                            ...prev[typeId],
                                            attachments: (prev[typeId]?.attachments || []).filter((_, i) => i !== idx)
                                          }
                                        }));
                                      }}
                                      className="text-xs font-bold text-red-500 hover:text-red-700 bg-transparent border-0 cursor-pointer"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-2 text-xs text-slate-400">No attachments added.</p>
                            )}
                          </div>
                        )}
                        
                        {/* Publishing Workflow Buttons */}
                        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-2 items-center justify-between">
                          <div className="flex flex-wrap gap-1.5">
                            {/* Draft or Failed: Submit for Approval */}
                            {((contentObj.workflowStatus || "Draft") === "Draft" || (contentObj.workflowStatus || "Draft") === "Failed") && (
                              <button
                                onClick={() => updateWorkflowStatus(typeId, "Pending Approval")}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-700 px-3.5 py-1.5 text-xs font-bold transition cursor-pointer"
                              >
                                Submit for Approval
                              </button>
                            )}

                            {/* Pending Approval: Approve or Reject */}
                            {(contentObj.workflowStatus || "Draft") === "Pending Approval" && (
                              <>
                                <button
                                  onClick={() => updateWorkflowStatus(typeId, "Approved")}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3.5 py-1.5 text-xs font-bold transition cursor-pointer"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => updateWorkflowStatus(typeId, "Draft")}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-205 bg-red-50 hover:bg-red-100 text-red-700 px-3.5 py-1.5 text-xs font-bold transition cursor-pointer"
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            {/* Approved or Draft: Publish button */}
                            {((contentObj.workflowStatus || "Draft") === "Approved" || (contentObj.workflowStatus || "Draft") === "Draft") && (
                              <button
                                onClick={() => {
                                  if (typeId === "linkedin_post") {
                                    if (!linkedinConnected) {
                                      setMessage("Please connect your LinkedIn account first.");
                                      return;
                                    }
                                    submitPostAction("post_linkedin");
                                  } else if (typeId === "instagram_post") {
                                    if (!instagramConnected) {
                                      setMessage("Please connect your Instagram account first.");
                                      return;
                                    }
                                    setMessage("Instagram API Integration: Coming Soon.");
                                  } else if (typeId === "email_campaign" || typeId === "newsletter") {
                                    handleSendEmail(contentObj);
                                  } else {
                                    setMessage(`${meta.label} API Integration: Coming Soon.`);
                                  }
                                }}
                                disabled={submittingPost}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-650 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                              >
                                <Send size={11} /> Publish
                              </button>
                            )}

                            {/* Published: Done indicator */}
                            {(contentObj.workflowStatus || "Draft") === "Published" && (
                              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                                ✓ Published successfully
                              </span>
                            )}
                          </div>

                          {/* Social Connections Status buttons inside the card */}
                          <div className="flex flex-wrap gap-1.5">
                            {typeId === "linkedin_post" && !linkedinConnected && (
                              <button
                                onClick={handleLinkedinConnect}
                                className="inline-flex items-center gap-1 rounded-lg border border-blue-300 bg-white text-blue-700 hover:bg-blue-50 px-3 py-1 text-xs font-bold transition cursor-pointer"
                              >
                                Connect LinkedIn
                              </button>
                            )}
                            {typeId === "instagram_post" && !instagramConnected && (
                              <button
                                onClick={() => handleConnectProvider("instagram")}
                                className="inline-flex items-center gap-1 rounded-lg border border-pink-300 bg-white text-pink-700 hover:bg-pink-50 px-3 py-1 text-xs font-bold transition cursor-pointer"
                              >
                                Connect Instagram
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              /* Specific tab workspace view */
              <div className="space-y-4">
                {activeEditorTab && contentByType[activeEditorTab] ? (
                  (() => {
                    const typeId = activeEditorTab;
                    const contentObj = contentByType[typeId];
                    const meta = PLATFORM_META[typeId] || { label: typeId, Icon: FileText, color: "text-slate-600" };
                    const Icon = meta.Icon;
                    
                    const wordCount = (contentObj.content || "").trim().split(/\s+/).filter(Boolean).length;
                    const charCount = (contentObj.content || "").length;
                    const generatedTime = contentObj.generatedAt || "N/A";
                    const lastModified = contentObj.lastModified || "N/A";

                    return (
                      <div className="border border-slate-200 rounded-2xl p-5 bg-white shadow-xs">
                        
                        {/* Metadata bar */}
                        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 bg-slate-50 border border-slate-150 rounded-xl p-3 mb-4 text-xs font-semibold">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Content Type</span>
                            <span className="font-bold text-slate-800 mt-0.5">{meta.label} Post</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Generated Time</span>
                            <span className="font-bold text-slate-800 mt-0.5">{generatedTime}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Word Count</span>
                            <span className="font-bold text-slate-800 mt-0.5">{wordCount} words</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Character Count</span>
                            <span className="font-bold text-slate-800 mt-0.5">{charCount} chars</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Last Modified</span>
                            <span className="font-bold text-slate-800 mt-0.5">{lastModified}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Status</span>
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold mt-0.5 justify-center ${
                              (contentObj.workflowStatus || "Draft") === "Draft" ? "bg-slate-100 text-slate-700" :
                              (contentObj.workflowStatus || "Draft") === "Pending Approval" ? "bg-amber-50 text-amber-700 ring-1 ring-amber-150" :
                              (contentObj.workflowStatus || "Draft") === "Approved" ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-150" :
                              (contentObj.workflowStatus || "Draft") === "Published" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" :
                              "bg-red-50 text-red-700 ring-1 ring-red-150"
                            }`}>
                              {contentObj.workflowStatus || "Draft"}
                            </span>
                          </div>
                        </div>

                        {/* Card actions */}
                        <div className="flex flex-wrap items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                          <button
                            onClick={() => {
                              const subject = contentObj.subject || "";
                              const body = contentObj.content || "";
                              const textToCopy = (typeId === "email_campaign" || typeId === "newsletter") && subject
                                ? `Subject: ${subject}\n\n${body}`
                                : body;
                              navigator.clipboard.writeText(textToCopy);
                              setMessage("Copied content to clipboard.");
                            }}
                            className="inline-flex items-center gap-1 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1.5 text-xs font-bold cursor-pointer transition"
                            title="Copy"
                          >
                            <Copy size={12} /> Copy
                          </button>
                          <button
                            onClick={() => saveDraft(typeId, contentObj)}
                            className="inline-flex items-center gap-1 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1.5 text-xs font-bold cursor-pointer transition"
                            title="Save Draft"
                          >
                            <Bookmark size={12} /> Save Draft
                          </button>
                          <button
                            onClick={() => duplicateContent(typeId, contentObj)}
                            className="inline-flex items-center gap-1 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1.5 text-xs font-bold cursor-pointer transition"
                            title="Duplicate"
                          >
                            <Plus size={12} /> Duplicate
                          </button>
                          <button
                            onClick={() => handleDownloadTxt(typeId, contentObj)}
                            className="inline-flex items-center gap-1 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1.5 text-xs font-bold cursor-pointer transition"
                            title="Download TXT"
                          >
                            <Download size={12} /> Download TXT
                          </button>
                          {(typeId === "email_campaign" || typeId === "newsletter") && (
                            <button
                              onClick={() => handleSendEmail(contentObj)}
                              className="inline-flex items-center gap-1.5 rounded bg-indigo-600 hover:bg-indigo-755 border border-indigo-650 text-white px-3 py-1.5 text-xs font-bold cursor-pointer transition shadow-2xs"
                              title="Send Email"
                            >
                              <Send size={12} /> Send Email
                            </button>
                          )}
                        </div>

                        {/* Editor input fields */}
                        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                          {(typeId === "email_campaign" || typeId === "newsletter") && (
                            <input
                              value={contentObj.subject}
                              onChange={(e) => {
                                setContentByType(prev => ({
                                  ...prev,
                                  [typeId]: {
                                    ...prev[typeId],
                                    subject: e.target.value,
                                    lastModified: new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
                                  }
                                }));
                              }}
                              placeholder="Email Subject"
                              className="mb-2 w-full rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-400"
                            />
                          )}
                          <textarea
                            value={contentObj.content}
                            onChange={(e) => {
                              setContentByType(prev => ({
                                ...prev,
                                [typeId]: {
                                  ...prev[typeId],
                                  content: e.target.value,
                                  lastModified: new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
                                }
                              }));
                            }}
                            rows={14}
                            className="w-full resize-none bg-transparent px-2 py-1 text-sm text-slate-800 outline-none"
                          />
                        </div>

                        {/* Email Campaign Attachments integration if applicable */}
                        {(typeId === "email_campaign" || typeId === "newsletter") && (
                          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-slate-950">Attachments</p>
                              <button
                                type="button"
                                onClick={() => attachmentInputRef.current?.click()}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                              >
                                + Add from computer
                              </button>
                            </div>
                            {(contentObj.attachments || []).length > 0 ? (
                              <div className="mt-2 space-y-1.5">
                                {contentObj.attachments.map((file, idx) => (
                                  <div key={`${file.name}-${idx}`} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
                                    <span className="truncate text-xs font-medium text-slate-750">{file.name}</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setContentByType(prev => ({
                                          ...prev,
                                          [typeId]: {
                                            ...prev[typeId],
                                            attachments: (prev[typeId]?.attachments || []).filter((_, i) => i !== idx)
                                          }
                                        }));
                                      }}
                                      className="text-xs font-bold text-red-500 hover:text-red-700 bg-transparent border-0 cursor-pointer"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-2 text-xs text-slate-400">No attachments added.</p>
                            )}
                          </div>
                        )}
                        
                        {/* Publishing Workflow Buttons */}
                        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-2 items-center justify-between">
                          <div className="flex flex-wrap gap-1.5">
                            {/* Draft or Failed: Submit for Approval */}
                            {((contentObj.workflowStatus || "Draft") === "Draft" || (contentObj.workflowStatus || "Draft") === "Failed") && (
                              <button
                                onClick={() => updateWorkflowStatus(typeId, "Pending Approval")}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-700 px-3.5 py-1.5 text-xs font-bold transition cursor-pointer"
                              >
                                Submit for Approval
                              </button>
                            )}

                            {/* Pending Approval: Approve or Reject */}
                            {(contentObj.workflowStatus || "Draft") === "Pending Approval" && (
                              <>
                                <button
                                  onClick={() => updateWorkflowStatus(typeId, "Approved")}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3.5 py-1.5 text-xs font-bold transition cursor-pointer"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => updateWorkflowStatus(typeId, "Draft")}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-205 bg-red-50 hover:bg-red-100 text-red-700 px-3.5 py-1.5 text-xs font-bold transition cursor-pointer"
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            {/* Approved or Draft: Publish button */}
                            {((contentObj.workflowStatus || "Draft") === "Approved" || (contentObj.workflowStatus || "Draft") === "Draft") && (
                              <button
                                onClick={() => {
                                  if (typeId === "linkedin_post") {
                                    if (!linkedinConnected) {
                                      setMessage("Please connect your LinkedIn account first.");
                                      return;
                                    }
                                    submitPostAction("post_linkedin");
                                  } else if (typeId === "instagram_post") {
                                    if (!instagramConnected) {
                                      setMessage("Please connect your Instagram account first.");
                                      return;
                                    }
                                    setMessage("Instagram API Integration: Coming Soon.");
                                  } else if (typeId === "email_campaign" || typeId === "newsletter") {
                                    handleSendEmail(contentObj);
                                  } else {
                                    setMessage(`${meta.label} API Integration: Coming Soon.`);
                                  }
                                }}
                                disabled={submittingPost}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-650 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                              >
                                <Send size={11} /> Publish
                              </button>
                            )}

                            {/* Published: Done indicator */}
                            {(contentObj.workflowStatus || "Draft") === "Published" && (
                              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                                ✓ Published successfully
                              </span>
                            )}
                          </div>

                          {/* Social Connections Status buttons inside the card */}
                          <div className="flex flex-wrap gap-1.5">
                            {typeId === "linkedin_post" && !linkedinConnected && (
                              <button
                                onClick={handleLinkedinConnect}
                                className="inline-flex items-center gap-1 rounded-lg border border-blue-300 bg-white text-blue-700 hover:bg-blue-50 px-3 py-1 text-xs font-bold transition cursor-pointer"
                              >
                                Connect LinkedIn
                              </button>
                            )}
                            {typeId === "instagram_post" && !instagramConnected && (
                              <button
                                onClick={() => handleConnectProvider("instagram")}
                                className="inline-flex items-center gap-1 rounded-lg border border-pink-300 bg-white text-pink-700 hover:bg-pink-50 px-3 py-1 text-xs font-bold transition cursor-pointer"
                              >
                                Connect Instagram
                              </button>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })()
                ) : (
                  <p className="text-xs text-slate-400 italic py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No content generated for this platform type yet. Choose it in strategy suggestions above and generate.
                  </p>
                )}
              </div>
            )}
            
          </div>
          
        </section>

      </div>

      {showEmailPopup ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="flex h-full max-h-[90vh] w-full max-w-6xl flex-col space-y-3 rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-semibold text-slate-900">Email Campaign Setup</h3>
              <button onClick={() => setShowEmailPopup(false)} className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-800 bg-transparent border-0 cursor-pointer">
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
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 cursor-pointer"
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
                     className="absolute right-1 top-1 rounded-md bg-slate-900 px-3 py-1 text-xs font-semibold text-white transition-all hover:bg-slate-800 border-0 cursor-pointer"
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
                        className="font-bold text-slate-400 transition-colors hover:text-red-500 bg-transparent border-0 cursor-pointer"
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
                    className="w-full rounded-lg border border-slate-300 bg-slate-55 px-4 py-2 text-sm outline-none transition-all focus:border-indigo-400 focus:bg-white"
                  />
                  <div className="max-h-56 overflow-y-auto pr-2">
                    <div className="space-y-2">
                      {filteredUsers.map((u) => (
                        <label key={u.id} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-105 p-3 transition-colors hover:bg-slate-50">
                          <div>
                            <p className="text-sm font-semibold text-slate-850">{u.name}</p>
                            <p className="text-xs text-slate-500">{u.email}</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={selectedUserRecipients.includes(u.id)}
                            onChange={(e) => updateSelectedUsers(u.id, e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-650 focus:ring-indigo-500"
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
                          className="min-w-0 flex-1 text-left font-medium bg-transparent border-0 cursor-pointer"
                        >
                          <span className="block truncate">{email}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeRecipient(email)}
                          className="ml-2 rounded p-1 text-slate-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-650 group-hover:opacity-100 bg-transparent border-0 cursor-pointer"
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
                        <>Editing email for <span className="text-indigo-650">{activeRecipient}</span></>
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
                       className="w-full rounded-lg border border-slate-300 bg-slate-55 px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100 disabled:opacity-60"
                     />
                   </div>
                   
                   <div className="flex-1">
                     <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Email Body</label>
                     <textarea
                       rows={12}
                       disabled={!activeRecipient}
                       value={activeRecipient ? recipientDrafts[activeRecipient]?.body ?? baseEmailBody : ""}
                       onChange={(e) => updateRecipientDraft(activeRecipient, { body: e.target.value })}
                       className="w-full resize-none rounded-lg border border-slate-300 bg-slate-55 px-4 py-3 text-sm outline-none transition-all focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100 disabled:opacity-60"
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
                      disabled={!aiEditingRecipient && (!activeRecipient || !aiPromptForRecipient.trim())}
                      className="whitespace-nowrap rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 disabled:opacity-50 border-0 cursor-pointer"
                    >
                      <span className="inline-flex items-center gap-2">
                        {aiEditingRecipient ? <LoadingSpinner /> : null}
                        {aiEditingRecipient ? "Stop" : "Apply AI Edit"}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                    <button
                      onClick={() => handleSendEmail(null, activeRecipient)}
                      disabled={!activeRecipient}
                      className="rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 px-5 py-2.5 text-sm font-semibold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Send size={14} /> Send Email to Recipient
                    </button>
                    <button
                      onClick={saveDraftForRecipient}
                      disabled={!activeRecipient || savingRecipientDraft}
                      className="rounded-lg border border-slate-205 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                    >
                      {savingRecipientDraft ? "Saving..." : "Save Draft"}
                    </button>
                 </div>
              </div>
            </div>

             <div className="pt-2 flex gap-3">
                <button
                  onClick={() => submitPostAction("send_all")}
                  disabled={submittingPost || allRecipients.length === 0}
                  className="flex-1 rounded-xl bg-slate-900 px-4 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:scale-[0.99] hover:bg-slate-800 hover:shadow-lg disabled:opacity-50 border-0 cursor-pointer"
                >
                  {submittingPost ? "Sending Campaign..." : `Send to ${allRecipients.length} Recipient${allRecipients.length !== 1 ? 's' : ''}`}
                </button>
                <button
                  onClick={() => handleSendEmail(null)}
                  disabled={allRecipients.length === 0}
                  className="flex-1 rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:scale-[0.99] hover:bg-indigo-700 hover:shadow-lg disabled:opacity-50 border-0 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Send size={14} /> Send Email (Outlook/Gmail)
                </button>
             </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
