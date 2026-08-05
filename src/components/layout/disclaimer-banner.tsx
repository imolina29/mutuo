// src/components/layout/disclaimer-banner.tsx
export function DisclaimerBanner() {
  return (
    <div className="bg-mutuo-primary text-white text-xs text-center py-1 px-4">
      Esta plataforma no reemplaza los mecanismos de denuncia del Estado colombiano. El
      consentimiento es revocable en cualquier momento.{" "}
      <a href="tel:155" className="underline ml-2 font-semibold" aria-label="Llamar a la Línea 155">
        Línea 155
      </a>
    </div>
  );
}
