// ─────────────────────────────────────────────────────────────────────────────
//  El código de fundador.
//
//  Qué problema resuelve. La insignia de fundador se promete hoy y se entrega
//  cuando la app abra, en otro producto y probablemente con otra base de datos.
//  Entre una cosa y la otra hace falta algo que la persona guarde y que nosotros
//  podamos comprobar sin fiarnos de su palabra.
//
//  Cómo se hace imposible de falsificar. El código NO es aleatorio: es una firma
//  (HMAC-SHA256) del correo y del número de fundador con un secreto que sólo
//  vive en el servidor. Eso da tres propiedades que un token al azar no da:
//
//   · No se puede fabricar. Sin el secreto, acertar los 40 bits de firma es 1
//     entre 1.1 billones, y el canje va con límite de intentos.
//   · No hay que guardarlo. Se vuelve a derivar del correo cuando haga falta:
//     reenviar el correo devuelve EL MISMO código, y si algún día se filtra la
//     base de datos, los códigos no están ahí porque no se guardan.
//   · Se verifica sin base de datos. Quien reciba el canje —la app, un script,
//     otro servicio— sólo necesita el secreto: no tiene que consultar Neon ni
//     exportar la lista.
//
//  Qué NO resuelve, y hay que decirlo claro: el código es al portador. Quien lo
//  tenga puede canjearlo, así que quien lo publique en una historia de Instagram
//  está regalando su insignia. Por eso el correo dice que no se comparte, y por
//  eso el canje debe ser de un solo uso y quedar atado a la primera cuenta que
//  lo use. La prueba de que alguien es fundador sigue siendo el registro en la
//  lista; el código es la llave que lo hace portátil.
//
//  El secreto (`FOUNDER_SECRET`) no se rota NUNCA: rotarlo invalida de golpe
//  todos los códigos que ya se mandaron.
// ─────────────────────────────────────────────────────────────────────────────

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Base32 de Crockford: sin I, L, O ni U. La gente va a copiar este código a
 * mano desde el correo y a dictarlo por teléfono; el alfabeto normal confunde
 * el 1 con la I y el 0 con la O, y la U aparece en palabras que no queremos.
 */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** 8 caracteres = 40 bits de firma. */
const MAC_CHARS = 8;

/** Prefijo de marca; `F` marca el número de fundador. */
const PREFIX = "CRD";

function secret(): string | null {
  return process.env.FOUNDER_SECRET || null;
}

function encode(bytes: Buffer, chars: number): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
      if (out.length === chars) return out;
    }
  }
  return out;
}

/** La firma de este par (número, correo). El correo va normalizado por el
 *  esquema del formulario, pero se repite aquí: la firma no puede depender de
 *  que quien llame se acuerde. */
function sign(number: number, email: string, key: string): string {
  const mac = createHmac("sha256", key).update(`${number}:${email.trim().toLowerCase()}`).digest();
  return encode(mac, MAC_CHARS);
}

/**
 * El código tal como se enseña: `CRD-F137-K7M4-9QXT`.
 *
 * Devuelve `null` sin `FOUNDER_SECRET`. Un código firmado con un secreto de
 * mentira es peor que no tener código: se manda, la persona lo guarda, y el día
 * del canje no vale nada.
 */
export function founderCode(number: number, email: string): string | null {
  const key = secret();
  if (!key) return null;
  const mac = sign(number, email, key);
  return `${PREFIX}-F${number}-${mac.slice(0, 4)}-${mac.slice(4)}`;
}

/**
 * Deja el código como lo escribimos nosotros. La gente lo va a teclear con
 * espacios, en minúsculas, sin guiones o con la O y la I que Crockford
 * sustituye — todo eso es el mismo código.
 */
export function normalizeFounderCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "")
    .replace(/[IL]/g, "1")
    .replace(/O/g, "0");
}

export type FounderCheck =
  | { ok: true; number: number }
  | { ok: false; reason: "malformed" | "invalid" | "unconfigured" };

/**
 * ¿Este código es nuestro y es de este correo?
 *
 * Comparación en tiempo constante: la diferencia de milisegundos entre "falló
 * en el primer carácter" y "falló en el último" es suficiente para adivinar la
 * firma carácter a carácter.
 */
export function verifyFounderCode(code: string, email: string): FounderCheck {
  const key = secret();
  if (!key) return { ok: false, reason: "unconfigured" };

  const parsed = normalizeFounderCode(code).match(
    new RegExp(`^${PREFIX}F(\\d+)([0-9A-Z]{${MAC_CHARS}})$`)
  );
  if (!parsed) return { ok: false, reason: "malformed" };

  const number = Number(parsed[1]);
  if (!Number.isSafeInteger(number) || number <= 0) return { ok: false, reason: "malformed" };

  const expected = Buffer.from(normalizeFounderCode(sign(number, email, key)));
  const given = Buffer.from(parsed[2]);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return { ok: false, reason: "invalid" };
  }
  return { ok: true, number };
}
