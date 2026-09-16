// ─────────────────────────────────────────────────────────────────────────────
//  El pase de embarque: la imagen que WhatsApp enseña al pegar `/ruta/<slug>`.
//
//  Satori (next/og) sólo maqueta flexbox y un subconjunto de CSS, de ahí el
//  `display: flex` en cada caja y la isla como SVG en línea. Izquierda, el
//  documento: marca, "TU RUTA", el nombre del viaje y las paradas en orden.
//  Derecha, el talón troquelado: la silueta de la isla con la ruta en coral y
//  los totales por carretera, que salen de la misma matriz que el itinerario.
//
//  Las paradas van unidas por cuerda recta y no por la carretera: la geometría
//  de los tramos pesa 547 KB y a este tamaño la diferencia no se ve.
// ─────────────────────────────────────────────────────────────────────────────

/* eslint-disable @next/next/no-img-element -- satori sólo sabe de <img>. */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { DESTINATIONS } from "@/data/destinations";
import contorno from "@/data/rd-contorno.json";
import { contarParadas, nombreDeRuta } from "@/lib/ruta/slug";
import { duracion, totalesDeRuta } from "@/lib/ruta/totales";
import { OG_SIZE, loadOgFonts } from "@/lib/og";

export { OG_SIZE, loadOgFonts };

const INK = "#0F1A2E";
const INK_3 = "#3B5073";
const CREAM = "#FDF8F0";
const CREAM_2 = "#F5EFE2";
const CORAL = "#E0552F";
const CORAL_INK = "#B23410";
const MINT = "#25CCB8";
const MINT_INK = "#0C6A60";
const MUTED = "#677080";
const LINE = "#D9D2C1";

// ─── La isla ─────────────────────────────────────────────────────────────────

const BBOX = { oeste: -72.1, este: -68.2, sur: 17.4, norte: 20.05 };
const MAPA = { ancho: 420, alto: 300 };
const K = Math.cos((18.7 * Math.PI) / 180);

function proyectar([lon, lat]: readonly [number, number]): [number, number] {
  const x = ((lon - BBOX.oeste) / (BBOX.este - BBOX.oeste)) * MAPA.ancho;
  // El alto que corresponde a la latitud con el coseno del centro, centrado
  // en la caja: la isla no se estira ni se aplasta.
  const altoGeo = (MAPA.ancho * (BBOX.norte - BBOX.sur)) / ((BBOX.este - BBOX.oeste) * K);
  const y = ((BBOX.norte - lat) / (BBOX.norte - BBOX.sur)) * altoGeo + (MAPA.alto - altoGeo) / 2;
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}

const ISLA = "M" + (contorno as [number, number][]).map((p) => proyectar(p).join(" ")).join(" L") + " Z";

function svgIsla(ids: readonly string[]): string {
  const puntos = ids
    .map((id) => DESTINATIONS.find((d) => d.id === id)?.coords)
    .filter((c): c is [number, number] => Boolean(c))
    .map(proyectar);
  const ruta = puntos.map((p) => p.join(" ")).join(" L");
  const pines = puntos
    .map(([x, y], i) => {
      const color = i === puntos.length - 1 ? MINT : CORAL;
      return `<circle cx="${x}" cy="${y}" r="9" fill="${color}" stroke="#fff" stroke-width="3.5"/>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${MAPA.ancho}" height="${MAPA.alto}" viewBox="0 0 ${MAPA.ancho} ${MAPA.alto}">
    <path d="${ISLA}" fill="#EFE8D8" stroke="${LINE}" stroke-width="1.5"/>
    <path d="M${ruta}" fill="none" stroke="${CORAL}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="10 9"/>
    ${pines}
  </svg>`;
}

// ─── El pase ─────────────────────────────────────────────────────────────────

async function logo() {
  const buf = await readFile(join(process.cwd(), "assets/og", "logo.png"));
  return `data:image/png;base64,${buf.toString("base64")}`;
}

export async function PaseDeEmbarque({ ids }: { ids: readonly string[] }) {
  const nombre = nombreDeRuta(ids);
  const totales = totalesDeRuta(ids);
  const paradas = ids.map((id) => DESTINATIONS.find((d) => d.id === id)?.name ?? id);
  const isla = `data:image/svg+xml;utf8,${encodeURIComponent(svgIsla(ids))}`;
  const marca = await logo();
  // Con muchas paradas la lista baja de cuerpo para no salirse del pase.
  const cuerpo = paradas.length > 5 ? 22 : 27;

  return (
    <div
      style={{
        width: OG_SIZE.width,
        height: OG_SIZE.height,
        display: "flex",
        background: CREAM_2,
        padding: 48,
        fontFamily: "Plus Jakarta Sans",
      }}
    >
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: CREAM,
          borderRadius: 28,
          boxShadow: "0 18px 50px rgba(38,70,83,.12)",
          overflow: "hidden",
        }}
      >
        {/* El documento */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "40px 40px 36px 48px" }}>
          <img src={marca} width={210} height={100} style={{ marginLeft: -8 }} alt="" />
          <div style={{ display: "flex", marginTop: 14, fontSize: 16, fontWeight: 800, letterSpacing: 3, color: CORAL_INK }}>
            TU RUTA · {contarParadas(ids.length).toUpperCase()}
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: "Bricolage Grotesque",
              fontSize: 60,
              fontWeight: 800,
              letterSpacing: -2,
              lineHeight: 1,
              color: INK,
              marginTop: 8,
            }}
          >
            {nombre}
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 22, gap: 9 }}>
            {paradas.map((p, i) => (
              <div key={p} style={{ display: "flex", alignItems: "center", fontSize: cuerpo, fontWeight: 600, color: INK_3 }}>
                <div
                  style={{
                    display: "flex",
                    width: 13,
                    height: 13,
                    borderRadius: 99,
                    background: i === paradas.length - 1 ? MINT : CORAL,
                    marginRight: 14,
                  }}
                />
                {p}
              </div>
            ))}
          </div>
        </div>

        {/* El talón */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: 460,
            padding: "32px 40px 32px 32px",
            borderLeft: `2px dashed ${LINE}`,
          }}
        >
          <img src={isla} width={MAPA.ancho} height={MAPA.alto} alt="" />
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontFamily: "Bricolage Grotesque", fontSize: 54, fontWeight: 800, letterSpacing: -2, lineHeight: 1, color: INK }}>
                {totales.km} km
              </div>
              <div style={{ display: "flex", marginTop: 8, fontSize: 15, fontWeight: 800, letterSpacing: 2, color: MUTED }}>
                {duracion(totales.min).toUpperCase()} MANEJANDO
              </div>
            </div>
            <div
              style={{
                display: "flex",
                padding: "10px 18px",
                borderRadius: 999,
                background: "#C6F3EB",
                color: MINT_INK,
                fontSize: 15,
                fontWeight: 800,
                letterSpacing: 1.5,
              }}
            >
              CONOCERD.APP
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
