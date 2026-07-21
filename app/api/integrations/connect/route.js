import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSessionFromCookies } from "../../../../lib/authSession";

function getBaseUrl() {
  return String(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export async function GET(req) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const url = new URL(req.url);
    const provider = String(url.searchParams.get("provider") || "").toLowerCase();

    const redirectUri = `${getBaseUrl()}/api/integrations/callback`;
    const state = crypto.randomBytes(16).toString("hex");

    let authUrl = null;
    let clientId = null;

    if (provider === "linkedin") {
      clientId = process.env.LINKEDIN_CLIENT_ID;
      if (clientId) {
        authUrl = new URL("https://www.linkedin.com/oauth/v2/authorization");
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("client_id", clientId);
        authUrl.searchParams.set("redirect_uri", redirectUri);
        authUrl.searchParams.set("state", state);
        authUrl.searchParams.set("scope", "openid profile email w_member_social");
      }
    } else if (provider === "instagram") {
      clientId = process.env.INSTAGRAM_CLIENT_ID;
      if (clientId) {
        authUrl = new URL("https://api.instagram.com/oauth/authorize");
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("client_id", clientId);
        authUrl.searchParams.set("redirect_uri", redirectUri);
        authUrl.searchParams.set("state", state);
        authUrl.searchParams.set("scope", "user_profile,user_media");
      }
    } else if (provider === "facebook") {
      clientId = process.env.FACEBOOK_CLIENT_ID;
      if (clientId) {
        authUrl = new URL("https://www.facebook.com/v12.0/dialog/oauth");
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("client_id", clientId);
        authUrl.searchParams.set("redirect_uri", redirectUri);
        authUrl.searchParams.set("state", state);
        authUrl.searchParams.set("scope", "email,public_profile");
      }
    } else if (provider === "outlook") {
      clientId = process.env.OUTLOOK_CLIENT_ID || process.env.MICROSOFT_CLIENT_ID;
      if (clientId) {
        authUrl = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("client_id", clientId);
        authUrl.searchParams.set("redirect_uri", redirectUri);
        authUrl.searchParams.set("state", state);
        authUrl.searchParams.set("response_mode", "query");
        authUrl.searchParams.set("scope", "openid profile email https://graph.microsoft.com/User.Read");
      }
    } else if (provider === "gmail") {
      clientId = process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
      if (clientId) {
        authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("client_id", clientId);
        authUrl.searchParams.set("redirect_uri", redirectUri);
        authUrl.searchParams.set("state", state);
        authUrl.searchParams.set("scope", "openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile");
        authUrl.searchParams.set("access_type", "offline");
        authUrl.searchParams.set("prompt", "consent");
      }
    }

    if (!authUrl) {
      return NextResponse.redirect(`${getBaseUrl()}/create-post?error=not_configured&provider=${provider}`);
    }

    const res = NextResponse.redirect(authUrl.toString());
    res.cookies.set("oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600,
    });
    res.cookies.set("oauth_provider", provider, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600,
    });
    return res;
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to start connection." }, { status: 500 });
  }
}
