import type { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import { db } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as Adapter,
  providers: [
    EmailProvider({
      server: {
        host: "smtp.resend.com",
        port: 465,
        auth: {
          user: "resend",
          pass: process.env.RESEND_API_KEY,
        },
      },
      from: process.env.EMAIL_FROM ?? "noreply@mutuo.co",
      maxAge: 10 * 60, // OTP valid 10 minutes
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const dbUser = await db.user.findUnique({ where: { email: user.email! } });
        if (dbUser) {
          token.id = dbUser.id;
          token.fullName = dbUser.fullName ?? "";
          token.verified = dbUser.verified;
          token.profileComplete = !!(dbUser.fullName && dbUser.cedulaNumber);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.fullName = token.fullName as string;
        session.user.verified = token.verified as boolean;
        session.user.profileComplete = token.profileComplete as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
    verifyRequest: "/auth/verify",
    newUser: "/auth/register",
  },
};
