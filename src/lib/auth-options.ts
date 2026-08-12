import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Correo y contraseña",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          const email = credentials.email.toLowerCase().trim();
          const user = await db.user.findUnique({ where: { email } });

          if (!user || !user.passwordHash) {
            return null;
          }

          const valid = await bcrypt.compare(credentials.password, user.passwordHash);
          if (!valid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.fullName,
          };
        } catch (err) {
          console.error("[authorize] ERROR:", err);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.lastRefreshed = 0;
      }

      const now = Date.now();
      const lastRefreshed = (token.lastRefreshed as number) ?? 0;
      const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

      if (token.email && now - lastRefreshed > REFRESH_INTERVAL) {
        const dbUser = await db.user.findUnique({
          where: { email: token.email as string },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.fullName = dbUser.fullName ?? [dbUser.nombres, dbUser.apellidos].filter(Boolean).join(" ") ?? "";
          token.verified = dbUser.verified;
          token.profileComplete = !!((dbUser.nombres || dbUser.fullName) && dbUser.cedulaNumber);
          token.lastRefreshed = now;
        } else {
          return {} as typeof token;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.fullName = (token.fullName as string) ?? "";
        session.user.verified = (token.verified as boolean) ?? false;
        session.user.profileComplete = (token.profileComplete as boolean) ?? false;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
  },
};
