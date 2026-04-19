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

export default function CampaignRow({
  item,
  idx,
  selected,
  onToggleSelected,
  onRowClick,
  onCampaignNameClick,
}) {
  const status = getStatus(item);
  const createdByName = item?.created_by_name || item?.created_by || "-";
  const initials = getInitials(createdByName);

  const statusColors = {
    confirmed: "bg-emerald-50 text-emerald-700 ring-emerald-500/20",
    cancelled: "bg-slate-50 text-slate-600 ring-slate-500/20",
    pending: "bg-amber-50 text-amber-700 ring-amber-500/20"
  };

  return (
    <tr
      onClick={() => onRowClick?.(item.id)}
      className="group cursor-pointer border-t border-slate-100 transition-colors hover:bg-slate-50"
      role="row"
    >
      <td className="py-5 pl-6 pr-4 text-[13px] font-medium text-slate-500">
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
            className="cursor-pointer text-[14px] font-bold tracking-wide text-slate-900 underline-offset-4 transition-colors hover:text-indigo-600 hover:underline"
          >
            {item.name || "Generating title..."}
          </button>
        </div>
      </td>



      <td className="py-5 pr-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 ring-1 ring-indigo-500/20">
            <span className="text-[13px] font-bold">{initials}</span>
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold text-slate-700">{createdByName || "-"}</div>
          </div>
        </div>
      </td>

      <td className="py-5 pr-4">
        <div className="text-[13px] font-medium text-slate-500">{formatDate(item.created_at)}</div>
      </td>

      <td className="py-5 pr-4">
        <div className="text-[13px] font-medium text-slate-500">{formatDate(item.updated_at)}</div>
      </td>

      <td className="py-5 text-center px-6">
        <div className="inline-flex rounded-md p-1 hover:bg-slate-100 transition-colors">
          <input
            type="checkbox"
            checked={selected}
            onClick={(e) => e.stopPropagation()}
            onChange={() => onToggleSelected?.(item.id)}
            aria-label={`Select campaign ${item.name || idx + 1}`}
            className="cursor-pointer h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0"
          />
        </div>
      </td>
    </tr>
  );
}

