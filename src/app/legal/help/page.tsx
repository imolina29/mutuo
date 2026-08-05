export default function HelpPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-mutuo-primary mb-8">Rutas de atención</h1>
      <div className="space-y-6">
        <div className="p-6 bg-mutuo-danger/5 border border-mutuo-danger/20 rounded-lg">
          <h2 className="text-xl font-bold text-mutuo-danger mb-2">Línea 155</h2>
          <p className="text-sm mb-2">Línea de atención a víctimas de violencia de género. Disponible 24/7.</p>
          <a href="tel:155" className="text-mutuo-primary font-bold text-lg underline">Llamar al 155</a>
        </div>
        <div className="p-6 bg-white border rounded-lg">
          <h2 className="text-xl font-bold text-mutuo-primary mb-2">Fiscalía General de la Nación</h2>
          <p className="text-sm mb-2">Para denuncias penales por delitos contra la libertad sexual.</p>
          <a href="https://www.fiscalia.gov.co" target="_blank" rel="noopener" className="text-mutuo-primary underline">www.fiscalia.gov.co</a>
        </div>
        <div className="p-6 bg-white border rounded-lg">
          <h2 className="text-xl font-bold text-mutuo-primary mb-2">Policía Nacional</h2>
          <p className="text-sm mb-2">Línea de emergencias.</p>
          <a href="tel:123" className="text-mutuo-primary font-bold text-lg underline">Llamar al 123</a>
        </div>
        <div className="p-6 bg-white border rounded-lg">
          <h2 className="text-xl font-bold text-mutuo-primary mb-2">Comisaría de Familia</h2>
          <p className="text-sm">Atención en casos de violencia intrafamiliar y de género en tu municipio.</p>
        </div>
      </div>
      <div className="mt-8 p-4 bg-mutuo-gray-light rounded-lg">
        <p className="text-sm text-mutuo-gray">
          <strong>Recuerda:</strong> esta plataforma no reemplaza los mecanismos de denuncia del Estado colombiano.
          Si estás en peligro, llama al 155 o al 123 inmediatamente.
        </p>
      </div>
    </main>
  );
}
