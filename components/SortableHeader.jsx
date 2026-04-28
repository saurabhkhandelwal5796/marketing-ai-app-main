import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

export default function SortableHeader({ 
  label, 
  sortKey, 
  sortBy, 
  sortOrder, 
  onSort, 
  align = "left",
  className = ""
}) {
  const isActive = sortBy === sortKey;
  const isAsc = isActive && sortOrder === "asc";
  const isDesc = isActive && sortOrder === "desc";

  return (
    <th 
      className={`px-4 py-3 font-medium cursor-pointer group hover:bg-slate-100 transition-colors select-none ${
        align === "center" ? "text-center" : "text-left"
      } ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <div className={`inline-flex items-center gap-1.5 ${align === "center" ? "justify-center" : "justify-start"}`}>
        <span className={isActive ? "text-blue-600 font-semibold" : ""}>{label}</span>
        {isAsc ? (
          <ArrowUp size={14} className="text-blue-600" />
        ) : isDesc ? (
          <ArrowDown size={14} className="text-blue-600" />
        ) : (
          <ArrowUpDown size={14} className="text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </div>
    </th>
  );
}
