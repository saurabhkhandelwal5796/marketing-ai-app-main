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
  History,
  Mail,
  Megaphone,
  ClipboardList,
  UsersRound,
  Settings,
  UserCircle2,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/campaigns", label: "Campaign", icon: Megaphone },
  { href: "/email-templates", label: "Email Templates", icon: Mail },
  { href: "/create-post", label: "Create & Post", icon: Sparkles },
  { href: "/learning", label: "Learning", icon: BookOpen },
  { href: "/my-profile", label: "My Profile", icon: UserCircle2 },
  { href: "/my-tasks", label: "My Tasks", icon: ClipboardList },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/users", label: "Users", icon: UsersRound, adminOnly: true },
  { href: "/history", label: "History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar({
  mode = "expanded",
  onToggleCollapsed,
  onHoverExpand,
  onToggleHidden,
  isAdmin = false,
  currentUser,
  onOpenProfileModal,
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
      className={`fixed left-0 top-0 z-40 h-screen border-r border-[#1B1B2A] bg-gradient-to-b from-[#0B0F1A] to-[#121826] backdrop-blur transition-all duration-300 ease-in-out ${
        collapsed ? "w-[78px]" : "w-64"
      }`}
    >
      <div className="flex h-full flex-col">
        <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-white/[0.05] bg-white/[0.02] px-5 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          <div className={`transition ${collapsed ? "hidden" : "block"}`}>
            {/* Replaced PNG with a code-based logo for precise control over size, font weight, and spacing */}
            <div className="flex items-center gap-3.5">
              <div className="flex h-[36px] w-[36px] items-center justify-center rounded-[10px] bg-gradient-to-br from-[#6366f1] to-[#818cf8] shadow-[0_0_15px_rgba(99,102,241,0.5)]">
                <Sparkles size={20} className="text-white drop-shadow-md" />
              </div>
              <span className="text-[20px] font-extrabold tracking-wide text-white drop-shadow-sm">
                Marketing<span className="font-medium text-[#818cf8]">Tool</span>
              </span>
            </div>
          </div>

          <button
            onClick={onToggleCollapsed}
            className="rounded-lg border border-[#2A2A3A] p-1.5 text-[#A9A9BA] transition-all duration-200 ease-in-out hover:bg-white/5 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1]/50"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            style={{ outline: "none" }}
          >
            {collapsed ? <ChevronRight size={16} strokeWidth={1.5} /> : <ChevronLeft size={16} strokeWidth={1.5} />}
          </button>
        </div>

        <nav className="mt-5 space-y-1.5 px-3 pb-3">
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
                  className={`group relative flex items-center gap-3 rounded-[10px] px-3 py-2.5 transition-all duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1]/50 ${
                    active
                      ? "bg-[#6366f1]/15 font-bold text-white"
                      : "text-[#A9A9BA] hover:translate-x-1 hover:bg-white/5 hover:text-white"
                  }`}
                  style={{ outline: "none" }}
                >
                  <div
                    className={`absolute left-0 top-1/2 h-[60%] w-[3px] -translate-y-1/2 rounded-r-full transition-all duration-200 ${
                      active ? "bg-[#6366f1] shadow-[0_0_8px_rgba(99,102,241,0.8)]" : "bg-transparent opacity-0"
                    }`}
                    aria-hidden="true"
                  />
                  <Icon 
                    size={18} 
                    strokeWidth={active ? 2 : 1.5} 
                    className={`transition-all duration-200 ${
                      active ? "text-[#818cf8] drop-shadow-[0_0_6px_rgba(99,102,241,0.6)]" : "text-[#A9A9BA] group-hover:text-white"
                    }`}
                  />
                  <span className={collapsed ? "hidden" : "inline text-[13px] tracking-wide"}>{item.label}</span>
                </Link>
              );
            })}
        </nav>

        <div className="mt-auto p-3">
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen((p) => !p)}
              className="flex w-full items-center gap-3 rounded-[10px] border border-[#2A2A3A] bg-transparent px-3 py-2.5 text-[#A9A9BA] transition-all duration-200 ease-in-out hover:bg-white/5 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1]/50"
              aria-label="Open profile menu"
              style={{ outline: "none" }}
            >
              <UserCircle2 size={16} strokeWidth={1.5} />
              {!collapsed ? (
                <span className="min-w-0 truncate text-[12px] font-medium">
                  {currentUser?.name || "User"}
                </span>
              ) : null}
            </button>

            {isUserMenuOpen ? (
              <div className="absolute bottom-full right-0 z-20 w-44 rounded-lg border border-[#2A2A3A] bg-[#121826] p-1 shadow-lg">
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onOpenProfileModal?.();
                  }}
                  className="block w-full rounded-md px-3 py-2 text-left text-[12px] font-medium text-[#EDEBFF] transition-all duration-200 hover:bg-white/5 focus:outline-none"
                >
                  Edit Profile
                </button>
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onLogout?.();
                  }}
                  className="block w-full rounded-md px-3 py-2 text-left text-[12px] font-medium text-[#FF5C7A] transition-all duration-200 hover:bg-white/5 focus:outline-none"
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


