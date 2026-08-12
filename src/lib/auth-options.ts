import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { randomInt } from "crypto";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { checkOtpVerifyLimit } from "@/lib/rate-limit";
import { cleanupExpiredTokens } from "@/lib/cleanup";

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

function generateOtp(): string {
  return randomInt(100000, 1000000).toString();
}

// --- OTP send endpoint (called from login page) ---
export async function sendOtp(email: string): Promise<boolean> {
  const otp = generateOtp();
  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  // Clean up all expired tokens (piggyback on OTP send — runs frequently enough)
  cleanupExpiredTokens().catch(() => {}); // fire-and-forget

  // Upsert: delete existing token for this email, then create new
  await db.verificationToken.deleteMany({ where: { identifier: email } });
  await db.verificationToken.create({
    data: { identifier: email, token: otp, expires },
  });

  const from = process.env.EMAIL_FROM ?? "onboarding@resend.dev";
  await getResend().emails.send({
    from,
    to: email,
    subject: `Tu código de verificación: ${otp}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e3a5f;">Mutuo</h2>
        <p>Tu código de verificación es:</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1e3a5f; text-align: center; padding: 16px; background: #f3f4f6; border-radius: 8px;">${otp}</p>
        <p style="font-size: 14px; color: #6b7280;">Ingresa este código en la app. Expira en 10 minutos.</p>
        <p style="font-size: 12px; color: #6b7280;">Si no solicitaste este código, puedes ignorar este correo.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb;" />
        <p style="font-size: 12px; color: #6b7280;">Línea 155 — Atención a víctimas de violencia de género.</p>
      </div>
    `,
  });

  return true;
}

// --- Verify OTP and return user ---
async function verifyOtp(email: string, otp: string) {
  const token = await db.verificationToken.findFirst({
    where: { identifier: email, token: otp, expires: { gt: new Date() } },
  });

  if (!token) return null;

  // Delete used token
  await db.verificationToken.delete({
    where: { identifier_token: { identifier: email, token: otp } },
  });

  // Find or create user
  let user = await db.user.findUnique({ where: { email } });
  if (!user) {
    user = await db.user.create({ data: { email } });
  }

  return user;
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  // NO adapter — we manage users ourselves
  providers: [
    CredentialsProvider({
      id: "otp",
      name: "Código OTP",
      credentials: {
        email: { label: "Email", type: "email" },
        otp: { label: "Código", type: "text" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.otp) {
            return null;
          }

          // Rate limit: max 5 OTP verification attempts per email per 10 minutes
          const limit = checkOtpVerifyLimit(credentials.email);
          if (!limit.allowed) {
            throw new Error("RATE_LIMITED");
          }

          const user = await verifyOtp(credentials.email, credentials.otp);

          if (!user) return null;

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
    maxAge: 7 * 24 * 60 * 60, // 7 days — appropriate for legal platform
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.lastRefreshed = 0; // Force refresh on first login
      }

      // Refresh profile from DB — but only every 5 minutes (not every request)
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
          // User deleted — clear token to force sign-out
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
