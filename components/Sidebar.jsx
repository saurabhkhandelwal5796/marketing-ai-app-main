"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
  Users,
  Settings,
  UserCircle2,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/campaigns", label: "Campaign", icon: Megaphone },
  { href: "/milestones", label: "Milestones", icon: Flag },
  { href: "/audit-trail", label: "Audit Trail", icon: ScrollText },
  { href: "/email-templates", label: "Email Templates", icon: Mail },
  { href: "/create-post", label: "Create & Post", icon: Sparkles },
  { href: "/learning", label: "Learning", icon: BookOpen },
  { href: "/my-tasks", label: "My Tasks", icon: ClipboardList },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/target-audience", label: "Target Audience", icon: Users },
  { href: "/users", label: "Users", icon: UsersRound, adminOnly: true },
  { href: "/my-profile", label: "My Profile", icon: UserCircle2 },
];

export default function Sidebar({
  mode = "expanded",
  onToggleCollapsed,
  onHoverExpand,
  onToggleHidden,
  isAdmin = false,
  currentUser,
  onOpenProfileModal,
  onEditProfileNavigate,
  onLogout,
}) {
  const pathname = usePathname();
  const collapsed = mode === "collapsed";
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (!userMenuRef.current?.contains(event.target)) setIsUserMenuOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <aside
      onMouseEnter={onHoverExpand}
      className={`fixed left-0 top-0 z-40 h-screen border-r border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 transition-all duration-200 ease-in-out print:hidden ${
        collapsed ? "w-[78px]" : "w-64"
      }`}
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 shadow-sm">
          <div className={`transition-all duration-200 ${collapsed ? "hidden" : "block"}`}>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563eb] to-[#4f46e5] shadow-md shadow-blue-500/20">
                <Sparkles size={18} className="text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                Marketing<span className="font-medium text-blue-600 dark:text-blue-400">AI</span>
              </span>
            </div>
          </div>

          <button
            onClick={onToggleCollapsed}
            className="rounded-xl border border-slate-200 dark:border-slate-700 p-2 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 focus:outline-none"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            style={{ outline: "none" }}
          >
            {collapsed ? <ChevronRight size={14} strokeWidth={2} /> : <ChevronLeft size={14} strokeWidth={2} />}
          </button>
        </div>

        <nav className="mt-4 flex-1 min-h-0 space-y-1.5 overflow-y-auto overflow-x-hidden scroll-smooth custom-sidebar-scroll px-3 pb-2">
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
                  className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 ease-in-out focus:outline-none ${
                    active
                      ? "bg-blue-50 dark:bg-blue-900/20 font-bold text-blue-600 dark:text-blue-400"
                      : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                  }`}
                  style={{ outline: "none" }}
                >
                  <div
                    className={`absolute left-0 top-1/2 h-[50%] w-[3px] -translate-y-1/2 rounded-r-full transition-all duration-200 ${
                      active ? "bg-blue-600 dark:bg-blue-400" : "bg-transparent opacity-0"
                    }`}
                    aria-hidden="true"
                  />
                  <Icon 
                    size={16} 
                    strokeWidth={active ? 2.5 : 1.8} 
                    className={`transition-all duration-200 ${
                      active ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white"
                    }`}
                  />
                  <span className={collapsed ? "hidden" : "inline text-xs font-semibold tracking-wide"}>{item.label}</span>
                </Link>
              );
            })}
        </nav>

        <div className="mt-auto shrink-0 p-3 border-t border-slate-100 dark:border-slate-800">
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen((p) => !p)}
              className="flex w-full items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2.5 text-slate-700 dark:text-slate-300 transition-all duration-200 ease-in-out hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none"
              aria-label="Open profile menu"
              style={{ outline: "none" }}
            >
              <UserCircle2 size={16} strokeWidth={1.8} />
              {!collapsed ? (
                <span className="min-w-0 truncate text-xs font-semibold">
                  {currentUser?.name || "User"}
                </span>
              ) : null}
            </button>

            {isUserMenuOpen ? (
              <div className="absolute bottom-full left-0 mb-2 z-20 w-48 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5 shadow-xl">
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    if (onEditProfileNavigate) onEditProfileNavigate();
                    else onOpenProfileModal?.();
                  }}
                  className="block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none"
                >
                  Edit Profile
                </button>
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onLogout?.();
                  }}
                  className="block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-600 dark:text-red-400 transition-all duration-200 hover:bg-red-50 dark:hover:bg-red-950/20 focus:outline-none"
                >
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </aside>
  );
}


