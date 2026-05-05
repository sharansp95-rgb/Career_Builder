import NextAuth from "next-auth";

const GoogleOAuth = {
  id: "google",
  name: "Google",
  type: "oauth" as const,
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  issuer: "https://accounts.google.com",
  authorization: {
    url: "https://accounts.google.com/o/oauth2/v2/auth",
    params: {
      scope: "openid email profile",
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
    },
  },
  token: "https://oauth2.googleapis.com/token",
  userinfo: "https://www.googleapis.com/oauth2/v3/userinfo",
  checks: ["state"] as ("pkce" | "state")[],
  profile(profile: { sub: string; name: string; email: string; picture: string }) {
    return {
      id: profile.sub,
      name: profile.name,
      email: profile.email,
      image: profile.picture,
    };
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  providers: [GoogleOAuth],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.picture = user.image;
      }
      if (account?.id_token) {
        token.googleIdToken = account.id_token;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? "";
        if (token.picture) {
          session.user.image = token.picture as string;
        }
      }
      (session as any).googleIdToken = token.googleIdToken ?? null;
      return session;
    },
  },
});