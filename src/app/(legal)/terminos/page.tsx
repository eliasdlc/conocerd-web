import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos de uso",
  description: "Condiciones de uso del sitio de ConoceRD y de su lista de espera.",
};

export default function TerminosPage() {
  return (
    <article>
      <h1>Términos de uso</h1>
      <p className="crd-legal-date">Última actualización: 27 de julio de 2026</p>

      <p>
        Estos términos aplican a este sitio web y a la lista de espera de ConoceRD. La aplicación
        móvil todavía no está publicada; cuando lo esté tendrá sus propios términos.
      </p>

      <h2>Qué es este sitio</h2>
      <p>
        Una página informativa sobre ConoceRD y un formulario para entrar a la lista de espera.
        Los datos de destinos, negocios y estadísticas que se muestran son ilustrativos y no
        constituyen una recomendación ni una garantía sobre ningún lugar o establecimiento.
      </p>

      <h2>Lista de espera</h2>
      <ul>
        <li>Registrarte es gratuito y no crea ninguna obligación para ti.</li>
        <li>Al registrarte aceptas recibir correos nuestros sobre el proyecto. Puedes darte de
          baja cuando quieras.</li>
        <li>Los beneficios anunciados —badge de fundador, acceso anticipado y perfil destacado
          para negocios— dependen de que la app se lance, y sus condiciones pueden ajustarse. Si
          algo cambia de forma relevante, te lo comunicaremos por correo.</li>
        <li>Debes usar un correo tuyo, o de un negocio que representes. No registres a terceros
          sin su permiso.</li>
      </ul>

      <h2>Uso aceptable</h2>
      <p>
        No está permitido intentar vulnerar el sitio, automatizar registros masivos ni enviar
        datos falsos. Podemos eliminar registros que incumplan esto, sin aviso previo.
      </p>

      <h2>Propiedad</h2>
      <p>
        La marca, el diseño y los contenidos de este sitio pertenecen a ConoceRD, salvo las
        imágenes de terceros que se identifiquen como tales.
      </p>

      <h2>Responsabilidad</h2>
      <p>
        Ofrecemos este sitio tal cual, sin garantía de disponibilidad continua. No respondemos por
        daños derivados de decisiones de viaje tomadas a partir de la información aquí publicada.
      </p>

      <h2>Contacto</h2>
      <p>
        Cualquier duda sobre estos términos: <a href="mailto:contacto@conocerd.app">contacto@conocerd.app</a>.
      </p>
    </article>
  );
}
