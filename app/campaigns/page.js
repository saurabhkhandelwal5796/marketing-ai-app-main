"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuditUserAndPage } from "../../lib/useAuditPageVisit";

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

export default function CampaignListPage() {
  useAuditUserAndPage("Campaigns");
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
  const [search, setSearch] = useState("");
  const PAGE_SIZE = 15;
  const [isFetching, setIsFetching] = useState(false);
  const createInFlightRef = useRef(false);
  const fetchInFlightRef = useRef(false);

  const loadCampaigns = useCallback(async ({ nextOffset = 0, append = false } = {}) => {
    if (fetchInFlightRef.current) return;
    fetchInFlightRef.current = true;
    setIsFetching(true);
    if (append) setLoadingMore(true);
    else setLoading(true);
    if (!append) setError("");
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(nextOffset),
      });
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/campaigns?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to fetch campaigns.");
      const nextRows = Array.isArray(data?.campaigns) ? data.campaigns : [];
      setCampaigns((prev) => (append ? [...prev, ...nextRows] : nextRows));
      setOffset(nextOffset + nextRows.length);
      setHasMore(Boolean(data?.hasMore));
    } catch (err) {
      setError(err.message || "Failed to fetch campaigns.");
    } finally {
      fetchInFlightRef.current = false;
      setIsFetching(false);
      setLoading(false);
      setLoadingMore(false);
    }
  }, [PAGE_SIZE, search]);

  useEffect(() => {
    loadCampaigns({ nextOffset: 0, append: false });
  }, [loadCampaigns]);

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
  }, [hasMore, isFetching, loading, loadCampaigns, offset]);

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

  useEffect(() => {
    setSelectedCampaignIds([]);
  }, [search]);

  const allSelected = campaigns.length > 0 && selectedCampaignIds.length === campaigns.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedCampaignIds([]);
      return;
    }
    setSelectedCampaignIds(campaigns.map((item) => item.id).filter(Boolean));
  };

  const toggleSelectOne = (id) => {
    setSelectedCampaignIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };
 
  // Added
  const handleStatusChange = async (id, newStatus) => {
  const original = campaigns.find((c) => c.id === id);
  setCampaigns((prev) =>
    prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
  );
  try {
    const res = await fetch(`/api/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const data = await res.json();
    if (!res.ok || data?.error) throw new Error(data?.error || "Failed to update status.");
    // if (data?.campaign) {
    //   setCampaigns((prev) =>
    //     prev.map((c) =>
    //       c.id === id
    //         ? { ...c, updated_at: data.campaign.updated_at, updated_by: data.campaign.updated_by }
    //         : c
    //     )
    //   );
    // }
    if (data?.campaign) {
      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                status: data.campaign.status,
                updated_at: data.campaign.updated_at,
                updated_by: data.campaign.updated_by,
                last_modified_by_name: c.created_by_name || data.campaign.updated_by,
              }
            : c
        )
      );
    }
  } catch (err) {
    if (original) {
      setCampaigns((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: original.status } : c))
      );
    }
    setError(err.message || "Failed to update status.");
  }
};

  //Added

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
    <main className="p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Campaigns</h1>
            <p className="mt-1 text-sm text-slate-500">Open an existing campaign or create a new one.</p>
          </div>
          <div className="w-full max-w-sm">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Campaign no. or name"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDeleteSelected}
              disabled={deleting || selectedCampaignIds.length === 0}
              className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? "Deleting..." : `Delete${selectedCampaignIds.length ? ` (${selectedCampaignIds.length})` : ""}`}
            </button>
            <button
              onClick={handleCreateNew}
              disabled={creating}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? "Creating..." : "New"}
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
          {loading ? (
            <div className="p-4 text-sm text-slate-500">Loading campaigns...</div>
          ) : campaigns.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">No campaigns found</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  {/* <th className="px-4 py-3 font-medium">S.No.</th> */}
                  <th className="px-4 py-3 font-medium">Campaign No.</th>
                  <th className="px-4 py-3 font-medium">Campaign Name</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created Date</th>
                  <th className="px-4 py-3 font-medium">Last Modified Date</th>
                  <th className="px-4 py-3 font-medium">Created By</th>
                  <th className="px-4 py-3 font-medium">Last Modified By</th>
                  <th className="px-4 py-3 font-medium text-center">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Select all campaigns"
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((item, idx) => (
                  <tr
                    key={item.id}
                    onClick={() => router.push(`/campaigns/${item.id}`)}
                    className="cursor-pointer border-t border-slate-200 transition hover:bg-slate-50"
                  >
                    {/* <td className="px-4 py-3 text-slate-600">{idx + 1}</td> */}
                    <td className="px-4 py-3 font-medium text-slate-700">
                    {/* {`C-${String(item.campaign_no ?? idx + 1).padStart(2, "0")}`} */}
                    {item.campaign_no || `C-${String(idx + 1).padStart(2, "0")}`}
                  </td> 

                    <td className="px-4 py-3 font-medium text-blue-700 underline-offset-2 hover:underline">
                      {item.name || "Generating title..."}
                    </td>
                    {/* <td className="px-4 py-3 text-slate-600">{item.status || "Open"}</td> */}
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={item.status || "Open"}
                        onChange={(e) => handleStatusChange(item.id, e.target.value)}
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold outline-none cursor-pointer ${
                          (item.status || "Open") === "Open"
                            ? "border-blue-200 bg-blue-50 text-blue-700"
                            : (item.status || "Open") === "In progress"
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-slate-200 bg-slate-100 text-slate-600"
                        }`}
                      >
                        <option value="Open">Open</option>
                        <option value="In progress">In progress</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </td>

                    <td className="px-4 py-3 text-slate-600">{formatDate(item.created_at)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(item.updated_at)}</td>
                    <td className="px-4 py-3 text-slate-600">{item.created_by_name || item.created_by || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">
                    {item.last_modified_by_name || item.updated_by || "-"}

                      {/* {item.updated_by || "-"} */}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedCampaignIds.includes(item.id)}
                        onChange={() => toggleSelectOne(item.id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Select campaign ${item.name || idx + 1}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {loadingMore ? (
          <div className="mt-3 text-center text-sm text-slate-500">Loading more campaigns...</div>
        ) : null}
      </div>
    </main>
  );
}
