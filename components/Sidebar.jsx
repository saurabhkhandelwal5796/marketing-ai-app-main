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
  Flag,
  ScrollText,
  Mail,
  Megaphone,
  ClipboardList,
  UsersRound,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/campaigns", label: "Campaign", icon: Megaphone },
  { href: "/milestones", label: "Milestones", icon: Flag },
  { href: "/email-templates", label: "Email Templates", icon: Mail },
  { href: "/create-post", label: "Create & Post", icon: Sparkles },
  { href: "/learning", label: "Learning", icon: BookOpen },
  { href: "/my-tasks", label: "My Tasks", icon: ClipboardList },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/users", label: "Users", icon: UsersRound, adminOnly: true },
  { href: "/audit-trail", label: "Audit Trail", icon: ScrollText },
];

export default function Sidebar({ mode = "expanded", onToggleCollapsed, onHoverExpand, onToggleHidden, isAdmin = false }) {
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
    </aside>
  );
}


