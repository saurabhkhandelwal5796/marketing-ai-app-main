"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Sparkles,
  Send,
  Plus,
  Search,
  Pin,
  Trash2,
  Edit3,
  Copy,
  RotateCcw,
  Star,
  Users,
  MessageSquare,
  Mic,
  Image as ImageIcon,
  FileText,
  Bookmark,
  Share2,
  Volume2,
  FileDown,
  Info,
  Check,
  TrendingUp,
  Cpu,
  Bot,
  RefreshCw
} from "lucide-react";
import { getCurrentSessionId, getCurrentUserId } from "../../lib/getCurrentUserId";

export default function AIAssistantPage() {
  const [currentUser, setCurrentUser] = useState(null);
  
  // Chat threads and selection states (persists learning_chat_threads)
  const [threads, setThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [searchChatQuery, setSearchChatQuery] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  
  // Renaming chat state
  const [editingThreadId, setEditingThreadId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  
  // Sidebar category filter: all | favorites | experts | settings
  const [sidebarFilter, setSidebarFilter] = useState("all");
  
  // Active Capability Mode: text | image | voice | pdf | agents
  const [activeMode, setActiveMode] = useState("text");
  
  const assistantChatBottomRef = useRef(null);

  // Load profile and existing chat history on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/auth/profile");
        const data = await res.json();
        if (res.ok && data?.user) setCurrentUser(data.user);
      } catch {}
    };
    fetchProfile();

    try {
      const storedThreads = localStorage.getItem("learning_chat_threads");
      if (storedThreads) {
        const parsed = JSON.parse(storedThreads);
        setThreads(parsed);
        if (parsed.length > 0) {
          setActiveThreadId(parsed[0].id);
        }
      } else {
        // Create initial thread if none exists
        const initialThread = {
          id: `thread-${Date.now()}`,
          title: "New B2B Strategy Chat",
          pinned: false,
          favorite: false,
          createdAt: new Date().toISOString(),
          messages: []
        };
        setThreads([initialThread]);
        setActiveThreadId(initialThread.id);
        localStorage.setItem("learning_chat_threads", JSON.stringify([initialThread]));
      }
    } catch {}
  }, []);

  // Save threads to local storage helper
  const saveThreadsToLocalStorage = (updatedThreads) => {
    setThreads(updatedThreads);
    try {
      localStorage.setItem("learning_chat_threads", JSON.stringify(updatedThreads));
    } catch {}
  };

  // Auto-scroll chat area
  const activeThread = threads.find(t => t.id === activeThreadId);
  useEffect(() => {
    if (assistantChatBottomRef.current) {
      assistantChatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeThread?.messages, chatLoading]);

  // Thread Actions
  const createNewThread = () => {
    const newThread = {
      id: `thread-${Date.now()}`,
      title: "New B2B Strategy Chat",
      pinned: false,
      favorite: false,
      createdAt: new Date().toISOString(),
      messages: []
    };
    const updated = [newThread, ...threads];
    saveThreadsToLocalStorage(updated);
    setActiveThreadId(newThread.id);
  };

  const deleteThread = (id, e) => {
    e.stopPropagation();
    const conf = window.confirm("Are you sure you want to delete this conversation?");
    if (!conf) return;
    const updated = threads.filter(t => t.id !== id);
    saveThreadsToLocalStorage(updated);
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
        return { ...t, title: newTitle.trim() || "Untitled Chat" };
      }
      return t;
    });
    saveThreadsToLocalStorage(updated);
  };

  const togglePinThread = (id, e) => {
    e.stopPropagation();
    const updated = threads.map(t => {
      if (t.id === id) {
        return { ...t, pinned: !t.pinned };
      }
      return t;
    });
    saveThreadsToLocalStorage(updated);
  };

  const toggleFavoriteThread = (id, e) => {
    e.stopPropagation();
    const updated = threads.map(t => {
      if (t.id === id) {
        return { ...t, favorite: !t.favorite };
      }
      return t;
    });
    saveThreadsToLocalStorage(updated);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  const exportChat = (thread) => {
    if (!thread || thread.messages.length === 0) return;
    const text = thread.messages
      .map(m => `[${m.timestamp || ""}] [${m.role.toUpperCase()}]\n${m.content}\n`)
      .join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${thread.title.replace(/\s+/g, "_")}_transcript.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // OpenAI Chat Integration
  const handleSendChatMessage = async (overridePrompt = "") => {
    const text = (overridePrompt || chatInput).trim();
    if (!text || chatLoading || !activeThreadId) return;

    setChatInput("");
    
    const userMsg = {
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    };
    
    const currentThread = threads.find(t => t.id === activeThreadId);
    const updatedMessages = [...currentThread.messages, userMsg];
    
    const updatedThreads = threads.map(t => {
      if (t.id === activeThreadId) {
        const title = t.title === "New B2B Strategy Chat" ? (text.slice(0, 30) + (text.length > 30 ? "..." : "")) : t.title;
        return { ...t, title, messages: updatedMessages };
      }
      return t;
    });
    saveThreadsToLocalStorage(updatedThreads);
    setChatLoading(true);

    // Audit log write
    try {
      const currentUserId = await getCurrentUserId();
      await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: currentUserId || "anonymous",
          event_type: "action",
          page_name: "AI Assistant",
          action_name: "Sent AI Chat query",
          details: text.slice(0, 100),
          session_id: getCurrentSessionId()
        })
      });
    } catch {}

    try {
      const res = await fetch("/api/learning/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages.map(m => ({ role: m.role, content: m.content })) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Query failed");
      
      const assistantMsg = {
        role: "assistant",
        content: data.reply,
        timestamp: new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
      };
      
      const finalThreads = updatedThreads.map(t => {
        if (t.id === activeThreadId) {
          return { ...t, messages: [...updatedMessages, assistantMsg] };
        }
        return t;
      });
      saveThreadsToLocalStorage(finalThreads);
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setChatLoading(false);
    }
  };

  // Regenerate Response
  const handleRegenerateResponse = async () => {
    if (chatLoading || !activeThreadId || !activeThread || activeThread.messages.length === 0) return;
    
    // Find the last user message
    const userMsgs = activeThread.messages.filter(m => m.role === "user");
    if (userMsgs.length === 0) return;
    const lastUserPrompt = userMsgs[userMsgs.length - 1].content;
    
    // Remove the last assistant message if there is one
    const updatedMessages = [...activeThread.messages];
    if (updatedMessages[updatedMessages.length - 1].role === "assistant") {
      updatedMessages.pop();
    }
    
    const updatedThreads = threads.map(t => {
      if (t.id === activeThreadId) {
        return { ...t, messages: updatedMessages };
      }
      return t;
    });
    saveThreadsToLocalStorage(updatedThreads);
    
    setChatLoading(true);
    
    try {
      const res = await fetch("/api/learning/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages.map(m => ({ role: m.role, content: m.content })) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Regeneration failed");
      
      const assistantMsg = {
        role: "assistant",
        content: data.reply,
        timestamp: new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
      };
      
      const finalThreads = updatedThreads.map(t => {
        if (t.id === activeThreadId) {
          return { ...t, messages: [...updatedMessages, assistantMsg] };
        }
        return t;
      });
      saveThreadsToLocalStorage(finalThreads);
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setChatLoading(false);
    }
  };

  // Sort and filter threads
  const getSortedFilteredThreads = () => {
    let list = [...threads];
    
    // Filter by tab type
    if (sidebarFilter === "favorites") {
      list = list.filter(t => t.favorite);
    }
    
    // Filter by search query
    const q = searchChatQuery.toLowerCase().trim();
    if (q) {
      list = list.filter(t => t.title.toLowerCase().includes(q) || t.messages.some(m => m.content.toLowerCase().includes(q)));
    }
    
    // Sort: pinned first, then date desc
    return list.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  };

  const filteredThreads = getSortedFilteredThreads();

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#111827] p-6 flex flex-col font-sans leading-relaxed">
      
      {/* Top Page Header */}
      <section className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#4F46E5] flex items-center justify-center text-white shadow-md">
            <Sparkles size={20} />
          </div>
          <div>
            <h1 className="text-[28px] font-bold text-slate-900 tracking-tight">AI Assistant Hub</h1>
            <p className="text-[13px] text-slate-500 font-semibold">Your organization&apos;s custom intelligent copilot portal</p>
          </div>
        </div>

        {/* Phase / activeMode Switcher for Future Readiness */}
        <div className="flex bg-slate-100 p-1 rounded-xl">
          {[
            { id: "text", label: "Text Chat", phase: "Active" },
            { id: "image", label: "Visual Gen", phase: "Phase 2" },
            { id: "voice", label: "Voice Mode", phase: "Phase 3" },
            { id: "pdf", label: "PDF Chat", phase: "Phase 4" },
            { id: "agents", label: "Team Agents", phase: "Phase 5" }
          ].map(mode => (
            <button
              key={mode.id}
              onClick={() => setActiveMode(mode.id)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all border-0 cursor-pointer flex items-center gap-1.5 ${
                activeMode === mode.id
                  ? "bg-white text-[#2563EB] shadow-[0_2px_8px_rgba(0,0,0,0.05)]"
                  : "text-slate-550 hover:text-slate-800 bg-transparent"
              }`}
            >
              {mode.label}
              <span className={`text-[9px] px-1 rounded uppercase tracking-wider font-extrabold ${
                activeMode === mode.id ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-500"
              }`}>
                {mode.phase}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Main Workspace Grid (Sidebar + Chat Console) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch flex-1">
        
        {/* Left Sidebar Pane */}
        <div className="lg:col-span-3 bg-white border border-slate-100 rounded-[16px] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.05)] flex flex-col justify-between">
          
          <div className="space-y-4">
            
            {/* Header / New Chat */}
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold text-slate-900">Conversations</span>
              <button
                onClick={createNewThread}
                className="rounded-lg p-1.5 bg-[#2563EB]/10 text-[#2563EB] hover:bg-[#2563EB] hover:text-white transition border-0 cursor-pointer flex items-center justify-center"
                title="New Chat"
              >
                <Plus size={16} />
              </button>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
              <input
                type="text"
                value={searchChatQuery}
                onChange={(e) => setSearchChatQuery(e.target.value)}
                placeholder="Search threads..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-350 placeholder-slate-400"
              />
            </div>

            {/* Sidebar filter tabs */}
            <div className="flex border-b border-slate-100 pb-2">
              <button
                onClick={() => setSidebarFilter("all")}
                className={`flex-1 text-center py-1 text-[11px] font-bold border-b-2 cursor-pointer ${
                  sidebarFilter === "all" ? "border-[#2563EB] text-[#2563EB]" : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                Recent
              </button>
              <button
                onClick={() => setSidebarFilter("favorites")}
                className={`flex-1 text-center py-1 text-[11px] font-bold border-b-2 cursor-pointer ${
                  sidebarFilter === "favorites" ? "border-[#2563EB] text-[#2563EB]" : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                Favorites
              </button>
            </div>

            {/* Chats List */}
            <div className="space-y-1 max-h-[32vh] overflow-y-auto pr-1">
              {filteredThreads.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic text-center py-6">No chats found</p>
              ) : (
                filteredThreads.map((thread) => {
                  const isActive = thread.id === activeThreadId;
                  const isEditing = thread.id === editingThreadId;
                  return (
                    <div
                      key={thread.id}
                      onClick={() => {
                        if (!isEditing) setActiveThreadId(thread.id);
                      }}
                      className={`p-2 rounded-xl flex items-center justify-between gap-2 cursor-pointer group transition ${
                        isActive
                          ? "bg-blue-50/50 border border-blue-100 text-[#2563EB] font-bold"
                          : "border border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        {thread.pinned ? (
                          <Pin size={11} className="text-amber-500 fill-amber-500 shrink-0" />
                        ) : (
                          <MessageSquare size={11} className="text-slate-400 shrink-0" />
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
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white border border-slate-300 text-xs text-slate-800 px-1 py-0.5 rounded outline-none w-full"
                          />
                        ) : (
                          <span className="text-xs truncate select-none">{thread.title}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => toggleFavoriteThread(thread.id, e)}
                          className="text-slate-400 hover:text-amber-400 p-0.5 bg-transparent border-0 cursor-pointer"
                          title="Favorite"
                        >
                          <Star size={10} className={thread.favorite ? "fill-amber-400 text-amber-400" : ""} />
                        </button>
                        <button
                          onClick={(e) => togglePinThread(thread.id, e)}
                          className="text-slate-400 hover:text-amber-500 p-0.5 bg-transparent border-0 cursor-pointer"
                          title="Pin to top"
                        >
                          <Pin size={10} className={thread.pinned ? "fill-amber-500 text-amber-500" : ""} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingThreadId(thread.id);
                            setEditingTitle(thread.title);
                          }}
                          className="text-slate-400 hover:text-blue-500 p-0.5 bg-transparent border-0 cursor-pointer"
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

          {/* Placeholders for Future AI Experts & Tools */}
          <div className="pt-4 border-t border-slate-100 space-y-3.5 mt-4">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">AI Experts &amp; Copilots</span>
            
            <div className="space-y-2 text-xs">
              {[
                { label: "Marketing Expert", badge: "Agent", icon: Bot, desc: "B2B SaaS Campaign strategies" },
                { label: "Sales Expert", badge: "Agent", icon: Users, desc: "Objection handler, call preps" },
                { label: "Prompt Generator", badge: "Tools", icon: Sparkles, desc: "Optimize AI prompts" },
                { label: "LinkedIn Generator", badge: "Tools", icon: Share2, desc: "High-engagement social copy" },
                { label: "Email Generator", badge: "Tools", icon: FileText, desc: "Cold outbound funnel templates" }
              ].map((expert) => {
                const Icon = expert.icon;
                return (
                  <div
                    key={expert.label}
                    onClick={() => alert(`Launching specialized B2B ${expert.label} Agent dashboard panel... [Coming soon in Phase 5]`)}
                    className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100/50 transition cursor-pointer flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-6 w-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                        <Icon size={12} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-800 truncate">{expert.label}</h4>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{expert.desc}</p>
                      </div>
                    </div>
                    <span className="rounded bg-slate-200 px-1 py-0.5 text-[8px] font-extrabold text-slate-500 uppercase tracking-wider shrink-0">
                      {expert.badge}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Main Area Console */}
        <div className="lg:col-span-9 bg-white border border-slate-100 rounded-[16px] shadow-[0_2px_8px_rgba(0,0,0,0.05)] flex flex-col justify-between overflow-hidden relative">
          
          {activeMode === "text" ? (
            activeThread ? (
              <>
                {/* Chat Top Banner Header */}
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 bg-slate-50/30">
                  <div className="min-w-0">
                    <h3 className="text-[14px] font-bold text-slate-900 truncate">{activeThread.title}</h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mt-0.5">Active text chat session</p>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => toggleFavoriteThread(activeThread.id, e)}
                      className={`rounded-lg border border-slate-200 bg-white p-1.5 hover:text-amber-500 transition cursor-pointer ${
                        activeThread.favorite ? "text-amber-500 border-amber-200 bg-amber-50/20" : "text-slate-400"
                      }`}
                      title="Favorite Chat"
                    >
                      <Star size={12} className={activeThread.favorite ? "fill-amber-500" : ""} />
                    </button>
                    <button
                      onClick={(e) => togglePinThread(activeThread.id, e)}
                      className={`rounded-lg border border-slate-200 bg-white p-1.5 hover:text-amber-500 transition cursor-pointer ${
                        activeThread.pinned ? "text-amber-500 border-amber-200 bg-amber-50/20" : "text-slate-400"
                      }`}
                      title="Pin Chat"
                    >
                      <Pin size={12} className={activeThread.pinned ? "fill-amber-500" : ""} />
                    </button>
                    <button
                      onClick={() => exportChat(activeThread)}
                      className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 hover:text-[#2563EB] transition cursor-pointer"
                      title="Export Transcript (.txt)"
                    >
                      <FileDown size={12} />
                    </button>
                    <button
                      onClick={() => deleteThread(activeThread.id, { stopPropagation: () => {} })}
                      className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 hover:text-red-500 transition cursor-pointer"
                      title="Delete Chat"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Messages Feed Area */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/10 min-h-[480px]">
                  {activeThread.messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center h-full max-w-lg mx-auto py-12">
                      <Sparkles size={40} className="text-[#2563EB] mb-2.5 animate-pulse" />
                      <h4 className="text-[20px] font-semibold text-slate-900 tracking-tight">How can I assist you today?</h4>
                      <p className="text-[13px] text-slate-500 mt-1">Select one of our verified starter chips or ask any marketing question.</p>
                      
                      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
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
                            className="p-3.5 text-left rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[11px] text-slate-700 hover:text-slate-900 font-semibold transition leading-relaxed cursor-pointer hover:-translate-y-0.5 shadow-xs"
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
                        <div className="flex items-center justify-between gap-4 mb-1">
                          <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">
                            {msg.role === "user" ? "You" : "AI Assistant"}
                          </span>
                          <span className="text-[9px] opacity-50">{msg.timestamp || ""}</span>
                        </div>
                        <p className="whitespace-pre-line font-medium">{msg.content}</p>
                        
                        {msg.role === "assistant" && (
                          <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 hover:opacity-100 transition flex items-center gap-1">
                            <button
                              onClick={() => copyToClipboard(msg.content)}
                              className="p-1 rounded bg-white border border-slate-200 text-slate-500 hover:text-[#2563EB] cursor-pointer"
                              title="Copy response"
                            >
                              <Copy size={11} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  {chatLoading && (
                    <div className="bg-slate-100 text-slate-800 mr-auto rounded-2xl rounded-tl-none px-4 py-3 text-xs max-w-[85%] border border-slate-200 flex items-center gap-2">
                      <RefreshCw className="animate-spin text-[#2563EB] shrink-0" size={13} />
                      <span className="font-semibold text-slate-500">Copilot is composing response...</span>
                    </div>
                  )}
                  <div ref={assistantChatBottomRef} />
                </div>

                {/* Footer Input Area */}
                <div className="border-t border-slate-200 p-4 bg-white space-y-3">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendChatMessage();
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Type your sales, marketing, or strategy prompt..."
                      disabled={chatLoading}
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-800 outline-none focus:border-slate-350 disabled:opacity-50"
                    />
                    
                    {activeThread.messages.length > 0 && (
                      <button
                        type="button"
                        onClick={handleRegenerateResponse}
                        disabled={chatLoading}
                        className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 text-slate-500 transition hover:text-[#2563EB] flex items-center justify-center cursor-pointer disabled:opacity-50"
                        title="Regenerate Last Response"
                      >
                        <RotateCcw size={13} />
                      </button>
                    )}

                    <button
                      type="submit"
                      disabled={chatLoading || !chatInput.trim()}
                      className="rounded-xl bg-[#2563EB] hover:bg-[#1d4ed8] px-4 text-white transition disabled:opacity-55 active:scale-95 flex items-center justify-center cursor-pointer border-0 shadow-sm"
                    >
                      <Send size={13} />
                    </button>
                  </form>
                  <p className="text-[11px] text-slate-400 text-center font-semibold">
                    Marketing AI Assistant leverages proxy models. Verify outputs before running ad budgets.
                  </p>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 py-12">
                <p className="text-xs font-semibold">Select or create a conversation thread from the sidebar</p>
              </div>
            )
          ) : (
            /* Premium Future Mode Roadmap placeholder rendering */
            <div className="flex-1 p-8 flex flex-col items-center justify-center text-center max-w-lg mx-auto py-16 animate-fadeIn">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 text-[#2563EB] flex items-center justify-center mb-4 border border-indigo-200/50 shadow-sm animate-bounce">
                {activeMode === "image" && <ImageIcon size={28} />}
                {activeMode === "voice" && <Mic size={28} />}
                {activeMode === "pdf" && <FileText size={28} />}
                {activeMode === "agents" && <Cpu size={28} />}
              </div>

              <span className="rounded bg-indigo-500/10 px-2.5 py-1 text-xs font-extrabold text-[#4F46E5] uppercase tracking-wider block mb-2">
                Roadmap {activeMode === "image" ? "Phase 2" : activeMode === "voice" ? "Phase 3" : activeMode === "pdf" ? "Phase 4" : "Phase 5"}
              </span>

              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                {activeMode === "image" && "Visual Ad Copy & Image Generation"}
                {activeMode === "voice" && "Voice Call AI Script Assistant"}
                {activeMode === "pdf" && "B2B Document Analysis & Chat"}
                {activeMode === "agents" && "Distributed B2B Marketing Agents"}
              </h2>

              <p className="text-[13px] text-slate-500 mt-2.5 leading-relaxed">
                {activeMode === "image" && "Create high-converting campaign ad visuals, social graphics, and custom B2B landing banner drafts dynamically directly within your chat console."}
                {activeMode === "voice" && "Speak directly with your coaching avatar. Conduct live mock cold call training sessions or listen back to generated pitch audio tracks."}
                {activeMode === "pdf" && "Upload B2B whitepapers, reports, leads CSV spreadsheets, or client briefings. Ask the AI assistant to summarize statistics and draft strategy items."}
                {activeMode === "agents" && "Deploy autonomous bots that coordinate campaigns, manage WhatsApp drip campaigns, and analyze CRM pipeline statistics simultaneously."}
              </p>

              <div className="mt-6 p-4 rounded-xl border border-slate-100 bg-slate-50 text-[12px] text-slate-600 leading-normal flex items-start gap-2 max-w-md">
                <Info size={14} className="text-[#2563EB] shrink-0 mt-0.5" />
                <span>
                  Our engineering team is actively building this integration. The interface will activate automatically in the next platform release.
                </span>
              </div>

              <button
                onClick={() => setActiveMode("text")}
                className="mt-8 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition text-xs border-0 cursor-pointer active:scale-95"
              >
                Return to Text Chat Workspace
              </button>
            </div>
          )}

        </div>

      </div>

    </main>
  );
}
