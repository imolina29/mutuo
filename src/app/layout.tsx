import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/providers/session-provider";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { DisclaimerBanner } from "@/components/layout/disclaimer-banner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Mutuo — Declaración de Consentimiento Mutuo",
  description:
    "Plataforma para declaraciones de consentimiento mutuo en Colombia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.className} antialiased flex flex-col min-h-screen`}>
        <SessionProvider>
          <DisclaimerBanner />
          <Header />
          <div className="flex-1 flex flex-col">{children}</div>
          <Footer />
        </SessionProvider>
      </body>
    </html>
  );
}
