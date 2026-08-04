// ─────────────────────────────────────────────────────────────────────────────
//  La marca viaja DENTRO del mensaje.
//
//  Un `<img src="https://…">` en un correo depende de tres cosas que no
//  controlamos en el momento en que alguien lo abre:
//
//   1. Que el archivo esté publicado. El correo sale del código de hoy y las
//      imágenes son las del último deploy: estrenar el logo y mandarlo el mismo
//      día deja el mensaje con un 404 donde va la marca.
//   2. Que el cliente cargue imágenes remotas. Gmail las bloquea de entrada
//      para un remitente nuevo, y nosotros lo somos.
//   3. Que el proxy del cliente siga los redirects del dominio.
//
//  Cuando cualquiera de las tres falla, el logo y el sello se caen al texto
//  alternativo y ConoceRD se presenta como una frase en negro sobre crema.
//
//  Por eso el logo y el sello van adjuntos en línea (`cid:`): son dos, pesan
//  poco y son justo lo que no puede faltar. Se pintan aunque el cliente tenga
//  las imágenes remotas bloqueadas, porque ya están en el mensaje.
//
//  Las fotos de los destinos NO: son contenido, cambian por ruta y multiplican
//  el peso del correo. Esas siguen siendo remotas (y en JPEG — ver
//  `scripts/gen-email-photos.mjs`).
//
//  Empaquetado: leer de `public/` en runtime sólo funciona si el trace de la
//  ruta se lleva los PNG. Eso se declara en `next.config.ts`
//  (`outputFileTracingIncludes`); si se toca la ruta de estos archivos, hay que
//  tocarlo también.
// ─────────────────────────────────────────────────────────────────────────────

import { readFile } from "node:fs/promises";
import path from "node:path";

import { SITE_URL } from "@/lib/site";

/** Adjunto en línea con el nombre que espera la API de Resend. */
export interface InlineAttachment {
  filename: string;
  content: Buffer;
  content_id: string;
}

export interface EmailAssets {
  /** `src` listo para el `<img>`, dado un camino público (`/assets/email/x.png`). */
  src(publicPath: string): string;
  attachments: InlineAttachment[];
}

/**
 * `send` mete los binarios en el mensaje. `preview` los deja como rutas
 * relativas para poder abrir el correo en el navegador (`cid:` no significa
 * nada fuera de un cliente de correo).
 */
export type RenderMode = "send" | "preview";

/** El lambda se reutiliza entre envíos; el PNG no cambia dentro del deploy. */
const cache = new Map<string, Buffer | null>();

async function readAsset(publicPath: string): Promise<Buffer | null> {
  const cached = cache.get(publicPath);
  if (cached !== undefined) return cached;

  let buffer: Buffer | null = null;
  try {
    buffer = await readFile(path.join(process.cwd(), "public", publicPath));
  } catch (err) {
    // Ruidoso a propósito: si esto falla es un fallo de empaquetado, no del
    // envío. El correo sale igual apuntando a la URL del sitio.
    console.error("[email] no pude leer el asset", publicPath, err);
  }

  cache.set(publicPath, buffer);
  return buffer;
}

/** Los Content-ID tienen forma de dirección; el nombre del archivo basta. */
function contentId(publicPath: string): string {
  return `${path.basename(publicPath).replace(/[^\w.-]+/g, "-")}@conocerd.app`;
}

export async function loadEmailAssets(
  publicPaths: string[],
  mode: RenderMode = "send"
): Promise<EmailAssets> {
  if (mode === "preview") {
    return { src: (publicPath) => publicPath, attachments: [] };
  }

  const attachments: InlineAttachment[] = [];
  const srcs = new Map<string, string>();

  await Promise.all(
    publicPaths.map(async (publicPath) => {
      const content = await readAsset(publicPath);
      if (!content) return; // Se queda con la URL remota de más abajo.
      const cid = contentId(publicPath);
      attachments.push({ filename: path.basename(publicPath), content, content_id: cid });
      srcs.set(publicPath, `cid:${cid}`);
    })
  );

  return {
    src: (publicPath) => srcs.get(publicPath) ?? `${SITE_URL}${publicPath}`,
    attachments,
  };
}
