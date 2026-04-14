import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.provider === 'google' && profile?.sub) {
        token.googleSub = profile.sub;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.googleSub) {
        session.user.googleSub = token.googleSub;
      }
      return session;
    },
  },
};
