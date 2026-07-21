import { NextResponse } from "next/server";
import { getSessionFromCookies } from "../../../../../lib/authSession";
import { checkAndRefreshGoogleToken } from "../../../../../lib/googleIntegration";

export async function GET() {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const integration = await checkAndRefreshGoogleToken(session.id);

    if (!integration) {
      return NextResponse.json({
        connected: false,
        status: "Disconnected",
      });
    }

    return NextResponse.json({
      connected: true,
      gmailAddress: integration.gmail_address,
      connectedSince: integration.connected_at,
      status: integration.status || "Connected",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Failed to fetch Google integration status." },
      { status: 500 }
    );
  }
}
