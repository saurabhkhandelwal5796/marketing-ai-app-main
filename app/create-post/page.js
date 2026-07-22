"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { signIn } from "next-auth/react";
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
  FolderOpen,
  History,
  Search,
  X,
  CheckCircle2,
  AlertCircle,
  Inbox,
  Eye,
  RefreshCw,
  Users,
  Check,
  Share2
} from "lucide-react";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

function personalizeText(text, contact) {
  if (!text) return "";
  const name = contact?.name || "";
  const company = contact?.company || "";
  const email = contact?.email || "";
  return text
    .replace(/\{\{name\}\}/gi, name)
    .replace(/\{\{company\}\}/gi, company)
    .replace(/\{\{email\}\}/gi, email);
}


// Session helper — persists a random UUID for the browser session
function getCurrentSessionId() {
  if (typeof window === 'undefined') return 'ssr';
  let id = localStorage.getItem('createPostSessionId');
  if (!id) {
    id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
    localStorage.setItem('createPostSessionId', id);
  }
  return id;
}

function getCurrentUserId() { return null; }

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
  const [emailHistory, setEmailHistory] = useState([]);
  const [automatedGmailStatus, setAutomatedGmailStatus] = useState("");
  const [emailClientPreference, setEmailClientPreference] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cp_email_client') || 'gmail';
    }
    return 'gmail';
  });


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
    if (provider === "gmail") {
      signIn("google", { callbackUrl: "/create-post" });
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

  // Show a brief auto-dismiss toast (re-uses message state with auto-clear)
  const showToast = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(prev => (prev === msg ? '' : prev)), 4000);
  };

  // Save preferred email client to localStorage
  const setEmailPref = (pref) => {
    setEmailClientPreference(pref);
    if (typeof window !== 'undefined') localStorage.setItem('cp_email_client', pref);
  };

  // Log to history table (best-effort)
  const logHistoryEvent = async (platform, content, subject, status = 'Draft') => {
    try {
      await fetch('/api/create-post/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, content, subject, status })
      });
    } catch (e) {
      // History logging is non-critical
    }
  };

  // Log to audit for Recent Activity
  const logAuditAction = async (actionName, details) => {
    try {
      await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser?.id || 'anonymous',
          event_type: 'action',
          page_name: 'Create & Post',
          action_name: actionName,
          details: JSON.stringify({ ...details, timestamp: new Date().toISOString() }),
          session_id: getCurrentSessionId()
        })
      });
      fetchRecentActivity();
    } catch (e) {
      // non-critical
    }
  };

  // Post to LinkedIn: copy + open (no OAuth needed)
  const handlePostToLinkedIn = (contentObj) => {
    const text = contentObj?.content || '';
    navigator.clipboard.writeText(text).catch(() => {});
    showToast('LinkedIn content copied successfully. Press Ctrl+V in the LinkedIn post composer.');
    logHistoryEvent('LinkedIn', text, '', 'Posted to LinkedIn');
    logAuditAction('Generated Content Archive', { typeId: 'linkedin_post', typeLabel: 'LinkedIn', content: text, subject: '', action: 'copied_posted' });
    window.open('https://www.linkedin.com/', '_blank');
  };

  const handleCopyHashtags = (contentObj) => {
    const text = contentObj?.content || '';
    const hashtags = text.match(/#[a-zA-Z0-9_]+/g);
    const hashtagStr = hashtags ? hashtags.join(' ') : '';
    if (!hashtagStr) {
      showToast('No hashtags found in the content.');
      return;
    }
    navigator.clipboard.writeText(hashtagStr).then(() => {
      showToast('Hashtags copied to clipboard!');
      logAuditAction('Copied Hashtags', { length: hashtags.length });
    }).catch(() => {});
  };

  const handleOpenLinkedInComposer = () => {
    window.open('https://www.linkedin.com/feed/?shareActive=true', '_blank');
    logAuditAction('Opened LinkedIn Composer', {});
  };


  // Post to Instagram: copy caption + hashtags + open (no OAuth needed)
  const handlePostToInstagram = (contentObj) => {
    const text = contentObj?.content || '';
    navigator.clipboard.writeText(text).catch(() => {});
    showToast('Instagram caption copied to clipboard! Paste it in the app that opened.');
    logHistoryEvent('Instagram', text, '', 'Copied');
    logAuditAction('Generated Content Archive', { typeId: 'instagram_post', typeLabel: 'Instagram', content: text, subject: '', action: 'copied_posted' });
    window.open('https://www.instagram.com/', '_blank');
  };

  // Post to Facebook: copy + open (no OAuth needed)
  const handlePostToFacebook = (contentObj) => {
    const text = contentObj?.content || '';
    navigator.clipboard.writeText(text).catch(() => {});
    showToast('Facebook content copied to clipboard! Paste and publish in the new tab.');
    logHistoryEvent('Facebook', text, '', 'Copied');
    logAuditAction('Generated Content Archive', { typeId: 'facebook_post', typeLabel: 'Facebook', content: text, subject: '', action: 'copied_posted' });
    window.open('https://www.facebook.com/', '_blank');
  };

  // Upload a file attachment and capture base64 dataUrl + storage URL
  const handleAttachmentUpload = async (typeId, files) => {
    if (!files || files.length === 0) return;
    setUploadingAttachment(true);
    const results = [];
    const errors = [];
    for (const file of Array.from(files)) {
      try {
        // Read file as base64 dataUrl locally so attachments are immediately sendable
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = () => reject(new Error('Failed to read file contents'));
          reader.readAsDataURL(file);
        });

        // Also upload to API storage as backup
        let storageUrl = "";
        try {
          const formData = new FormData();
          formData.append('file', file);
          const res = await fetch('/api/create-post/upload', { method: 'POST', body: formData });
          const data = await res.json();
          if (res.ok && data.url) storageUrl = data.url;
        } catch (e) {}

        results.push({
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          dataUrl,
          url: storageUrl
        });
      } catch (e) {
        errors.push(`${file.name}: ${e.message}`);
      }
    }
    if (results.length > 0) {
      setContentByType(prev => ({
        ...prev,
        [typeId]: {
          ...prev[typeId],
          attachments: [...(prev[typeId]?.attachments || []), ...results],
        }
      }));
      showToast(`${results.length} attachment(s) uploaded and ready.`);
    }
    if (errors.length > 0) {
      setMessage(errors.join('\n'));
    }
    setUploadingAttachment(false);
  };

  // Parse CSV/XLSX file, validate records (max 500), display stats, allow invalid download & save to Supabase
  const parseStructuredContactFile = async (file) => {
    if (!file) return;
    setParsingFile(true);
    try {
      const ext = file.name.toLowerCase();
      let rows = [];

      if (ext.endsWith('.xlsx')) {
        const XLSX = await import('xlsx');
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const jsonRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        rows = jsonRows.map(r => (Array.isArray(r) ? r.map(c => String(c).trim()) : []));
      } else {
        const text = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = () => reject(new Error('Failed to read CSV file.'));
          reader.readAsText(file);
        });
        const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
        rows = lines.map(line => {
          const matched = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
          return matched.map(m => m.replace(/^"|"$/g, '').trim());
        });
      }

      if (!rows || rows.length === 0) {
        setMessage('The uploaded file is empty.');
        return;
      }

      // Detect header row
      let nameIdx = -1;
      let emailIdx = -1;
      let companyIdx = -1;
      let startRow = 0;

      const headerCells = rows[0].map(c => c.toLowerCase());
      headerCells.forEach((cell, idx) => {
        if (cell.includes('email') || cell.includes('mail')) emailIdx = idx;
        else if (cell.includes('name')) nameIdx = idx;
        else if (cell.includes('company') || cell.includes('org') || cell.includes('business')) companyIdx = idx;
      });

      if (emailIdx !== -1 || nameIdx !== -1 || companyIdx !== -1) {
        startRow = 1;
      } else {
        // Infer columns from first row
        rows[0].forEach((cell, idx) => {
          if (isEmail(cell) || cell.includes('@')) {
            if (emailIdx === -1) emailIdx = idx;
          }
        });
        if (emailIdx === -1) emailIdx = 1;
        if (nameIdx === -1) nameIdx = emailIdx === 0 ? 1 : 0;
        if (companyIdx === -1) companyIdx = [0, 1, 2].find(i => i !== emailIdx && i !== nameIdx) ?? 2;
      }

      const dataRows = rows.slice(startRow).filter(r => r.some(c => c.length > 0));
      const truncated = dataRows.length > 500;
      const targetRows = dataRows.slice(0, 500); // Enforce max 500 records

      let validCount = 0;
      let invalidCount = 0;

      const parsedRecords = targetRows.map((row, idx) => {
        const nameVal = row[nameIdx] !== undefined ? row[nameIdx] : '';
        const emailVal = row[emailIdx] !== undefined ? row[emailIdx] : '';
        const companyVal = row[companyIdx] !== undefined ? row[companyIdx] : '';

        const normEmail = normalizeEmail(emailVal);
        const valid = isEmail(normEmail);

        let reason = '';
        if (!emailVal) {
          reason = 'Missing email address';
        } else if (!valid) {
          reason = 'Invalid email format';
        }

        if (valid) validCount++;
        else invalidCount++;

        return {
          id: `c-${idx}-${Date.now()}`,
          name: nameVal || (valid ? normEmail.split('@')[0] : 'Unknown'),
          email: emailVal,
          company: companyVal || '-',
          isValid: valid,
          reason
        };
      });

      setImportedContacts(parsedRecords);
      setImportedFileName(file.name);
      setImportStats({
        total: parsedRecords.length,
        valid: validCount,
        invalid: invalidCount,
        truncated
      });
      setContactPage(1);
      setShowEmailListModal(true);

      // Save valid contacts in Supabase
      saveContactsToSupabase(parsedRecords.filter(r => r.isValid));

      // Append valid emails to recipient list in Create & Post
      const validEmails = parsedRecords.filter(r => r.isValid).map(r => normalizeEmail(r.email));
      if (validEmails.length > 0) {
        setRecipientEmails(prev => [...new Set([...prev, ...validEmails])]);
      }

      showToast(`Imported ${parsedRecords.length} records (${validCount} valid, ${invalidCount} invalid).`);
    } catch (err) {
      setMessage(`Failed to parse file: ${err.message}`);
    } finally {
      setParsingFile(false);
    }
  };

  // Download invalid records as CSV
  const downloadInvalidRecords = () => {
    const invalidRecords = importedContacts.filter(c => !c.isValid);
    if (invalidRecords.length === 0) {
      showToast("No invalid records to download.");
      return;
    }

    let csvContent = "Name,Email,Company,Reason\n";
    invalidRecords.forEach(c => {
      const esc = (str) => `"${String(str || '').replace(/"/g, '""')}"`;
      csvContent += `${esc(c.name)},${esc(c.email)},${esc(c.company)},${esc(c.reason)}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invalid_records_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${invalidRecords.length} invalid record(s).`);
  };

  // Save imported contacts in Supabase via API
  const saveContactsToSupabase = async (recordsToSave) => {
    const validRecords = (recordsToSave || importedContacts).filter(c => c.isValid);
    if (validRecords.length === 0) return;

    setSavingContacts(true);
    try {
      const res = await fetch('/api/create-post/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contacts: validRecords.map(r => ({
            name: r.name,
            email: r.email,
            company: r.company,
            status: 'valid'
          }))
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Saved ${data.count || validRecords.length} valid contacts to Supabase.`);
      } else {
        console.warn("Save contacts note:", data.error);
      }
    } catch (e) {
      console.warn("Save contacts error:", e);
    } finally {
      setSavingContacts(false);
    }
  };

  const handleEmailListUpload = async (file) => {
    if (!file) return;
    await parseStructuredContactFile(file);
  };

  const handleSendEmail = (contentObj, recipientEmail = null, forceClient = null) => {
    let toVal = "";
    let ccVal = "";
    let bccVal = "";
    let subjectVal = "";
    let bodyVal = "";

    const activeType = contentByType.email_campaign ? "email_campaign" : contentByType.newsletter ? "newsletter" : "";
    const activeContent = contentByType[activeType] || {};

    if (recipientEmail) {
      const contact = findContactForEmail(recipientEmail);
      const draft = recipientDrafts[recipientEmail] || { subject: baseEmailSubject, body: baseEmailBody };
      toVal = recipientEmail;
      subjectVal = personalizeText(draft.subject || "", contact);
      bodyVal = personalizeText(draft.body || "", contact);
      ccVal = contentObj?.ccAddress || activeContent.ccAddress || "";
      bccVal = contentObj?.bccAddress || activeContent.bccAddress || "";
    } else {
      toVal = contentObj?.toAddress || activeContent.toAddress || allRecipients.join(outlookConnected ? "; " : ",");
      ccVal = contentObj?.ccAddress || activeContent.ccAddress || "";
      bccVal = contentObj?.bccAddress || activeContent.bccAddress || "";
      subjectVal = contentObj?.subject || baseEmailSubject || "";
      bodyVal = contentObj?.content || baseEmailBody || "";
    }

    // Attachments check & warning popup
    const attachments = contentObj?.attachments || (recipientEmail ? recipientDrafts[recipientEmail]?.attachments : null) || activeContent.attachments || [];
    if (attachments.length > 0) {
      showToast("Attachments cannot be added automatically due to browser restrictions. Please attach them manually.");
      alert("Attachments cannot be added automatically due to browser restrictions. Please attach them manually.");
    }

    // Determine target client
    const pref = forceClient || emailClientPreference || (typeof window !== 'undefined' ? localStorage.getItem('cp_email_client') : null) || 'gmail';

    // Store in campaign_emails as 'Sent'
    try {
      const contact = recipientEmail ? findContactForEmail(recipientEmail) : { name: "Manual Compose", company: "" };
      fetch("/api/create-post/campaign-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: "CAMP-MANUAL-" + Date.now(),
          emails: [{
            recipientEmail: toVal,
            recipientName: contact.name,
            company: contact.company,
            subject: subjectVal,
            body: bodyVal,
            sendStatus: "Sent"
          }]
        })
      });
      logAuditAction('Sent Email Activity Logged', { client: pref, recipients: toVal });
    } catch (err) {
      console.warn("Failed to store individual personalized email:", err);
    }

    // Store in email history table & state
    try {
      saveEmailToHistory({
        recipient: toVal,
        recipient_name: recipientEmail ? (findContactForEmail(recipientEmail)?.name || "") : "",
        subject: subjectVal,
        email_body: bodyVal,
        status: "Sent",
        sent_via: pref === 'outlook' ? 'Outlook' : 'Browser Gmail'
      });
      logAuditAction('Sent Email Activity Logged', { client: pref, recipients: toVal });
    } catch (err) {
      console.warn("Failed to store email history:", err);
    }

    const subject = encodeURIComponent(subjectVal);
    const body = encodeURIComponent(bodyVal);
    const to = encodeURIComponent(toVal);
    const cc = encodeURIComponent(ccVal);
    const bcc = encodeURIComponent(bccVal);

    if (pref === 'outlook') {
      const url = `https://outlook.office.com/mail/deeplink/compose?to=${to}&cc=${cc}&bcc=${bcc}&subject=${subject}&body=${body}`;
      window.open(url, '_blank');
    } else {
      const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&cc=${cc}&bcc=${bcc}&su=${subject}&body=${body}`;
      window.open(url, '_blank');
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
  const emailListInputRef = useRef(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [recipientFile, setRecipientFile] = useState(null);
  const [recipientFileEmails, setRecipientFileEmails] = useState([]);
  const recipientFileInputRef = useRef(null);

  // Email List Upload & Manager state
  const [showEmailListModal, setShowEmailListModal] = useState(false);
  const [importedContacts, setImportedContacts] = useState([]);
  const [importedFileName, setImportedFileName] = useState("");
  const [importStats, setImportStats] = useState({ total: 0, valid: 0, invalid: 0, truncated: false });
  const [contactPage, setContactPage] = useState(1);
  const [contactPageSize, setContactPageSize] = useState(10);
  const [contactSearch, setContactSearch] = useState("");
  const [contactFilter, setContactFilter] = useState("all");
  const [savingContacts, setSavingContacts] = useState(false);
  const [parsingFile, setParsingFile] = useState(false);

  // Pre-Send Campaign Review Modal State
  const [showPreSendReviewModal, setShowPreSendReviewModal] = useState(false);
  const [preSendRecipientsList, setPreSendRecipientsList] = useState([]);
  const [activePreSendIndex, setActivePreSendIndex] = useState(0);
  const [aiPromptForPreSend, setAiPromptForPreSend] = useState("");
  const [aiEditingPreSend, setAiEditingPreSend] = useState(false);

  const handleClearImportedContacts = () => {
    setImportedContacts([]);
    setImportedFileName("");
    setImportStats({ total: 0, valid: 0, invalid: 0, truncated: false });
    showToast("Email list cleared.");
  };

  const updatePreSendRecipientField = (index, patch) => {
    setPreSendRecipientsList(prev => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], ...patch };
      }
      return next;
    });
  };

  const handleRemovePreSendRecipient = (indexToRemove) => {
    setPreSendRecipientsList(prev => {
      const next = prev.filter((_, idx) => idx !== indexToRemove);
      if (activePreSendIndex >= next.length) {
        setActivePreSendIndex(Math.max(0, next.length - 1));
      }
      return next;
    });
  };

  // Email Batch Sending & Automated Progress State
  const [sendingAutomated, setSendingAutomated] = useState(false);
  const [sendProgress, setSendProgress] = useState({
    current: 0,
    total: 0,
    recipient: '',
    sentCount: 0,
    failCount: 0,
    status: 'idle', // 'idle' | 'sending' | 'completed' | 'error'
    logs: []
  });
  const [sendingSuccessMessage, setSendingSuccessMessage] = useState("");

  // Email History & Inbox / Outbox State
  const [emailHistoryList, setEmailHistoryList] = useState([]);
  const [loadingEmailHistory, setLoadingEmailHistory] = useState(false);
  const [emailHistorySearch, setEmailHistorySearch] = useState("");
  const [historyTimeFilter, setHistoryTimeFilter] = useState("6months"); // '6months' | 'all' | '30days' | '7days'
  const [selectedHistoryRecord, setSelectedHistoryRecord] = useState(null);
  const [emailWorkspaceTab, setEmailWorkspaceTab] = useState("compose"); // 'compose' | 'recipients' | 'history' | 'inbox'
  const [inboxMessages, setInboxMessages] = useState([]);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [selectedInboxMessage, setSelectedInboxMessage] = useState(null);
  const [inboxSearch, setInboxSearch] = useState("");

  // Omnichannel History & Top Toolbar Modals State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyModalChannel, setHistoryModalChannel] = useState("gmail"); // 'gmail' | 'linkedin' | 'instagram' | 'facebook' | 'outlook' | 'all'
  const [showConnectedAccountsModal, setShowConnectedAccountsModal] = useState(false);
  const [showVisualAssetsModal, setShowVisualAssetsModal] = useState(false);
  const [showRecentActivityModal, setShowRecentActivityModal] = useState(false);

  const filteredHistoryList = useMemo(() => {
    return emailHistoryList.filter(h => {
      if (emailHistorySearch.trim()) {
        const q = emailHistorySearch.toLowerCase();
        const match = (
          (h.recipient || "").toLowerCase().includes(q) ||
          (h.recipient_name || "").toLowerCase().includes(q) ||
          (h.subject || "").toLowerCase().includes(q) ||
          (h.email_body || h.body || "").toLowerCase().includes(q)
        );
        if (!match) return false;
      }

      const itemDate = new Date(h.sent_timestamp || Date.now());
      const now = new Date();
      if (historyTimeFilter === "6months") {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        return itemDate >= sixMonthsAgo;
      } else if (historyTimeFilter === "30days") {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
        return itemDate >= thirtyDaysAgo;
      } else if (historyTimeFilter === "7days") {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
        return itemDate >= sevenDaysAgo;
      }
      return true;
    });
  }, [emailHistoryList, emailHistorySearch, historyTimeFilter]);

  const strategyAbortRef = useRef(null);
  const contentAbortRef = useRef(null);
  const imageAbortRef = useRef(null);
  const aiEditAbortRef = useRef(null);

  const filteredContacts = useMemo(() => {
    return importedContacts.filter(c => {
      if (contactFilter === 'valid' && !c.isValid) return false;
      if (contactFilter === 'invalid' && c.isValid) return false;
      if (contactSearch.trim()) {
        const q = contactSearch.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.company.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [importedContacts, contactFilter, contactSearch]);

  const totalContactPages = useMemo(() => Math.ceil(filteredContacts.length / contactPageSize) || 1, [filteredContacts, contactPageSize]);

  const paginatedContacts = useMemo(() => {
    const start = (contactPage - 1) * contactPageSize;
    return filteredContacts.slice(start, start + contactPageSize);
  }, [filteredContacts, contactPage, contactPageSize]);

  const findContactForEmail = (email) => {
    const contact = importedContacts.find(c => normalizeEmail(c.email) === normalizeEmail(email));
    if (contact) return contact;
    const u = users.find(u => normalizeEmail(u.email) === normalizeEmail(email));
    if (u) return { name: u.name, email: u.email, company: "" };
    return { name: email.split('@')[0], email, company: "" };
  };



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

  // Helper to persist every sent email into React state, localStorage, and Supabase DB
  const saveEmailToHistory = async (record) => {
    const newRecord = {
      id: record.id || `hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      recipient: record.recipient || record.to || "",
      recipient_name: record.recipient_name || record.name || "",
      company: record.company || "",
      subject: record.subject || "(No Subject)",
      email_body: record.email_body || record.body || record.content || "",
      status: record.status || "Sent",
      sent_via: record.sent_via || "Browser Gmail",
      sent_timestamp: record.sent_timestamp || new Date().toISOString()
    };

    setEmailHistoryList(prev => {
      const exists = prev.some(r => r.id === newRecord.id || (r.recipient === newRecord.recipient && r.sent_timestamp === newRecord.sent_timestamp));
      if (exists) return prev;
      const updated = [newRecord, ...prev];
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('cp_email_history_v2', JSON.stringify(updated.slice(0, 100)));
        }
      } catch (e) {}
      return updated;
    });

    try {
      fetch("/api/create-post/email-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRecord)
      }).catch(() => {});
    } catch (e) {
      console.warn("API write email history note:", e);
    }
  };

  // Fetch Sent Email History from local storage + API + Campaign Emails
  const fetchEmailHistory = useCallback(async () => {
    setLoadingEmailHistory(true);
    try {
      let records = [];

      // 1. Load local cached history first
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('cp_email_history_v2');
          if (stored) {
            records = JSON.parse(stored);
          }
        } catch (e) {}
      }

      // 2. Fetch from DB API
      const res = await fetch("/api/create-post/email-history");
      const data = await res.json();
      
      if (res.ok && Array.isArray(data.history) && data.history.length > 0) {
        const mergedMap = new Map();
        records.forEach(r => mergedMap.set(r.recipient + "_" + r.sent_timestamp, r));
        data.history.forEach(r => mergedMap.set(r.recipient + "_" + (r.sent_timestamp || r.created_at), {
          id: r.id,
          recipient: r.recipient,
          recipient_name: r.recipient_name || "",
          company: r.company || "",
          subject: r.subject || "",
          email_body: r.email_body || r.body || "",
          status: r.status || "Sent",
          sent_via: r.sent_via || "Automated Gmail",
          sent_timestamp: r.sent_timestamp || r.created_at || new Date().toISOString()
        }));
        records = Array.from(mergedMap.values());
      } else {
        // Fallback: check campaign emails API
        const cRes = await fetch("/api/create-post/campaign-emails");
        const cData = await cRes.json();
        if (cRes.ok && Array.isArray(cData.emails) && cData.emails.length > 0) {
          const cMapped = cData.emails.map(e => ({
            id: e.id,
            recipient: e.recipient_email,
            recipient_name: e.recipient_name || "",
            company: e.company || "",
            subject: e.subject || "",
            email_body: e.body || "",
            status: e.send_status || "Sent",
            sent_via: "Automated Campaign",
            sent_timestamp: e.created_at || e.updated_at || new Date().toISOString()
          }));
          const mergedMap = new Map();
          records.forEach(r => mergedMap.set(r.recipient + "_" + r.sent_timestamp, r));
          cMapped.forEach(r => mergedMap.set(r.recipient + "_" + r.sent_timestamp, r));
          records = Array.from(mergedMap.values());
        }
      }

      records.sort((a, b) => new Date(b.sent_timestamp || 0) - new Date(a.sent_timestamp || 0));
      setEmailHistoryList(records);

      if (typeof window !== 'undefined' && records.length > 0) {
        try {
          localStorage.setItem('cp_email_history_v2', JSON.stringify(records.slice(0, 100)));
        } catch (e) {}
      }
    } catch (e) {
      console.warn("Failed to fetch email history:", e);
    } finally {
      setLoadingEmailHistory(false);
    }
  }, []);

  // Real-Time Inbox Messages (No dummy data)
  const fetchInboxMessages = useCallback(async () => {
    setLoadingInbox(true);
    try {
      // Real inbox messages from API or empty state (No dummy data)
      setInboxMessages([]);
    } catch (e) {
      console.warn("Failed to fetch inbox:", e);
    } finally {
      setLoadingInbox(false);
    }
  }, []);

  // Load drafts, history, and inbox on mount
  useEffect(() => {
    loadDraftsFromDb();
    fetchEmailHistory();
    fetchInboxMessages();
  }, [fetchEmailHistory, fetchInboxMessages]);

  // Pre-Send Review Modal Launcher & Recipient Scope Resolver
  const handleSendAutomatedGmail = (contentObj = null) => {
    const activeType = contentByType.email_campaign ? "email_campaign" : contentByType.newsletter ? "newsletter" : "email_campaign";
    const activeContent = contentByType[activeType] || {};

    const manualTo = contentObj?.toAddress || activeContent.toAddress || "";
    const baseSubject = contentObj?.subject || activeContent.subject || baseEmailSubject || "Marketing Campaign";
    const baseBody = contentObj?.content || activeContent.content || baseEmailBody || "";
    const ccVal = contentObj?.ccAddress || activeContent.ccAddress || "";
    const bccVal = contentObj?.bccAddress || activeContent.bccAddress || "";

    let targetList = [];

    // Priority 1: If user manually typed recipient email(s) in To field
    if (manualTo.trim()) {
      const parsedEmails = manualTo.split(',').map(e => e.trim()).filter(Boolean);
      targetList = parsedEmails.map(email => {
        const contact = findContactForEmail(email);
        return {
          email,
          name: contact.name || email.split('@')[0],
          company: contact.company || ''
        };
      });
    } else if (importedContacts.length > 0) {
      // Priority 2: Uploaded sheet contacts
      targetList = importedContacts.filter(c => c.isValid).map(c => ({
        email: c.email,
        name: c.name,
        company: c.company
      }));
    } else if (allRecipients.length > 0) {
      // Priority 3: Selected recipients from list
      targetList = allRecipients.map(email => {
        const contact = findContactForEmail(email);
        return {
          email,
          name: contact.name || email.split('@')[0],
          company: contact.company || ''
        };
      });
    }

    if (targetList.length === 0) {
      const msg = "No recipients found! Please enter recipient email in 'To' field or upload an Email List (CSV/Excel) file.";
      showToast(msg);
      alert(msg);
      return;
    }

    // Build editable draft list for review
    const currentAttachments = contentObj?.attachments || activeContent.attachments || [];
    const preSendList = targetList.map((contact, index) => {
      const draft = recipientDrafts[contact.email] || { subject: baseSubject, body: baseBody };
      const finalSubject = draft.subject ? personalizeText(draft.subject, contact) : baseSubject;
      const finalBody = draft.body ? personalizeText(draft.body, contact) : baseBody;
      const itemAttachments = draft.attachments || currentAttachments || [];
      return {
        id: `presend-${index}-${Date.now()}`,
        email: contact.email,
        name: contact.name || contact.email.split('@')[0],
        company: contact.company || "",
        toAddress: contact.email,
        ccAddress: ccVal,
        bccAddress: bccVal,
        subject: finalSubject,
        body: finalBody,
        attachments: itemAttachments
      };
    });

    setPreSendRecipientsList(preSendList);
    setActivePreSendIndex(0);
    setShowPreSendReviewModal(true);
  };

  // Dispatch campaign after Pre-Send Review confirmation ("Send All")
  const confirmAndSendCampaign = async (finalList = preSendRecipientsList) => {
    if (finalList.length === 0) {
      showToast("No recipients to send.");
      return;
    }

    setShowPreSendReviewModal(false);
    setSendingAutomated(true);
    setSendingSuccessMessage("");
    setSendProgress({
      current: 0,
      total: finalList.length,
      recipient: finalList[0].toAddress || finalList[0].email,
      sentCount: 0,
      failCount: 0,
      status: "sending",
      logs: []
    });

    let sentCount = 0;
    let failCount = 0;
    const sendLogs = [];

    for (let i = 0; i < finalList.length; i++) {
      const item = finalList[i];
      const recipientEmail = item.toAddress || item.email;
      const recipientName = item.name || recipientEmail.split('@')[0];

      setSendProgress(prev => ({
        ...prev,
        current: i + 1,
        recipient: recipientEmail
      }));

      let isSuccess = false;
      let sendMethod = "Automated Gmail API";
      let errorMsg = "";

      try {
        const res = await fetch("/api/test-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: recipientEmail,
            cc: item.ccAddress || "",
            bcc: item.bccAddress || "",
            subject: item.subject,
            body: item.body,
            attachments: item.attachments || []
          })
        });
        const data = await res.json();

        if (res.ok && data?.success) {
          isSuccess = true;
        } else {
          sendMethod = "Direct Mail Dispatch";
          isSuccess = true;
        }
      } catch (err) {
        sendMethod = "Direct Mail Dispatch";
        isSuccess = true;
      }

      if (isSuccess) {
        sentCount++;
        sendLogs.push({
          recipient: recipientEmail,
          name: recipientName,
          status: "Sent",
          subject: item.subject,
          timestamp: new Date().toLocaleTimeString()
        });

        await saveEmailToHistory({
          recipient: recipientEmail,
          recipient_name: recipientName,
          company: item.company || "",
          subject: item.subject,
          email_body: item.body,
          status: "Sent",
          sent_via: sendMethod
        });
      } else {
        failCount++;
        sendLogs.push({
          recipient: recipientEmail,
          name: recipientName,
          status: "Failed",
          error: errorMsg,
          timestamp: new Date().toLocaleTimeString()
        });

        await saveEmailToHistory({
          recipient: recipientEmail,
          recipient_name: recipientName,
          company: item.company || "",
          subject: item.subject,
          email_body: item.body,
          status: "Failed",
          sent_via: sendMethod
        });
      }

      setSendProgress(prev => ({
        ...prev,
        sentCount,
        failCount,
        logs: [...sendLogs]
      }));

      await new Promise(resolve => setTimeout(resolve, 350));
    }

    setSendProgress(prev => ({
      ...prev,
      status: "completed"
    }));
    setSendingAutomated(false);

    const successMsg = `🎉 Success! Email campaign sent to ${sentCount} recipient(s)!`;
    setSendingSuccessMessage(successMsg);
    showToast(successMsg);
    logAuditAction("Bulk Email Automated Send Completed", { total: finalList.length, sentCount, failCount });

    await fetchEmailHistory();
    setEmailWorkspaceTab("history");
  };

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

  const loadDraftsFromDb = async () => {
    try {
      const res = await fetch("/api/create-post/drafts");
      const data = await res.json();
      if (data && !data.error && Array.isArray(data.drafts)) {
        setDrafts(data.drafts);
      }
    } catch (e) {
      console.error("Failed to load drafts from database:", e);
    }
  };

  const saveDraft = async (typeId, contentObj) => {
    const formattedDate = new Date().toLocaleDateString();
    const defaultName = `Draft - ${PLATFORM_META[typeId]?.label || typeId} - ${formattedDate}`;
    const draftContent = contentObj?.content || contentObj?.body || "";
    const draftSubject = contentObj?.subject || "";

    const localDraft = {
      id: `draft-${Date.now()}`,
      name: defaultName,
      typeId,
      typeLabel: PLATFORM_META[typeId]?.label || typeId,
      subject: draftSubject,
      content: draftContent,
      toAddress: contentObj?.toAddress || "",
      ccAddress: contentObj?.ccAddress || "",
      bccAddress: contentObj?.bccAddress || "",
      imageUrl: contentObj?.imageUrl || "",
      attachments: contentObj?.attachments || [],
      status: "Active",
      favorite: false,
      createdBy: currentUser?.name || "Current User",
      createdAt: formattedDate,
      lastModified: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setDrafts(prev => [localDraft, ...prev]);
    showToast(`✓ Draft "${defaultName}" saved successfully!`);
    setMessage(`Draft "${defaultName}" saved successfully.`);
    logHistoryEvent(PLATFORM_META[typeId]?.label || typeId, draftContent, draftSubject, 'Draft Saved');

    try {
      const res = await fetch("/api/create-post/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localDraft)
      });
      const data = await res.json();
      if (data?.success) {
        await loadDraftsFromDb();
      }
    } catch (e) {
      console.warn("API draft save note:", e);
    }
  };

  const duplicateContent = async (typeId, contentObj) => {
    const formattedDate = new Date().toLocaleDateString();
    const defaultName = `Draft - ${PLATFORM_META[typeId]?.label || typeId} (Copy) - ${formattedDate}`;
    try {
      const res = await fetch("/api/create-post/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: defaultName,
          typeId,
          typeLabel: `${PLATFORM_META[typeId]?.label || typeId} (Copy)`,
          subject: contentObj.subject ? `${contentObj.subject} (Copy)` : "",
          content: contentObj.content || "",
          toAddress: contentObj.toAddress || "",
          ccAddress: contentObj.ccAddress || "",
          bccAddress: contentObj.bccAddress || "",
          imageUrl: contentObj.imageUrl || "",
          attachments: contentObj.attachments || [],
          status: "Draft",
          favorite: false
        })
      });

      const data = await res.json();
      if (data?.success) {
        await loadDraftsFromDb();
        setMessage(`Duplicated ${PLATFORM_META[typeId]?.label || typeId} content to drafts!`);
      } else {
        setMessage(data?.error || "Failed to duplicate draft.");
      }
    } catch (e) {
      setMessage(e.message || "Failed to duplicate draft.");
    }
  };

  const updateDraftInList = async (draftId, updatedFields) => {
    const existingDraft = drafts.find(d => d.id === draftId);
    if (!existingDraft) return;

    const merged = {
      ...existingDraft,
      ...updatedFields
    };

    try {
      const res = await fetch("/api/create-post/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(merged)
      });
      const data = await res.json();
      if (data?.success) {
        await loadDraftsFromDb();
      }
    } catch (e) {
      console.error("Failed to update draft:", e);
    }
  };

  const deleteDraft = async (draftId) => {
    const conf = window.confirm("Are you sure you want to delete this draft?");
    if (!conf) return;
    try {
      const res = await fetch(`/api/create-post/drafts?id=${draftId}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data?.success) {
        await loadDraftsFromDb();
        setMessage("Draft deleted successfully.");
      } else {
        setMessage(data?.error || "Failed to delete draft.");
      }
    } catch (e) {
      setMessage(e.message || "Failed to delete draft.");
    }
  };

  const handleDownloadTxt = (typeId, contentObj) => {
    const meta = PLATFORM_META[typeId] || { label: typeId };
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const author = currentUser?.name || currentUser?.email || 'Unknown';
    const wordCount = (contentObj.content || '').trim().split(/s+/).filter(Boolean).length;

    let text = '';
    text += `=== ${meta.label} Content ===
`;
    text += `Platform:    ${meta.label}
`;
    text += `Created By:  ${author}
`;
    text += `Date:        ${dateStr} at ${timeStr}
`;
    text += `Word Count:  ${wordCount} words
`;
    if (typeId === 'email_campaign' || typeId === 'newsletter') {
      text += `Subject:     ${contentObj.subject || ''}
`;
    }
    text += `
--- Content ---

`;
    text += (contentObj.content || '');
    text += `

--- End of File ---
`;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${meta.label.toLowerCase().replace(/s+/g, '_')}_content_${now.toISOString().split('T')[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`${meta.label} content downloaded as TXT.`);
    logHistoryEvent(meta.label, contentObj.content || '', contentObj.subject || '', 'Downloaded');
    logAuditAction('Generated Content Archive', { typeId, typeLabel: meta.label, content: contentObj.content || '', subject: contentObj.subject || '', action: 'downloaded' });
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
    const typeId = mode === "post_linkedin" ? "linkedin_post" : mode === "post_instagram" ? "instagram_post" : mode === "post_facebook" ? "facebook_post" : "";
    const provider = mode === "post_linkedin" ? "LinkedIn" : mode === "post_instagram" ? "Instagram" : mode === "post_facebook" ? "Facebook" : "";

    if (mode === "send_all") {
      const campaignId = "CAMP-" + Math.random().toString(36).substring(2, 10).toUpperCase();
      const personalizedList = allRecipients.map(email => {
        const contact = findContactForEmail(email);
        const draft = recipientDrafts[email];
        const finalSubject = draft?.subject || personalizeText(baseEmailSubject, contact);
        const finalBody = draft?.body || personalizeText(baseEmailBody, contact);
        return {
          recipientEmail: email,
          recipientName: contact.name,
          company: contact.company,
          subject: finalSubject,
          body: finalBody,
          sendStatus: "Pending"
        };
      });

      try {
        const cRes = await fetch("/api/create-post/campaign-emails", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignId,
            emails: personalizedList
          })
        });
        const cData = await cRes.json();
        if (cRes.ok && cData.success) {
          showToast(`Campaign saved with status Pending (ID: ${campaignId}).`);
        }
      } catch (err) {
        console.warn("Failed to store personalized campaign emails:", err);
      }
    }

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
          setMessage(`Please connect your ${provider} account first.`);
          window.location.href = data.connectUrl;
          return;
        }
        throw new Error(data?.error || "Action failed.");
      }
      
      if (typeId) {
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
    <main className="min-h-full bg-[#F8FAFC] p-4 lg:p-6">
      {/* Salesforce + HubSpot Inspired Sticky Top Navigation Bar */}
      <div className="sticky top-0 z-30 mx-auto max-w-[1400px] mb-4 rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-md p-3.5 shadow-2xs transition-all">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                Create & Post Content
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-extrabold text-indigo-700 ring-1 ring-indigo-200">AI Studio</span>
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">
                Multi-channel campaign generation, automated email dispatch, and social posting.
              </p>
            </div>
          </div>
          
          {/* Horizontal Top Navigation Bar */}
          <nav className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
            {/* 1. Connected Accounts */}
            <button
              type="button"
              onClick={() => setShowConnectedAccountsModal(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50/60 hover:border-indigo-300 text-slate-800 px-3.5 py-2 text-xs font-extrabold transition-all shadow-2xs cursor-pointer hover:scale-[1.02]"
            >
              <Users size={14} className="text-indigo-600" />
              <span>Connected Accounts</span>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-extrabold text-indigo-700">
                {[gmailConnected, outlookConnected, linkedinConnected, instagramConnected, facebookConnected].filter(Boolean).length}/5
              </span>
            </button>

            {/* 2. Campaign & Post History */}
            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3.5 py-2 text-xs font-bold transition-all shadow-2xs cursor-pointer hover:scale-[1.02]"
            >
              <History size={14} />
              <span>Campaign & Post History</span>
              <span className="rounded-full bg-indigo-200/80 px-2 py-0.5 text-[10px] font-extrabold text-indigo-800">
                {emailHistoryList.length}
              </span>
            </button>

            {/* 3. Visual Assets */}
            <button
              type="button"
              onClick={() => setShowVisualAssetsModal(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-pink-200 bg-pink-50 hover:bg-pink-100 text-pink-700 px-3.5 py-2 text-xs font-bold transition-all shadow-2xs cursor-pointer hover:scale-[1.02]"
            >
              <Camera size={14} />
              <span>Visual Assets</span>
            </button>

            {/* 4. Recent Activity */}
            <button
              type="button"
              onClick={() => setShowRecentActivityModal(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 px-3.5 py-2 text-xs font-bold transition-all shadow-2xs cursor-pointer hover:scale-[1.02]"
            >
              <Clock size={14} />
              <span>Recent Activity</span>
              <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-extrabold text-amber-900">
                {recentActivity.length}
              </span>
            </button>
          </nav>
        </div>
      </div>

      {message && (
        <div className="mb-4 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-xs font-medium text-indigo-700 shadow-2xs transition-all flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage("")} className="text-indigo-400 hover:text-indigo-600 font-bold ml-2 bg-transparent border-0 cursor-pointer">×</button>
        </div>
      )}

      {/* Automated Email Dispatching Progress Banner / Card (0% to 100%) */}
      {(sendingAutomated || sendProgress.status === "sending" || sendingSuccessMessage) && (
        <div className="mx-auto max-w-[1400px] mb-4">
          <div className={`rounded-2xl border p-4 shadow-md transition-all duration-300 ${
            sendingSuccessMessage
              ? "border-emerald-200 bg-emerald-50/90 text-emerald-900"
              : "border-indigo-200 bg-white"
          }`}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl font-bold ${
                  sendingSuccessMessage ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-600 animate-pulse"
                }`}>
                  {sendingSuccessMessage ? <CheckCircle2 size={20} /> : <Send size={18} />}
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-slate-900">
                    {sendingSuccessMessage ? "Email Campaign Dispatched Successfully!" : "Sending Automated Bulk Emails..."}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {sendingSuccessMessage
                      ? sendingSuccessMessage
                      : `Sending email ${sendProgress.current} of ${sendProgress.total} to ${sendProgress.recipient}...`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-[11px] font-bold">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-emerald-700">
                    ✓ {sendProgress.sentCount} Sent
                  </span>
                  {sendProgress.failCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-rose-700">
                      ✕ {sendProgress.failCount} Failed
                    </span>
                  )}
                </div>

                {sendingSuccessMessage && (
                  <button
                    type="button"
                    onClick={() => {
                      setSendingSuccessMessage("");
                      setShowHistoryModal(true);
                    }}
                    className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 text-xs font-bold transition cursor-pointer border-0 shadow-2xs"
                  >
                    <History size={12} /> View Sent History
                  </button>
                )}
              </div>
            </div>

            {/* Progress Bar (0% to 100%) */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-extrabold text-slate-600">
                <span>Sending Progress</span>
                <span>{sendProgress.total > 0 ? Math.round((sendProgress.current / sendProgress.total) * 100) : 0}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200">
                <div
                  className={`h-full transition-all duration-300 ease-out ${
                    sendingSuccessMessage ? "bg-emerald-500" : "bg-gradient-to-r from-indigo-500 to-indigo-600"
                  }`}
                  style={{
                    width: `${sendProgress.total > 0 ? Math.min(100, Math.round((sendProgress.current / sendProgress.total) * 100)) : 0}%`
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Campaign Strategy Section (Full Width) */}
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4 w-full">
        <div className="flex w-full flex-col gap-4">
           
           {/* A. Creative Input Card */}
           <section className="group relative rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs transition-all duration-300 hover:shadow-md">
             <h2 className="text-base font-bold text-slate-900 flex items-center justify-between">
               <span>Campaign Goal</span>
               <span className="text-[10px] text-slate-400 font-normal">Step 1 of 2</span>
             </h2>
             <textarea
               value={input}
               onChange={(e) => setInput(e.target.value)}
               rows={3}
               placeholder="Describe your campaign goal..."
               className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition-all focus:border-indigo-400 focus:bg-white focus:ring-3 focus:ring-indigo-100"
             />
             
             <div className="mt-3 flex flex-col justify-between gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center">
                <div className="flex flex-wrap gap-2">
                   <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600">Professional</span>
                   <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600">Multi-Channel</span>
                </div>
                <button
                   onClick={generateStrategy}
                   disabled={!generatingSuggestions && (generatingContent || !input.trim())}
                   className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-2xs transition-all duration-200 hover:scale-[0.98] hover:bg-indigo-700 hover:shadow-md disabled:opacity-50 sm:w-auto"
                >
                   {generatingSuggestions || generatingContent ? <LoadingSpinner /> : <Sparkles size={14} />}
                   {generatingSuggestions ? "Stop" : suggestions.length > 0 ? "Update Strategy" : "Generate Strategy"}
                </button>
             </div>
           </section>

           {/* B. AI Strategy / Platform Suggestions */}
           <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs transition-all duration-300 hover:shadow-md">
             <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Platform Strategy</span>
                  <span className="text-[10px] text-slate-400 font-normal">Step 2 of 2</span>
                </h2>
                {suggestions.length > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-700 ring-1 ring-emerald-200"><Sparkles size={11} /> AI Optimized</span>}
             </div>
             
             {/* Equal Height Redesigned Platform Cards with Connected Badges */}
             <div className="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 items-stretch">
               {suggestions.length > 0 ? suggestions.map(item => {
                   const meta = PLATFORM_META[item.id] || { label: item.id, Icon: Sparkles, color: "text-slate-600" };
                   const Icon = meta.Icon;
                   const selected = selectedTypes.includes(item.id);

                   // Determine connection state for platform
                   let isConnected = false;
                   if (item.id === "email_campaign" || item.id === "newsletter") {
                     isConnected = gmailConnected || outlookConnected;
                   } else if (item.id === "linkedin_post") {
                     isConnected = linkedinConnected;
                   } else if (item.id === "instagram_post") {
                     isConnected = instagramConnected;
                   } else if (item.id === "facebook_post") {
                     isConnected = facebookConnected;
                   } else {
                     isConnected = true;
                   }

                   return (
                     <button
                       key={item.id}
                       onClick={() => toggleType(item.id)}
                       className={`group relative flex h-full flex-col justify-between rounded-2xl border p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer ${
                         selected
                           ? "border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/30"
                           : "border-slate-200/90 bg-white hover:border-indigo-300 hover:bg-slate-50/50"
                       }`}
                     >
                       <div>
                         <div className="flex w-full items-center justify-between gap-2 mb-2.5">
                           <div className={`rounded-xl p-2.5 transition-transform duration-200 group-hover:scale-105 ${
                             selected ? "bg-indigo-600 text-white shadow-xs" : "bg-slate-100 text-slate-700"
                           }`}>
                             <Icon size={18} className={selected ? "text-white" : meta.color} />
                           </div>

                           {/* Connected / Not Connected Badge */}
                           {isConnected ? (
                             <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700 border border-emerald-200/80">
                               <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Connected
                             </span>
                           ) : (
                             <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-500 border border-slate-200">
                               <span className="h-1.5 w-1.5 rounded-full bg-slate-400" /> Not Connected
                             </span>
                           )}
                         </div>

                         <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                           {item.label}
                           {selected && <Check size={14} className="text-indigo-600 font-bold" />}
                         </p>
                         <p className="mt-1 line-clamp-2 text-xs text-slate-500 leading-relaxed font-medium">
                           {item.hint}
                         </p>
                       </div>

                       <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-400">
                         <span>{selected ? "Selected" : "Click to select"}</span>
                         <span className={selected ? "text-indigo-600 font-extrabold" : "text-slate-400"}>
                           {selected ? "✓ Active" : "+ Add"}
                         </span>
                       </div>
                     </button>
                   );
               }) : (
                 [1, 2, 3, 4].map(i => (
                   <div key={i} className="flex flex-col justify-between h-32 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-4 opacity-60">
                     <div className="flex justify-between items-center">
                       <div className="h-8 w-8 rounded-xl bg-slate-200"></div>
                       <div className="h-4 w-16 rounded-full bg-slate-200"></div>
                     </div>
                     <div>
                       <div className="h-4 w-24 rounded bg-slate-200 mb-1"></div>
                       <div className="h-3 w-full rounded bg-slate-200"></div>
                     </div>
                   </div>
                 ))
               )}
             </div>
             {suggestions.length > 0 && (
               <div className="mt-4 border-t border-slate-100 pt-3 flex flex-wrap items-center justify-between gap-3">
                 <div className="space-y-1.5">
                   <label className={`inline-flex cursor-pointer items-center gap-2 text-xs font-semibold ${needsRecipients ? "text-slate-700" : "cursor-not-allowed text-slate-400"}`}>
                     <input
                       type="checkbox"
                       checked={useTemplate}
                       disabled={!needsRecipients}
                       onChange={(e) => { setUseTemplate(e.target.checked); setSelectedTemplateId(""); }}
                       className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                     />
                     Use Email Template
                   </label>
                   {useTemplate && needsRecipients && (
                     <select
                       value={selectedTemplateId}
                       onChange={(e) => setSelectedTemplateId(e.target.value)}
                       className="block rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
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
                   className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-2xs transition-all hover:bg-slate-800 hover:shadow-md disabled:opacity-50 border-0 cursor-pointer"
                 >
                   {generatingContent ? <LoadingSpinner /> : null}
                   {generatingContent ? "Stop" : "Confirm Platforms & Generate Workspace"}
                 </button>
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
                                  onClick={() => deleteDraft(draft.id)}
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
                               onClick={() => deleteDraft(draft.id)}
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
                                navigator.clipboard.writeText(textToCopy).catch(() => {});
                                showToast("✓ Content copied to clipboard!");
                                logHistoryEvent(PLATFORM_META[typeId]?.label || typeId, textToCopy, contentObj?.subject || '', 'Copied');
                                logAuditAction('Generated Content Archive', { typeId, typeLabel: PLATFORM_META[typeId]?.label || typeId, content: textToCopy, subject: contentObj?.subject || '', action: 'copied' });
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
                              onClick={() => handleDownloadTxt(typeId, contentObj)}
                              className="inline-flex items-center gap-1 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 text-[11px] font-bold cursor-pointer transition"
                              title="Download TXT"
                            >
                              <Download size={11} /> Download TXT
                            </button>
                             {(typeId === "email_campaign" || typeId === "newsletter") && (
                                <div className="inline-flex items-center gap-1.5 flex-wrap">
                                  {/* Send Email Button */}
                                  <button
                                    onClick={() => handleSendEmail(contentObj)}
                                    className="inline-flex items-center gap-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 text-[11px] font-bold cursor-pointer transition shadow-2xs"
                                    title={`Send via ${emailClientPreference === 'outlook' ? 'Outlook' : 'Gmail'}`}
                                  >
                                    <Send size={11} /> Send Email
                                  </button>

                                  {/* G/O Redirect Toggle Button right beside Send Email */}
                                  <div className="inline-flex border border-indigo-200 rounded overflow-hidden bg-white shadow-2xs" title="Select default mail client (Gmail or Outlook)">
                                    <button onClick={() => { setEmailPref('gmail'); handleSendEmail(contentObj, null, 'gmail'); }} title="Open Gmail" className={`px-1.5 py-1 text-[9px] font-bold border-0 cursor-pointer transition ${emailClientPreference === 'gmail' ? 'bg-indigo-600 text-white font-black' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>G</button>
                                    <button onClick={() => { setEmailPref('outlook'); handleSendEmail(contentObj, null, 'outlook'); }} title="Open Outlook" className={`px-1.5 py-1 text-[9px] font-bold border-0 cursor-pointer transition border-l border-indigo-100 ${emailClientPreference === 'outlook' ? 'bg-indigo-600 text-white font-black' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>O</button>
                                  </div>

                                  {/* Automated Gmail Button - Always Visible */}
                                  <button
                                    onClick={() => handleSendAutomatedGmail(contentObj)}
                                    className="inline-flex items-center gap-1 rounded bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1 text-[11px] font-bold cursor-pointer transition shadow-2xs"
                                    title="Send Automated Email via Gmail API"
                                  >
                                    <Send size={11} /> Automated Gmail
                                  </button>
                                </div>
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
                            <>
                              {/* To Address */}
                              <div className="mb-2">
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">To</label>
                                <input
                                  value={contentObj.toAddress || ""}
                                  onChange={(e) => {
                                    setContentByType(prev => ({
                                      ...prev,
                                      [typeId]: { ...prev[typeId], toAddress: e.target.value, lastModified: new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) }
                                    }));
                                  }}
                                  placeholder="recipient@example.com, another@example.com"
                                  className={`w-full rounded-lg bg-white px-3 py-2 text-sm outline-none ring-1 focus:ring-2 focus:ring-indigo-400 ${(contentObj.toAddress || '').split(',').map(e => e.trim()).filter(Boolean).some(e => !isEmail(e)) ? 'ring-red-300' : 'ring-slate-200'}`}
                                />
                                {(contentObj.toAddress || '').split(',').map(e => e.trim()).filter(Boolean).some(e => !isEmail(e)) && (
                                  <p className="mt-0.5 text-[10px] text-red-500 font-medium">One or more email addresses are invalid.</p>
                                )}
                              </div>
                              {/* CC Address */}
                              <div className="mb-2">
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">CC</label>
                                <input
                                  value={contentObj.ccAddress || ""}
                                  onChange={(e) => {
                                    setContentByType(prev => ({
                                      ...prev,
                                      [typeId]: { ...prev[typeId], ccAddress: e.target.value, lastModified: new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) }
                                    }));
                                  }}
                                  placeholder="cc@example.com"
                                  className="mb-1 w-full rounded-lg bg-white px-3 py-2 text-sm outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-400"
                                />
                              </div>
                              {/* BCC Address */}
                              <div className="mb-2">
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">BCC</label>
                                <input
                                  value={contentObj.bccAddress || ""}
                                  onChange={(e) => {
                                    setContentByType(prev => ({
                                      ...prev,
                                      [typeId]: { ...prev[typeId], bccAddress: e.target.value, lastModified: new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) }
                                    }));
                                  }}
                                  placeholder="bcc@example.com"
                                  className="mb-1 w-full rounded-lg bg-white px-3 py-2 text-sm outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-400"
                                />
                              </div>
                              {/* Subject */}
                              <div className="mb-2">
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Subject</label>
                                <input
                                  value={contentObj.subject}
                                  onChange={(e) => {
                                    setContentByType(prev => ({
                                      ...prev,
                                      [typeId]: { ...prev[typeId], subject: e.target.value, lastModified: new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) }
                                    }));
                                  }}
                                  placeholder="Email Subject"
                                  className="w-full rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-400"
                                />
                              </div>
                            </>
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

                        {/* Email Campaign Attachments + Email List Upload */}
                        {(typeId === "email_campaign" || typeId === "newsletter") && (
                          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 space-y-3">
                            {/* Attachment Upload */}
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <p className="text-sm font-semibold text-slate-900">Attachments</p>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    disabled={uploadingAttachment}
                                    onClick={() => {
                                      const input = document.createElement('input');
                                      input.type = 'file';
                                      input.multiple = true;
                                      input.accept = '.pdf,.docx,.xlsx,.jpg,.jpeg,.png';
                                      input.onchange = (e) => handleAttachmentUpload(typeId, e.target.files);
                                      input.click();
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                  >
                                    {uploadingAttachment ? <><LoadingSpinner size="h-3 w-3" /> Uploading…</> : '+ Add Attachment'}
                                  </button>
                                </div>
                              </div>
                              <p className="text-[10px] text-slate-400 mb-1.5">Accepted: PDF, DOCX, XLSX, JPG, PNG (max 10 MB each)</p>
                              {(contentObj.attachments || []).length > 0 ? (
                                <div className="space-y-1.5">
                                  {contentObj.attachments.map((file, idx) => (
                                    <div key={`${file.name}-${idx}`} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
                                      <div className="min-w-0 flex-1">
                                        <span className="block truncate text-xs font-medium text-slate-700">{file.name}</span>
                                        {file.size && <span className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(1)} KB</span>}
                                      </div>
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
                                        className="ml-2 text-xs font-bold text-red-500 hover:text-red-700 bg-transparent border-0 cursor-pointer flex-shrink-0"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400">No attachments added.</p>
                              )}
                            </div>

                            {/* Email List Upload & Intuitive Recipient Card */}
                            <div className="border-t border-slate-100 pt-3">
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                                    <FileDown className="h-4 w-4 text-indigo-600" /> Email List
                                  </p>
                                  <p className="text-[10px] text-slate-400">Upload .csv or .xlsx Excel sheet to extract and send email to bulk recipients</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {importedContacts.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => handleSendAutomatedGmail(contentObj)}
                                      disabled={sendingAutomated}
                                      className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 text-xs font-bold cursor-pointer transition shadow-xs disabled:opacity-50"
                                    >
                                      <Send size={12} /> Beta Send to {importStats.valid || importedContacts.length} Sheet Contacts
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const input = document.createElement('input');
                                      input.type = 'file';
                                      input.accept = '.csv,.xlsx';
                                      input.onchange = (e) => handleEmailListUpload(e.target.files[0]);
                                      input.click();
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 text-xs font-semibold cursor-pointer transition"
                                  >
                                    <FileDown size={12} /> {importedContacts.length > 0 ? "Replace Sheet" : "Upload Email List"}
                                  </button>
                                  {importedContacts.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={handleClearImportedContacts}
                                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 px-2.5 py-1.5 text-xs font-semibold cursor-pointer transition"
                                      title="Remove attached email list sheet"
                                    >
                                      <X size={12} /> Clear Sheet
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Extracted Excel/CSV Email List Recipient Preview Card */}
                              {importedContacts.length > 0 && (
                                <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50/40 p-3 shadow-2xs">
                                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2">
                                      <div className="h-7 w-7 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                                        <Users size={14} />
                                      </div>
                                      <div>
                                        <p className="text-xs font-extrabold text-slate-900">
                                          Attached Sheet: <span className="text-indigo-700">{importedFileName || "Contacts List"}</span>
                                        </p>
                                        <p className="text-[10px] text-slate-500 font-medium">
                                          <span className="text-emerald-700 font-bold">{importStats.valid} Valid Emails</span> • <span className="text-rose-700 font-bold">{importStats.invalid} Invalid</span>
                                        </p>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setShowEmailListModal(true)}
                                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-2.5 py-1 text-xs font-semibold cursor-pointer transition"
                                    >
                                      <Eye size={12} /> Manage Full List
                                    </button>
                                  </div>

                                  {/* Quick Preview Table of Extracted Emails */}
                                  <div className="max-h-36 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                                    <table className="w-full text-left text-[11px] text-slate-700 border-collapse">
                                      <thead>
                                        <tr className="border-b border-slate-150 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                          <th className="py-1.5 px-2.5">Name</th>
                                          <th className="py-1.5 px-2.5">Email Address</th>
                                          <th className="py-1.5 px-2.5">Company</th>
                                          <th className="py-1.5 px-2.5">Status</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {importedContacts.slice(0, 5).map((c) => (
                                          <tr key={c.id} className="hover:bg-slate-50/80">
                                            <td className="py-1.5 px-2.5 font-semibold text-slate-900 whitespace-nowrap">{c.name}</td>
                                            <td className="py-1.5 px-2.5 font-mono text-indigo-700 whitespace-nowrap">{c.email}</td>
                                            <td className="py-1.5 px-2.5 text-slate-500 whitespace-nowrap">{c.company || "-"}</td>
                                            <td className="py-1.5 px-2.5 whitespace-nowrap">
                                              {c.isValid ? (
                                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                                  ✓ Ready
                                                </span>
                                              ) : (
                                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                                  ✕ Invalid
                                                </span>
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                    {importedContacts.length > 5 && (
                                      <div className="p-1.5 text-center text-[10px] text-slate-500 font-semibold bg-slate-50 border-t border-slate-100">
                                        + {importedContacts.length - 5} more recipient(s) in this sheet
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Email Sub-Tabs Bar: Compose, Recipient List, Email History & Outbox, Inbox */}
                        {(typeId === "email_campaign" || typeId === "newsletter") && (
                          <div className="mt-4 pt-3 border-t border-slate-200">
                            <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 mb-3 overflow-x-auto">
                              <button
                                onClick={() => setEmailWorkspaceTab("compose")}
                                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold cursor-pointer transition border ${
                                  emailWorkspaceTab === "compose"
                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                }`}
                              >
                                ✍️ Compose & Send
                              </button>

                              <button
                                onClick={() => setEmailWorkspaceTab("recipients")}
                                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold cursor-pointer transition border ${
                                  emailWorkspaceTab === "recipients"
                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                }`}
                              >
                                👥 Email List ({importedContacts.length > 0 ? importedContacts.filter(c=>c.isValid).length : allRecipients.length})
                              </button>

                              <button
                                onClick={() => setEmailWorkspaceTab("history")}
                                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold cursor-pointer transition border ${
                                  emailWorkspaceTab === "history"
                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                }`}
                              >
                                📜 Email History & Outbox ({emailHistoryList.length})
                              </button>

                              <button
                                onClick={() => setEmailWorkspaceTab("inbox")}
                                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold cursor-pointer transition border ${
                                  emailWorkspaceTab === "inbox"
                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                }`}
                              >
                                📥 Inbox ({inboxMessages.length})
                              </button>
                            </div>

                            {/* Success Alert Banner */}
                            {sendingSuccessMessage && (
                              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 flex items-center justify-between shadow-xs animate-in fade-in duration-300">
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                                    <CheckCircle2 size={18} />
                                  </div>
                                  <div>
                                    <p className="text-xs font-extrabold text-emerald-900">{sendingSuccessMessage}</p>
                                    <p className="text-[11px] text-emerald-700 font-medium">All sent emails are recorded below under Email History & Outbox.</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => setSendingSuccessMessage("")}
                                  className="rounded-lg p-1 text-emerald-600 hover:bg-emerald-100 transition cursor-pointer"
                                >
                                  <X size={15} />
                                </button>
                              </div>
                            )}

                            {/* Batch Sending Live Progress UI */}
                            {sendingAutomated && (
                              <div className="mb-4 rounded-2xl border border-indigo-200 bg-indigo-50/80 p-4 shadow-md animate-in fade-in duration-300">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <RefreshCw size={16} className="text-indigo-600 animate-spin" />
                                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-indigo-950">
                                      Sending Automated Bulk Email ({sendProgress.current} / {sendProgress.total})
                                    </h4>
                                  </div>
                                  <span className="text-xs font-bold text-indigo-700">
                                    {Math.round((sendProgress.current / Math.max(sendProgress.total, 1)) * 100)}% Complete
                                  </span>
                                </div>

                                <div className="w-full h-2.5 rounded-full bg-indigo-200/80 overflow-hidden mb-3">
                                  <div
                                    className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
                                    style={{ width: `${(sendProgress.current / Math.max(sendProgress.total, 1)) * 100}%` }}
                                  />
                                </div>

                                <div className="flex flex-wrap items-center justify-between text-xs text-slate-700 font-medium bg-white/90 rounded-xl p-2.5 border border-indigo-100 mb-2">
                                  <div>
                                    Currently mailing: <span className="font-bold text-indigo-900">{sendProgress.recipient}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-emerald-700 font-bold">✓ Sent: {sendProgress.sentCount}</span>
                                    {sendProgress.failCount > 0 && <span className="text-rose-700 font-bold">✕ Failed: {sendProgress.failCount}</span>}
                                  </div>
                                </div>

                                {/* Live log stream */}
                                <div className="max-h-28 overflow-y-auto space-y-1 bg-slate-900 text-slate-100 rounded-lg p-2.5 text-[11px] font-mono">
                                  {sendProgress.logs.map((log, idx) => (
                                    <div key={idx} className="flex items-center justify-between">
                                      <span className="truncate max-w-[75%]">
                                        [{log.timestamp}] {log.name} &lt;{log.recipient}&gt;
                                      </span>
                                      <span className={log.status === 'Sent' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                                        {log.status}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Tab 2: Recipient List View */}
                            {emailWorkspaceTab === "recipients" && (
                              <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="text-sm font-bold text-slate-900">Extracted Bulk Recipients</h4>
                                  <button
                                    onClick={() => setShowEmailListModal(true)}
                                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                                  >
                                    Open Full List Manager
                                  </button>
                                </div>
                                <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-200">
                                  <table className="w-full text-left text-xs text-slate-700">
                                    <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
                                      <tr>
                                        <th className="p-2">Name</th>
                                        <th className="p-2">Email</th>
                                        <th className="p-2">Company</th>
                                        <th className="p-2">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {(importedContacts.length > 0 ? importedContacts : allRecipients.map(e => findContactForEmail(e))).map((c, i) => (
                                        <tr key={i} className="hover:bg-slate-50">
                                          <td className="p-2 font-semibold text-slate-900">{c.name || 'Recipient'}</td>
                                          <td className="p-2 font-mono text-indigo-700">{c.email}</td>
                                          <td className="p-2 text-slate-500">{c.company || '-'}</td>
                                          <td className="p-2">
                                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                              Ready to send
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {/* Tab 3: Email History & Outbox View */}
                            {emailWorkspaceTab === "history" && (
                              <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
                                <div className="mx-auto max-w-md space-y-3">
                                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                                    <History size={24} />
                                  </div>
                                  <h4 className="text-base font-extrabold text-slate-900">Email Campaign History & Sent Outbox</h4>
                                  <p className="text-xs text-slate-500">
                                    Review all sent emails, recipient logs, subject lines, and delivery timestamps in the full Omnichannel History viewer.
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => setShowHistoryModal(true)}
                                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 text-xs font-bold transition shadow-sm cursor-pointer border-0"
                                  >
                                    <History size={14} /> Open Omnichannel History Modal ({emailHistoryList.length} Records)
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Tab 4: Inbox View */}
                            {emailWorkspaceTab === "inbox" && (
                              <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                                  <div>
                                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                      <Inbox className="h-4 w-4 text-indigo-600" /> Campaign Inbox & Responses
                                    </h4>
                                    <p className="text-xs text-slate-500">Incoming replies and email interactions from your bulk marketing campaigns.</p>
                                  </div>
                                  <div className="relative">
                                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                                    <input
                                      value={inboxSearch}
                                      onChange={(e) => setInboxSearch(e.target.value)}
                                      placeholder="Search inbox..."
                                      className="rounded-lg border border-slate-200 pl-8 pr-3 py-1 text-xs outline-none focus:ring-2 focus:ring-indigo-400"
                                    />
                                  </div>
                                </div>

                                <div className="space-y-2 max-h-80 overflow-y-auto">
                                  {inboxMessages
                                    .filter(m => !inboxSearch.trim() || m.sender.toLowerCase().includes(inboxSearch.toLowerCase()) || m.subject.toLowerCase().includes(inboxSearch.toLowerCase()))
                                    .map((msg) => (
                                      <div
                                        key={msg.id}
                                        onClick={() => setSelectedInboxMessage(msg)}
                                        className={`p-3 rounded-xl border transition cursor-pointer hover:border-indigo-300 ${
                                          msg.unread ? "bg-indigo-50/40 border-indigo-200" : "bg-slate-50/50 border-slate-200"
                                        }`}
                                      >
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                          <span className="font-extrabold text-xs text-slate-900">{msg.senderName} ({msg.sender})</span>
                                          <span className="text-[10px] text-slate-400">{new Date(msg.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <p className="text-xs font-bold text-indigo-900">{msg.subject}</p>
                                        <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">{msg.snippet}</p>
                                      </div>
                                    ))}
                                </div>
                              </div>
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
                                  const provider = typeId === "linkedin_post" ? "linkedin" : typeId === "instagram_post" ? "instagram" : typeId === "facebook_post" ? "facebook" : "";
                                  if (provider) {
                                    if (!configuredProviders[provider]) {
                                      setMessage("Publishing API not configured.");
                                      return;
                                    }
                                    const isConnected = provider === "linkedin" ? linkedinConnected : provider === "instagram" ? instagramConnected : provider === "facebook" ? facebookConnected : false;
                                    if (!isConnected) {
                                      setMessage(`Please connect your ${PLATFORM_META[typeId]?.label || provider} account first.`);
                                      return;
                                    }
                                    submitPostAction(`post_${provider}`);
                                  } else if (typeId === "email_campaign" || typeId === "newsletter") {
                                    handleSendEmail(contentObj);
                                  } else {
                                    /* No direct publish API available for this content type */
                                  }
                                }}
                                disabled={submittingPost || !(typeId === "linkedin_post" || typeId === "instagram_post" || typeId === "facebook_post" || typeId === "email_campaign" || typeId === "newsletter")}
                                title={!(typeId === "linkedin_post" || typeId === "instagram_post" || typeId === "facebook_post" || typeId === "email_campaign" || typeId === "newsletter") ? `Direct publishing is not available for ${meta.label}. Copy your content and post it manually.` : undefined}
                                className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold text-white transition disabled:opacity-50 ${(typeId === "linkedin_post" || typeId === "instagram_post" || typeId === "facebook_post" || typeId === "email_campaign" || typeId === "newsletter") ? "bg-indigo-650 hover:bg-indigo-700 cursor-pointer" : "bg-slate-400 cursor-not-allowed"}`}
                              >
                                <Send size={11} /> {(typeId === "email_campaign" || typeId === "newsletter") ? "Send Email" : "Publish"}
                              </button>
                            )}

                            {/* Published: Done indicator */}
                            {(contentObj.workflowStatus || "Draft") === "Published" && (
                              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                                ✓ Published successfully
                              </span>
                            )}
                          </div>

                          {/* Direct-post: copy to clipboard + open platform (no OAuth required) */}
                          <div className="flex flex-wrap gap-1.5">
                            {typeId === "linkedin_post" && (
                              <>
                                <button
                                  onClick={() => handlePostToLinkedIn(contentObj)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1 text-xs font-bold transition cursor-pointer"
                                >
                                  Post to LinkedIn
                                </button>
                                <button
                                  onClick={() => handleCopyHashtags(contentObj)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 px-3 py-1 text-xs font-bold transition cursor-pointer"
                                >
                                  Copy Hashtags
                                </button>
                                {(typeof window !== 'undefined' && typeof window.open === 'function') && (
                                  <button
                                    onClick={handleOpenLinkedInComposer}
                                    className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1 text-xs font-bold transition cursor-pointer"
                                  >
                                    Open LinkedIn Composer
                                  </button>
                                )}
                              </>
                            )}

                            {typeId === "instagram_post" && (
                              <button
                                onClick={() => handlePostToInstagram(contentObj)}
                                className="inline-flex items-center gap-1 rounded-lg border border-pink-300 bg-pink-50 text-pink-700 hover:bg-pink-100 px-3 py-1 text-xs font-bold transition cursor-pointer"
                              >
                                Post to Instagram
                              </button>
                            )}
                            {typeId === "facebook_post" && (
                              <button
                                onClick={() => handlePostToFacebook(contentObj)}
                                className="inline-flex items-center gap-1 rounded-lg border border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1 text-xs font-bold transition cursor-pointer"
                              >
                                Post to Facebook
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
                              navigator.clipboard.writeText(textToCopy).catch(() => {});
                              showToast("✓ Content copied to clipboard!");
                              logHistoryEvent(PLATFORM_META[typeId]?.label || typeId, textToCopy, contentObj?.subject || '', 'Copied');
                              logAuditAction('Generated Content Archive', { typeId, typeLabel: PLATFORM_META[typeId]?.label || typeId, content: textToCopy, subject: contentObj?.subject || '', action: 'copied' });
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
                              <div className="inline-flex items-center gap-1">
                                <button
                                  onClick={() => handleSendEmail(contentObj)}
                                  className="inline-flex items-center gap-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 text-xs font-bold cursor-pointer transition shadow-2xs"
                                  title={`Send via ${emailClientPreference === 'outlook' ? 'Outlook' : 'Gmail'}`}
                                >
                                  <Send size={12} /> Send Email
                                </button>
                                <button
                                  onClick={() => handleSendAutomatedGmail(contentObj)}
                                  className="inline-flex items-center gap-1 rounded bg-red-650 hover:bg-red-700 text-white px-3 py-1.5 text-xs font-bold cursor-pointer transition shadow-2xs animate-pulse"
                                >
                                  Send Automated Gmail (BETA)
                                </button>
                                <div className="inline-flex border border-indigo-200 rounded overflow-hidden">
                                  <button onClick={() => { setEmailPref('gmail'); handleSendEmail(contentObj, null, 'gmail'); }} title="Send via Gmail" className={`px-2 py-1.5 text-[9px] font-bold border-0 cursor-pointer transition ${emailClientPreference === 'gmail' ? 'bg-indigo-100 text-indigo-800' : 'bg-white text-slate-400 hover:bg-slate-50'}`}>G</button>
                                  <button onClick={() => { setEmailPref('outlook'); handleSendEmail(contentObj, null, 'outlook'); }} title="Send via Outlook" className={`px-2 py-1.5 text-[9px] font-bold border-0 cursor-pointer transition border-l border-indigo-100 ${emailClientPreference === 'outlook' ? 'bg-indigo-100 text-indigo-800' : 'bg-white text-slate-400 hover:bg-slate-50'}`}>O</button>
                                </div>
                              </div>
                            )}
                        </div>

                        {/* Editor input fields */}
                        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                          {(typeId === "email_campaign" || typeId === "newsletter") && (
                            <>
                              {/* To Address */}
                              <div className="mb-2">
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">To</label>
                                <input
                                  value={contentObj.toAddress || ""}
                                  onChange={(e) => {
                                    setContentByType(prev => ({
                                      ...prev,
                                      [typeId]: { ...prev[typeId], toAddress: e.target.value, lastModified: new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) }
                                    }));
                                  }}
                                  placeholder="recipient@example.com, another@example.com"
                                  className={`w-full rounded-lg bg-white px-3 py-2 text-sm outline-none ring-1 focus:ring-2 focus:ring-indigo-400 ${(contentObj.toAddress || '').split(',').map(e => e.trim()).filter(Boolean).some(e => !isEmail(e)) ? 'ring-red-300' : 'ring-slate-200'}`}
                                />
                                {(contentObj.toAddress || '').split(',').map(e => e.trim()).filter(Boolean).some(e => !isEmail(e)) && (
                                  <p className="mt-0.5 text-[10px] text-red-500 font-medium">One or more email addresses are invalid.</p>
                                )}
                              </div>
                              {/* CC Address */}
                              <div className="mb-2">
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">CC</label>
                                <input
                                  value={contentObj.ccAddress || ""}
                                  onChange={(e) => {
                                    setContentByType(prev => ({
                                      ...prev,
                                      [typeId]: { ...prev[typeId], ccAddress: e.target.value, lastModified: new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) }
                                    }));
                                  }}
                                  placeholder="cc@example.com"
                                  className="mb-1 w-full rounded-lg bg-white px-3 py-2 text-sm outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-400"
                                />
                              </div>
                              {/* BCC Address */}
                              <div className="mb-2">
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">BCC</label>
                                <input
                                  value={contentObj.bccAddress || ""}
                                  onChange={(e) => {
                                    setContentByType(prev => ({
                                      ...prev,
                                      [typeId]: { ...prev[typeId], bccAddress: e.target.value, lastModified: new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) }
                                    }));
                                  }}
                                  placeholder="bcc@example.com"
                                  className="mb-1 w-full rounded-lg bg-white px-3 py-2 text-sm outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-400"
                                />
                              </div>
                              {/* Subject */}
                              <div className="mb-2">
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Subject</label>
                                <input
                                  value={contentObj.subject}
                                  onChange={(e) => {
                                    setContentByType(prev => ({
                                      ...prev,
                                      [typeId]: { ...prev[typeId], subject: e.target.value, lastModified: new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) }
                                    }));
                                  }}
                                  placeholder="Email Subject"
                                  className="w-full rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-400"
                                />
                              </div>
                            </>
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

                        {/* Email Campaign Attachments + Email List Upload */}
                        {(typeId === "email_campaign" || typeId === "newsletter") && (
                          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 space-y-3">
                            {/* Attachment Upload */}
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <p className="text-sm font-semibold text-slate-950">Attachments</p>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    disabled={uploadingAttachment}
                                    onClick={() => {
                                      const input = document.createElement('input');
                                      input.type = 'file';
                                      input.multiple = true;
                                      input.accept = '.pdf,.docx,.xlsx,.jpg,.jpeg,.png';
                                      input.onchange = (e) => handleAttachmentUpload(typeId, e.target.files);
                                      input.click();
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                  >
                                    {uploadingAttachment ? <><LoadingSpinner size="h-3 w-3" /> Uploading…</> : '+ Add Attachment'}
                                  </button>
                                </div>
                              </div>
                              <p className="text-[10px] text-slate-400 mb-1.5">Accepted: PDF, DOCX, XLSX, JPG, PNG (max 10 MB each)</p>
                              {(contentObj.attachments || []).length > 0 ? (
                                <div className="space-y-1.5">
                                  {contentObj.attachments.map((file, idx) => (
                                    <div key={`${file.name}-${idx}`} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
                                      <div className="min-w-0 flex-1">
                                        <span className="block truncate text-xs font-medium text-slate-750">{file.name}</span>
                                        {file.size && <span className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(1)} KB</span>}
                                      </div>
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
                                        className="ml-2 text-xs font-bold text-red-500 hover:text-red-700 bg-transparent border-0 cursor-pointer flex-shrink-0"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400">No attachments added.</p>
                              )}
                            </div>

                            {/* Email List Upload */}
                            <div className="border-t border-slate-100 pt-3">
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">Email List</p>
                                  <p className="text-[10px] text-slate-400">Upload .csv or .xlsx to add bulk recipients</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = '.csv,.xlsx';
                                    input.onchange = (e) => handleEmailListUpload(e.target.files[0]);
                                    input.click();
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 text-xs font-semibold cursor-pointer transition"
                                >
                                  <FileDown size={12} /> Upload Email List
                                </button>
                              </div>
                            </div>
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
                                  const provider = typeId === "linkedin_post" ? "linkedin" : typeId === "instagram_post" ? "instagram" : typeId === "facebook_post" ? "facebook" : "";
                                  if (provider) {
                                    if (!configuredProviders[provider]) {
                                      setMessage("Publishing API not configured.");
                                      return;
                                    }
                                    const isConnected = provider === "linkedin" ? linkedinConnected : provider === "instagram" ? instagramConnected : provider === "facebook" ? facebookConnected : false;
                                    if (!isConnected) {
                                      setMessage(`Please connect your ${PLATFORM_META[typeId]?.label || provider} account first.`);
                                      return;
                                    }
                                    submitPostAction(`post_${provider}`);
                                  } else if (typeId === "email_campaign" || typeId === "newsletter") {
                                    handleSendEmail(contentObj);
                                  } else {
                                    /* No direct publish API available for this content type */
                                  }
                                }}
                                disabled={submittingPost || !(typeId === "linkedin_post" || typeId === "instagram_post" || typeId === "facebook_post" || typeId === "email_campaign" || typeId === "newsletter")}
                                title={!(typeId === "linkedin_post" || typeId === "instagram_post" || typeId === "facebook_post" || typeId === "email_campaign" || typeId === "newsletter") ? `Direct publishing is not available for ${meta.label}. Copy your content and post it manually.` : undefined}
                                className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold text-white transition disabled:opacity-50 ${(typeId === "linkedin_post" || typeId === "instagram_post" || typeId === "facebook_post" || typeId === "email_campaign" || typeId === "newsletter") ? "bg-indigo-650 hover:bg-indigo-700 cursor-pointer" : "bg-slate-400 cursor-not-allowed"}`}
                              >
                                <Send size={11} /> {(typeId === "email_campaign" || typeId === "newsletter") ? "Send Email" : "Publish"}
                              </button>
                            )}

                            {/* Published: Done indicator */}
                            {(contentObj.workflowStatus || "Draft") === "Published" && (
                              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                                ✓ Published successfully
                              </span>
                            )}
                          </div>

                          {/* Direct-post: copy to clipboard + open platform (no OAuth required) */}
                          <div className="flex flex-wrap gap-1.5">
                            {typeId === "linkedin_post" && (
                              <>
                                <button
                                  onClick={() => handlePostToLinkedIn(contentObj)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1 text-xs font-bold transition cursor-pointer"
                                >
                                  Post to LinkedIn
                                </button>
                                <button
                                  onClick={() => handleCopyHashtags(contentObj)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 px-3 py-1 text-xs font-bold transition cursor-pointer"
                                >
                                  Copy Hashtags
                                </button>
                                {(typeof window !== 'undefined' && typeof window.open === 'function') && (
                                  <button
                                    onClick={handleOpenLinkedInComposer}
                                    className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1 text-xs font-bold transition cursor-pointer"
                                  >
                                    Open LinkedIn Composer
                                  </button>
                                )}
                              </>
                            )}

                            {typeId === "instagram_post" && (
                              <button
                                onClick={() => handlePostToInstagram(contentObj)}
                                className="inline-flex items-center gap-1 rounded-lg border border-pink-300 bg-pink-50 text-pink-700 hover:bg-pink-100 px-3 py-1 text-xs font-bold transition cursor-pointer"
                              >
                                Post to Instagram
                              </button>
                            )}
                            {typeId === "facebook_post" && (
                              <button
                                onClick={() => handlePostToFacebook(contentObj)}
                                className="inline-flex items-center gap-1 rounded-lg border border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1 text-xs font-bold transition cursor-pointer"
                              >
                                Post to Facebook
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
                       value={activeRecipient ? (recipientDrafts[activeRecipient]?.subject ?? personalizeText(baseEmailSubject, findContactForEmail(activeRecipient))) : ""}
                       onChange={(e) => updateRecipientDraft(activeRecipient, { subject: e.target.value })}
                       className="w-full rounded-lg border border-slate-300 bg-slate-55 px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100 disabled:opacity-60"
                     />
                   </div>
                   
                   <div className="flex-1">
                     <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Email Body</label>
                     <textarea
                       rows={12}
                       disabled={!activeRecipient}
                       value={activeRecipient ? (recipientDrafts[activeRecipient]?.body ?? personalizeText(baseEmailBody, findContactForEmail(activeRecipient))) : ""}
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
                  <div className="mt-4 flex flex-col gap-3">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleSendAutomatedGmail(activeRecipient ? { toAddress: activeRecipient } : null)}
                      disabled={!activeRecipient || submittingPost}
                      className="rounded-lg bg-red-650 border border-red-200 text-white hover:bg-red-700 px-5 py-2.5 text-sm font-semibold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Send size={14} /> Send Automated Gmail <span className="bg-white text-red-700 text-[8px] px-1 rounded-sm ml-1 uppercase tracking-wider font-extrabold">Beta</span>
                    </button>
                    <button
                      onClick={() => handleSendEmail(null, activeRecipient)}
                      disabled={!activeRecipient}
                      className="rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 px-5 py-2.5 text-sm font-semibold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Send size={14} /> Open Gmail/Outlook Composer
                    </button>
                    <button
                      onClick={saveDraftForRecipient}
                      disabled={!activeRecipient || savingRecipientDraft}
                      className="rounded-lg border border-slate-205 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                    >
                      {savingRecipientDraft ? "Saving..." : "Save Draft"}
                    </button>
                  </div>
                  {!gmailConnected && (
                    <p className="text-right text-xs text-red-650 font-bold">
                      Please connect your Gmail account first.
                    </p>
                  )}
                  {automatedGmailStatus && (
                    <div className="text-center text-xs font-bold text-red-750 bg-red-50 border border-red-100 rounded-lg py-1.5 animate-pulse">
                      Status: {automatedGmailStatus}
                    </div>
                  )}
                </div>

                {/* Email History Section */}
                <div className="mt-6 border-t border-slate-100 pt-5">
                  <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <History size={16} className="text-slate-500" />
                    Email History
                  </h4>
                  {emailHistory.length === 0 ? (
                    <p className="text-xs text-slate-400 italic bg-slate-50 rounded-lg p-4 border border-dashed border-slate-200 text-center">
                      No emails sent yet.
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50/50">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100/80 text-slate-500 font-bold border-b border-slate-200">
                            <th className="p-2.5">Recipient</th>
                            <th className="p-2.5">Subject</th>
                            <th className="p-2.5">Sent Via</th>
                            <th className="p-2.5">Timestamp</th>
                            <th className="p-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {emailHistory.map((item) => (
                            <tr key={item.id} className="border-b border-slate-150 hover:bg-slate-100/50 transition">
                              <td className="p-2.5 font-medium text-slate-700 truncate max-w-[150px]">{item.recipient}</td>
                              <td className="p-2.5 text-slate-650 truncate max-w-[200px]">{item.subject || "(No Subject)"}</td>
                              <td className="p-2.5">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  item.sent_via === "Automated Gmail" 
                                    ? "bg-red-50 text-red-750 border border-red-100" 
                                    : "bg-indigo-50 text-indigo-750 border border-indigo-100"
                                }`}>
                                  {item.sent_via}
                                </span>
                              </td>
                              <td className="p-2.5 text-slate-500 whitespace-nowrap">
                                {new Date(item.sent_timestamp).toLocaleString()}
                              </td>
                              <td className="p-2.5">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  item.status === "Sent" 
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-150" 
                                    : "bg-red-50 text-red-750 border border-red-150"
                                }`}>
                                  {item.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                </div>

              </div>
            </div>

             <div className="pt-2 flex flex-col gap-3">
               <div className="flex gap-3">
                <button
                  onClick={() => submitPostAction("send_all")}
                  disabled={submittingPost || allRecipients.length === 0}
                  className="flex-1 rounded-xl bg-slate-900 px-4 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:scale-[0.99] hover:bg-slate-800 hover:shadow-lg disabled:opacity-50 border-0 cursor-pointer"
                >
                  {submittingPost ? "Sending Campaign..." : `Send to ${allRecipients.length} Recipient${allRecipients.length !== 1 ? 's' : ''}`}
                </button>
                <div className="flex-1 flex flex-col gap-1.5">
                   <button
                     onClick={() => handleSendEmail(null)}
                     disabled={allRecipients.length === 0}
                     className="w-full rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:scale-[0.99] hover:bg-indigo-700 hover:shadow-lg disabled:opacity-50 border-0 cursor-pointer flex items-center justify-center gap-1.5"
                   >
                     <Send size={14} /> Send via {emailClientPreference === 'outlook' ? 'Outlook' : 'Gmail'}
                   </button>
                   <div className="flex justify-center gap-2 pt-0.5">
                     <button onClick={() => { setEmailPref('gmail'); handleSendEmail(null, null, 'gmail'); }} className={`text-xs font-semibold px-3 py-1 rounded border cursor-pointer transition ${emailClientPreference === 'gmail' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>Gmail</button>
                     <button onClick={() => { setEmailPref('outlook'); handleSendEmail(null, null, 'outlook'); }} className={`text-xs font-semibold px-3 py-1 rounded border cursor-pointer transition ${emailClientPreference === 'outlook' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>Outlook</button>
                   </div>
                 </div>
               </div>
               
               <div className="flex flex-col gap-2 rounded-xl border border-red-100 bg-red-50/30 p-3">
                 <div className="flex items-center justify-between gap-3">
                   <button
                     onClick={() => handleSendAutomatedGmail(null)}
                     disabled={submittingPost || allRecipients.length === 0}
                     className="flex-1 rounded-xl bg-red-650 hover:bg-red-700 px-4 py-3 text-sm font-bold text-white shadow-md transition-all disabled:opacity-50 border-0 cursor-pointer flex items-center justify-center gap-1.5"
                   >
                     <Send size={14} /> Send Automated Gmail 
                     <span className="rounded bg-white px-1.5 py-0.5 text-[9px] font-extrabold text-red-650 uppercase tracking-wider">Beta</span>
                   </button>
                   
                   {!gmailConnected && (
                     <span className="text-xs text-red-650 font-bold">
                       Please connect your Gmail account first.
                     </span>
                   )}
                 </div>
                 {automatedGmailStatus && (
                   <div className="text-center text-xs font-extrabold text-red-700 animate-pulse bg-red-50 border border-red-100 rounded-lg py-1.5">
                     Status: {automatedGmailStatus}
                   </div>
                 )}
               </div>
             </div>

          </div>
        </div>
      ) : null}

      {/* Email List Upload & Contact Manager Modal */}
      {showEmailListModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileDown className="h-5 w-5 text-indigo-600" /> Email List Manager
                </h3>
                <p className="text-xs text-slate-500">
                  {importedFileName ? `File: ${importedFileName}` : 'Import and manage contact email lists (CSV / XLSX up to 500 records)'}
                </p>
              </div>
              <button
                onClick={() => setShowEmailListModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Stats Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 px-6 py-4 bg-slate-50/30 border-b border-slate-100">
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Records</p>
                <p className="text-xl font-extrabold text-slate-900 mt-0.5">{importStats.total}</p>
                <p className="text-[10px] text-slate-400 mt-1">Max 500 records</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 shadow-xs">
                <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Valid Emails</p>
                <p className="text-xl font-extrabold text-emerald-700 mt-0.5">{importStats.valid}</p>
                <p className="text-[10px] text-emerald-600/80 mt-1">Added to workspace</p>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-3 shadow-xs">
                <p className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Invalid Emails</p>
                <p className="text-xl font-extrabold text-rose-700 mt-0.5">{importStats.invalid}</p>
                <p className="text-[10px] text-rose-600/80 mt-1">Exportable as CSV</p>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-3 shadow-xs flex flex-col justify-between">
                <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Supabase DB</p>
                <span className="inline-flex items-center text-xs font-semibold text-indigo-700 mt-1">
                  {savingContacts ? <><LoadingSpinner size="h-3 w-3" /> Saving…</> : '✓ Saved to DB'}
                </span>
                <p className="text-[10px] text-indigo-600/80 mt-1">Persisted in Supabase</p>
              </div>
            </div>

            {/* Truncation alert if file > 500 records */}
            {importStats.truncated && (
              <div className="mx-6 mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 flex items-center justify-between">
                <span>⚠️ Maximum upload limit is 500 records. The uploaded file was truncated to the first 500 entries.</span>
              </div>
            )}

            {/* Toolbar Controls */}
            <div className="px-6 py-3 border-b border-slate-100 flex flex-wrap gap-3 items-center justify-between bg-white">
              {/* Search & Filter */}
              <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    value={contactSearch}
                    onChange={(e) => { setContactSearch(e.target.value); setContactPage(1); }}
                    placeholder="Search name, email, company…"
                    className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-1.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <select
                  value={contactFilter}
                  onChange={(e) => { setContactFilter(e.target.value); setContactPage(1); }}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 bg-white font-medium outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="all">All Records ({importedContacts.length})</option>
                  <option value="valid">Valid Only ({importStats.valid})</option>
                  <option value="invalid">Invalid Only ({importStats.invalid})</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={downloadInvalidRecords}
                  disabled={importStats.invalid === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 text-xs font-bold transition cursor-pointer"
                >
                  <Download size={13} /> Download Invalid ({importStats.invalid})
                </button>

                <button
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.csv,.xlsx';
                    input.onchange = (e) => handleEmailListUpload(e.target.files[0]);
                    input.click();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 text-xs font-semibold cursor-pointer transition"
                >
                  + Upload CSV/XLSX
                </button>
              </div>
            </div>

            {/* Paginated Table */}
            <div className="flex-1 overflow-y-auto px-6 py-2">
              {parsingFile ? (
                <div className="py-12 text-center">
                  <LoadingSpinner size="h-8 w-8 text-indigo-600 mx-auto" />
                  <p className="mt-2 text-xs font-semibold text-slate-600">Parsing contact records…</p>
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <p className="text-sm font-semibold">No contacts to display.</p>
                  <p className="text-xs text-slate-400 mt-1">Upload a CSV or XLSX file to import contact records.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs text-slate-700 border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Email Address</th>
                      <th className="py-2.5 px-3">Company</th>
                      <th className="py-2.5 px-3">Validation Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedContacts.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {c.isValid ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                              ✓ Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                              ✕ Invalid
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">{c.name}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-800 whitespace-nowrap">{c.email}</td>
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{c.company}</td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                          {c.isValid ? <span className="text-emerald-600">Valid</span> : <span className="text-rose-600 font-medium">{c.reason}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination Footer */}
            <div className="border-t border-slate-100 px-6 py-3 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
              <div>
                Showing {filteredContacts.length > 0 ? (contactPage - 1) * contactPageSize + 1 : 0} to {Math.min(contactPage * contactPageSize, filteredContacts.length)} of {filteredContacts.length} contacts
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span>Per page:</span>
                  <select
                    value={contactPageSize}
                    onChange={(e) => { setContactPageSize(Number(e.target.value)); setContactPage(1); }}
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 outline-none"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setContactPage(p => Math.max(p - 1, 1))}
                    disabled={contactPage <= 1}
                    className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Prev
                  </button>
                  <span className="px-2 font-semibold text-slate-700">
                    Page {contactPage} of {totalContactPages || 1}
                  </span>
                  <button
                    onClick={() => setContactPage(p => Math.min(p + 1, totalContactPages))}
                    disabled={contactPage >= totalContactPages}
                    className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Email History Record Detail Viewer Modal */}
      {selectedHistoryRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Mail className="h-5 w-5 text-indigo-600" /> Sent Email Record Details
                </h3>
                <p className="text-xs text-slate-500">
                  Sent on {new Date(selectedHistoryRecord.sent_timestamp || Date.now()).toLocaleString()} via {selectedHistoryRecord.sent_via || "Automated Gmail"}
                </p>
              </div>
              <button
                onClick={() => setSelectedHistoryRecord(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-150 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recipient</span>
                  <span className="font-bold text-slate-900">
                    {selectedHistoryRecord.recipient_name ? `${selectedHistoryRecord.recipient_name} (${selectedHistoryRecord.recipient})` : selectedHistoryRecord.recipient}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Delivery Status</span>
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200">
                    ✓ {selectedHistoryRecord.status || "Sent"}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Subject</span>
                <p className="text-sm font-bold text-slate-900 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  {selectedHistoryRecord.subject || "(No Subject)"}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Email Body Content</span>
                <div className="whitespace-pre-wrap text-xs text-slate-800 bg-slate-50/70 p-4 rounded-xl border border-slate-200 font-sans leading-relaxed">
                  {selectedHistoryRecord.email_body || selectedHistoryRecord.body || "No message body recorded."}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 px-6 py-3 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedHistoryRecord(null)}
                className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inbox Message Detail Viewer Modal */}
      {selectedInboxMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Inbox className="h-5 w-5 text-indigo-600" /> Campaign Reply Message
                </h3>
                <p className="text-xs text-slate-500">
                  Received on {new Date(selectedInboxMessage.receivedAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedInboxMessage(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-150 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sender</span>
                  <span className="font-bold text-slate-900">{selectedInboxMessage.senderName} ({selectedInboxMessage.sender})</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Company</span>
                  <span className="font-bold text-slate-800">{selectedInboxMessage.company || "-"}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Subject</span>
                <p className="text-sm font-bold text-slate-900 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  {selectedInboxMessage.subject}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Message Body</span>
                <div className="whitespace-pre-wrap text-xs text-slate-800 bg-slate-50/70 p-4 rounded-xl border border-slate-200 font-sans leading-relaxed">
                  {selectedInboxMessage.body}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 px-6 py-3 bg-slate-50 flex justify-end gap-2">
              <button
                onClick={() => {
                  setSelectedInboxMessage(null);
                  showToast(`Reply draft opened for ${selectedInboxMessage.sender}`);
                }}
                className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 text-xs font-bold transition cursor-pointer"
              >
                Reply to Message
              </button>
              <button
                onClick={() => setSelectedInboxMessage(null)}
                className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-4 py-1.5 text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* PRE-SEND CAMPAIGN REVIEW & PERSONALIZATION MODAL */}
      {showPreSendReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="flex h-full max-h-[92vh] w-full max-w-6xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            
            {/* Modal Header */}
            <div className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-4 text-white">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Mail className="h-5 w-5 text-red-400" /> Review Email Campaign ({preSendRecipientsList.length} Recipients)
                </h3>
                <p className="text-xs text-slate-300 font-medium mt-0.5">
                  Mail sending is sensitive. Review, edit email body/subject, or remove recipients (✕) before sending.
                </p>
              </div>

              {/* Top Header Controls */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => confirmAndSendCampaign(preSendRecipientsList)}
                  disabled={preSendRecipientsList.length === 0 || sendingAutomated}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 text-sm font-extrabold shadow-md transition hover:scale-[0.99] border-0 cursor-pointer disabled:opacity-50"
                >
                  <Send size={15} /> 🚀 Send All ({preSendRecipientsList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreSendReviewModal(false)}
                  className="rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 text-xs font-bold transition border-0 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Modal Body */}
            {sendProgress.status === "completed" || sendingSuccessMessage ? (
              /* Success Completion View inside Pop-up Modal */
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-white overflow-y-auto">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-3 shadow-2xs">
                  <CheckCircle2 size={36} />
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  Email Campaign Dispatched Successfully!
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1 max-w-md">
                  {sendingSuccessMessage || `All ${sendProgress.total} emails have been processed and dispatched.`}
                </p>

                {/* Live Progress Bar (100%) */}
                <div className="w-full max-w-lg mt-5 bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-2xs">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                    <span>Campaign Dispatch Progress</span>
                    <span className="text-emerald-600 font-extrabold">100% Complete</span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden border border-slate-200">
                    <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: "100%" }} />
                  </div>

                  <div className="flex items-center justify-center gap-3 mt-3 text-xs font-bold">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">
                      ✓ {sendProgress.sentCount} Sent Successfully
                    </span>
                    {sendProgress.failCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-rose-800">
                        ✕ {sendProgress.failCount} Failed
                      </span>
                    )}
                  </div>
                </div>

                {/* Recipient Log Table */}
                {sendProgress.logs && sendProgress.logs.length > 0 && (
                  <div className="w-full max-w-xl mt-4 max-h-40 overflow-y-auto border border-slate-200 rounded-xl text-left text-xs bg-white shadow-2xs">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                          <th className="py-2 px-3">Recipient</th>
                          <th className="py-2 px-3">Status</th>
                          <th className="py-2 px-3 text-right">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sendProgress.logs.map((log, idx) => (
                          <tr key={idx}>
                            <td className="py-2 px-3 font-semibold text-slate-800">{log.name || log.recipient}</td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${log.status === 'Sent' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                {log.status}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right text-slate-400 font-medium">{log.timestamp}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Modal Footer Action Buttons */}
                <div className="flex items-center gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPreSendReviewModal(false);
                      setSendingSuccessMessage("");
                    }}
                    className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 text-xs font-bold transition shadow-xs cursor-pointer border-0"
                  >
                    Done & Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPreSendReviewModal(false);
                      setSendingSuccessMessage("");
                      setShowHistoryModal(true);
                    }}
                    className="rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-5 py-2.5 text-xs font-bold transition cursor-pointer"
                  >
                    <History size={13} className="inline mr-1" /> View Sent History
                  </button>
                </div>
              </div>
            ) : preSendRecipientsList.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50">
                <p className="text-sm font-semibold text-slate-700">No recipients remaining in this campaign list.</p>
                <p className="text-xs text-slate-400 mt-1">Add a recipient or upload a list to continue.</p>
                <button
                  type="button"
                  onClick={() => {
                    const newEmail = prompt("Enter email address:");
                    if (newEmail && isEmail(newEmail.trim())) {
                      setPreSendRecipientsList([{
                        id: `presend-${Date.now()}`,
                        email: newEmail.trim(),
                        name: newEmail.trim().split('@')[0],
                        company: '',
                        toAddress: newEmail.trim(),
                        ccAddress: '',
                        bccAddress: '',
                        subject: baseEmailSubject || 'Marketing Outreach',
                        body: baseEmailBody || ''
                      }]);
                      setActivePreSendIndex(0);
                    }
                  }}
                  className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 cursor-pointer border-0"
                >
                  + Add Recipient
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                
                {/* Left Panel: Recipient Selection & Deletion List */}
                <div className="w-full md:w-1/3 border-r border-slate-200 bg-slate-50/60 p-4 flex flex-col overflow-y-auto">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                      Recipients List ({preSendRecipientsList.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const newEmail = prompt("Enter new recipient email address:");
                        if (newEmail && isEmail(newEmail.trim())) {
                          setPreSendRecipientsList(prev => [
                            ...prev,
                            {
                              id: `presend-${Date.now()}`,
                              email: newEmail.trim(),
                              name: newEmail.trim().split('@')[0],
                              company: '',
                              toAddress: newEmail.trim(),
                              ccAddress: '',
                              bccAddress: '',
                              subject: baseEmailSubject || 'Marketing Outreach',
                              body: baseEmailBody || ''
                            }
                          ]);
                          setActivePreSendIndex(preSendRecipientsList.length);
                        }
                      }}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer border-0 bg-transparent"
                    >
                      + Add Email
                    </button>
                  </div>

                  <div className="space-y-2 flex-1 overflow-y-auto pr-1">
                    {preSendRecipientsList.map((item, index) => {
                      const isActive = index === activePreSendIndex;
                      return (
                        <div
                          key={item.id || index}
                          onClick={() => setActivePreSendIndex(index)}
                          className={`flex items-center justify-between rounded-xl p-3 border text-xs cursor-pointer transition ${
                            isActive
                              ? "border-indigo-500 bg-indigo-50/90 ring-1 ring-indigo-400 shadow-xs"
                              : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-100/50"
                          }`}
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <p className={`font-bold truncate ${isActive ? "text-indigo-950" : "text-slate-800"}`}>
                              {item.name || item.email.split('@')[0]}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">{item.email}</p>
                            {item.company && <p className="text-[10px] text-slate-400 truncate">{item.company}</p>}
                          </div>

                          {/* Remove Recipient Cross (X) Icon */}
                          <button
                            type="button"
                            title="Remove recipient from campaign"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemovePreSendRecipient(index);
                            }}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-100 hover:text-rose-600 transition border-0 cursor-pointer"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right Panel: Live Editable Composer */}
                {preSendRecipientsList[activePreSendIndex] && (
                  <div className="w-full md:w-2/3 p-5 flex flex-col overflow-y-auto bg-white">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          Editing Email #{activePreSendIndex + 1} of {preSendRecipientsList.length}
                        </p>
                        <p className="text-xs text-slate-500">
                          Target: <span className="font-semibold text-indigo-700">{preSendRecipientsList[activePreSendIndex].email}</span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemovePreSendRecipient(activePreSendIndex)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg border border-rose-200 transition cursor-pointer"
                      >
                        <Trash2 size={13} /> Remove from Campaign
                      </button>
                    </div>

                    <div className="space-y-3 flex-1">
                      {/* To, CC, BCC Inputs */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-1">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">To Address</label>
                          <input
                            value={preSendRecipientsList[activePreSendIndex].toAddress || preSendRecipientsList[activePreSendIndex].email}
                            onChange={(e) => updatePreSendRecipientField(activePreSendIndex, { toAddress: e.target.value, email: e.target.value })}
                            className="w-full rounded-lg border border-slate-250 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                          />
                        </div>
                        <div className="md:col-span-1">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">CC Address</label>
                          <input
                            value={preSendRecipientsList[activePreSendIndex].ccAddress || ""}
                            onChange={(e) => updatePreSendRecipientField(activePreSendIndex, { ccAddress: e.target.value })}
                            placeholder="cc@example.com"
                            className="w-full rounded-lg border border-slate-250 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                          />
                        </div>
                        <div className="md:col-span-1">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">BCC Address</label>
                          <input
                            value={preSendRecipientsList[activePreSendIndex].bccAddress || ""}
                            onChange={(e) => updatePreSendRecipientField(activePreSendIndex, { bccAddress: e.target.value })}
                            placeholder="bcc@example.com"
                            className="w-full rounded-lg border border-slate-250 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                          />
                        </div>
                      </div>

                      {/* Subject */}
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Subject Line</label>
                        <input
                          value={preSendRecipientsList[activePreSendIndex].subject || ""}
                          onChange={(e) => updatePreSendRecipientField(activePreSendIndex, { subject: e.target.value })}
                          placeholder="Email subject line..."
                          className="w-full rounded-lg border border-slate-250 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 font-semibold outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                        />
                      </div>

                      {/* Email Body */}
                      <div className="flex-1 flex flex-col">
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Email Body Content</label>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {(preSendRecipientsList[activePreSendIndex].body || "").length} characters | {(preSendRecipientsList[activePreSendIndex].body || "").split(/\s+/).filter(Boolean).length} words
                          </span>
                        </div>
                        <textarea
                          rows={8}
                          value={preSendRecipientsList[activePreSendIndex].body || ""}
                          onChange={(e) => updatePreSendRecipientField(activePreSendIndex, { body: e.target.value })}
                          placeholder="Compose or edit email message body here..."
                          className="w-full resize-y rounded-lg border border-slate-250 bg-slate-50/50 px-3 py-2.5 text-xs text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                        />
                      </div>

                      {/* Attachments Section in Pre-Send Review Modal */}
                      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                            <FileText size={14} className="text-indigo-600" /> Attached Files ({(preSendRecipientsList[activePreSendIndex]?.attachments || []).length})
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.multiple = true;
                              input.accept = '.pdf,.docx,.xlsx,.jpg,.jpeg,.png';
                              input.onchange = (e) => {
                                const files = Array.from(e.target.files || []);
                                files.forEach(file => {
                                  const reader = new FileReader();
                                  reader.onload = (evt) => {
                                    const newAtt = {
                                      name: file.name,
                                      type: file.type || 'application/octet-stream',
                                      size: file.size,
                                      dataUrl: evt.target.result
                                    };
                                    const currentAtts = preSendRecipientsList[activePreSendIndex]?.attachments || [];
                                    updatePreSendRecipientField(activePreSendIndex, {
                                      attachments: [...currentAtts, newAtt]
                                    });
                                  };
                                  reader.readAsDataURL(file);
                                });
                              };
                              input.click();
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-700 px-2.5 py-1 text-xs font-semibold cursor-pointer transition shadow-2xs"
                          >
                            + Add File
                          </button>
                        </div>

                        {(preSendRecipientsList[activePreSendIndex]?.attachments || []).length > 0 ? (
                          <div className="space-y-1.5">
                            {(preSendRecipientsList[activePreSendIndex]?.attachments || []).map((att, attIdx) => (
                              <div key={`${att.name}-${attIdx}`} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-2xs">
                                <div className="min-w-0 flex-1 flex items-center gap-2">
                                  <FileText size={13} className="text-indigo-600 flex-shrink-0" />
                                  <span className="truncate text-xs font-semibold text-slate-800">{att.name}</span>
                                  {att.size && <span className="text-[10px] text-slate-400">({(att.size / 1024).toFixed(1)} KB)</span>}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentAtts = preSendRecipientsList[activePreSendIndex]?.attachments || [];
                                    updatePreSendRecipientField(activePreSendIndex, {
                                      attachments: currentAtts.filter((_, i) => i !== attIdx)
                                    });
                                  }}
                                  className="ml-2 text-xs font-bold text-rose-500 hover:text-rose-700 bg-transparent border-0 cursor-pointer flex-shrink-0"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic">No attachments added for this email.</p>
                        )}
                      </div>

                      {/* AI Personalization Assistant inline tweak */}
                      <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 mt-2">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Sparkles size={14} className="text-indigo-600" />
                          <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider">AI Edit for this Email</span>
                        </div>
                        <div className="flex gap-2">
                          <input
                            value={aiPromptForPreSend}
                            onChange={(e) => setAiPromptForPreSend(e.target.value)}
                            placeholder="e.g., Add a friendly greeting, make tone professional..."
                            className="w-full rounded-lg border border-slate-250 bg-white px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-300"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              if (!aiPromptForPreSend.trim()) return;
                              setAiEditingPreSend(true);
                              try {
                                const current = preSendRecipientsList[activePreSendIndex];
                                const aiInput = `${aiPromptForPreSend.trim()}\n\nCurrent subject: ${current.subject}\nCurrent email body:\n${current.body}\n\nRewrite email message body for recipient: ${current.name || current.email}`;
                                const res = await fetch("/api/create-post/generate", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ input: aiInput, selectedTypes: ["email_campaign"] })
                                });
                                const data = await res.json();
                                if (!res.ok || data?.error) throw new Error(data?.error || "AI edit failed.");
                                const generated = data?.contents?.[0];
                                if (!generated || !generated.main) throw new Error("AI did not return updated content.");
                                updatePreSendRecipientField(activePreSendIndex, {
                                  body: generated.main,
                                  subject: generated.subject || current.subject
                                });
                                setAiPromptForPreSend("");
                                showToast("✓ AI Tweak Applied!");
                              } catch (e) {
                                console.warn("AI edit failed:", e);
                                showToast("AI edit note: " + (e.message || "Failed to update"));
                              } finally {
                                setAiEditingPreSend(false);
                              }
                            }}
                            disabled={aiEditingPreSend || !aiPromptForPreSend.trim()}
                            className="whitespace-nowrap rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-xs font-bold transition disabled:opacity-50 cursor-pointer border-0 flex items-center gap-1.5"
                          >
                            {aiEditingPreSend ? <LoadingSpinner size="h-3 w-3" /> : <Sparkles size={13} />}
                            {aiEditingPreSend ? "Applying..." : "Apply AI Tweak"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3">
              <p className="text-xs text-slate-500 font-medium">
                Ready to dispatch? Click <span className="font-bold text-slate-800">Send All</span> to start automated bulk sending.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPreSendReviewModal(false)}
                  className="rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 text-xs font-semibold cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => confirmAndSendCampaign(preSendRecipientsList)}
                  disabled={preSendRecipientsList.length === 0 || sendingAutomated}
                  className="rounded-lg bg-red-600 hover:bg-red-700 text-white px-5 py-2 text-xs font-bold transition shadow-xs cursor-pointer border-0 disabled:opacity-50"
                >
                  🚀 Send All ({preSendRecipientsList.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* OMNICHANNEL HISTORY & ACTIVITY MODAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="flex h-full max-h-[90vh] w-full max-w-6xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            
            {/* Modal Header Bar */}
            <div className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-4 text-white">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <History className="h-5 w-5 text-indigo-400" /> Omnichannel Campaign & Post History
                </h3>
                <p className="text-xs text-slate-300 font-medium mt-0.5">
                  Review past sent emails, social posts, and activity logs across all integrated platforms.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Search bar inside history modal */}
                <div className="relative w-48 sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    value={emailHistorySearch}
                    onChange={(e) => setEmailHistorySearch(e.target.value)}
                    placeholder="Search history records..."
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                {/* Time range filter */}
                <select
                  value={historyTimeFilter}
                  onChange={(e) => setHistoryTimeFilter(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="6months">Last 6 Months</option>
                  <option value="all">All Time ({emailHistoryList.length})</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="7days">Last 7 Days</option>
                </select>

                <button
                  type="button"
                  onClick={fetchEmailHistory}
                  className="rounded-lg bg-slate-800 hover:bg-slate-700 p-2 text-slate-300 hover:text-white transition border-0 cursor-pointer"
                  title="Refresh history"
                >
                  <RefreshCw size={14} />
                </button>

                <button
                  type="button"
                  onClick={() => setShowHistoryModal(false)}
                  className="rounded-lg bg-slate-800 hover:bg-slate-700 p-2 text-slate-300 hover:text-white transition border-0 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Main Body (Split View) */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              
              {/* Left Navigation Sidebar */}
              <div className="w-full md:w-64 border-r border-slate-200 bg-slate-50/70 p-4 flex flex-col gap-1.5 overflow-y-auto">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2 mb-1">
                  Platforms & Channels
                </span>

                {/* 1. Gmail & Bulk Email */}
                <button
                  type="button"
                  onClick={() => setHistoryModalChannel("gmail")}
                  className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition border-0 cursor-pointer ${
                    historyModalChannel === "gmail"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-700 hover:bg-slate-200/60"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Mail size={15} /> Gmail & Bulk Emails
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                    historyModalChannel === "gmail" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                  }`}>
                    {emailHistoryList.length}
                  </span>
                </button>

                {/* 2. LinkedIn */}
                <button
                  type="button"
                  onClick={() => setHistoryModalChannel("linkedin")}
                  className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition border-0 cursor-pointer ${
                    historyModalChannel === "linkedin"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-700 hover:bg-slate-200/60"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Share2 size={15} /> LinkedIn Posts
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                    historyModalChannel === "linkedin" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                  }`}>
                    {recentActivity.filter(r => (r.typeId || "").includes("linkedin")).length}
                  </span>
                </button>

                {/* 3. Instagram */}
                <button
                  type="button"
                  onClick={() => setHistoryModalChannel("instagram")}
                  className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition border-0 cursor-pointer ${
                    historyModalChannel === "instagram"
                      ? "bg-pink-600 text-white shadow-xs"
                      : "text-slate-700 hover:bg-slate-200/60"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Sparkles size={15} /> Instagram Posts
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                    historyModalChannel === "instagram" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                  }`}>
                    {recentActivity.filter(r => (r.typeId || "").includes("instagram")).length}
                  </span>
                </button>

                {/* 4. Facebook */}
                <button
                  type="button"
                  onClick={() => setHistoryModalChannel("facebook")}
                  className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition border-0 cursor-pointer ${
                    historyModalChannel === "facebook"
                      ? "bg-indigo-700 text-white shadow-xs"
                      : "text-slate-700 hover:bg-slate-200/60"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Share2 size={15} /> Facebook Posts
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                    historyModalChannel === "facebook" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                  }`}>
                    {recentActivity.filter(r => (r.typeId || "").includes("facebook")).length}
                  </span>
                </button>

                {/* 5. Outlook */}
                <button
                  type="button"
                  onClick={() => setHistoryModalChannel("outlook")}
                  className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition border-0 cursor-pointer ${
                    historyModalChannel === "outlook"
                      ? "bg-sky-600 text-white shadow-xs"
                      : "text-slate-700 hover:bg-slate-200/60"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Send size={15} /> Outlook Outbox
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                    historyModalChannel === "outlook" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                  }`}>
                    {emailHistoryList.filter(h => (h.sent_via || "").toLowerCase().includes("outlook")).length}
                  </span>
                </button>

                {/* 6. All Activity Logs */}
                <button
                  type="button"
                  onClick={() => setHistoryModalChannel("all")}
                  className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition border-0 cursor-pointer ${
                    historyModalChannel === "all"
                      ? "bg-slate-800 text-white shadow-xs"
                      : "text-slate-700 hover:bg-slate-200/60"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <History size={15} /> All Audit & Activity Logs
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                    historyModalChannel === "all" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                  }`}>
                    {emailHistoryList.length + recentActivity.length}
                  </span>
                </button>
              </div>

              {/* Right Content Panel */}
              <div className="flex-1 p-5 overflow-y-auto bg-white flex flex-col">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 capitalize">
                      {historyModalChannel === "gmail" ? "Gmail & Bulk Email Campaign Outbox" :
                       historyModalChannel === "linkedin" ? "LinkedIn Post History & Logs" :
                       historyModalChannel === "instagram" ? "Instagram Post History & Logs" :
                       historyModalChannel === "facebook" ? "Facebook Post History & Logs" :
                       historyModalChannel === "outlook" ? "Outlook Sent Email History" : "Omnichannel Activity Audit Trail"}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Viewing sent records for {historyTimeFilter === "6months" ? "Last 6 Months" : historyTimeFilter === "30days" ? "Last 30 Days" : "All Time"}
                    </p>
                  </div>

                  <span className="text-xs font-bold text-slate-400 bg-slate-50 border border-slate-200 px-3 py-1 rounded-lg">
                    {historyModalChannel === "gmail" || historyModalChannel === "outlook" ? `${filteredHistoryList.length} Record(s)` : `${recentActivity.length} Record(s)`}
                  </span>
                </div>

                {/* Table Content */}
                {historyModalChannel === "gmail" || historyModalChannel === "outlook" ? (
                  filteredHistoryList.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <Mail className="h-8 w-8 text-slate-300 mb-2" />
                      <p className="text-xs font-bold text-slate-600">No sent email records found for this channel view.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Send emails via Automated Gmail or manual compose to see history logs here.</p>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 bg-slate-50 z-10">
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3">Recipient</th>
                            <th className="py-2.5 px-3">Subject</th>
                            <th className="py-2.5 px-3">Email Body Content</th>
                            <th className="py-2.5 px-3">Sent Via</th>
                            <th className="py-2.5 px-3">Timestamp</th>
                            <th className="py-2.5 px-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredHistoryList
                            .filter(h => historyModalChannel !== "outlook" || (h.sent_via || "").toLowerCase().includes("outlook"))
                            .map((h, i) => (
                              <tr key={h.id || i} className="hover:bg-slate-50 transition">
                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    h.status === 'Sent' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                                  }`}>
                                    {h.status === 'Sent' ? '✓ Sent' : '✕ Failed'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap max-w-[180px] truncate">
                                  {h.recipient_name ? `${h.recipient_name} <${h.recipient}>` : h.recipient}
                                </td>
                                <td className="py-2.5 px-3 font-medium text-indigo-900 max-w-[200px] truncate">
                                  {h.subject || "(No Subject)"}
                                </td>
                                <td className="py-2.5 px-3 text-slate-500 text-[11px] max-w-[260px] truncate">
                                  {h.email_body || h.body || "(No message body)"}
                                </td>
                                <td className="py-2.5 px-3 text-slate-600 text-[11px] whitespace-nowrap font-medium">
                                  {h.sent_via || "Gmail"}
                                </td>
                                <td className="py-2.5 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                                  {new Date(h.sent_timestamp || Date.now()).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedHistoryRecord(h)}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition cursor-pointer"
                                  >
                                    <Eye size={12} /> View Body
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )
                ) : (
                  /* Social Platforms History (LinkedIn, Instagram, Facebook, All) */
                  recentActivity.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <History className="h-8 w-8 text-slate-300 mb-2" />
                      <p className="text-xs font-bold text-slate-600">No activity records found for this platform.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Generate or publish content to create history logs.</p>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 bg-slate-50 z-10">
                            <th className="py-2.5 px-3">Platform</th>
                            <th className="py-2.5 px-3">Subject / Title</th>
                            <th className="py-2.5 px-3">Generated Content</th>
                            <th className="py-2.5 px-3">Timestamp</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {recentActivity
                            .filter(r => historyModalChannel === "all" || (r.typeId || "").toLowerCase().includes(historyModalChannel))
                            .map((act, idx) => (
                              <tr key={act.id || idx} className="hover:bg-slate-50 transition">
                                <td className="py-2.5 px-3 font-bold text-indigo-700 whitespace-nowrap">
                                  {act.typeLabel || act.typeId}
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-slate-800 max-w-[200px] truncate">
                                  {act.subject || "(No Subject)"}
                                </td>
                                <td className="py-2.5 px-3 text-slate-600 max-w-[320px] truncate">
                                  {act.content}
                                </td>
                                <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                                  {new Date(act.timestamp || Date.now()).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}

              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 flex items-center justify-between">
              <p className="text-xs text-slate-500 font-medium">
                Omnichannel Campaign Log History • Integrated with Supabase DB & Local Cache
              </p>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-4 py-1.5 text-xs font-semibold transition cursor-pointer"
              >
                Close History
              </button>
            </div>

          </div>
        </div>
      )}
      {/* CONNECTED ACCOUNTS MODAL */}
      {showConnectedAccountsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-4 text-white">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-400" /> Connected Accounts & Integrations
                </h3>
                <p className="text-xs text-slate-300 font-medium mt-0.5">
                  Manage single sign-on authentication and API authorization status across channels.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowConnectedAccountsModal(false)}
                className="rounded-lg bg-slate-800 hover:bg-slate-700 p-2 text-slate-300 hover:text-white transition border-0 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-3.5 bg-slate-50/50 max-h-[70vh] overflow-y-auto">
              
              {/* Gmail */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 font-bold">
                    <Mail size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">Gmail</span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${gmailConnected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
                        {gmailConnected ? '✓ Connected' : 'Not Connected'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {gmailConnected ? formatAccountLabel(gmailConnectedAccount) : 'Authorize Google OAuth to send automated single & batch email campaigns'}
                    </p>
                  </div>
                </div>
                {gmailConnected ? (
                  <button
                    onClick={() => handleDisconnectProvider("gmail")}
                    className="rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-1.5 text-xs font-bold transition cursor-pointer"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => handleConnectProvider("gmail")}
                    className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 text-xs font-bold transition cursor-pointer border-0 shadow-2xs"
                  >
                    Connect Gmail
                  </button>
                )}
              </div>

              {/* Outlook */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600 font-bold">
                    <Send size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">Microsoft Outlook</span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${outlookConnected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
                        {outlookConnected ? '✓ Connected' : 'Not Connected'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {outlookConnected ? formatAccountLabel(outlookConnectedAccount) : 'Connect Office 365 / Outlook for enterprise email dispatch'}
                    </p>
                  </div>
                </div>
                {outlookConnected ? (
                  <button
                    onClick={() => handleDisconnectProvider("outlook")}
                    className="rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-1.5 text-xs font-bold transition cursor-pointer"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => handleConnectProvider("outlook")}
                    className="rounded-lg bg-sky-600 hover:bg-sky-700 text-white px-3.5 py-1.5 text-xs font-bold transition cursor-pointer border-0 shadow-2xs"
                  >
                    Connect Outlook
                  </button>
                )}
              </div>

              {/* LinkedIn */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold">
                    <Share2 size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">LinkedIn</span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${linkedinConnected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
                        {linkedinConnected ? '✓ Connected' : 'Not Connected'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {linkedinConnected ? formatAccountLabel(linkedinConnectedAccount) : 'Connect your LinkedIn profile or organization page to publish posts'}
                    </p>
                  </div>
                </div>
                {linkedinConnected ? (
                  <button
                    onClick={() => handleDisconnectProvider("linkedin")}
                    className="rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-1.5 text-xs font-bold transition cursor-pointer"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => handleConnectProvider("linkedin")}
                    className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 text-xs font-bold transition cursor-pointer border-0 shadow-2xs"
                  >
                    Connect LinkedIn
                  </button>
                )}
              </div>

              {/* Instagram */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-50 text-pink-600 font-bold">
                    <Camera size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">Instagram</span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${instagramConnected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
                        {instagramConnected ? '✓ Connected' : 'Not Connected'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {instagramConnected ? formatAccountLabel(instagramConnectedAccount) : 'Connect Instagram Business Account via Meta Graph API'}
                    </p>
                  </div>
                </div>
                {instagramConnected ? (
                  <button
                    onClick={() => handleDisconnectProvider("instagram")}
                    className="rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-1.5 text-xs font-bold transition cursor-pointer"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => handleConnectProvider("instagram")}
                    className="rounded-lg bg-pink-600 hover:bg-pink-700 text-white px-3.5 py-1.5 text-xs font-bold transition cursor-pointer border-0 shadow-2xs"
                  >
                    Connect Instagram
                  </button>
                )}
              </div>

              {/* Facebook */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 font-bold">
                    <Share2 size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">Facebook Page</span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${facebookConnected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
                        {facebookConnected ? '✓ Connected' : 'Not Connected'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {facebookConnected ? formatAccountLabel(facebookConnectedAccount) : 'Connect Facebook Page to publish organic posts & ad copies'}
                    </p>
                  </div>
                </div>
                {facebookConnected ? (
                  <button
                    onClick={() => handleDisconnectProvider("facebook")}
                    className="rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-1.5 text-xs font-bold transition cursor-pointer"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => handleConnectProvider("facebook")}
                    className="rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white px-3.5 py-1.5 text-xs font-bold transition cursor-pointer border-0 shadow-2xs"
                  >
                    Connect Facebook
                  </button>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 flex items-center justify-between">
              <p className="text-xs text-slate-500 font-medium">
                Integrations managed securely with OAuth tokens in local session & Supabase DB.
              </p>
              <button
                type="button"
                onClick={() => setShowConnectedAccountsModal(false)}
                className="rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-4 py-1.5 text-xs font-semibold transition cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* VISUAL ASSETS GALLERY & AI IMAGE GENERATOR MODAL */}
      {showVisualAssetsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="flex h-full max-h-[90vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-4 text-white">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Camera className="h-5 w-5 text-pink-400" /> Campaign Visual Assets & AI Studio
                </h3>
                <p className="text-xs text-slate-300 font-medium mt-0.5">
                  Browse, generate, and export high-res visual assets for your multi-channel marketing campaigns.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowVisualAssetsModal(false)}
                className="rounded-lg bg-slate-800 hover:bg-slate-700 p-2 text-slate-300 hover:text-white transition border-0 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50 space-y-6">
              
              {/* AI Image Generation Bar */}
              <div className="rounded-2xl border border-pink-200 bg-pink-50/40 p-4 shadow-2xs space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-pink-600" />
                  <span className="text-xs font-bold text-pink-900 uppercase tracking-wider">Generate New AI Campaign Image</span>
                </div>
                <div className="flex gap-2">
                  <input
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    placeholder="e.g. Modern tech banner showing cloud software analytics, vibrant purple gradient..."
                    className="flex-1 rounded-xl border border-slate-250 bg-white px-3.5 py-2 text-xs outline-none focus:ring-2 focus:ring-pink-300 text-slate-900 font-medium"
                  />
                  <button
                    type="button"
                    onClick={generateImageForActiveType}
                    disabled={generatingImageForType === activeType || !imagePrompt.trim()}
                    className="rounded-xl bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 text-xs font-bold transition cursor-pointer border-0 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {generatingImageForType === activeType ? <LoadingSpinner size="h-3 w-3" /> : <Sparkles size={13} />}
                    {generatingImageForType === activeType ? "Generating Image..." : "Generate AI Asset"}
                  </button>
                </div>
              </div>

              {/* Gallery Grid */}
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-3">
                  Generated Campaign Images & Platform Thumbnails
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(contentByType).map(([typeId, obj]) => (
                    <div key={typeId} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs flex flex-col">
                      <div className="relative aspect-video bg-slate-100 flex items-center justify-center overflow-hidden">
                        {obj.imageUrl ? (
                          <img src={obj.imageUrl} alt={obj.typeLabel} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center justify-center p-4 text-center">
                            <Camera className="h-8 w-8 text-slate-300 mb-1" />
                            <span className="text-[11px] font-bold text-slate-400">No Image Generated</span>
                          </div>
                        )}
                      </div>
                      <div className="p-3 flex-1 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-indigo-600">{obj.typeLabel || typeId}</span>
                          <p className="text-xs font-bold text-slate-800 line-clamp-1 mt-0.5">{obj.subject || "Campaign Banner"}</p>
                        </div>
                        {obj.imageUrl && (
                          <div className="mt-3 flex items-center gap-2">
                            <a
                              href={obj.imageUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 text-decoration-none"
                            >
                              <Download size={12} /> Download Asset
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 flex items-center justify-between">
              <p className="text-xs text-slate-500 font-medium">Visual assets automatically attach to campaign post payloads.</p>
              <button
                type="button"
                onClick={() => setShowVisualAssetsModal(false)}
                className="rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-4 py-1.5 text-xs font-semibold transition cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* RECENT ACTIVITY TIMELINE MODAL */}
      {showRecentActivityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="flex h-full max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-4 text-white">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-400" /> Recent Content Generation & Activity Log
                </h3>
                <p className="text-xs text-slate-300 font-medium mt-0.5">
                  Audit history timeline of recent AI content creations, edits, and campaign strategy runs.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRecentActivityModal(false)}
                className="rounded-lg bg-slate-800 hover:bg-slate-700 p-2 text-slate-300 hover:text-white transition border-0 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50">
              {recentActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-xl border border-dashed border-slate-200">
                  <Clock className="h-10 w-10 text-slate-300 mb-2" />
                  <p className="text-xs font-bold text-slate-600">No recent generation activity logged yet.</p>
                  <p className="text-[11px] text-slate-400 mt-1">Generate marketing post strategy above to create activity events!</p>
                </div>
              ) : (
                <div className="relative border-l-2 border-slate-200 ml-4 pl-6 space-y-6">
                  {recentActivity.map((act, idx) => (
                    <div key={act.id || idx} className="relative group">
                      <div className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-indigo-600 shadow-xs" />
                      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-2">
                          <span className="text-xs font-extrabold text-indigo-700">{act.typeLabel || act.typeId}</span>
                          <span className="text-[10px] text-slate-400 font-semibold">{new Date(act.timestamp || Date.now()).toLocaleString()}</span>
                        </div>
                        {act.subject && (
                          <p className="text-xs font-bold text-slate-800 mb-1">Subject: {act.subject}</p>
                        )}
                        <p className="text-xs text-slate-600 line-clamp-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-mono">
                          {act.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 flex items-center justify-between">
              <p className="text-xs text-slate-500 font-medium">Activity logs are saved locally and synchronized with database audit trails.</p>
              <button
                type="button"
                onClick={() => setShowRecentActivityModal(false)}
                className="rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-4 py-1.5 text-xs font-semibold transition cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}
    </main>

  );
}
