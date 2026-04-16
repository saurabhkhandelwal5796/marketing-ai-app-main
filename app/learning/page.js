"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, ExternalLink, GraduationCap, RefreshCw, Sparkles, Video, X } from "lucide-react";

function getYouTubeId(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) return parsed.pathname.replace("/", "");
    if (parsed.hostname.includes("youtube.com")) return parsed.searchParams.get("v") || "";
  } catch {
    return "";
  }
  return "";
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "";
  }
}

function svgThumbnail(item, variant) {
  const title = String(item?.title || "").slice(0, 48);
  const domain = getDomain(item?.url || "") || "resource";
  const accent = variant === "blog" ? "#7c3aed" : "#0ea5e9";
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360'>
    <defs>
      <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0%' stop-color='#0f172a'/>
        <stop offset='100%' stop-color='${accent}'/>
      </linearGradient>
    </defs>
    <rect width='100%' height='100%' fill='url(#g)'/>
    <rect x='24' y='24' width='592' height='312' rx='20' fill='rgba(255,255,255,0.08)'/>
    <text x='44' y='78' fill='#bfdbfe' font-size='20' font-family='Arial' font-weight='700'>${domain}</text>
    <text x='44' y='126' fill='white' font-size='28' font-family='Arial' font-weight='700'>${title.replace(/&/g, "&amp;")}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function getCardImage(item, variant) {
  if (variant === "video") {
    const videoId = getYouTubeId(item.url);
    return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : "";
  }
  return svgThumbnail(item, variant);
}

function HorizontalRail({ title, items, icon: Icon, variant = "web", onPlayVideo }) {
  const railRef = useRef(null);
  const scrollByCards = (direction) => {
    if (!railRef.current) return;
    const amount = direction === "left" ? -420 : 420;
    railRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <section className="rounded-2xl border border-slate-700/70 bg-gradient-to-b from-slate-900 to-slate-950 p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-slate-700/60 p-2">
            <Icon size={16} className="text-slate-100" />
          </div>
          <h2 className="text-base font-semibold text-white">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => scrollByCards("left")} className="rounded-lg border border-slate-600 p-1.5 text-slate-100 hover:bg-slate-700/70">
            <ChevronLeft size={15} />
          </button>
          <button onClick={() => scrollByCards("right")} className="rounded-lg border border-slate-600 p-1.5 text-slate-100 hover:bg-slate-700/70">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
      <div ref={railRef} className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item, index) => {
          const cardImage = getCardImage(item, variant);
          return (
            <div
              key={`${item.url}-${index}`}
              className="min-w-[340px] max-w-[340px] overflow-hidden rounded-xl border border-slate-700/80 bg-slate-900/50 transition duration-200 hover:-translate-y-1 hover:border-blue-500/60 hover:shadow-[0_18px_40px_rgba(15,23,42,0.45)]"
            >
              <button
                onClick={() => (variant === "video" ? onPlayVideo(item) : null)}
                className="block w-full overflow-hidden bg-slate-800"
                disabled={variant !== "video"}
              >
                {cardImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cardImage} alt={item.title} className="h-44 w-full object-cover" />
                ) : (
                  <div className="flex h-44 items-center justify-center text-sm text-slate-300">No image</div>
                )}
              </button>
              <div className="p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-300">{getDomain(item.url) || "resource"}</p>
                <p className="mt-1 text-sm font-semibold text-white line-clamp-2">{item.title}</p>
                <p className="mt-1 text-xs text-slate-300 line-clamp-3">{item.takeaway}</p>
              </div>
              <div className="mt-3 flex items-center gap-2">
                {variant === "video" ? (
                  <button onClick={() => onPlayVideo(item)} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500">
                    Play
                  </button>
                ) : null}
                <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-slate-700">
                  <ExternalLink size={12} />
                  {variant === "video" ? "Open in YouTube" : "Open"}
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function LearningPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [content, setContent] = useState(null);
  const [generatedAt, setGeneratedAt] = useState("");
  const [activeVideo, setActiveVideo] = useState(null);
  const [showMiniPlayer, setShowMiniPlayer] = useState(false);
  const [miniPlayerVideo, setMiniPlayerVideo] = useState(null);

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
    <main className="space-y-5 bg-slate-950 p-6">
      <section className="overflow-hidden rounded-2xl border border-slate-700 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900 p-6 text-white shadow-sm">
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
        <section className="rounded-2xl border border-red-800/80 bg-red-950/40 p-4 text-sm text-red-200">{error}</section>
      ) : null}

      {!content && loading ? (
        <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-sm">
          <p className="text-sm text-slate-300">Generating premium learning content...</p>
        </section>
      ) : null}

      {content ? (
        <>
          <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <GraduationCap size={16} className="text-blue-700" />
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Today&apos;s Focus</p>
            </div>
            <h2 className="mt-2 text-xl font-semibold text-white">{content.topic}</h2>
            <p className="mt-2 text-sm text-slate-300">{content.summary}</p>
            {generatedAt ? (
              <p className="mt-3 text-xs text-slate-400">Generated: {new Date(generatedAt).toLocaleString()}</p>
            ) : null}
          </section>

          <HorizontalRail
            title="YouTube Learning"
            items={content.videos || []}
            icon={Video}
            variant="video"
            onPlayVideo={(video) => {
              setActiveVideo(video);
              setShowMiniPlayer(false);
            }}
          />
          <HorizontalRail title="Blog Reads" items={content.blogs || []} icon={BookOpen} variant="blog" />
          <HorizontalRail title="Web Resources" items={content.webResources || []} icon={Sparkles} variant="web" />

          <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-sm">
            <h2 className="text-base font-semibold text-white">Action Plan</h2>
            <div className="mt-3 space-y-2">
              {(content.actionPlan || []).map((step, index) => (
                <div
                  key={`${step}-${index}`}
                  className="flex items-start gap-3 rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2.5 text-sm text-slate-200"
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

      {activeVideo ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 p-4">
          <div className="w-full max-w-5xl rounded-2xl bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">{activeVideo.title}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setMiniPlayerVideo(activeVideo);
                    setShowMiniPlayer(true);
                    setActiveVideo(null);
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Picture in Picture
                </button>
                <a
                  href={activeVideo.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Open in YouTube
                </a>
                <button onClick={() => setActiveVideo(null)} className="rounded-lg border border-slate-300 p-1.5 hover:bg-slate-50">
                  <X size={14} />
                </button>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <iframe
                title={activeVideo.title}
                src={`https://www.youtube.com/embed/${getYouTubeId(activeVideo.url)}?autoplay=1`}
                className="h-[62vh] w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      ) : null}

      {showMiniPlayer && miniPlayerVideo ? (
        <div className="fixed bottom-5 right-5 z-40 w-[360px] overflow-hidden rounded-xl border border-slate-300 bg-black shadow-xl">
          <div className="flex items-center justify-between bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
            <span>Mini Player</span>
            <button onClick={() => setShowMiniPlayer(false)} className="rounded border border-white/30 px-1.5 py-0.5">
              Close
            </button>
          </div>
          <iframe
            title="Mini YouTube Player"
            src={`https://www.youtube.com/embed/${getYouTubeId(miniPlayerVideo.url)}?autoplay=1`}
            className="h-[200px] w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : null}
    </main>
  );
}
