"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function CampaignListPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const loadCampaigns = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/campaigns");
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to fetch campaigns.");
      setCampaigns(Array.isArray(data?.campaigns) ? data.campaigns : []);
    } catch (err) {
      setError(err.message || "Failed to fetch campaigns.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const handleCreateNew = async () => {
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
    }
  };

  return (
    <main className="p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Campaigns</h1>
            <p className="mt-1 text-sm text-slate-500">Open an existing campaign or create a new one.</p>
          </div>
          <button
            onClick={handleCreateNew}
            disabled={creating}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? "Creating..." : "New"}
          </button>
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
            <div className="p-6 text-sm text-slate-500">No campaigns yet. Click New to create your first campaign.</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Campaign</th>
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => router.push(`/campaigns/${item.id}`)}
                    className="cursor-pointer border-t border-slate-200 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 text-slate-800">{item.name || item.goal || "Untitled Campaign"}</td>
                    <td className="px-4 py-3 text-slate-600">{item.company || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {item.updated_at ? new Date(item.updated_at).toLocaleString() : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
