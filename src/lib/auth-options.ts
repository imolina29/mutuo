import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { Resend } from "resend";
import { db } from "@/lib/db";

const resend = new Resend(process.env.RESEND_API_KEY);

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// --- OTP send endpoint (called from login page) ---
export async function sendOtp(email: string): Promise<boolean> {
  const otp = generateOtp();
  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  // Upsert: delete existing token for this email, then create new
  await db.verificationToken.deleteMany({ where: { identifier: email } });
  await db.verificationToken.create({
    data: { identifier: email, token: otp, expires },
  });

  const from = process.env.EMAIL_FROM ?? "onboarding@resend.dev";
  await resend.emails.send({
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
          console.log("[authorize] credentials:", { email: credentials?.email, otp: credentials?.otp });

          if (!credentials?.email || !credentials?.otp) {
            console.log("[authorize] missing credentials");
            return null;
          }

          const user = await verifyOtp(credentials.email, credentials.otp);
          console.log("[authorize] verifyOtp result:", user ? user.id : "null");

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
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      // Refresh profile from DB
      if (token.email) {
        const dbUser = await db.user.findUnique({
          where: { email: token.email as string },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.fullName = dbUser.fullName ?? [dbUser.nombres, dbUser.apellidos].filter(Boolean).join(" ") ?? "";
          token.verified = dbUser.verified;
          token.profileComplete = !!((dbUser.nombres || dbUser.fullName) && dbUser.cedulaNumber);
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
