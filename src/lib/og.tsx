// ─────────────────────────────────────────────────────────────────────────────
//  Tarjeta compartida de las imágenes Open Graph (audit 5.5).
//
//  La waitlist se difunde por WhatsApp e Instagram: la preview del enlace es la
//  primera impresión del sitio, antes que ninguna otra pantalla. Se dibuja con
//  satori (`next/og`), que sólo entiende flexbox y un subconjunto de CSS — de
//  ahí que cada contenedor lleve `display: flex` explícito y que el decorado
//  (manchas de color + ruta punteada) viaje como un SVG inline en vez de varios
//  divs con gradientes.
//
//  Las fuentes y las fotos se leen del disco en `assets/og/`, no de la red: la
//  imagen se prerenderiza en el build y una dependencia de red ahí es un fallo
//  de despliegue esperando su turno. Los .ttf son obligatorios — satori no lee
//  woff2, que es lo que sirve next/font.
// ─────────────────────────────────────────────────────────────────────────────

/* eslint-disable @next/next/no-img-element --
   satori no ejecuta React ni next/image: sólo sabe maquetar <img> con la fuente
   ya resuelta a data URI. La regla no aplica dentro de una ImageResponse. */

import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const INK = "#0F1A2E";
const INK_2 = "#090F1B";
const CREAM = "#FDF8F0";
const CORAL = "#E0552F";
const CORAL_INK = "#B23410";
const MANGO = "#FF8D16";
const MUTED = "#677080";

/** Las tres polaroids del deck que mejor resumen el país: playa, cascada, río. */
const PHOTOS = [
  { file: "photo-aguilas.jpg", name: "Bahía de las Águilas", meta: "Pedernales · 17.88°N" },
  { file: "photo-limon.jpg", name: "Salto El Limón", meta: "Samaná · 40 m" },
  { file: "photo-charcos.jpg", name: "27 Charcos", meta: "Puerto Plata · Damajagua" },
] as const;

const asset = (file: string) => join(process.cwd(), "assets/og", file);

async function dataUri(file: string, mime: string) {
  const buf = await readFile(asset(file));
  return `data:${mime};base64,${buf.toString("base64")}`;
}

/** Fondo: crema, tres manchas de la paleta y la ruta coral punteada del mapa. */
const BACKDROP = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <radialGradient id="mint"><stop offset="0" stop-color="#25CCB8" stop-opacity=".24"/><stop offset="1" stop-color="#25CCB8" stop-opacity="0"/></radialGradient>
      <radialGradient id="mango"><stop offset="0" stop-color="#FF8D16" stop-opacity=".22"/><stop offset="1" stop-color="#FF8D16" stop-opacity="0"/></radialGradient>
      <radialGradient id="coral"><stop offset="0" stop-color="${CORAL}" stop-opacity=".18"/><stop offset="1" stop-color="${CORAL}" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="1200" height="630" fill="${CREAM}"/>
    <circle cx="90" cy="90" r="300" fill="url(#mint)"/>
    <circle cx="1130" cy="600" r="330" fill="url(#mango)"/>
    <circle cx="700" cy="20" r="260" fill="url(#coral)"/>
    <path d="M-30 546 C 210 512 286 372 512 352 S 892 250 1240 128" fill="none" stroke="${CORAL}" stroke-width="5" stroke-linecap="round" stroke-dasharray="1 16" opacity=".55"/>
    <circle cx="512" cy="352" r="7" fill="${CORAL}" opacity=".7"/>
    <circle cx="1006" cy="176" r="7" fill="${CORAL}" opacity=".7"/>
  </svg>`
)}`;

// Dos familias y dos roles, los mismos del sitio: la de titular para el titular
// y las cifras, la de etiqueta para todo lo demás. Salieron JetBrains Mono, que
// dejó el sistema, y Caveat, que baja a un solo uso en todo el producto — la
// firma del dorso de la polaroid del equipo, que no aparece en esta tarjeta.
export async function loadOgFonts() {
  const [display, label, labelSemi] = await Promise.all([
    readFile(asset("BricolageGrotesque-ExtraBold.ttf")),
    readFile(asset("PlusJakartaSans-ExtraBold.ttf")),
    readFile(asset("PlusJakartaSans-SemiBold.ttf")),
  ]);
  return [
    { name: "Bricolage Grotesque", data: display, weight: 800 as const, style: "normal" as const },
    { name: "Plus Jakarta Sans", data: label, weight: 800 as const, style: "normal" as const },
    { name: "Plus Jakarta Sans", data: labelSemi, weight: 600 as const, style: "normal" as const },
  ];
}

