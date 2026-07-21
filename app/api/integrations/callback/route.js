import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookies } from "../../../../lib/authSession";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";

function getBaseUrl() {
  return String(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export async function GET(req) {
  const store = await cookies();
  const provider = String(store.get("oauth_provider")?.value || "").toLowerCase();
  
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.redirect(`${getBaseUrl()}/auth`);

    const url = new URL(req.url);
    const code = String(url.searchParams.get("code") || "");
    const state = String(url.searchParams.get("state") || "");
    const savedState = String(store.get("oauth_state")?.value || "");

    if (!code || !state || !savedState || state !== savedState) {
      return NextResponse.redirect(`${getBaseUrl()}/create-post?error=state_error`);
    }

    let accessToken = null;
    let displayName = "";
    let emailAddress = "";

    const redirectUri = `${getBaseUrl()}/api/integrations/callback`;

    if (provider === "linkedin") {
      const clientId = process.env.LINKEDIN_CLIENT_ID;
      const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
      
      const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData?.access_token) {
        throw new Error(tokenData?.error_description || "LinkedIn token exchange failed");
      }
      accessToken = tokenData.access_token;

      try {
        const userInfoRes = await fetch("https://api.linkedin.com/v2/userinfo", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const userInfo = await userInfoRes.json();
        if (userInfoRes.ok && userInfo) {
          displayName = userInfo.name || `${userInfo.given_name || ""} ${userInfo.family_name || ""}`.trim();
          emailAddress = userInfo.email || "";
        }
      } catch {
        // fallback
      }

      if (!displayName) {
        const meRes = await fetch("https://api.linkedin.com/v2/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const meData = await meRes.json();
        if (meRes.ok && meData) {
          displayName = `${meData.localizedFirstName || ""} ${meData.localizedLastName || ""}`.trim() || meData.id;
        }
      }
    } 
    else if (provider === "instagram") {
      const clientId = process.env.INSTAGRAM_CLIENT_ID;
      const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;

      const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
          code,
        }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData?.access_token) {
        throw new Error(tokenData?.error_message || "Instagram token exchange failed");
      }
      accessToken = tokenData.access_token;
      
      const meRes = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`);
      const meData = await meRes.json();
      if (meRes.ok && meData) {
        displayName = meData.username || meData.id;
      }
    } 
    else if (provider === "facebook") {
      const clientId = process.env.FACEBOOK_CLIENT_ID;
      const clientSecret = process.env.FACEBOOK_CLIENT_SECRET;

      const tokenRes = await fetch(`https://graph.facebook.com/v12.0/oauth/access_token?client_id=${clientId}&redirect_uri=${redirectUri}&client_secret=${clientSecret}&code=${code}`);
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData?.access_token) {
        throw new Error(tokenData?.error?.message || "Facebook token exchange failed");
      }
      accessToken = tokenData.access_token;

      const meRes = await fetch(`https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`);
      const meData = await meRes.json();
      if (meRes.ok && meData) {
        displayName = meData.name || meData.id;
        emailAddress = meData.email || "";
      }
    } 
    else if (provider === "outlook") {
      const clientId = process.env.OUTLOOK_CLIENT_ID || process.env.MICROSOFT_CLIENT_ID;
      const clientSecret = process.env.OUTLOOK_CLIENT_SECRET || process.env.MICROSOFT_CLIENT_SECRET;

      const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          scope: "openid profile email https://graph.microsoft.com/User.Read",
          code,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
          client_secret: clientSecret,
        }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData?.access_token) {
        throw new Error(tokenData?.error_description || "Outlook token exchange failed");
      }
      accessToken = tokenData.access_token;

      const meRes = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const meData = await meRes.json();
      if (meRes.ok && meData) {
        displayName = meData.displayName || meData.userPrincipalName || "";
        emailAddress = meData.mail || meData.userPrincipalName || "";
      }
    } 
    else if (provider === "gmail") {
      const clientId = process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData?.access_token) {
        throw new Error(tokenData?.error_description || "Gmail token exchange failed");
      }
      accessToken = tokenData.access_token;

      const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const userInfo = await userInfoRes.json();
      if (userInfoRes.ok && userInfo) {
        displayName = userInfo.name || userInfo.email || "";
        emailAddress = userInfo.email || "";
      }
    }

    if (!accessToken) {
      throw new Error("No access token acquired.");
    }

    const supabase = getSupabaseServerClient();
    const { error: dbError } = await supabase
      .from("connected_accounts")
      .upsert({
        user_id: session.id,
        provider,
        connected: true,
        connected_at: new Date().toISOString(),
        email_address: emailAddress || null,
        display_name: displayName || null,
      }, { onConflict: "user_id,provider" });

    if (dbError) {
      throw new Error(`Database save error: ${dbError.message}`);
    }

    const res = NextResponse.redirect(`${getBaseUrl()}/create-post?connected=${provider}`);
    res.cookies.set("oauth_state", "", { maxAge: 0, path: "/" });
    res.cookies.set("oauth_provider", "", { maxAge: 0, path: "/" });
    return res;
  } catch (e) {
    console.error("OAuth callback error:", e);
    const res = NextResponse.redirect(`${getBaseUrl()}/create-post?error=${encodeURIComponent(e.message || "auth_failed")}&provider=${provider}`);
    res.cookies.set("oauth_state", "", { maxAge: 0, path: "/" });
    res.cookies.set("oauth_provider", "", { maxAge: 0, path: "/" });
    return res;
  }
}
