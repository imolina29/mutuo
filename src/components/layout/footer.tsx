// src/components/layout/footer.tsx
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t bg-mutuo-gray-light mt-auto">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div>
            <p className="font-bold text-mutuo-primary mb-2">Mutuo</p>
            <p className="text-mutuo-gray">
              Declaración de intención mutua con validez probatoria. Colombia.
            </p>
          </div>
          <nav aria-label="Enlaces legales">
            <p className="font-medium mb-2">Legal</p>
            <ul className="space-y-1 text-mutuo-gray">
              <li>
                <Link href="/legal/terms" className="hover:text-mutuo-primary">
                  Términos y condiciones
                </Link>
              </li>
              <li>
                <Link href="/legal/privacy" className="hover:text-mutuo-primary">
                  Política de privacidad
                </Link>
              </li>
              <li>
                <Link href="/legal/about" className="hover:text-mutuo-primary">
                  Acerca de
                </Link>
              </li>
            </ul>
          </nav>
          <nav aria-label="Ayuda y rutas de atención">
            <p className="font-medium mb-2">Ayuda</p>
            <ul className="space-y-1 text-mutuo-gray">
              <li>
                <a
                  href="tel:155"
                  className="hover:text-mutuo-primary font-semibold"
                  aria-label="Llamar a la Línea 155, atención a víctimas de violencia de género"
                >
                  Línea 155 — Violencia de género
                </a>
              </li>
              <li>
                <a
                  href="https://www.fiscalia.gov.co"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-mutuo-primary"
                >
                  Fiscalía General de la Nación
                </a>
              </li>
              <li>
                <Link href="/legal/help" className="hover:text-mutuo-primary">
                  Rutas de atención
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
