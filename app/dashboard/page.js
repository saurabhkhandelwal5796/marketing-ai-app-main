"use client";

import { useMemo, useState, useEffect } from "react";
import DashboardHeader from "../../components/dashboard/DashboardHeader";
import PrimaryKPIs from "../../components/dashboard/PrimaryKPIs";
import CampaignTable from "../../components/dashboard/CampaignTable";
import DashboardCharts from "../../components/dashboard/DashboardCharts";

const withinDays = (dateStr, days) => {
  if (days === "all") return true;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - Number(days));
  return new Date(dateStr) >= cutoff;
};

export default function DashboardPage() {
  useEffect(() => {
    const startTime = Date.now();
    return () => {
      const timeSpent = Date.now() - startTime;
      if (timeSpent > 10000) {
        (async () => {
          const currentUserId = await getCurrentUserId();
          fetch("/api/audit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: currentUserId || "anonymous",
              event_type: "page_visit",
              page_name: "Dashboard",
              time_spent_ms: timeSpent,
              details: `Spent ${Math.round(timeSpent / 1000)} seconds on Dashboard page`,
              session_id: getCurrentSessionId(),
            }),
          }).catch(() => {});
        })();
      }
    };
  }, []);
  const [rows, setRows] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState("30");

  const refresh = async () => {
    setLoading(true);
    try {
      const [logsRes, campRes, tasksRes] = await Promise.all([
        fetch("/api/campaign-logs?limit=500"),
        fetch("/api/campaigns?limit=500"),
        fetch("/api/tasks?limit=500"),
      ]);
      const dataLogs = await logsRes.json();
      const dataCamp = await campRes.json();
      const dataTasks = await tasksRes.json();

      if (logsRes.ok && !dataLogs?.error) setRows(dataLogs.rows || []);
      if (campRes.ok && !dataCamp?.error) setCampaigns(dataCamp.campaigns || []);
      if (tasksRes.ok && !dataTasks?.error) setTasks(dataTasks.tasks || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const filteredRows = useMemo(() => rows.filter((row) => withinDays(row.sent_at, days)), [rows, days]);
  const filteredCampaigns = useMemo(() => campaigns.filter((c) => withinDays(c.created_at, days)), [campaigns, days]);
  const filteredTasks = useMemo(() => tasks.filter((t) => withinDays(t.created_at, days)), [tasks, days]);

  const unifiedMetrics = useMemo(() => {
    const totalCampaigns = filteredCampaigns.length;
    const closedCampaigns = filteredCampaigns.filter(c => String(c.status).toLowerCase() === "cancelled" || String(c.status).toLowerCase() === "completed").length;
    const openCampaigns = totalCampaigns - closedCampaigns;

    const totalTasks = filteredTasks.length;
    const closedTasks = filteredTasks.filter(t => String(t.status).toLowerCase() === "completed" || String(t.status).toLowerCase() === "done").length;
    const openTasks = totalTasks - closedTasks;

    const totalMilestones = filteredTasks.filter(t => t.task_type === "Milestone").length;
    const closedMilestones = 0; 
    const openMilestones = totalMilestones - closedMilestones;

    let totalEmails = 0, totalLinkedIn = 0, totalWhatsApp = 0;
    let emailOpens = 0, emailClicks = 0;

    filteredRows.forEach((r) => {
      const ch = (r.channel || "").toLowerCase();
      if (ch === "email") {
        totalEmails++;
        emailOpens += Number(r.opens || 0);
        emailClicks += Number(r.clicks || 0);
      }
      if (ch === "linkedin") totalLinkedIn++;
      if (ch === "whatsapp") totalWhatsApp++;
    });

    const emailOpenRate = totalEmails ? ((emailOpens / totalEmails) * 100).toFixed(1) : "0.0";
    const emailClickRate = totalEmails ? ((emailClicks / totalEmails) * 100).toFixed(1) : "0.0";

    return {
      totalCampaigns, openCampaigns, closedCampaigns,
      totalTasks, openTasks, closedTasks,
      totalMilestones, openMilestones, closedMilestones,
      totalEmails, totalLinkedIn, totalWhatsApp,
      emailOpenRate, emailClickRate,
      linkedinEngagementRate: "5.4",
      linkedinClickRate: "1.2",
      whatsappReadRate: "92.5",
      whatsappReplyRate: "14.2",
    };
  }, [filteredRows, filteredCampaigns, filteredTasks]);

  return (
    <main className="space-y-6 px-4 py-8 md:px-8 bg-[#f8fafc] min-h-screen">
      <DashboardHeader days={days} setDays={setDays} refresh={refresh} loading={loading} />
      <PrimaryKPIs metrics={unifiedMetrics} loading={loading} />
      <DashboardCharts rows={filteredRows} campaigns={filteredCampaigns} loading={loading} />
      <div>
        <CampaignTable rows={filteredRows} campaigns={filteredCampaigns} loading={loading} />
      </div>
    </main>
  );
}
