"use client";

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function getInitials(fullName) {
  const parts = String(fullName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "U";
  const first = parts[0]?.[0] || "U";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : "";
  return (first + last).toUpperCase();
}

function getStatus(item) {
  const name = String(item?.name || "").toLowerCase();
  if (name.includes("cancel")) return { label: "Cancelled", variant: "cancelled" };

  const last = item?.last_activity_at || item?.updated_at || item?.created_at;
  const ts = last ? new Date(last).getTime() : NaN;
  if (!Number.isNaN(ts)) {
    const days = (Date.now() - ts) / (1000 * 60 * 60 * 24);
    if (days <= 14) return { label: "Confirmed", variant: "confirmed" };
  }
  return { label: "Pending", variant: "pending" };
}

function getTag(item) {
  const name = String(item?.name || "").toLowerCase();
  const goal = String(item?.goal || "").toLowerCase();
  if (name.includes("generate") || goal.includes("ai") || name.includes("ai")) return "AI Generated";
  if (name.includes("manual")) return "Manual";
  if (name.includes("sales") || String(item?.company || "").toLowerCase().includes("sales")) return "Sales";
  return null;
}

export default function CampaignRow({
  item,
  idx,
  selected,
  onToggleSelected,
  onRowClick,
  onCampaignNameClick,
}) {
  const tag = getTag(item);
  const status = getStatus(item);
  const createdByName = item?.created_by_name || item?.created_by || "-";
  const initials = getInitials(createdByName);

  const statusColors = {
    confirmed: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
    cancelled: "bg-slate-500/10 text-slate-400 ring-slate-500/20",
    pending: "bg-amber-500/10 text-amber-400 ring-amber-500/20"
  };

  const tagColors = {
    "AI Generated": "bg-purple-500/10 text-purple-400 ring-purple-500/20",
    Sales: "bg-blue-500/10 text-blue-400 ring-blue-500/20",
    Manual: "bg-slate-500/10 text-slate-300 ring-slate-500/20"
  };

  return (
    <tr
      onClick={() => onRowClick?.(item.id)}
      className="group cursor-pointer transform-gpu border-t border-white/[0.04] transition-all duration-300 ease-in-out hover:-translate-y-[2px] hover:bg-white/[0.04] hover:shadow-[0_8px_30px_-5px_rgba(99,102,241,0.15)]"
      role="row"
    >
      <td className="py-5 pl-6 pr-4 text-[13px] font-medium text-slate-500 transition-colors group-hover:text-slate-400">
        {idx + 1}
      </td>

      <td className="py-5 pr-4">
        <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCampaignNameClick?.(item.id);
            }}
            className="cursor-pointer text-[14px] font-bold tracking-wide text-white underline-offset-4 transition-colors hover:text-indigo-400 hover:underline"
          >
            {item.name || "Generating title..."}
          </button>
          {tag ? (
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide ring-1 ring-inset ${tagColors[tag] || tagColors.Manual}`}>
              {tag}
            </span>
          ) : null}
        </div>
      </td>

      <td className="py-5 pr-4">
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-bold tracking-wide ring-1 ring-inset ${statusColors[status.variant] || statusColors.pending}`}>
          <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${status.variant === 'confirmed' ? 'bg-emerald-400' : status.variant === 'pending' ? 'bg-amber-400 animate-pulse' : 'bg-slate-400'}`}></span>
          {status.label}
        </span>
      </td>

      <td className="py-5 pr-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/30">
            <span className="text-[13px] font-bold">{initials}</span>
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium text-slate-300">{createdByName || "-"}</div>
          </div>
        </div>
      </td>

      <td className="py-5 pr-4">
        <div className="text-[13px] font-medium text-slate-400">{formatDate(item.created_at)}</div>
      </td>

      <td className="py-5 pr-4">
        <div className="text-[13px] font-medium text-slate-400">{formatDate(item.updated_at)}</div>
      </td>

      <td className="py-5 text-center px-6">
        <div className="inline-flex rounded-md p-1 hover:bg-white/5 transition-colors">
          <input
            type="checkbox"
            checked={selected}
            onClick={(e) => e.stopPropagation()}
            onChange={() => onToggleSelected?.(item.id)}
            aria-label={`Select campaign ${item.name || idx + 1}`}
            className="cursor-pointer h-4 w-4 rounded border-white/20 bg-white/5 text-indigo-500 transition-all focus:ring-indigo-500 focus:ring-offset-0"
          />
        </div>
      </td>
    </tr>
  );
}

