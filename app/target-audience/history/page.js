"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Search,
  Star,
  Trash2,
  Play,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowUpDown,
  Download,
  X,
  Building2,
  UserCheck
} from "lucide-react";

const cx = (...classes) => classes.filter(Boolean).join(" ");

export default function TargetAudienceHistoryPage() {
  const router = useRouter();
  
  // Storage State
  const [history, setHistory] = useState([]);
  
  // Search, Filters & Pagination State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState("all"); // all | favorites
  const [sortField, setSortField] = useState("createdAt"); // createdAt | sessionName | results
  const [sortOrder, setSortOrder] = useState("desc"); // asc | desc
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Selected Session Details Drawer
  const [selectedSession, setSelectedSession] = useState(null);

  // Load history on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("target_audience_history");
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load history from localStorage:", e);
    }
  }, []);

  // Update localStorage when history changes
  const saveHistoryToStore = (updatedHistory) => {
    setHistory(updatedHistory);
    try {
      localStorage.setItem("target_audience_history", JSON.stringify(updatedHistory));
    } catch (e) {
      console.error("Failed to save updated history:", e);
    }
  };

  // Toggle Favorite Status
  const toggleFavorite = (sessionId, e) => {
    if (e) e.stopPropagation();
    const updated = history.map(s => {
      if (s.id === sessionId) {
        return { ...s, favorite: !s.favorite, updatedAt: new Date().toISOString() };
      }
      return s;
    });
    saveHistoryToStore(updated);
    if (selectedSession && selectedSession.id === sessionId) {
      setSelectedSession(prev => ({ ...prev, favorite: !prev.favorite }));
    }
  };

  // Delete Session
  const deleteSession = (sessionId, e) => {
    if (e) e.stopPropagation();
    const conf = window.confirm("Are you sure you want to delete this session?");
    if (!conf) return;

    const updated = history.filter(s => s.id !== sessionId);
    saveHistoryToStore(updated);

    // If deleting currently active session on the main page, clear its reference
    try {
      const currentActive = localStorage.getItem("target_audience_current_session_id");
      if (currentActive === sessionId) {
        localStorage.removeItem("target_audience_current_session_id");
        localStorage.removeItem("target_audience_chat_messages");
        localStorage.removeItem("target_audience_companies");
        localStorage.removeItem("target_audience_employees");
        localStorage.removeItem("target_audience_batches_count");
      }
    } catch (err) {}

    if (selectedSession && selectedSession.id === sessionId) {
      setSelectedSession(null);
    }
  };

  // Toggle Sorting
  const requestSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  };

  // Open & Resume Session
  const openSession = (sessionId) => {
    router.push(`/target-audience?session=${sessionId}`);
  };

  // Analytics Calcs
  const totalSessions = history.length;
  const totalCompanies = history.reduce((acc, s) => acc + (s.results?.companies?.length || 0), 0);
  const totalEmployees = history.reduce((acc, s) => acc + (s.results?.employees?.length || 0), 0);
  const totalExports = history.reduce((acc, s) => acc + (s.exportCount || 0), 0);
  const totalFavorites = history.filter(s => s.favorite).length;

  // Filter history
  const filteredHistory = history.filter(s => {
    if (filterTab === "favorites" && !s.favorite) return false;
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      
      const matchName = (s.sessionName || "").toLowerCase().includes(q);
      const matchPrompt = (s.prompt || "").toLowerCase().includes(q);
      
      const formattedDate = new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }).toLowerCase();
      const matchDate = formattedDate.includes(q);
      
      const matchIndustry = s.results?.companies?.some(c => 
        (c.industry || "").toLowerCase().includes(q) || (c.sector || "").toLowerCase().includes(q)
      ) || false;

      if (!matchName && !matchPrompt && !matchDate && !matchIndustry) return false;
    }
    return true;
  });

  // Sort history
  const sortedHistory = [...filteredHistory].sort((a, b) => {
    let valA, valB;
    if (sortField === "createdAt") {
      valA = new Date(a.createdAt).getTime();
      valB = new Date(b.createdAt).getTime();
    } else if (sortField === "sessionName") {
      valA = (a.sessionName || "").toLowerCase();
      valB = (b.sessionName || "").toLowerCase();
    } else if (sortField === "results") {
      valA = (a.results?.companies?.length || 0) + (a.results?.employees?.length || 0);
      valB = (b.results?.companies?.length || 0) + (b.results?.employees?.length || 0);
    }
    
    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedHistory.length / itemsPerPage) || 1;
  const paginatedHistory = sortedHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
  };

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        
        {/* Header */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Target Audience History</h1>
            <p className="text-sm text-slate-500">
              Manage previous audience search criteria, favorited prompts, and AI chat sessions.
            </p>
          </div>
          <Link
            href="/target-audience"
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 self-start sm:self-center"
          >
            <Sparkles size={14} /> New Generation
          </Link>
        </section>

        {/* Analytics Summary */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total Sessions</p>
            <p className="mt-1.5 text-2xl font-bold text-slate-900">{totalSessions}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Companies</p>
            <p className="mt-1.5 text-2xl font-bold text-slate-900">{totalCompanies}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Employees</p>
            <p className="mt-1.5 text-2xl font-bold text-slate-900">{totalEmployees}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">CSV Exports</p>
            <p className="mt-1.5 text-2xl font-bold text-slate-900">{totalExports}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-center col-span-2 sm:col-span-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Favorites</p>
            <p className="mt-1.5 text-2xl font-bold text-amber-500">{totalFavorites}</p>
          </div>
        </section>

        {/* Filter Controls & Search */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Tabs */}
          <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1 w-full md:w-auto">
            <button
              type="button"
              onClick={() => { setFilterTab("all"); setCurrentPage(1); }}
              className={cx(
                "rounded-full px-4 py-1.5 text-xs font-semibold transition flex-1 md:flex-initial text-center",
                filterTab === "all" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              )}
            >
              All Sessions
            </button>
            <button
              type="button"
              onClick={() => { setFilterTab("favorites"); setCurrentPage(1); }}
              className={cx(
                "rounded-full px-4 py-1.5 text-xs font-semibold transition flex-1 md:flex-initial text-center flex items-center justify-center gap-1",
                filterTab === "favorites" ? "bg-amber-500 text-white" : "text-slate-600 hover:bg-slate-100"
              )}
            >
              <Star size={12} className={filterTab === "favorites" ? "fill-white" : "text-amber-500"} /> Favorites
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search by prompt, name, date, or industry..."
              className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-4 py-2 text-xs text-slate-900 outline-none transition focus:border-slate-500"
            />
          </div>
        </section>

        {/* History Table Card */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">
                    <button
                      type="button"
                      onClick={() => requestSort("createdAt")}
                      className="flex items-center gap-1 font-bold text-slate-500 hover:text-slate-800"
                    >
                      Date <ArrowUpDown size={12} />
                    </button>
                  </th>
                  <th className="px-5 py-3">
                    <button
                      type="button"
                      onClick={() => requestSort("sessionName")}
                      className="flex items-center gap-1 font-bold text-slate-500 hover:text-slate-800"
                    >
                      Session Name <ArrowUpDown size={12} />
                    </button>
                  </th>
                  <th className="px-5 py-3">
                    <button
                      type="button"
                      onClick={() => requestSort("results")}
                      className="flex items-center gap-1 font-bold text-slate-500 hover:text-slate-800"
                    >
                      Results <ArrowUpDown size={12} />
                    </button>
                  </th>
                  <th className="px-5 py-3">Exported</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-slate-500 font-medium">
                      No historical sessions match your criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedHistory.map((sess) => {
                    const companiesCount = sess.results?.companies?.length || 0;
                    const employeesCount = sess.results?.employees?.length || 0;
                    const dateFormatted = new Date(sess.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric"
                    });
                    
                    return (
                      <tr
                        key={sess.id}
                        onClick={() => setSelectedSession(sess)}
                        className="group hover:bg-slate-50/50 cursor-pointer transition-colors"
                      >
                        <td className="whitespace-nowrap px-5 py-3.5 font-medium text-slate-500 flex items-center gap-2">
                          <Calendar size={14} className="text-slate-400" /> {dateFormatted}
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-slate-900">
                          <div className="max-w-[200px] truncate" title={sess.sessionName}>
                            {sess.sessionName}
                          </div>
                          <div className="max-w-[200px] truncate text-[10px] text-slate-400 font-normal mt-0.5" title={sess.prompt}>
                            {sess.prompt}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-medium text-slate-700">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                              <Building2 size={10} /> {companiesCount} Co
                            </span>
                            {employeesCount > 0 && (
                              <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
                                <UserCheck size={10} /> {employeesCount} Emp
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          {sess.exported === "Yes" ? (
                            <span className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold leading-normal">
                              ✓ Yes <span className="text-[10px] bg-emerald-50 px-1 rounded font-bold">x{sess.exportCount || 1}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => toggleFavorite(sess.id, e)}
                              className="rounded-lg p-1.5 border border-slate-200 text-slate-400 hover:text-amber-500 hover:bg-slate-100 transition"
                              title={sess.favorite ? "Unfavorite" : "Favorite"}
                            >
                              <Star size={14} className={cx(sess.favorite ? "fill-amber-500 text-amber-500" : "")} />
                            </button>
                            <button
                              type="button"
                              onClick={() => openSession(sess.id)}
                              className="rounded-lg p-1.5 border border-slate-200 text-blue-600 hover:bg-blue-50 transition"
                              title="Resume Session"
                            >
                              <Play size={14} fill="currentColor" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => deleteSession(sess.id, e)}
                              className="rounded-lg p-1.5 border border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50 transition"
                              title="Delete Session"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-5 py-3.5">
              <span className="text-xs text-slate-500 font-semibold">
                Page <span className="text-slate-800 font-bold">{currentPage}</span> of <span className="text-slate-800 font-bold">{totalPages}</span>
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={handlePrevPage}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft size={14} /> Previous
                </button>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={handleNextPage}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed transition"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Details Side Drawer Panel */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white h-screen shadow-2xl flex flex-col justify-between">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/80">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 truncate" title={selectedSession.sessionName}>
                  {selectedSession.sessionName}
                </h3>
                <p className="text-[10px] text-slate-500 font-semibold uppercase mt-0.5 flex items-center gap-1">
                  📅 {new Date(selectedSession.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => toggleFavorite(selectedSession.id)}
                  className="rounded-lg p-1.5 border border-slate-200 text-slate-400 hover:text-amber-500 hover:bg-slate-100 transition"
                  title="Favorite"
                >
                  <Star size={14} className={cx(selectedSession.favorite ? "fill-amber-500 text-amber-500" : "")} />
                </button>
                <button
                  type="button"
                  onClick={() => deleteSession(selectedSession.id)}
                  className="rounded-lg p-1.5 border border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50 transition"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSession(null)}
                  className="rounded-lg p-1.5 border border-slate-200 text-slate-500 hover:bg-slate-100 transition ml-2"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Content Drawer Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Initial Prompt</p>
                <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 text-xs text-slate-800 leading-relaxed font-semibold">
                  {selectedSession.prompt}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Conversation History</p>
                {selectedSession.conversation && selectedSession.conversation.length > 0 ? (
                  <div className="space-y-3">
                    {selectedSession.conversation.map((msg, idx) => (
                      <div
                        key={idx}
                        className={cx(
                          "rounded-2xl px-4 py-2.5 text-xs max-w-[85%] leading-relaxed flex flex-col",
                          msg.role === "user"
                            ? "bg-blue-600 text-white ml-auto rounded-tr-none"
                            : "bg-slate-100 text-slate-800 mr-auto rounded-tl-none border border-slate-200"
                        )}
                      >
                        <span className="text-[9px] font-bold uppercase tracking-widest opacity-60 mb-0.5">
                          {msg.role === "user" ? "You" : "AI"}
                        </span>
                        <p className="whitespace-pre-line font-medium">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No chat messages in this session.</p>
                )}
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Results Overview</p>
                <div className="grid grid-cols-2 gap-2 text-center text-xs font-semibold text-slate-800">
                  <div className="rounded-xl border border-slate-200 p-2.5">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Companies</p>
                    <p className="mt-1 text-lg font-bold">{selectedSession.results?.companies?.length || 0}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-2.5">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Employees</p>
                    <p className="mt-1 text-lg font-bold">{selectedSession.results?.employees?.length || 0}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 p-4 bg-slate-50/80 flex gap-2">
              <button
                type="button"
                onClick={() => openSession(selectedSession.id)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800 shadow-sm"
              >
                <Play size={14} fill="currentColor" /> Resume Conversation
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
