import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSessionFromCookies } from "../../../../lib/authSession";

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export async function GET() {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const clientId = process.env.LINKEDIN_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json({ error: "Missing LINKEDIN_CLIENT_ID env." }, { status: 500 });
    }

    const redirectUri = `${getBaseUrl()}/api/linkedin/callback`;
    const state = crypto.randomBytes(16).toString("hex");
    const authUrl = new URL("https://www.linkedin.com/oauth/v2/authorization");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("scope", "openid profile email w_member_social");

    const res = NextResponse.redirect(authUrl.toString());
    res.cookies.set("linkedin_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600,
    });
    return res;
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to start LinkedIn connect." }, { status: 500 });
  }
}
