export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-8 prose prose-sm">
      <h1 className="text-mutuo-primary">Política de Privacidad y Tratamiento de Datos Personales</h1>
      <p><em>Última actualización: agosto de 2026</em></p>
      <p>
        En cumplimiento de la <strong>Ley 1581 de 2012</strong> (Habeas Data), el{" "}
        <strong>Decreto 1377 de 2013</strong> y demás normativa concordante, Mutuo informa sobre el
        tratamiento de datos personales y datos sensibles recopilados a través de la plataforma.
      </p>

      <h2>1. Responsable del tratamiento</h2>
      <p>
        Mutuo, con domicilio en Colombia. Para el ejercicio de tus derechos como titular de datos
        personales, puedes contactarnos a:{" "}
        <a href="mailto:soporte@mutuo.co" className="text-mutuo-primary">soporte@mutuo.co</a>.
      </p>

      <h2>2. Datos que recopilamos</h2>
      <h3>Datos personales</h3>
      <ul>
        <li>Nombre completo, correo electrónico, número de teléfono</li>
        <li>Número de cédula de ciudadanía</li>
        <li>Contenido de las declaraciones de intención mutua</li>
      </ul>
      <h3>Datos sensibles (con autorización expresa)</h3>
      <ul>
        <li>Fotografías de la cédula de ciudadanía (ambas caras)</li>
        <li>Selfie de verificación de identidad</li>
        <li>Datos biométricos faciales (procesados para verificación, no almacenados como plantilla biométrica)</li>
      </ul>
      <h3>Datos técnicos</h3>
      <ul>
        <li>Dirección IP, agente de navegador (user-agent), marcas de tiempo</li>
        <li>Registros de auditoría de acciones en la plataforma</li>
      </ul>

      <h2>3. Finalidad del tratamiento</h2>
      <p>Los datos se utilizan exclusivamente para:</p>
      <ul>
        <li><strong>Verificación de identidad:</strong> confirmar que eres quien dices ser mediante OCR de tu cédula, comparación facial y validación de datos</li>
        <li><strong>Declaraciones de intención mutua:</strong> generar, custodiar y sellar declaraciones con validez probatoria (Ley 527/1999)</li>
        <li><strong>Seguridad:</strong> prevenir fraude, suplantación y abuso de la plataforma</li>
        <li><strong>Comunicaciones:</strong> enviarte notificaciones relacionadas con tus declaraciones</li>
        <li><strong>Cumplimiento legal:</strong> atender requerimientos de autoridades competentes</li>
      </ul>
      <p>
        <strong>No vendemos, compartimos ni cedemos tus datos a terceros</strong> con fines comerciales,
        publicitarios o de marketing. Los datos solo se comparten con las partes involucradas en cada
        declaración y con autoridades cuando la ley lo exija.
      </p>

      <h2>4. Seguridad de los datos</h2>
      <ul>
        <li><strong>En tránsito:</strong> cifrado TLS 1.3 en todas las comunicaciones</li>
        <li><strong>En reposo:</strong> fotografías de identidad cifradas con AES-256-CBC antes de almacenarse</li>
        <li><strong>Almacenamiento:</strong> archivos en bucket privado de Supabase Storage, accesibles solo con clave de servicio</li>
        <li><strong>Base de datos:</strong> PostgreSQL con conexión cifrada, alojado en Supabase (infraestructura AWS)</li>
        <li><strong>Sellado:</strong> declaraciones selladas con hash SHA-256 y timestamp TSA para integridad y no repudio</li>
      </ul>
      <p>
        Las claves de cifrado se almacenan de forma separada a los datos, y el acceso a los sistemas está
        restringido al personal autorizado.
      </p>

      <h2>5. Verificación de identidad</h2>
      <p>El proceso de verificación incluye:</p>
      <ol>
        <li><strong>OCR (Reconocimiento Óptico de Caracteres):</strong> se extrae el texto de la cédula de forma local para comparar nombre y número con tu perfil. No se envían datos a servicios externos durante este paso.</li>
        <li><strong>Comparación facial:</strong> se compara la selfie con la foto de la cédula usando Google Cloud Vision API para detectar que se trata de la misma persona. Google procesa las imágenes para detección facial; no almacena ni reutiliza las imágenes.</li>
        <li><strong>Almacenamiento cifrado:</strong> las fotografías se cifran con AES-256 <em>antes</em> de subirse al almacenamiento, lo que significa que ni siquiera el proveedor de almacenamiento puede ver su contenido.</li>
      </ol>

      <h2>6. Derechos del titular (artículo 8, Ley 1581 de 2012)</h2>
      <p>Como titular de tus datos, tienes derecho a:</p>
      <ul>
        <li><strong>Conocer:</strong> solicitar información sobre qué datos tuyos tenemos y cómo los usamos</li>
        <li><strong>Actualizar:</strong> corregir datos inexactos o desactualizados</li>
        <li><strong>Rectificar:</strong> modificar datos incorrectos</li>
        <li><strong>Suprimir:</strong> solicitar la eliminación de tus datos cuando no exista obligación legal de conservarlos</li>
        <li><strong>Revocar:</strong> revocar la autorización para el tratamiento de tus datos</li>
      </ul>
      <p>
        Para ejercer estos derechos, puedes usar la opción{" "}
        <strong>&quot;Eliminar mi cuenta y datos personales&quot;</strong> en tu perfil, o escribir a{" "}
        <a href="mailto:soporte@mutuo.co" className="text-mutuo-primary">soporte@mutuo.co</a>.
        Responderemos en un plazo máximo de 15 días hábiles.
      </p>

      <h2>7. Eliminación de datos</h2>
      <p>Al solicitar la eliminación de tu cuenta, se realizan las siguientes acciones:</p>
      <ul>
        <li>Se eliminan todas las fotografías de identidad del almacenamiento cifrado</li>
        <li>Se elimina tu información personal (nombre, correo, teléfono, cédula)</li>
        <li>Se eliminan notificaciones, bloqueos y reportes</li>
        <li>Los registros de auditoría se <strong>anonimizan</strong> (se remueve la información personal identificable)</li>
        <li>Las declaraciones selladas donde participaste como creador se conservan como <strong>obligación legal</strong> (Ley 527/1999)</li>
        <li>Se envía un correo de confirmación de la eliminación</li>
      </ul>

      <h2>8. Retención de datos</h2>
      <table>
        <thead>
          <tr>
            <th>Dato</th>
            <th>Período de retención</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Fotografías de identidad</td>
            <td>Hasta eliminación de cuenta o máximo 1 año</td>
          </tr>
          <tr>
            <td>Declaraciones selladas</td>
            <td>5 años (obligación legal)</td>
          </tr>
          <tr>
            <td>Registros de auditoría</td>
            <td>5 años (anonimizados tras eliminación de cuenta)</td>
          </tr>
          <tr>
            <td>Cuentas inactivas</td>
            <td>Eliminación automática a los 3 años</td>
          </tr>
        </tbody>
      </table>

      <h2>9. Encargados del tratamiento</h2>
      <table>
        <thead>
          <tr>
            <th>Servicio</th>
            <th>Uso</th>
            <th>Ubicación</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Supabase</td>
            <td>Base de datos y almacenamiento de archivos cifrados</td>
            <td>AWS (EE.UU.)</td>
          </tr>
          <tr>
            <td>Google Cloud Vision</td>
            <td>Detección facial para verificación de identidad</td>
            <td>Google Cloud (EE.UU.)</td>
          </tr>
          <tr>
            <td>Resend</td>
            <td>Envío de correos electrónicos transaccionales</td>
            <td>AWS (EE.UU.)</td>
          </tr>
        </tbody>
      </table>
      <p>
        Todos los encargados cumplen con estándares de seguridad equivalentes y las imágenes se cifran
        <em> antes</em> de transmitirse, garantizando que ningún tercero accede al contenido original.
      </p>

      <h2>10. Autorización</h2>
      <p>
        Al registrarte en Mutuo y verificar tu identidad, autorizas expresamente el tratamiento de tus
        datos personales y datos sensibles (fotografías de cédula, selfie, datos biométricos faciales)
        conforme a esta política. Esta autorización es libre, previa, expresa e informada, de acuerdo
        con el artículo 9 de la Ley 1581 de 2012.
      </p>

      <h2>11. Transferencia internacional de datos</h2>
      <p>
        Tus datos pueden ser transferidos a servidores ubicados en Estados Unidos (AWS, Google Cloud) para
        su procesamiento. Esta transferencia se realiza bajo los estándares de seguridad descritos y con
        cifrado previo de datos sensibles, conforme a lo establecido en los artículos 25 y 26 de la
        Ley 1581 de 2012.
      </p>

      <h2>12. Cambios a esta política</h2>
      <p>
        Cualquier cambio sustancial a esta política será notificado por correo electrónico con al menos
        15 días de anticipación. El uso continuado de la plataforma implica aceptación de los cambios.
      </p>

      <p className="text-xs text-mutuo-gray border-t pt-4 mt-8">
        Para consultas o reclamos sobre tratamiento de datos personales, puedes dirigirte a la{" "}
        <strong>Superintendencia de Industria y Comercio (SIC)</strong> como autoridad de protección de
        datos en Colombia.
      </p>
    </main>
  );
}
