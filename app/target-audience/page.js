"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Globe, Link, Mail, Phone, Users, X } from "lucide-react";
import { motion } from "framer-motion";
import ThinkingDisplay from "../../components/ThinkingDisplay";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function toCsvCell(value) {
  if (value == null) return "";
  const s = typeof value === "object" ? JSON.stringify(value) : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

function toCsvString(rows) {
  if (!Array.isArray(rows) || !rows.length) return "";
  const cols = [];
  rows.forEach((r) => r && typeof r === "object" && Object.keys(r).forEach((k) => !cols.includes(k) && cols.push(k)));
  return [cols.map(toCsvCell).join(","), ...rows.map((r) => cols.map((c) => toCsvCell(r?.[c])).join(","))].join("\n");
}

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "NA";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export default function TargetAudiencePage() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [targetAudience, setTargetAudience] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [audienceView, setAudienceView] = useState("companies");
  const [contactPopup, setContactPopup] = useState({ open: false, type: "", name: "", value: "", top: 0, left: 0 });
  const [contactCopied, setContactCopied] = useState(false);
  const [emailClientOpen, setEmailClientOpen] = useState(false);
  const contactPopupRef = useRef(null);
  const abortRef = useRef(null);
  const [companyFilter, setCompanyFilter] = useState("");


  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
  }, []);

  // Click outside handler for contact popup
  useEffect(() => {
    if (!contactPopup.open) return;
    const handleClickOutside = (e) => {
      if (contactPopupRef.current && !contactPopupRef.current.contains(e.target)) {
        setContactPopup((prev) => ({ ...prev, open: false }));
        setContactCopied(false);
        setEmailClientOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [contactPopup.open]);

  const generate = async () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setLoading(false);
      return;
    }
    const desc = prompt.trim();
    if (!desc) return;
    setLoading(true);
    setError("");
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ description: desc, step: "target_audience" }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to generate.");
      setTargetAudience(Array.isArray(data?.targetAudience) ? data.targetAudience : []);
      setEmployees(Array.isArray(data?.employees) ? data.employees : []);
      setAudienceView("companies");
    } catch (e) {
      if (e?.name === "AbortError") return;
      setError(e?.message || "Failed to generate target audience.");
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setLoading(false);
      }
    }
  };

  const downloadCsv = () => {
    const rows = audienceView === "companies" ? targetAudience : employees;
    if (!rows?.length) return;
    const csv = toCsvString(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `target_audience_${audienceView}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openPopup = (e, type, name, value) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setContactCopied(false);
    setEmailClientOpen(false);
    setContactPopup({
      open: true,
      type,
      name,
      value: String(value || ""),
      top: rect.bottom + 8,
      left: Math.max(12, rect.left - 220 + rect.width),
    });
  };

  const hasResults = targetAudience.length > 0 || employees.length > 0;

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">

        {/* Prompt Input */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Target Audience</h1>
          <p className="mt-1 text-sm text-slate-500">
            Describe your campaign or product to generate a target audience.
          </p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
            placeholder="e.g. We are an IT consultancy targeting real estate and manufacturing companies in India. We offer cloud services and IT infrastructure solutions."
            className="mt-4 w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={generate}
              disabled={!loading && !prompt.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Users size={16} />
              {loading ? "Stop" : hasResults ? "Regenerate" : "Generate"}
            </button>
          </div>
          {error ? (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
          {loading ? (
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <ThinkingDisplay preset="marketing_analysis" />
            </div>
          ) : null}
        </section>

        {/* Results */}
        {hasResults ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setAudienceView("companies")}
                  className={cx(
                    "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                    audienceView === "companies" ? "bg-blue-500 text-white" : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  Companies
                </button>
                <button
                  type="button"
                  onClick={() => setAudienceView("employees")}
                  className={cx(
                    "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                    audienceView === "employees" ? "bg-blue-500 text-white" : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  Employees
                </button>
              </div>
              <button
                type="button"
                onClick={downloadCsv}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Download CSV
              </button>
            </div>

            {audienceView === "companies" ? (
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                {targetAudience.map((c, idx) => (
                  <motion.article
                    key={`${c.name}-${idx}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-700">{c.description}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Country: <span className="font-semibold text-slate-700">{c.country || "-"}</span>
                        </p>
                      </div>
                      <span className="whitespace-nowrap rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                        {c.sector || c.industry || "-"}
                      </span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {c.whyRelevant ? (
                        <div>
                          <p className="text-xs font-semibold text-slate-700">Why relevant</p>
                          <p className="mt-1 text-sm leading-6 text-slate-700">{c.whyRelevant}</p>
                        </div>
                      ) : null}
                      {c.decisionMakerRole ? (
                        <div>
                          <p className="text-xs font-semibold text-slate-700">Decision maker role</p>
                          <span className="mt-1 inline-block rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-600">
                            {c.decisionMakerRole}
                          </span>
                        </div>
                      ) : null}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          onClick={(e) => openPopup(e, "email", c.name, c.email || "Email not found")}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <Mail size={14} /> Email
                        </button>
                        <button
                          type="button"
                          onClick={(e) => openPopup(e, "call", c.name, c.phone || "Phone not found")}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <Phone size={14} /> Phone
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            if (c.linkedin) window.open(c.linkedin, "_blank", "noopener,noreferrer");
                            else openPopup(e, "linkedin", c.name, "LinkedIn not found");
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <Link size={14} /> LinkedIn
                        </button>
                        {c.website ? (
                          <a
                            href={c.website}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <Globe size={14} /> Website
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </motion.article>
                ))}
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={companyFilter}
                    onChange={(e) => setCompanyFilter(e.target.value)}
                    placeholder="Filter by company name..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                  {companyFilter && (
                    <button
                      type="button"
                      onClick={() => setCompanyFilter("")}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {employees.filter(emp => !companyFilter || (emp.company || "").toLowerCase().includes(companyFilter.toLowerCase())).length === 0 ? (
                  <p className="text-sm text-slate-500">{companyFilter ? `No employees found for "${companyFilter}"` : "No employee data available."}</p>
                ) : null}
                {employees.filter(emp => !companyFilter || (emp.company || "").toLowerCase().includes(companyFilter.toLowerCase())).map((emp, idx) => (

                  <div
                    key={`${emp.name}-${emp.company}-${idx}`}
                    className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                        {initials(emp.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900">{emp.name || "-"}</p>
                        <p className="text-sm text-slate-700">{emp.title || "-"}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{emp.company || "-"}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={(e) => openPopup(e, "email", emp.name, emp.email || "Email not found")}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[11px] text-slate-700 hover:bg-slate-50"
                      >
                        <Mail size={12} /> Email
                      </button>
                      <button
                        type="button"
                        onClick={(e) => openPopup(e, "call", emp.name, emp.phone || "Phone not found")}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[11px] text-slate-700 hover:bg-slate-50"
                      >
                        <Phone size={12} /> Phone
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          if (emp.linkedin) window.open(emp.linkedin, "_blank", "noopener,noreferrer");
                          else openPopup(e, "linkedin", emp.name, "LinkedIn not found");
                        }}
                        className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-600 px-2 py-0.5 text-[11px] text-white hover:bg-blue-700"
                      >
                        <Link size={12} /> LinkedIn
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : null}
      </div>

      {/* Contact Popup */}
      {contactPopup.open ? (
        <div
          ref={contactPopupRef}
          className="fixed z-[80]"
          style={{ top: `${contactPopup.top}px`, left: `${contactPopup.left}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-[280px] rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">
                {contactPopup.type === "email"
                  ? `Email — ${contactPopup.name}`
                  : contactPopup.type === "call"
                  ? `Call — ${contactPopup.name}`
                  : `LinkedIn — ${contactPopup.name}`}
              </p>
              <button
                type="button"
                onClick={() => { setContactPopup((p) => ({ ...p, open: false })); setContactCopied(false); setEmailClientOpen(false); }}
                className="rounded-md border border-slate-300 bg-white p-1 text-slate-600 hover:bg-slate-50"
              >
                <X size={12} />
              </button>
            </div>
            <input
              readOnly
              value={contactPopup.value}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-2 text-xs text-slate-700"
              onFocus={(e) => e.target.select()}
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { navigator.clipboard.writeText(contactPopup.value || "").catch(() => {}); setContactCopied(true); setTimeout(() => setContactCopied(false), 2000); }}
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <span className={contactCopied ? "text-emerald-600" : ""}>{contactCopied ? "✓" : "📋"}</span>
                Copy
              </button>
              {contactPopup.type === "email" ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setEmailClientOpen((v) => !v)}
                    className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-slate-900 px-2 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    Open Gmail/Outlook <ChevronDown size={12} />
                  </button>
                  {emailClientOpen ? (
                    <div className="absolute bottom-full left-0 z-10 mb-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                      <button
                        type="button"
                        onClick={() => { window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(contactPopup.value)}`, "_blank", "noopener,noreferrer"); setEmailClientOpen(false); }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Mail size={12} className="text-red-500" /> Gmail
                      </button>
                      <button
                        type="button"
                        onClick={() => { window.open(`https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(contactPopup.value)}`, "_blank", "noopener,noreferrer"); setEmailClientOpen(false); }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Mail size={12} className="text-blue-600" /> Outlook
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => { if (contactPopup.type === "linkedin") window.open(contactPopup.value, "_blank", "noopener,noreferrer"); else window.open(`tel:${contactPopup.value}`, "_self"); }}
                  className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-2 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  {contactPopup.type === "call" ? "Call Now" : "Open LinkedIn"}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
