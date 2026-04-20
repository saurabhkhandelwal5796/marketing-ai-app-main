"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function formatDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

/** Saved marketing plan snapshots (formerly /history). */
export default function SavedPlansPage() {
  const router = useRouter();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/campaign-history");
        const data = await res.json();
        if (!res.ok || data?.error) throw new Error(data?.error || "Failed to load saved plans.");
        if (!mounted) return;
        setRecords(Array.isArray(data.records) ? data.records : []);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Failed to load saved plans.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Saved campaign plans</h1>
        <p className="mt-2 text-sm text-slate-500">Marketing plan and analysis snapshots.</p>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}
        {loading ? <div className="mt-4 text-sm text-slate-500">Loading...</div> : null}

        {!loading && records.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            No saved plans yet.
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-1 gap-4">
          {records.map((r) => (
            <article key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{r.company || "—"}</p>
                  <p className="mt-1 text-sm text-slate-600">{r.goal || "—"}</p>
                  <p className="mt-1 text-xs text-slate-500">Generated: {formatDate(r.created_at)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push(`/campaigns/${r.campaign_id}?historyId=${encodeURIComponent(r.id)}`)}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  View
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
