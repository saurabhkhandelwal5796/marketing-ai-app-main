"use client";

import { useMemo, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { getCurrentSessionId, getCurrentUserId } from "../../lib/getCurrentUserId";

const DashboardHeader = dynamic(() => import("../../components/dashboard/DashboardHeader"));
const PrimaryKPIs = dynamic(() => import("../../components/dashboard/PrimaryKPIs"));
const CampaignTable = dynamic(() => import("../../components/dashboard/CampaignTable"));
const DashboardCharts = dynamic(() => import("../../components/dashboard/DashboardCharts"));

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
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState("30");
  const [sessionUser, setSessionUser] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        if (!mounted) return;
        setSessionUser(data?.user || null);
      } catch {
        if (mounted) setSessionUser(null);
      } finally {
        if (mounted) setSessionReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      // const [logsRes, campRes, tasksRes] = await Promise.all([
      //   fetch("/api/campaign-logs?limit=500"),
      //   fetch("/api/campaigns?limit=500"),
      //   fetch("/api/tasks?limit=500"),
      // ]);
      // const dataLogs = await logsRes.json();
      // const dataCamp = await campRes.json();
      // const dataTasks = await tasksRes.json();

      // if (logsRes.ok && !dataLogs?.error) setRows(dataLogs.rows || []);
      // if (campRes.ok && !dataCamp?.error) setCampaigns(dataCamp.campaigns || []);
      // if (tasksRes.ok && !dataTasks?.error) setTasks(dataTasks.tasks || []);
      const [logsRes, campRes, tasksRes, milestonesRes] = await Promise.all([
          fetch("/api/campaign-logs?limit=500"),
          // fetch("/api/campaigns?limit=500"),
          fetch("/api/campaigns?all=true"),
          fetch("/api/tasks?limit=500"),
          fetch("/api/milestones?limit=500"),
        ]);
        const dataLogs = await logsRes.json();
        const dataCamp = await campRes.json();
        const dataTasks = await tasksRes.json();
        const dataMilestones = await milestonesRes.json();

        if (logsRes.ok && !dataLogs?.error) setRows(dataLogs.rows || []);
        if (campRes.ok && !dataCamp?.error) setCampaigns(dataCamp.campaigns || []);
        if (tasksRes.ok && !dataTasks?.error) setTasks(dataTasks.tasks || []);
        if (milestonesRes.ok && !dataMilestones?.error) setMilestones(dataMilestones.milestones || []);

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!sessionReady) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionReady, sessionUser?.id, sessionUser?.is_admin]);

  const filteredRows = useMemo(() => rows.filter((row) => withinDays(row.sent_at, days)), [rows, days]);
  const filteredCampaigns = useMemo(() => {
    const dateFiltered = campaigns.filter((c) => withinDays(c.created_at, days));
    if (!sessionUser || sessionUser.is_admin) return dateFiltered;
    const allowed = new Set(
      [sessionUser.id, sessionUser.email, sessionUser.name]
        .map((v) => String(v || "").trim())
        .filter(Boolean)
    );
    return dateFiltered.filter((c) => allowed.has(String(c.created_by || "").trim()));
  }, [campaigns, days, sessionUser]);
  const filteredTasks = useMemo(() => {
    const dateFiltered = tasks.filter((t) => withinDays(t.created_at, days));
    if (!sessionUser || sessionUser.is_admin) return dateFiltered;
    return dateFiltered.filter((t) => String(t.assignee_id || "") === String(sessionUser.id || ""));
  }, [tasks, days, sessionUser]);
  const filteredMilestones = useMemo(() => {
  return milestones.filter((m) => withinDays(m.created_at, days));
}, [milestones, days]);

  const campaignIdSet = useMemo(
    () => new Set(filteredCampaigns.map((c) => c.id).filter(Boolean)),
    [filteredCampaigns]
  );
  const scopedRows = useMemo(() => {
    if (!sessionUser || sessionUser.is_admin) return filteredRows;
    return filteredRows.filter((r) => campaignIdSet.has(r.campaign_id));
  }, [filteredRows, campaignIdSet, sessionUser]);

  const unifiedMetrics = useMemo(() => {
    const totalCampaigns = filteredCampaigns.length;
    const closedCampaigns = filteredCampaigns.filter(c => String(c.status).toLowerCase() === "closed").length;
    const openCampaigns = filteredCampaigns.filter(c => String(c.status).toLowerCase() === "open").length;

   const totalTasks = filteredTasks.length;
   const openTasks = filteredTasks.filter(t => String(t.status).toLowerCase() === "to do").length;
   const closedTasks = filteredTasks.filter(t => String(t.status).toLowerCase() === "completed" || String(t.status).toLowerCase() === "done").length;


    // const totalMilestones = filteredTasks.filter(t => t.task_type === "Milestone").length;
    // const closedMilestones = 0; 
    // const openMilestones = totalMilestones - closedMilestones;
    const totalMilestones = filteredMilestones.length;
    const openMilestones = filteredMilestones.filter(m => m.status === "Not Started").length;
    const inProgressMilestones = filteredMilestones.filter(m => m.status === "In Progress").length;
    const overdueMilestones = filteredMilestones.filter(m => m.status === "Overdue").length;
    const closedMilestones = filteredMilestones.filter(m => m.status === "Completed").length;


    let totalEmails = 0, totalLinkedIn = 0, totalWhatsApp = 0;
    let emailOpens = 0, emailClicks = 0;

    scopedRows.forEach((r) => {
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
      totalMilestones, openMilestones, inProgressMilestones, overdueMilestones, closedMilestones,
      totalEmails, totalLinkedIn, totalWhatsApp,
      emailOpenRate, emailClickRate,
      linkedinEngagementRate: "5.4",
      linkedinClickRate: "1.2",
      whatsappReadRate: "92.5",
      whatsappReplyRate: "14.2",
    };
  }, [scopedRows, filteredCampaigns, filteredTasks, filteredMilestones]);

  return (
    <main className="space-y-6 px-4 py-8 md:px-8 bg-[#f8fafc] min-h-screen">
      <DashboardHeader days={days} setDays={setDays} refresh={refresh} loading={loading} />
      {!loading &&
      sessionUser &&
      !sessionUser.is_admin &&
      scopedRows.length === 0 &&
      filteredCampaigns.length === 0 &&
      filteredTasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
          <p className="text-base font-semibold text-slate-900">No data available for your account</p>
          <p className="mt-1 text-sm text-slate-500">Once you create campaigns or get tasks assigned, your analytics will appear here.</p>
        </div>
      ) : null}
      <PrimaryKPIs metrics={unifiedMetrics} loading={loading} />
      <DashboardCharts rows={scopedRows} campaigns={filteredCampaigns} loading={loading} />
      <div>
        <CampaignTable rows={scopedRows} campaigns={filteredCampaigns} loading={loading} />
      </div>
    </main>
  );
}
