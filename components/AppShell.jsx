"use client";

import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";

export default function AppShell({ children }) {
  const [sidebarMode, setSidebarMode] = useState("expanded"); // expanded | collapsed

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("aiMarketing.sidebarMode");
      if (saved === "expanded" || saved === "collapsed") {
        setSidebarMode(saved);
      }
    } catch (_) {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("aiMarketing.sidebarMode", sidebarMode);
    } catch (_) {
      // ignore
    }
  }, [sidebarMode]);

  const cycleCollapsed = () => {
    setSidebarMode((prev) => (prev === "expanded" ? "collapsed" : "expanded"));
  };

  const sidebarWidthClass = sidebarMode === "collapsed" ? "pl-[78px]" : "pl-64";
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        mode={sidebarMode}
        onToggleCollapsed={cycleCollapsed}
      />
      <div className={`transition-all ${sidebarWidthClass}`}>
        <div className="min-h-screen">{children}</div>
      </div>
    </div>
  );
}

