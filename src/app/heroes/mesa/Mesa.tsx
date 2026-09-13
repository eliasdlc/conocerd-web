"use client";

import { useState } from "react";
import Image from "next/image";
import Button from "@/components/Button";
import StampCRD from "@/components/StampCRD";
import { POLAROID_PAPER, PolaroidCaption, PolaroidMedia } from "@/components/Polaroid";
import { CATEGORY_META, FEATURED_DESTINATIONS, type Destination } from "@/data/destinations";
import s from "./estilos.module.css";

// ─────────────────────────────────────────────────────────────────────────────
//  Propuesta "Mesa de viaje": las polaroids del recorrido, tiradas sobre la
//  mesa antes de salir.
//
//  Es la pieza más reconocible de la marca (la polaroid con cinta que ya
//  recorre la home) puesta a hacer de primera pantalla. No hay foto de fondo ni
//  card encima: hay un tablero crema, cinco fotos reales con su cinta, el cuño
//  de equipaje y, a un lado, la nota que las acompaña (el titular y los CTA).
//
//  Interacción: señalar una polaroid la trae al frente y la levanta; la ficha
//  bajo el copy cuenta de qué lugar es. Al cargar, las fotos caen sobre la mesa
//  una detrás de otra y después nada se mueve.
// ─────────────────────────────────────────────────────────────────────────────

type Foto = {
  destino: Destination;
  /** Posición de la esquina superior izquierda, en % del tablero. */
  x: number;
  y: number;
  /** Ángulo con el que quedó sobre la mesa. */
  giro: number;
};

function destino(id: string): Destination {
  const d = FEATURED_DESTINATIONS.find((x) => x.id === id);
  if (!d) throw new Error(`Mesa: no existe el destino "${id}"`);
  return d;
}

/** Orden = orden en que caen sobre la mesa. La última cae encima. */
const FOTOS: Foto[] = [
  { destino: destino("aguilas"), x: 2, y: 2, giro: -7 },
  { destino: destino("duarte"), x: 56, y: 0, giro: 5 },
  { destino: destino("constanza"), x: 0, y: 54, giro: 4 },
  { destino: destino("charcos"), x: 60, y: 48, giro: 7 },
  { destino: destino("limon"), x: 28, y: 26, giro: -2 },
];

export default function Mesa() {
  // Pila de la mesa: la última es la que está encima. Señalar una foto la
  // mueve al final de la pila, como cogerla y volverla a soltar arriba.
  const [pila, setPila] = useState<string[]>(FOTOS.map((f) => f.destino.id));
  const frente = pila[pila.length - 1];
  const activa = FOTOS.find((f) => f.destino.id === frente) ?? FOTOS[FOTOS.length - 1];
  const meta = CATEGORY_META[activa.destino.category];

  const traer = (id: string) => {
    setPila((prev) => (prev[prev.length - 1] === id ? prev : [...prev.filter((x) => x !== id), id]));
  };

  return (
    <main className={s.escena}>
      {/* ── La nota junto a las fotos ── */}
      <section className={s.nota}>
        <Image
          src="/assets/logo.svg"
          alt="ConoceRD, descubre lo nuestro"
          width={1296}
          height={595}
          priority
          unoptimized
          className={`${s.logo} ${s.entra}`}
        />

        <h1
          className={`${s.titulo} ${s.entra}`}
          style={{ "--d": ".08s", fontVariationSettings: '"opsz" 96' } as React.CSSProperties}
        >
          Los lugares que <em className="crd-accent">sí</em> valen el viaje
        </h1>

        <p className={`${s.copy} ${s.entra}`} style={{ "--d": ".16s" } as React.CSSProperties}>
          Fotos de verdad, de gente de aquí. La app te arma la ruta entre ellas y te dice a quién
          comprarle en el camino.
        </p>

        <div className={`${s.acciones} ${s.entra}`} style={{ "--d": ".24s" } as React.CSSProperties}>
          <Button variant="primary" size="lg" icon="download" className="max-desk:h-12 max-desk:px-3.5 max-desk:text-sm">
            Descargar la app
          </Button>
          <Button variant="ghost" size="lg" icon="storefront" className="max-desk:h-12 max-desk:px-3.5 max-desk:text-sm">
            Soy un negocio
          </Button>
        </div>

        {/* Ficha de la foto que está encima: convierte el gesto en información. */}
        <p className={`${s.ficha} ${s.entra}`} style={{ "--d": ".32s" } as React.CSSProperties} aria-live="polite">
          <span className={s.fichaCategoria} style={{ color: meta.ink }}>
            {meta.label}
          </span>
          <span className={s.fichaNombre}>{activa.destino.name}</span>
          <span className={s.fichaDesc}>{activa.destino.desc}</span>
        </p>
      </section>

      {/* ── El tablero ── */}
      <div className={s.tablero}>
        {FOTOS.map((f, i) => {
          const d = f.destino;
          const cat = CATEGORY_META[d.category];
          const alFrente = frente === d.id;
          return (
            <figure
              key={d.id}
              className={s.foto}
              data-frente={alFrente ? "1" : undefined}
              style={
                {
                  "--x": `${f.x}%`,
                  "--y": `${f.y}%`,
                  "--giro": `${f.giro}deg`,
                  "--d": `${0.35 + i * 0.11}s`,
                  zIndex: pila.indexOf(d.id) + 1,
                } as React.CSSProperties
              }
            >
              <div className={`${POLAROID_PAPER} ${s.papel} relative`}>
                <PolaroidMedia
                  image={d.image}
                  alt={`${d.name}, ${d.province}`}
                  sizes="(max-width: 899px) 44vw, 22vw"
                  icon={cat.icon}
                  chip={d.tagline}
                  className={s.recorte}
                />
                <figcaption className="pb-3 pt-2.5 text-left">
                  <PolaroidCaption name={d.name} meta={d.meta} />
                </figcaption>
              </div>
              {/* El control cubre la foto entera: en táctil no hay hover, así
                  que tocar tiene que hacer lo mismo que pasar el ratón. */}
              <button
                type="button"
                className={s.control}
                aria-pressed={alFrente}
                aria-label={`Traer al frente: ${d.name}, ${d.province}`}
                onPointerEnter={(e) => e.pointerType === "mouse" && traer(d.id)}
                onFocus={() => traer(d.id)}
                onClick={() => traer(d.id)}
              />
            </figure>
          );
        })}

        {/* El cuño de equipaje, pegado a la mesa como en la maleta. */}
        <div className={`${s.cuño} ${s.cae}`} style={{ "--d": "1s" } as React.CSSProperties}>
          <StampCRD size={124} rotate={-12} />
        </div>
      </div>
    </main>
  );
}
