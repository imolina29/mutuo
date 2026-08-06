import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main>
      {/* Hero */}
      <section className="bg-mutuo-primary text-white py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Declaración de Intención Mutua
          </h1>
          <p className="text-lg md:text-xl mb-8 opacity-90">
            Deja constancia verificable de que ambas partes acuerdan voluntariamente
            encontrarse. Con validez probatoria bajo la legislación colombiana.
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild size="lg" className="bg-white text-mutuo-primary hover:bg-gray-100">
              <Link href="/auth/register">Crear cuenta</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
              <Link href="#como-funciona">¿Cómo funciona?</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="como-funciona" className="py-16 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-mutuo-primary mb-12">¿Cómo funciona?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-mutuo-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-mutuo-primary">1</span>
              </div>
              <h3 className="font-semibold mb-2">Crea</h3>
              <p className="text-sm text-mutuo-gray">
                Define los detalles del encuentro y selecciona las cláusulas que ambas partes declararán.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-mutuo-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-mutuo-primary">2</span>
              </div>
              <h3 className="font-semibold mb-2">Comparte</h3>
              <p className="text-sm text-mutuo-gray">
                Envía el enlace a la otra persona por WhatsApp, SMS o el medio que prefieras.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-mutuo-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-mutuo-primary">3</span>
              </div>
              <h3 className="font-semibold mb-2">Firman</h3>
              <p className="text-sm text-mutuo-gray">
                Ambos verifican su identidad y firman. El documento queda sellado con hash SHA-256 y estampa de tiempo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Marco legal */}
      <section className="py-16 px-4 bg-mutuo-gray-light">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-mutuo-primary mb-8">Respaldo legal</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg">
              <h3 className="font-semibold mb-2">Ley 527 de 1999</h3>
              <p className="text-sm text-mutuo-gray">Reconoce la validez jurídica de mensajes de datos y firmas electrónicas en Colombia.</p>
            </div>
            <div className="bg-white p-6 rounded-lg">
              <h3 className="font-semibold mb-2">Ley 1581 de 2012</h3>
              <p className="text-sm text-mutuo-gray">Protección de datos personales. Tus datos están cifrados y protegidos.</p>
            </div>
            <div className="bg-white p-6 rounded-lg">
              <h3 className="font-semibold mb-2">Custodia certificada</h3>
              <p className="text-sm text-mutuo-gray">Cada documento se sella con hash SHA-256 y estampa de tiempo certificada, garantizando que no fue alterado.</p>
            </div>
            <div className="bg-white p-6 rounded-lg">
              <h3 className="font-semibold mb-2">Auditoría completa</h3>
              <p className="text-sm text-mutuo-gray">Cada acción queda registrada con fecha, hora, IP y detalle. Registro inmutable para máxima transparencia.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Disclaimers */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-xl font-bold text-mutuo-primary mb-4">Importante</h2>
          <div className="space-y-2 text-sm text-mutuo-gray">
            <p>Esta declaración es una manifestación de voluntad de encuentro, <strong>no una autorización de actividad sexual</strong>.</p>
            <p>El consentimiento es <strong>revocable en cualquier momento</strong>.</p>
            <p>Esta plataforma <strong>no reemplaza</strong> los mecanismos de denuncia del Estado colombiano.</p>
            <p className="pt-4">
              <a href="tel:155" className="text-mutuo-primary font-semibold underline">Línea 155</a> — Atención a víctimas de violencia de género |{" "}
              <a href="https://www.fiscalia.gov.co" target="_blank" rel="noopener" className="text-mutuo-primary underline">Fiscalía General de la Nación</a>
            </p>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-16 px-4 bg-mutuo-primary text-white text-center">
        <h2 className="text-3xl font-bold mb-4">Protege tus encuentros</h2>
        <p className="mb-8 opacity-90">Crea tu primera declaración de intención mutua en minutos.</p>
        <Button asChild size="lg" className="bg-white text-mutuo-primary hover:bg-gray-100">
          <Link href="/auth/register">Empezar ahora</Link>
        </Button>
      </section>
    </main>
  );
}
