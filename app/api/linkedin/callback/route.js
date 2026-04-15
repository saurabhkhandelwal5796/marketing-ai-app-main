import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookies } from "../../../../lib/authSession";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export async function GET(req) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.redirect(`${getBaseUrl()}/auth`);

    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return NextResponse.redirect(`${getBaseUrl()}/create-post?linkedin=env_missing`);
    }

    const url = new URL(req.url);
    const code = String(url.searchParams.get("code") || "");
    const state = String(url.searchParams.get("state") || "");
    const store = await cookies();
    const savedState = String(store.get("linkedin_oauth_state")?.value || "");
    if (!code || !state || !savedState || state !== savedState) {
      return NextResponse.redirect(`${getBaseUrl()}/create-post?linkedin=state_error`);
    }

    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: `${getBaseUrl()}/api/linkedin/callback`,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData?.access_token) {
      return NextResponse.redirect(`${getBaseUrl()}/create-post?linkedin=token_error`);
    }

    const accessToken = tokenData.access_token;
    const expiresIn = Number(tokenData.expires_in || 3600);
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const meRes = await fetch("https://api.linkedin.com/v2/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const meData = await meRes.json();
    if (!meRes.ok || !meData?.id) {
      return NextResponse.redirect(`${getBaseUrl()}/create-post?linkedin=profile_error`);
    }
    const memberUrn = `urn:li:person:${meData.id}`;

    const supabase = getSupabaseServerClient();
    const { error } = await supabase
      .from("users")
      .update({
        linkedin_access_token: accessToken,
        linkedin_token_expires_at: expiresAt,
        linkedin_member_urn: memberUrn,
      })
      .eq("id", session.id);
    if (error) {
      return NextResponse.redirect(`${getBaseUrl()}/create-post?linkedin=save_error`);
    }

    const res = NextResponse.redirect(`${getBaseUrl()}/create-post?linkedin=connected`);
    res.cookies.set("linkedin_oauth_state", "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    return res;
  } catch {
    return NextResponse.redirect(`${getBaseUrl()}/create-post?linkedin=error`);
  }
}
