"use client";

import { useState } from "react";

/**
 * Contar que algo va mal, sin abrir el correo.
 *
 * Antes el único canal era `contacto@conocerd.app`, que es un reenvío de
 * dominio: llega a un correo personal y ahí se acaba el rastro. Nada de lo que
 * escribía la gente llegaba al panel, así que nada se podía atender de verdad.
 *
 * El correo es opcional y lo dice: exigirlo deja fuera a quien solo quiere
 * avisar de algo, que es la mayoría.
 */
const ASUNTOS = [
  { valor: "la-app-falla", etiqueta: "La app falla o se cierra" },
  { valor: "un-dato-esta-mal", etiqueta: "Un dato de un lugar está mal" },
  { valor: "mi-cuenta", etiqueta: "Algo con mi cuenta" },
  { valor: "otro", etiqueta: "Otra cosa" },
] as const;

type Estado =
  | { fase: "listo" | "enviando" | "enviado" }
  | { fase: "error"; mensaje: string };

export function Formulario() {
  const [estado, setEstado] = useState<Estado>({ fase: "listo" });

  async function enviar(datos: FormData) {
    setEstado({ fase: "enviando" });

    const cuerpo = {
      origen: "web" as const,
      asunto: String(datos.get("asunto") ?? "otro"),
      mensaje: String(datos.get("mensaje") ?? "").trim(),
      ...(String(datos.get("correo") ?? "").trim()
        ? { correo: String(datos.get("correo")).trim() }
        : {}),
    };

    try {
      const respuesta = await fetch("/api/reportar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(cuerpo),
      });

      if (respuesta.ok) {
        setEstado({ fase: "enviado" });
        return;
      }

      const detalle = (await respuesta.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      setEstado({
        fase: "error",
        mensaje:
          respuesta.status === 429
            ? "Has enviado varios seguidos. Prueba dentro de un rato."
            : respuesta.status === 422
              ? "Revisa el mensaje: hacen falta al menos diez caracteres, y el correo tiene que ser válido."
              : (detalle.message ??
                detalle.error ??
                "No se pudo enviar. Escríbenos a contacto@conocerd.app."),
      });
    } catch {
      setEstado({
        fase: "error",
        mensaje: "No se pudo enviar. Escríbenos a contacto@conocerd.app.",
      });
    }
  }

  if (estado.fase === "enviado") {
    return (
      <p role="status" className="text-[15px] leading-[1.7]">
        Recibido. Si dejaste un correo, te escribimos. Si no, igual lo leemos: nos sirve para
        arreglarlo.
      </p>
    );
  }

  return (
    <form action={enviar} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-[15px]">
        ¿De qué va?
        <select
          name="asunto"
          defaultValue="la-app-falla"
          className="min-h-[44px] rounded-lg border border-black/15 bg-white px-3"
        >
          {ASUNTOS.map((a) => (
            <option key={a.valor} value={a.valor}>
              {a.etiqueta}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-[15px]">
        Cuéntanos
        <textarea
          name="mensaje"
          required
          minLength={10}
          maxLength={2000}
          rows={5}
          placeholder="Qué pasó, y dónde. Cuanto más concreto, antes lo arreglamos."
          className="resize-y rounded-lg border border-black/15 bg-white px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-[15px]">
        Tu correo, si quieres respuesta
        <input
          type="email"
          name="correo"
          maxLength={200}
          placeholder="opcional"
          className="min-h-[44px] rounded-lg border border-black/15 bg-white px-3"
        />
      </label>

      {estado.fase === "error" && (
        <p role="alert" className="text-[15px] text-red-700">
          {estado.mensaje}
        </p>
      )}

      <button
        type="submit"
        disabled={estado.fase === "enviando"}
        className="min-h-[44px] w-fit rounded-full bg-black px-6 font-semibold text-white disabled:opacity-50"
      >
        {estado.fase === "enviando" ? "Enviando" : "Enviar"}
      </button>
    </form>
  );
}
