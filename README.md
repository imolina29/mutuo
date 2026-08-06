# Mutuo

Plataforma de declaración de intención mutua — consentimiento informado entre dos personas, con marco legal colombiano (Ley 527/1999, Ley 1581/2012).

## Tech Stack

- **Next.js 14** (App Router) + TypeScript strict
- **Prisma v5** + PostgreSQL (Supabase)
- **NextAuth.js** — autenticación OTP por email (Resend)
- **Tailwind CSS** + shadcn/ui
- **AES-256-CBC** — encriptación de documentos de identidad
- **SHA-256 + TSA** — sellado y timestamp de declaraciones

## Getting Started

```bash
npm install
npx prisma generate
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## Variables de entorno

Copiar `.env.example` → `.env.local` y configurar:

- `DATABASE_URL` — PostgreSQL (Supabase)
- `NEXTAUTH_URL` / `NEXTAUTH_SECRET`
- `ENCRYPTION_KEY` — AES-256 para documentos
- `RESEND_API_KEY` / `EMAIL_FROM` — envío de emails

## Licencia

Proyecto social — todos los derechos reservados.
