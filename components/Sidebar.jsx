"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  History,
  Mail,
  Megaphone,
  ClipboardList,
  UsersRound,
  Settings,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/campaigns", label: "Campaign", icon: Megaphone },
  { href: "/email-templates", label: "Email Templates", icon: Mail },
  { href: "/my-tasks", label: "My Tasks", icon: ClipboardList },
  { href: "/users", label: "Users", icon: UsersRound, adminOnly: true },
  { href: "/history", label: "History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar({ mode = "expanded", onToggleCollapsed, onToggleHidden, isAdmin = false }) {
  const pathname = usePathname();
  const collapsed = mode === "collapsed";
  const hidden = mode === "hidden";

  return (
    <aside
      className={`fixed left-0 top-0 z-40 h-screen border-r border-slate-200 bg-white/95 backdrop-blur transition-all ${
        hidden ? "w-0 overflow-hidden border-r-0" : collapsed ? "w-[78px]" : "w-64"
      }`}
    >
      <div className="flex h-16 items-center justify-between border-b border-slate-200 px-3">
        <span className={`font-semibold text-slate-900 transition ${collapsed ? "hidden" : "block"}`}>
          AI Marketing Studio
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleHidden}
            className="rounded-lg border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50"
            title={hidden ? "Show sidebar" : "Hide sidebar"}
            aria-label={hidden ? "Show sidebar" : "Hide sidebar"}
          >
            {hidden ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
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
    </aside>
  );
}

