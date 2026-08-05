export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-8 prose prose-sm">
      <h1 className="text-mutuo-primary">Política de Privacidad y Tratamiento de Datos</h1>
      <p><em>Última actualización: agosto de 2026</em></p>
      <p>En cumplimiento de la Ley 1581 de 2012 y el Decreto 1377 de 2013, informamos sobre el tratamiento de datos personales.</p>
      <h2>1. Datos que recopilamos</h2>
      <ul>
        <li>Nombre completo, correo electrónico, teléfono, número de cédula</li>
        <li>Fotografías de la cédula de ciudadanía (ambas caras)</li>
        <li>Selfie de verificación</li>
        <li>Contenido de las declaraciones</li>
        <li>Registros de auditoría (IP, user-agent, timestamps)</li>
      </ul>
      <h2>2. Finalidad</h2>
      <p>Los datos se utilizan exclusivamente para: verificar la identidad de los usuarios, generar y custodiar declaraciones de intención mutua, y cumplir con obligaciones legales.</p>
      <h2>3. Seguridad</h2>
      <p>Datos cifrados en tránsito (TLS 1.3) y en reposo (AES-256). Las fotografías de identidad se eliminan 1 año después de la verificación, conservando solo el resultado.</p>
      <h2>4. Derechos del titular</h2>
      <p>Conforme a la Ley 1581 de 2012, tienes derecho a conocer, actualizar, rectificar y suprimir tus datos personales. Para ejercer estos derechos, contacta a proteccion@mutuo.co.</p>
      <h2>5. Retención</h2>
      <p>Declaraciones selladas: 5 años. Datos de identidad: 1 año. Audit logs: 5 años. Cuentas inactivas: eliminación a los 3 años.</p>
      <h2>6. Autorización</h2>
      <p>Al registrarte en Mutuo, autorizas expresamente el tratamiento de tus datos personales conforme a esta política.</p>
    </main>
  );
}
