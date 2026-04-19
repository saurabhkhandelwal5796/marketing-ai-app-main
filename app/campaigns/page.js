"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Filter, Search, ChevronDown } from "lucide-react";
import HeaderActions from "../../components/campaigns/HeaderActions";
import InsightPanel from "../../components/campaigns/InsightPanel";
import CampaignTable from "../../components/campaigns/table/CampaignTable";

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

function getCampaignStatus(item) {
  const name = String(item?.name || "").toLowerCase();
  if (name.includes("cancel")) return { label: "Cancelled", key: "cancelled" };

  const last = item?.last_activity_at || item?.updated_at || item?.created_at;
  const ts = last ? new Date(last).getTime() : NaN;
  if (!Number.isNaN(ts)) {
    const days = (Date.now() - ts) / (1000 * 60 * 60 * 24);
    if (days <= 14) return { label: "Confirmed", key: "confirmed" };
  }
  return { label: "Pending", key: "pending" };
}

export default function CampaignListPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [selectedCampaignIds, setSelectedCampaignIds] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 15;
  const [isFetching, setIsFetching] = useState(false);
  const createInFlightRef = useRef(false);
  const [mounted, setMounted] = useState(false);

  // UI-only state for premium campaign browsing (does not affect backend logic).
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all"); // all | confirmed | pending | cancelled
  const [sortValue, setSortValue] = useState("last_activity_desc");

  const loadCampaigns = async ({ nextOffset = 0, append = false } = {}) => {
    if (isFetching) return;
    setIsFetching(true);
    if (append) setLoadingMore(true);
    else setLoading(true);
    if (!append) setError("");
    try {
      const res = await fetch(`/api/campaigns?limit=${PAGE_SIZE}&offset=${nextOffset}`);
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to fetch campaigns.");
      const nextRows = Array.isArray(data?.campaigns) ? data.campaigns : [];
      setCampaigns((prev) => (append ? [...prev, ...nextRows] : nextRows));
      setOffset(nextOffset + nextRows.length);
      setHasMore(Boolean(data?.hasMore));
    } catch (err) {
      setError(err.message || "Failed to fetch campaigns.");
    } finally {
      setIsFetching(false);
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadCampaigns({ nextOffset: 0, append: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      if (!hasMore || isFetching || loading) return;
      const scrollBottom = window.innerHeight + window.scrollY;
      const pageBottom = document.documentElement.scrollHeight;
      if (pageBottom - scrollBottom < 120) {
        loadCampaigns({ nextOffset: offset, append: true });
      }
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [hasMore, isFetching, loading, offset]);

  const handleCreateNew = async () => {
    if (creating || createInFlightRef.current) return;
    createInFlightRef.current = true;
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to create campaign.");
      if (!data?.campaign?.id) throw new Error("Campaign ID missing from response.");
      router.push(`/campaigns/${data.campaign.id}`);
    } catch (err) {
      setError(err.message || "Failed to create campaign.");
    } finally {
      setCreating(false);
      createInFlightRef.current = false;
    }
  };

  const visibleCampaigns = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let list = [...campaigns];

    if (query) {
      list = list.filter((c) => {
        const name = String(c?.name || "").toLowerCase();
        const company = String(c?.company || "").toLowerCase();
        const goal = String(c?.goal || "").toLowerCase();
        return name.includes(query) || company.includes(query) || goal.includes(query);
      });
    }

    if (statusFilter !== "all") {
      list = list.filter((c) => getCampaignStatus(c).key === statusFilter);
    }

    const getTs = (v) => {
      const t = v ? new Date(v).getTime() : NaN;
      return Number.isNaN(t) ? 0 : t;
    };

    list.sort((a, b) => {
      const sa = getCampaignStatus(a);
      const sb = getCampaignStatus(b);
      // keep status stable in sort when everything else is equal
      if (sa.label === sb.label) {
        // no-op
      }

      const nameA = String(a?.name || "").toLowerCase();
      const nameB = String(b?.name || "").toLowerCase();
      const createdByA = String(a?.created_by_name || a?.created_by || "").toLowerCase();
      const createdByB = String(b?.created_by_name || b?.created_by || "").toLowerCase();
      const createdA = getTs(a?.created_at);
      const createdB = getTs(b?.created_at);
      const updatedA = getTs(a?.updated_at);
      const updatedB = getTs(b?.updated_at);

      switch (sortValue) {
        case "created_desc":
          return createdB - createdA;
        case "created_asc":
          return createdA - createdB;
        case "name_asc":
          return nameA.localeCompare(nameB);
        case "name_desc":
          return nameB.localeCompare(nameA);
        case "created_by_asc":
          return createdByA.localeCompare(createdByB);
        case "created_by_desc":
          return createdByB.localeCompare(createdByA);
        case "last_activity_asc":
          return updatedA - updatedB;
        case "last_activity_desc":
        default:
          return updatedB - updatedA;
      }
    });

    return list;
  }, [campaigns, searchQuery, statusFilter, sortValue]);

  const campaignInsights = useMemo(() => {
    const total = campaigns.length;
    let confirmedCount = 0;
    let pendingCount = 0;
    let cancelledCount = 0;

    for (const c of campaigns) {
      const st = getCampaignStatus(c);
      if (st.key === "confirmed") confirmedCount += 1;
      else if (st.key === "cancelled") cancelledCount += 1;
      else pendingCount += 1;
    }

    const activeCampaigns = confirmedCount;
    const performancePercent = total > 0 ? Math.round((activeCampaigns / total) * 100) : 0;

    return { total, confirmedCount, pendingCount, cancelledCount, activeCampaigns, performancePercent };
  }, [campaigns]);

  const visibleIds = visibleCampaigns.map((c) => c.id).filter(Boolean);
  const allSelectedVisible = visibleIds.length > 0 && visibleIds.every((id) => selectedCampaignIds.includes(id));

  const toggleSelectAllVisible = () => {
    if (!visibleIds.length) return;
    if (allSelectedVisible) {
      setSelectedCampaignIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
      return;
    }
    setSelectedCampaignIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
  };

  const toggleSelectOne = (id) => {
    setSelectedCampaignIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleDeleteSelected = async () => {
    if (!selectedCampaignIds.length || deleting) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch("/api/campaigns", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedCampaignIds }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to delete one or more campaigns.");
      }
      setCampaigns((prev) => prev.filter((item) => !selectedCampaignIds.includes(item.id)));
      setSelectedCampaignIds([]);
    } catch (err) {
      setError(err.message || "Failed to delete campaigns.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="space-y-6 px-4 py-8 md:px-8 bg-[#f8fafc] min-h-screen">
      <div className="mx-auto max-w-[1440px] space-y-6 md:space-y-8">
        <div
          className={`rounded-[16px] border border-slate-200 bg-white p-8 shadow-sm transition-all duration-[800ms] ease-out transform-gpu ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-center">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Campaign Intelligence</h1>
              <p className="mt-2 text-sm font-medium text-slate-500">Manage, analyze, and optimize your marketing campaigns in real-time.</p>
            </div>

            <HeaderActions
              creating={creating}
              deleting={deleting}
              selectedCount={selectedCampaignIds.length}
              onCreateNew={handleCreateNew}
              onDeleteSelected={handleDeleteSelected}
            />
          </div>

          {error ? (
            <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-400 backdrop-blur-sm shadow-inner">{error}</div>
          ) : null}

          {/* Toolbar */}
          <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-7 lg:items-center">
            <div className="lg:col-span-4">
              <div className="relative group">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-indigo-400" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search campaigns..."
                  className="w-full rounded-[14px] border border-slate-200 bg-white pl-11 pr-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all duration-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 shadow-sm hover:bg-slate-50"
                />
              </div>
            </div>

            <div className="lg:col-span-3 lg:justify-end">
              <div className="flex items-center justify-start gap-4 lg:justify-end">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setFilterOpen((p) => !p)}
                    className="flex items-center gap-2 rounded-[14px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 cursor-pointer shadow-sm"
                  >
                    <Filter size={16} strokeWidth={2} className="text-slate-500" />
                    Filter
                    <ChevronDown size={16} strokeWidth={2} className={`text-slate-500 transition-transform duration-300 ${filterOpen ? "rotate-180" : ""}`} />
                  </button>

                  {filterOpen ? (
                    <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-[16px] border border-slate-200 bg-white p-2 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                      {[
                        { key: "all", label: "All" },
                        { key: "confirmed", label: "Confirmed" },
                        { key: "pending", label: "Pending" },
                        { key: "cancelled", label: "Cancelled" },
                      ].map((opt) => {
                        const active = statusFilter === opt.key;
                        return (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => {
                              setStatusFilter(opt.key);
                              setFilterOpen(false);
                            }}
                            className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors duration-200 cursor-pointer ${
                              active
                                ? "bg-indigo-50 text-indigo-700"
                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>

                <select
                  value={sortValue}
                  onChange={(e) => setSortValue(e.target.value)}
                  className="rounded-[14px] border border-slate-200 bg-white px-4 py-3 pr-8 text-sm font-semibold text-slate-700 outline-none transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 cursor-pointer shadow-sm appearance-none"
                  aria-label="Sort campaigns"
                >
                  <option value="last_activity_desc">Last Modified (Newest)</option>
                  <option value="last_activity_asc">Last Modified (Oldest)</option>
                  <option value="created_desc">Created (Newest)</option>
                  <option value="created_asc">Created (Oldest)</option>
                  <option value="name_asc">Name (A-Z)</option>
                  <option value="name_desc">Name (Z-A)</option>
                  <option value="created_by_asc">Created By (A-Z)</option>
                  <option value="created_by_desc">Created By (Z-A)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Content: Table + Insights */}
          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-7 lg:items-start">
            <section className="lg:col-span-5">
              <CampaignTable
                rows={visibleCampaigns}
                loading={loading}
                selectedCampaignIds={selectedCampaignIds}
                totalCampaignCount={campaigns.length}
                onToggleSelectAll={toggleSelectAllVisible}
                allSelectedVisible={allSelectedVisible}
                onToggleSelected={toggleSelectOne}
                onRowClick={(id) => router.push(`/campaigns/${id}`)}
                onCampaignNameClick={(id) => router.push(`/campaigns/${id}`)}
                onEmptyCta={handleCreateNew}
                sortValue={sortValue}
                onSortChange={setSortValue}
              />

              {loadingMore ? (
                <div className="mt-4 text-center text-sm font-medium tracking-wide text-indigo-400 animate-pulse">Loading more campaigns...</div>
              ) : null}
            </section>

            <aside className="lg:col-span-2">
              <div className="sticky top-6">
                <InsightPanel
                  totalCampaigns={campaignInsights.total}
                  activeCampaigns={campaignInsights.activeCampaigns}
                  performancePercent={campaignInsights.performancePercent}
                  breakdown={{ confirmedCount: campaignInsights.confirmedCount, pendingCount: campaignInsights.pendingCount }}
                />
              </div>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
