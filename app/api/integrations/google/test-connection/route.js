import { NextResponse } from "next/server";
import { getSessionFromCookies } from "../../../../../lib/authSession";
import { checkAndRefreshGoogleToken } from "../../../../../lib/googleIntegration";

export async function POST() {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const integration = await checkAndRefreshGoogleToken(session.id);

    if (!integration || !integration.access_token) {
      return NextResponse.json({
        success: false,
        error: "Google account not connected.",
      });
    }

    const profileRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
      headers: {
        Authorization: `Bearer ${integration.access_token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await profileRes.json();

    if (!profileRes.ok) {
      return NextResponse.json({
        success: false,
        error: data?.error?.message || "Failed to fetch Gmail profile. Invalid or expired token.",
      });
    }

    return NextResponse.json({
      success: true,
      emailAddress: data.emailAddress,
      messagesTotal: data.messagesTotal,
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e?.message || "Failed to test connection." },
      { status: 500 }
    );
  }
}

// Support both GET and POST for convenience
export { POST as GET };
