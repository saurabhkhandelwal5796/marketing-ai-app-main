"use client";

import { useMemo, useState } from "react";

const channelInputHelp = (channel) => {
  const lower = channel.toLowerCase();
  if (lower.includes("email")) return "Comma separated emails (e.g. a@x.com, b@y.com)";
  if (lower.includes("whatsapp") || lower.includes("sms"))
    return "Comma separated phone numbers (e.g. +919876543210, +919999999999)";
  if (lower.includes("linkedin") || lower.includes("instagram"))
    return "Comma separated profile handles or URLs";
  return "Comma separated recipients";
};

export default function SendModal({ open, channel, content, campaignName, onClose, onSubmit, sending }) {
  const [recipients, setRecipients] = useState("");
  const helper = useMemo(() => channelInputHelp(channel || ""), [channel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
        <h3 className="text-base font-semibold text-slate-900">Send via {channel}</h3>
        <p className="mt-1 text-sm text-slate-500">This is a dummy send flow. Data will be logged in Supabase.</p>

        <label className="mt-4 block text-sm font-medium text-slate-700">
          Recipients
          <input
            value={recipients}
            onChange={(e) => setRecipients(e.target.value)}
            placeholder={helper}
            className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <label className="mt-3 block text-sm font-medium text-slate-700">
          Preview
          <textarea
            readOnly
            value={content || ""}
            rows={6}
            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-700"
          />
        </label>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            disabled={sending || !recipients.trim()}
            onClick={() => onSubmit({ campaignName, channel, recipients, content })}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {sending ? "Saving..." : "Send (Dummy)"}
          </button>
        </div>
      </div>
    </div>
  );
}

