import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Qué datos recoge ConoceRD en su lista de espera, para qué los usa y cómo darte de baja.",
};

// Versión mínima pero real: desde que la lista de espera guarda correos, esta
// página deja de ser un placeholder. Revisar antes del lanzamiento de la app,
// que añadirá tratamientos nuevos (cuenta, ubicación, reseñas).
export default function PrivacidadPage() {
  return (
    <article>
      <h1>Política de privacidad</h1>
      <p className="crd-legal-date">Última actualización: 27 de julio de 2026</p>

      <p>
        Esta política explica qué datos recogemos a través de la lista de espera de ConoceRD y
        qué hacemos con ellos. Es la única recolección de datos personales que hace este sitio
        hoy: la aplicación móvil aún no está publicada.
      </p>

      <h2>Quién es responsable</h2>
      <p>
        ConoceRD (Santiago, República Dominicana). Para cualquier asunto relacionado con tus
        datos escribe a <a href="mailto:contacto@conocerd.app">contacto@conocerd.app</a>.
      </p>

      <h2>Qué datos recogemos</h2>
      <ul>
        <li>Tu <strong>correo electrónico</strong> (obligatorio).</li>
        <li>Si te registras como negocio: <strong>nombre del negocio, tipo</strong> y, si lo das,
          un <strong>número de WhatsApp</strong>.</li>
        <li>El <strong>origen del registro</strong> (por ejemplo, si llegaste por el código QR de
          un evento) y la <strong>fecha y hora de tu consentimiento</strong>.</li>
      </ul>
      <p>
        No pedimos documentos, no cobramos nada y no usamos cookies de publicidad ni rastreo de
        terceros.
      </p>

      <h2>Para qué los usamos</h2>
      <ul>
        <li>Avisarte cuando la app esté disponible y darte el acceso anticipado y el badge de
          fundador prometidos al registrarte.</li>
        <li>Enviarte novedades del proyecto, siempre relacionadas con ConoceRD.</li>
        <li>Entender de qué canal vino cada registro, en forma agregada.</li>
      </ul>
      <p>
        La base para tratar tus datos es <strong>tu consentimiento</strong>, que das marcando la
        casilla del formulario. Guardamos la fecha en que lo diste.
      </p>

      <h2>Con quién los compartimos</h2>
      <p>
        Sólo con los proveedores que necesitamos para operar: <strong>Resend</strong> (envío de
        correos y gestión de la lista), <strong>Neon</strong> (base de datos) y{" "}
        <strong>Vercel</strong> (alojamiento del sitio). No vendemos ni cedemos tus datos a
        terceros con fines comerciales.
      </p>

      <h2>Cuánto tiempo los guardamos</h2>
      <p>
        Hasta que te des de baja o nos pidas eliminarlos. Si el proyecto no llega a lanzarse,
        borramos la lista.
      </p>

      <h2>Tus derechos</h2>
      <p>
        Puedes pedirnos en cualquier momento acceder a tus datos, corregirlos o eliminarlos, y
        retirar tu consentimiento. Cada correo que te enviemos incluye un enlace de baja, y
        también puedes escribirnos a <a href="mailto:contacto@conocerd.app">contacto@conocerd.app</a>.
        Darte de baja no tiene ninguna consecuencia más allá de dejar de recibir nuestros correos.
      </p>

      <h2>Cambios</h2>
      <p>
        Si cambiamos esta política actualizaremos la fecha de arriba. Si el cambio afecta a cómo
        usamos datos que ya nos diste, te lo avisaremos por correo antes de aplicarlo.
      </p>
    </article>
  );
}
