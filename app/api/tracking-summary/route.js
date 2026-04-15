import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabaseServer";

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("campaign_logs")
      .select("channel, status, opens, clicks, sent_at")
      .order("sent_at", { ascending: false })
      .limit(500);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = Array.isArray(data) ? data : [];
    const totalSent = rows.length;
    const totalOpens = rows.reduce((sum, row) => sum + Number(row.opens || 0), 0);
    const totalClicks = rows.reduce((sum, row) => sum + Number(row.clicks || 0), 0);

    const byChannelMap = {};
    for (const row of rows) {
      const key = row.channel || "Unknown";
      if (!byChannelMap[key]) {
        byChannelMap[key] = {
          channel: key,
          sent: 0,
          opens: 0,
          clicks: 0,
        };
      }
      byChannelMap[key].sent += 1;
      byChannelMap[key].opens += Number(row.opens || 0);
      byChannelMap[key].clicks += Number(row.clicks || 0);
    }

    const pct = (num, den) => {
      if (!den) return 0;
      return Number(Math.min(100, (num / den) * 100).toFixed(1));
    };

    const byChannel = Object.values(byChannelMap)
      .map((item) => ({
        ...item,
        open_rate: pct(item.opens, item.sent),
        click_rate: pct(item.clicks, item.sent),
      }))
      .sort((a, b) => b.sent - a.sent);

    const byDateMap = {};
    for (const row of rows) {
      const key = new Date(row.sent_at).toISOString().slice(0, 10);
      if (!byDateMap[key]) byDateMap[key] = { date: key, opens: 0, clicks: 0 };
      byDateMap[key].opens += Number(row.opens || 0);
      byDateMap[key].clicks += Number(row.clicks || 0);
    }
    const timeSeries = Object.values(byDateMap).sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      totals: {
        sent: totalSent,
        opens: totalOpens,
        clicks: totalClicks,
        open_rate: pct(totalOpens, totalSent),
        click_rate: pct(totalClicks, totalSent),
        conversion_rate: pct(totalClicks, totalSent),
      },
      byChannel,
      timeSeries,
    });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Failed to fetch tracking summary." }, { status: 500 });
  }
}

