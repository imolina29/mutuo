import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function VerifyPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-mutuo-primary">Revisa tu correo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-mutuo-gray">
            Te hemos enviado un enlace de verificación a tu correo electrónico.
            Haz clic en el enlace para iniciar sesión.
          </p>
          <p className="mt-4 text-sm text-mutuo-gray">
            Si no recibes el correo en unos minutos, revisa tu carpeta de spam.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
