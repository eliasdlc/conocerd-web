"use client";

import { useState } from "react";
import Image from "next/image";

import Button from "@/components/Button";
import Icon from "@/components/Icon";
import { CATEGORY_META } from "@/data/destinations";
import { PIEZAS } from "./piezas";
import styles from "./estilos.module.css";

// ─── Mosaico vivo ─────────────────────────────────────────────────────────────
//
// La primera pantalla ES el mosaico: no hay foto de fondo con una caja encima.
// El bloque de marca ocupa una celda más de la rejilla, del mismo tamaño que
// las piezas grandes, y las fotos lo rodean por los tres lados restantes.
//
// Interacción: señalar una pieza (mouse, dedo o teclado) la agranda, atenúa las
// demás y actualiza la ficha del bloque de copy con el dato real del destino.
// Nada se mueve por su cuenta: la cascada de entrada corre una vez y se para.

export default function Mosaico() {
  // Arranca en la pieza insignia para que la ficha nunca esté vacía.
  const [activa, setActiva] = useState(PIEZAS[0].id);
  const destino = PIEZAS.find((p) => p.id === activa) ?? PIEZAS[0];
  const meta = CATEGORY_META[destino.category];

  return (
    <main className={styles.escena}>
      <div className={styles.rejilla}>
        {/* ── Bloque de marca y propuesta ── */}
        <section className={styles.copy} style={{ "--d": "60ms" } as React.CSSProperties}>
          <div className={styles.cabecera}>
            {/* El logo es la marca; el h1 va escrito debajo, así que la imagen
                sólo necesita el nombre. */}
            <Image
              src="/assets/logo.svg"
              alt="ConoceRD"
              width={1296}
              height={595}
              priority
              unoptimized
              className={styles.logo}
            />

            <h1 className={styles.titulo} style={{ fontVariationSettings: '"opsz" 96' }}>
              El país entero,
              <br />
              <em className="crd-accent">pieza por pieza</em>
            </h1>

            <p className={styles.entrada}>
              Cada pieza es un lugar de verdad, con gente detrás. La app te dice cómo llegar, qué
              hacer y a quién comprarle en el camino.
            </p>
          </div>

          <div className={styles.acciones}>
            <Button variant="primary" size="lg" icon="download" className="max-desk:h-12 max-desk:px-3.5 max-desk:text-sm">
              Descargar la app
            </Button>
            <Button variant="ghost" size="lg" icon="storefront" className="max-desk:h-12 max-desk:px-3.5 max-desk:text-sm">
              Soy un negocio
            </Button>
          </div>

          {/* Ficha viva: cambia con la pieza señalada. */}
          <p className={styles.ficha} style={{ "--cat": meta.color, "--cat-ink": meta.ink } as React.CSSProperties}>
            <span className={styles.fichaCategoria}>
              <Icon name={meta.icon} className="text-[13px]" />
              {meta.label}
            </span>
            <span className={styles.fichaNombre}>
              {destino.name}
              {destino.province !== destino.name && (
                <span className={styles.fichaProvincia}>{destino.province}</span>
              )}
            </span>
            <span className={styles.fichaDesc}>{destino.desc}</span>
            <span className={styles.fichaRating}>
              <Icon name="star" className="text-[13px]" />
              {destino.rating.toFixed(1).replace(".", ",")}
              <span className="sr-only"> de valoración</span>
            </span>
          </p>
        </section>

        {/* ── Piezas: rejilla en desktop, carrusel con snap en móvil ── */}
        <div className={styles.carril}>
          {PIEZAS.map((pieza, i) => {
            const cat = CATEGORY_META[pieza.category];
            const seleccionada = pieza.id === activa;

            return (
              <button
                key={pieza.id}
                type="button"
                aria-pressed={seleccionada}
                className={styles.pieza}
                style={{ "--cat": cat.color, "--d": `${120 + i * 70}ms` } as React.CSSProperties}
                onMouseEnter={() => setActiva(pieza.id)}
                onFocus={() => setActiva(pieza.id)}
                onClick={() => setActiva(pieza.id)}
              >
                <span className={styles.marco}>
                  <Image
                    src={pieza.image}
                    alt={`${pieza.name}, ${pieza.province}`}
                    fill
                    sizes={pieza.sizes}
                    priority={i === 0}
                    className={styles.foto}
                  />
                  <span aria-hidden="true" className={styles.velo} />
                  <span className={styles.etiqueta}>
                    <span className={styles.categoria}>
                      <Icon name={cat.icon} className={styles.categoriaIcono} />
                      {cat.label}
                    </span>
                    <span className={styles.nombre}>{pieza.name}</span>
                    {/* Santiago es destino y provincia a la vez: repetirlo en
                        dos líneas se lee como un fallo, no como un dato. */}
                    {pieza.province !== pieza.name && (
                      <span className={styles.provincia}>{pieza.province}</span>
                    )}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}
