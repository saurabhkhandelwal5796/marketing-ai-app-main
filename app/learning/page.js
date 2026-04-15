"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, ExternalLink, GraduationCap, RefreshCw, Sparkles, Video } from "lucide-react";

function ResourceCard({ title, items, icon: Icon }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="rounded-lg bg-slate-100 p-2">
          <Icon size={16} className="text-slate-700" />
        </div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="space-y-3">
        {items.map((item, index) => (
          <a
            key={`${item.url}-${index}`}
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:bg-blue-50/40"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
              <ExternalLink size={14} className="mt-0.5 shrink-0 text-slate-500" />
            </div>
            <p className="mt-1 text-xs text-slate-500">{item.takeaway}</p>
            <p className="mt-2 truncate text-xs font-medium text-blue-700">{item.url}</p>
          </a>
        ))}
      </div>
    </section>
  );
}

export default function LearningPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [content, setContent] = useState(null);
  const [generatedAt, setGeneratedAt] = useState("");

  const loadContent = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/learning/content?t=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data?.content) throw new Error(data?.error || "Failed to load learning content.");
      setContent(data.content);
      setGeneratedAt(data.generatedAt || "");
    } catch (e) {
      setError(e?.message || "Failed to load learning content.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  return (
    <main className="space-y-5 p-6">
      <section className="overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 p-6 text-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
              <Sparkles size={14} />
              AI Marketing Learning Hub
            </p>
            <h1 className="mt-3 text-2xl font-semibold">Learning</h1>
            <p className="mt-2 text-sm text-slate-100/90">
              Fresh marketing learning content is generated whenever you open this tab. Explore curated video lessons,
              blog insights, and web resources.
            </p>
          </div>
          <button
            onClick={loadContent}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            {loading ? "Refreshing..." : "Refresh Content"}
          </button>
        </div>
      </section>

      {error ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</section>
      ) : null}

      {!content && loading ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Generating premium learning content...</p>
        </section>
      ) : null}

      {content ? (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <GraduationCap size={16} className="text-blue-700" />
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Today&apos;s Focus</p>
            </div>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">{content.topic}</h2>
            <p className="mt-2 text-sm text-slate-600">{content.summary}</p>
            {generatedAt ? (
              <p className="mt-3 text-xs text-slate-500">Generated: {new Date(generatedAt).toLocaleString()}</p>
            ) : null}
          </section>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <ResourceCard title="YouTube Learning" items={content.videos || []} icon={Video} />
            <ResourceCard title="Blog Reads" items={content.blogs || []} icon={BookOpen} />
            <ResourceCard title="Web Resources" items={content.webResources || []} icon={Sparkles} />
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Action Plan</h2>
            <div className="mt-3 space-y-2">
              {(content.actionPlan || []).map((step, index) => (
                <div
                  key={`${step}-${index}`}
                  className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700"
                >
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
