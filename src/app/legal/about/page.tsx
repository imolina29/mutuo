export default function AboutPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-8 prose prose-sm">
      <h1 className="text-mutuo-primary">Acerca de Mutuo</h1>
      <p>Mutuo es una plataforma de declaración de intención mutua diseñada para Colombia.</p>
      <h2>¿Qué es?</h2>
      <p>Una herramienta que permite a dos personas dejar constancia verificable de que ambas acuerdan voluntariamente encontrarse, estableciendo expectativas y límites a través de cláusulas modulares.</p>
      <h2>¿Qué NO es?</h2>
      <ul>
        <li>No es una app de citas</li>
        <li>No es un contrato de consentimiento sexual</li>
        <li>No reemplaza denuncias penales ni mecanismos del Estado</li>
        <li>No determina culpabilidad ni inocencia</li>
      </ul>
      <h2>¿Por qué existe?</h2>
      <p>Porque creemos que la transparencia y el registro verificable de intenciones puede proteger tanto a víctimas reales de acoso como a personas falsamente acusadas. La justicia debe velar por encontrar la verdad y hacer valer la ley.</p>
    </main>
  );
}
