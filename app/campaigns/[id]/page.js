import CampaignBuilder from "../../../components/CampaignBuilder";

export default async function CampaignDetailPage({ params }) {
  const resolvedParams = await params;
  return <CampaignBuilder campaignId={resolvedParams.id} />;
}
