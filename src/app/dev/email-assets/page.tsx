import { notFound } from "next/navigation";

import StampCRD from "@/components/StampCRD";
import { EMAIL_ASSET_PX, EMAIL_STAMPS } from "@/lib/email/stamps";

// ─────────────────────────────────────────────────────────────────────────────
//  Banco de imágenes de los correos, sólo en desarrollo.
//
//  Los clientes de correo no pintan SVG (Gmail lo tira, Outlook ni lo intenta),
//  así que el sello y el logo viajan como PNG. Esta página los dibuja con los
//  MISMOS componentes y assets que el sitio, y `scripts/gen-email-assets.mjs`
//  la abre con Chromium y fotografía cada `[data-asset]`. Así el correo no
//  puede quedarse con una versión vieja del sello: se regenera desde la fuente.
//
//  Fondo transparente a propósito: el PNG se pega luego sobre el crema del
//  correo, y un rectángulo blanco alrededor del sello se vería.
// ─────────────────────────────────────────────────────────────────────────────

export default function EmailAssetsDevPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main style={{ display: "flex", flexWrap: "wrap", gap: 40, padding: 40, alignItems: "flex-start" }}>
      {/* `omitBackground` de Puppeteer sólo funciona si NADA pinta un fondo:
          el crema que globals.css pone en el body dejaría un rectángulo opaco
          alrededor del sello al pegarlo en el correo. */}
      <style>{"html,body{background:transparent!important}"}</style>

      {/* El logo principal, reducido al tamaño real del correo. */}
      <figure style={{ margin: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- la foto la
            toma Chromium sobre el archivo original; next/image serviría un
            derivado optimizado y perdería el control del tamaño exacto. */}
        <img
          data-asset="logo"
          src="/assets/logo.png"
          alt="ConoceRD"
          width={EMAIL_ASSET_PX.logoWidth}
          style={{ display: "block", height: "auto" }}
        />
        <figcaption style={{ fontFamily: "monospace", fontSize: 12 }}>logo</figcaption>
      </figure>

      {EMAIL_STAMPS.map((s) => (
        <figure key={s.slug} style={{ margin: 0, textAlign: "center" }}>
          {/* El giro se hornea en el PNG: el correo no tiene transforms CSS. El
              contenedor tiene tamaño fijo para que la foto salga siempre del
              mismo lado (Puppeteer recorta por la caja del elemento, que no
              cambia con el `transform` del hijo) y como el cuño es un círculo
              inscrito en el viewBox, girarlo no lo saca de la caja. */}
          <div
            data-asset={`sello-${s.slug}`}
            style={{
              width: EMAIL_ASSET_PX.stampBox,
              height: EMAIL_ASSET_PX.stampBox,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <StampCRD
              size={EMAIL_ASSET_PX.stampSize}
              rotate={s.rotate}
              color={s.color}
              accent={s.accent}
              accent2={s.accent2}
              line1={s.line1}
              line2={s.line2}
            />
          </div>
          <figcaption style={{ fontFamily: "monospace", fontSize: 12 }}>sello-{s.slug}</figcaption>
        </figure>
      ))}
    </main>
  );
}
