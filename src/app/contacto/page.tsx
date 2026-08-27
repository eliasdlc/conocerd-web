import type { Metadata } from "next";

import { Formulario } from "@/app/contacto/Formulario";

export const metadata: Metadata = {
  title: "Reportar un problema · ConoceRD",
  description: "Cuéntanos qué va mal y lo arreglamos.",
};

export default function Contacto() {
  return (
    <main className="mx-auto max-w-[640px] px-5 py-16">
      <h1 className="text-[32px] font-bold tracking-tight">Reportar un problema</h1>
      <p className="mt-3 mb-8 text-[16px] leading-[1.7]">
        Si algo no funciona, si un lugar tiene un dato mal, o si algo de tu cuenta se comporta raro,
        cuéntanoslo aquí. Llega directo a quien puede arreglarlo.
      </p>

      <Formulario />

      {/*
        El canal legal se nombra aparte y no se mezcla con el formulario: las
        solicitudes de borrado de cuenta y lo que exige la Ley 172-13 siguen
        entrando por correo, que es lo que dicen las páginas legales de este
        mismo sitio. Meterlas aquí sin cambiar aquello dejaría dos verdades.
      */}
      <p className="mt-10 border-t border-black/10 pt-6 text-[14px] leading-[1.7] opacity-70">
        Para eliminar tu cuenta o ejercer tus derechos sobre tus datos, escribe a{" "}
        <a href="mailto:contacto@conocerd.app" className="underline">
          contacto@conocerd.app
        </a>
        . Ese canal es el que nombran nuestras páginas de privacidad y términos.
      </p>
    </main>
  );
}
