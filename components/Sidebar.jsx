"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  History,
  Mail,
  Megaphone,
  ClipboardList,
  UsersRound,
  Settings,
  UserRound,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/campaigns", label: "Campaign", icon: Megaphone },
  { href: "/email-templates", label: "Email Templates", icon: Mail },
  { href: "/create-post", label: "Create & Post", icon: Sparkles },
  { href: "/learning", label: "Learning", icon: BookOpen },
  { href: "/my-tasks", label: "My Tasks", icon: ClipboardList },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/users", label: "Users", icon: UsersRound, adminOnly: true },
  { href: "/my-profile", label: "My Profile", icon: UserRound },
  { href: "/history", label: "History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar({ mode = "expanded", onToggleCollapsed, onHoverExpand, onToggleHidden, isAdmin = false }) {
function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  const first = parts[0][0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] || "" : "";
  return `${first}${last}`.toUpperCase();
}

export default function Sidebar({ mode = "expanded", onToggleCollapsed, onToggleHidden, isAdmin = false, currentUser = null }) {
  const pathname = usePathname();
  const collapsed = mode === "collapsed";

  return (
    <aside
      onMouseEnter={onHoverExpand}
      className={`fixed left-0 top-0 z-40 h-screen border-r border-slate-200 bg-white/95 backdrop-blur transition-all ${
        collapsed ? "w-[78px]" : "w-64"
      }`}
    >
      <div className="flex h-16 items-center justify-between border-b border-slate-200 px-3">
        <div className={`transition ${collapsed ? "hidden" : "block"}`}>
          <Image
            src="/ai-workflow-logo.png"
            alt="AI Marketing Workflow Studio logo"
            width={180}
            height={48}
            className="h-8 w-auto object-contain"
            priority
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleCollapsed}
            className="rounded-lg border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </div>

      <nav className="space-y-1 p-3">
        {navItems
          .filter((item) => !item.adminOnly || isAdmin)
          .map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                active
                  ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon size={18} />
              <span className={collapsed ? "hidden" : "inline"}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 p-3">
        <Link
          href="/my-profile"
          className={`flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition hover:bg-slate-100 ${
            collapsed ? "justify-center" : ""
          }`}
          title={collapsed ? "My Profile" : undefined}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
            {initials(currentUser?.name)}
          </div>
          <div className={collapsed ? "hidden" : "min-w-0"}>
            <p className="truncate text-sm font-semibold text-slate-900">{currentUser?.name || "User"}</p>
            <p className="truncate text-xs text-slate-500">{currentUser?.email || "Open profile"}</p>
          </div>
        </Link>
      </div>
    </aside>
  );
}