/** Posición y giro de cada polaroid del abanico derecho. El escalonado deja
    los pies manuscritos a la vista: son el mejor momento tipográfico del sitio
    y taparlos con la carta siguiente arruina la mitad de la tarjeta. */
const FAN = [
  { left: 636, top: 52, rotate: -6 },
  { left: 916, top: 128, rotate: 5 },
  { left: 660, top: 340, rotate: 2 },
];

export interface OgCardProps {
  /** Overline de expedición, en la familia de etiqueta. */
  eyebrow: string;
  /** Dos líneas: el salto es explícito para que no dependa del ancho del glifo. */
  title: [string, string];
  subtitle: string;
  /** Píldora mango con el texto de acción. */
  badge: string;
}

export async function OgCard({ eyebrow, title, subtitle, badge }: OgCardProps) {
  const [logo, ...photos] = await Promise.all([
    dataUri("logo.png", "image/png"),
    ...PHOTOS.map((p) => dataUri(p.file, "image/jpeg")),
  ]);

  return (
    <div
      style={{
        width: OG_SIZE.width,
        height: OG_SIZE.height,
        display: "flex",
        position: "relative",
        background: CREAM,
        fontFamily: "Plus Jakarta Sans",
      }}
    >
      <img src={BACKDROP} width={OG_SIZE.width} height={OG_SIZE.height} style={{ position: "absolute", top: 0, left: 0 }} alt="" />

      {/* Columna de marca */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          width: 648,
          height: "100%",
          padding: "0 40px 0 68px",
        }}
      >
        <img src={logo} width={356} height={170} style={{ marginLeft: -10 }} alt="" />

        <div
          style={{
            display: "flex",
            marginTop: 22,
            fontSize: 15,
            fontWeight: 800,
            letterSpacing: 2.2,
            // El coral vivo como texto sobre crema da 2.76:1; la tinta coral
            // da 5.86:1 y es la que vale para texto de color sobre claro.
            color: CORAL_INK,
          }}
        >
          {eyebrow}
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: 12 }}>
          {title.map((line) => (
            <div
              key={line}
              style={{
                fontFamily: "Bricolage Grotesque",
                fontSize: 46,
                fontWeight: 800,
                color: INK,
                letterSpacing: -1.4,
                lineHeight: 1.12,
              }}
            >
              {line}
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 16,
            maxWidth: 468,
            fontSize: 20,
            fontWeight: 600,
            lineHeight: 1.45,
            color: MUTED,
          }}
        >
          {subtitle}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            alignSelf: "flex-start",
            marginTop: 26,
            padding: "13px 24px",
            borderRadius: 999,
            background: MANGO,
            color: INK_2,
            fontSize: 20,
            fontWeight: 800,
            boxShadow: "0 6px 18px rgba(38,70,83,.14)",
          }}
        >
          {badge}
        </div>
      </div>

      {/* Abanico de polaroids */}
      {PHOTOS.map((photo, i) => (
        <div
          key={photo.file}
          style={{
            position: "absolute",
            left: FAN[i].left,
            top: FAN[i].top,
            display: "flex",
            flexDirection: "column",
            width: 236,
            padding: "12px 12px 0",
            borderRadius: 6,
            background: "#FFFDF7",
            boxShadow: "0 10px 30px rgba(38,70,83,.08)",
            transform: `rotate(${FAN[i].rotate}deg)`,
          }}
        >
          <img src={photos[i]} width={212} height={159} style={{ borderRadius: 3 }} alt="" />
          {/* El pie de la polaroid deja la manuscrita, como en el sitio: el
              nombre va en la familia de titular. */}
          <div
            style={{
              display: "flex",
              fontFamily: "Bricolage Grotesque",
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: -0.4,
              color: INK,
              marginTop: 8,
            }}
          >
            {photo.name}
          </div>
          <div style={{ display: "flex", fontSize: 11, fontWeight: 600, color: MUTED, marginTop: 2, marginBottom: 14 }}>
            {photo.meta}
          </div>
        </div>
      ))}
    </div>
  );
}
