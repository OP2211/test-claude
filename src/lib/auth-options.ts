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
      if (!token.googleSub && typeof token.sub === 'string' && token.sub.trim()) {
        token.googleSub = token.sub;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const googleSub = token.googleSub || token.sub;
        if (typeof googleSub === 'string' && googleSub.trim()) {
          session.user.googleSub = googleSub;
        }
      }
      return session;
    },
  },
};
