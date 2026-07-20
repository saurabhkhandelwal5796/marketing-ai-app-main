import dynamic from "next/dynamic";

const CampaignBuilder = dynamic(() => import("../../../components/CampaignBuilder"), {
  loading: () => (
    <main className="p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        Loading campaign...
      </div>
    </main>
  ),
});

export default async function CampaignDetailPage({ params }) {
  const resolvedParams = await params;
  return <CampaignBuilder campaignId={resolvedParams.id} />;
}
