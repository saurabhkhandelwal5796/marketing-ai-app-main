"use client";

import { useEffect, useState } from "react";

const PRESETS = {
  milestone_generate: [
    "Reading your campaign goals...",
    "Analyzing selected marketing plan points...",
    "Calculating best timeline duration...",
    "Planning milestone structure...",
    "Creating tasks for each milestone...",
    "Reviewing plan for completeness...",
  ],
  marketing_analysis: [
    "Reading company information...",
    "Researching target industries...",
    "Identifying key marketing opportunities...",
    "Building strategy points...",
    "Generating target audience data...",
    "Finalizing marketing plan...",
  ],
  milestone_refine: [
    "Reading your request...",
    "Reviewing current plan...",
    "Calculating changes needed...",
    "Updating milestone structure...",
  ],
  company_research: [
    "Researching company background...",
    "Analyzing market positioning...",
    "Identifying decision makers...",
    "Preparing outreach insights...",
  ],
  general: [
    "Processing your request...",
    "Analyzing data...",
    "Generating response...",
    "Almost there...",
  ],
};

/**
 * ThinkingDisplay — animated cycling status messages while AI is processing.
 *
 * @param {"milestone_generate"|"marketing_analysis"|"milestone_refine"|"company_research"|"general"} preset
 * @param {string[]} [messages] — custom messages (overrides preset)
 * @param {number} [intervalMs] — fixed ms between messages (optional)
 * @param {[number, number]} [intervalRangeMs] — min/max ms between messages (default [1500, 2000])
 * @param {string} [className] — extra wrapper classes
 */
export default function ThinkingDisplay({
  preset = "general",
  messages: customMessages,
  intervalMs,
  intervalRangeMs = [1500, 2000],
  className = "",
}) {
  const messages = customMessages || PRESETS[preset] || PRESETS.general;
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const resetTimer = setTimeout(() => {
      setIndex(0);
      setVisible(true);
    }, 0);
    return () => clearTimeout(resetTimer);
  }, [preset]);

  useEffect(() => {
    if (!messages.length) return;

    let mounted = true;
    let tickTimeout = null;
    let fadeTimeout = null;

    const nextDelay = () => {
      if (Number.isFinite(intervalMs)) return Math.max(250, Number(intervalMs));
      const [min, max] = Array.isArray(intervalRangeMs) ? intervalRangeMs : [1500, 2000];
      const lo = Number.isFinite(min) ? Number(min) : 1500;
      const hi = Number.isFinite(max) ? Number(max) : 2000;
      const a = Math.max(250, Math.min(lo, hi));
      const b = Math.max(250, Math.max(lo, hi));
      return Math.floor(a + Math.random() * (b - a + 1));
    };

    const schedule = () => {
      tickTimeout = setTimeout(() => {
        if (!mounted) return;

        setVisible(false);
        fadeTimeout = setTimeout(() => {
          if (!mounted) return;
          setIndex((prev) => (prev + 1) % messages.length);
          setVisible(true);
          schedule();
        }, 250);
      }, nextDelay());
    };

    schedule();

    return () => {
      mounted = false;
      if (tickTimeout) clearTimeout(tickTimeout);
      if (fadeTimeout) clearTimeout(fadeTimeout);
    };
  }, [messages, intervalMs, intervalRangeMs]);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Pulsing dot */}
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-slate-400 opacity-50" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-slate-500" />
      </span>

      {/* Cycling message */}
      <span
        className="text-sm text-slate-500 transition-opacity duration-300 ease-in-out"
        style={{ opacity: visible ? 1 : 0 }}
      >
        {messages[index]}
      </span>
    </div>
  );
}
