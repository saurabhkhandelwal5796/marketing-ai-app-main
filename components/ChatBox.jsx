"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CircleHelp } from "lucide-react";
import { motion } from "framer-motion";

export default function ChatBox({ messages, onSend, loading }) {
  const [input, setInput] = useState("");
  const scrollerRef = useRef(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const disabled = useMemo(() => loading || !input.trim(), [loading, input]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    onSend(text);
    setInput("");
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="inline-flex items-center text-sm font-semibold text-slate-900">
          Description Chat
          <span className="group relative ml-1 inline-flex">
            <CircleHelp size={14} className="text-slate-400" />
            <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-56 -translate-x-1/2 rounded-md bg-slate-900 px-2.5 py-2 text-xs font-normal text-white shadow-lg group-hover:block">
              Write your campaign context in plain language. AI uses this as the primary brief for
              suggestions and generated content.
            </span>
          </span>
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">Describe goals, audience, and constraints.</p>
      </div>

      <div ref={scrollerRef} className="max-h-[360px] space-y-3 overflow-y-auto p-4">
        {messages.map((message) => {
          const isUser = message.role === "user";
          return (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${
                  isUser
                    ? "rounded-br-md bg-blue-600 text-white"
                    : "rounded-bl-md border border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                {message.content}
              </div>
            </motion.div>
          );
        })}

        {loading ? (
          <div className="flex justify-start">
            <div className="w-40 animate-pulse rounded-2xl rounded-bl-md border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm text-slate-500">
              AI is thinking...
            </div>
          </div>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-slate-200 p-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI to refine your campaign..."
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <button
            type="submit"
            disabled={disabled}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Ask AI
          </button>
        </div>
      </form>
    </div>
  );
}

