import { getSupabaseServerClient } from "./supabaseServer";

export async function checkAndRefreshGoogleToken(userId) {
  if (!userId) return null;

  const supabase = getSupabaseServerClient();
  
  // Fetch active Google integration
  let { data: integration, error } = await supabase
    .from("google_integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (!integration) {
    // Attempt auto-migration from connected_accounts
    try {
      const { data: conn } = await supabase
        .from("connected_accounts")
        .select("*")
        .eq("user_id", userId)
        .eq("provider", "gmail")
        .eq("connected", true)
        .maybeSingle();

      if (conn && conn.access_token) {
        console.log(`Auto-migrating Gmail connection from connected_accounts for user ${userId}...`);
        const { data: newIntegration, error: insertError } = await supabase
          .from("google_integrations")
          .upsert({
            user_id: userId,
            gmail_address: conn.email_address || "connected-gmail@gmail.com",
            access_token: conn.access_token,
            refresh_token: conn.refresh_token || "",
            expires_at: conn.expires_at || new Date(Date.now() + 3600 * 1000).toISOString(),
            connected_at: conn.connected_at || new Date().toISOString(),
            is_active: true
          }, { onConflict: "user_id" })
          .select()
          .single();

        if (!insertError && newIntegration) {
          integration = newIntegration;
        }
      }
    } catch (migError) {
      console.warn("Auto-migration of connected Gmail failed:", migError);
    }
  }

  if (error || !integration) {
    return null;
  }

  const now = new Date();
  const expiresAt = new Date(integration.expires_at);

  // If token is expired or expires in less than 5 minutes (300 seconds), refresh it
  const isExpired = expiresAt.getTime() - now.getTime() < 5 * 60 * 1000;

  if (isExpired) {
    console.log(`Google access token for user ${userId} is expired or expiring soon. Refreshing...`);
    try {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variables.");
      }

      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: integration.refresh_token,
          grant_type: "refresh_token",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.access_token) {
        console.error("Google token refresh API error:", data);
        return {
          ...integration,
          status: "Expired",
          error: data?.error_description || "Failed to refresh Google access token",
        };
      }

      const newAccessToken = data.access_token;
      // Google returns expires_in in seconds, typically 3600
      const newExpiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();

      const { data: updatedIntegration, error: updateError } = await supabase
        .from("google_integrations")
        .update({
          access_token: newAccessToken,
          expires_at: newExpiresAt,
          connected_at: new Date().toISOString(),
        })
        .eq("id", integration.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update google_integrations: ${updateError.message}`);
      }

      // Also keep connected_accounts updated for backward compatibility
      try {
        await supabase
          .from("connected_accounts")
          .update({
            access_token: newAccessToken,
            expires_at: newExpiresAt,
            connected_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .eq("provider", "gmail");
      } catch (e) {
        console.warn("Backward compatibility sync failed:", e);
      }

      console.log(`Google access token for user ${userId} refreshed successfully.`);
      return {
        ...updatedIntegration,
        status: "Connected",
      };
    } catch (e) {
      console.error(`Error refreshing Google token for user ${userId}:`, e.message);
      return {
        ...integration,
        status: "Expired",
        error: e.message,
      };
    }
  }

  return {
    ...integration,
    status: "Connected",
  };
}
