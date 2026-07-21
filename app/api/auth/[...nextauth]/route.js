import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { cookies } from "next/headers";
import { parseSessionToken } from "../../../../lib/authSession";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/gmail.send",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account.provider === "google") {
        try {
          const cookieStore = await cookies();
          const token = cookieStore.get("marketing_auth")?.value;
          const session = parseSessionToken(token);
          if (!session) {
            console.error("No active marketing auth session found in cookies.");
            return true;
          }

          const supabase = getSupabaseServerClient();
          const { error } = await supabase
            .from("connected_accounts")
            .upsert({
              user_id: session.id,
              provider: "gmail",
              connected: true,
              connected_at: new Date().toISOString(),
              email_address: profile.email,
              display_name: profile.name || profile.email,
              access_token: account.access_token,
              refresh_token: account.refresh_token || null,
              expires_at: account.expires_at ? new Date(account.expires_at * 1000).toISOString() : null,
            }, { onConflict: "user_id,provider" });

          if (error) {
            console.error("Failed to save connected Gmail account in Supabase:", error.message);
          }

          // Save to google_integrations
          const { error: gError } = await supabase
            .from("google_integrations")
            .upsert({
              user_id: session.id,
              gmail_address: profile.email,
              access_token: account.access_token,
              refresh_token: account.refresh_token || null,
              expires_at: account.expires_at ? new Date(account.expires_at * 1000).toISOString() : null,
              connected_at: new Date().toISOString(),
              is_active: true,
            }, { onConflict: "user_id" });

          if (gError) {
            console.error("Failed to save Google integration in Supabase:", gError.message);
          }
        } catch (e) {
          console.error("Error storing Gmail connected account:", e);
        }
      }
      return true;
    },
  },
  pages: {
    signIn: "/create-post",
    error: "/create-post",
  },
});

export { handler as GET, handler as POST };
