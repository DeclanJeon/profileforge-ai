import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/',
    error: '/',
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email || session.user.email
        session.user.name = token.name || session.user.name
        session.user.image = token.picture as string | null | undefined
      }
      return session
    },
  },
}

export function normalizeAuthEmail(email?: string | null) {
  return email?.trim().toLowerCase() || null
}
