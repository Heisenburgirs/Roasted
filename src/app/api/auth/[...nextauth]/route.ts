import NextAuth, { AuthOptions } from "next-auth";
import TwitterProvider from "next-auth/providers/twitter";

export const authOptions = {
  providers: [
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID || "",
      clientSecret: process.env.TWITTER_CLIENT_SECRET || "",
      version: "2.0",
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }: { token: any, account: any, profile: any }) {
      if (account) {
        token.id = account.providerAccountId;
        token.accessToken = account.access_token;
      }
      if (profile) {
        token.twitterHandle = profile.data.username;
        token.image = profile.data.profile_image_url;
        token.email = profile.data.email;
      }
      return token;
    },
    async session({ session, token }: { session: any, token: any }) {
      session.user.id = token.id;
      session.user.twitterHandle = token.twitterHandle;
      session.user.image = token.image;
      session.user.email = token.email; 
      return session;
    },
    async redirect({ url, baseUrl }: { url: any, baseUrl: any }) {
      // Redirect to the main page after successful login
      return `${baseUrl}/authenticatedX`;
    },
  },
  pages: {
    signIn: "/signin", // Custom sign-in page
  },
};

const handler = NextAuth(authOptions as AuthOptions);
export { handler as GET, handler as POST };