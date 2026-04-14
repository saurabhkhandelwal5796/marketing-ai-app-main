"use client";

import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";

export default function AppShell({ children }) {
  const [sidebarMode, setSidebarMode] = useState("expanded"); // expanded | collapsed | hidden

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("aiMarketing.sidebarMode");
      if (saved === "expanded" || saved === "collapsed" || saved === "hidden") {
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

  const toggleHidden = () => {
    setSidebarMode((prev) => (prev === "hidden" ? "expanded" : "hidden"));
  };

  const sidebarWidthClass = sidebarMode === "hidden" ? "pl-0" : sidebarMode === "collapsed" ? "pl-[78px]" : "pl-64";
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        mode={sidebarMode}
        onToggleCollapsed={cycleCollapsed}
        onToggleHidden={toggleHidden}
      />
      <div className={`transition-all ${sidebarWidthClass}`}>
        <div className="min-h-screen">{children}</div>
      </div>
    </div>
  );
}

