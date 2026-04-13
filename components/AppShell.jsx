"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";

export default function AppShell({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <div className={`transition-all ${collapsed ? "pl-[78px]" : "pl-64"}`}>
        <div className="min-h-screen">{children}</div>
      </div>
    </div>
  );
}

