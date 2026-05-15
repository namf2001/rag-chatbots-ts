import NextAuth from "next-auth"
import KeycloakProvider from "next-auth/providers/keycloak"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from "@/lib/db"

const handler = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [
    KeycloakProvider({
      clientId: process.env.KEYCLOAK_CLIENT_ID || "",
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET || "",
      issuer: process.env.KEYCLOAK_ISSUER || "",
    })
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, account, user }) {
      if (account) {
        token.accessToken = account.access_token
      }
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        // @ts-ignore
        session.user.id = token.id
        // @ts-ignore
        session.user.accessToken = token.accessToken
      }
      return session
    }
  }
})

export { handler as GET, handler as POST }

