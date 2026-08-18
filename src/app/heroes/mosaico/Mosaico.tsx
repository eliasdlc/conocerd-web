"use client";

import { useState } from "react";
import Image from "next/image";

import Button from "@/components/Button";
import Icon from "@/components/Icon";
import { CATEGORY_META } from "@/data/destinations";
import { PIEZAS, TOTAL_LUGARES, TOTAL_PROVINCIAS } from "./piezas";
import styles from "./estilos.module.css";

// ─── Mosaico vivo ─────────────────────────────────────────────────────────────
//
// La primera pantalla ES el mosaico: no hay foto de fondo con una caja encima.
// El bloque de marca ocupa una celda más de la rejilla, del mismo tamaño que
// las piezas grandes, y las fotos lo rodean por los cuatro lados.
//
// Interacción: señalar una pieza (mouse, dedo o teclado) la agranda, atenúa las
// demás y actualiza la ficha del bloque de copy con el dato real del destino.
// Nada se mueve por su cuenta: la cascada de entrada corre una vez y se para.

export default function Mosaico() {
  // Arranca en la pieza insignia para que la ficha nunca esté vacía.
  const [activa, setActiva] = useState(PIEZAS[0].id);
  const destino = PIEZAS.find((p) => p.id === activa) ?? PIEZAS[0];
  const meta = CATEGORY_META[destino.category];

  const maqueta = () => {
    /* Maqueta de revisión: los CTA no navegan a ningún sitio todavía. */
  };

  return (
    <main className={styles.escena}>
      <div className={styles.rejilla}>
        {/* ── Bloque de marca y propuesta ── */}
        <section className={styles.copy} style={{ "--d": "60ms" } as React.CSSProperties}>
          <div className={styles.cabecera}>
            <p className={styles.kicker}>
              <span aria-hidden="true" className={styles.kickerPunto} />
              {TOTAL_LUGARES} lugares · {TOTAL_PROVINCIAS} provincias
              {/* La coletilla no cabe en 360px sin partir el sello en dos. */}
              <span className="max-desk:hidden"> · una sola ruta</span>
            </p>

            {/* El logo es la marca; el h1 va escrito debajo, así que la imagen
                sólo necesita el nombre. */}
            <Image
              src="/assets/logo.png"
              alt="ConoceRD"
              width={760}
              height={363}
              priority
              sizes="(max-width: 899px) 140px, min(17vw, 244px)"
              className={styles.logo}
            />

            <h1 className={styles.titulo}>
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
            <Button
              variant="primary"
              size="lg"
              icon="download"
              onClick={maqueta}
              className="max-desk:h-12 max-desk:px-3.5 max-desk:text-sm"
            >
              Descargar la app
            </Button>
            <Button
              variant="outline"
              size="lg"
              icon="storefront"
              onClick={maqueta}
              className="max-desk:h-12 max-desk:px-3.5 max-desk:text-sm"
            >
              Soy un negocio
            </Button>
          </div>

          {/* Ficha viva: cambia con la pieza señalada. */}
          <p className={styles.ficha} style={{ "--cat": meta.color } as React.CSSProperties}>
            <span className={styles.fichaRotulo}>Ahora mirando</span>
            <span className={styles.fichaNombre}>
              <span aria-hidden="true" className={styles.fichaPunto} />
              {destino.name}
              {destino.province !== destino.name && ` · ${destino.province}`}
            </span>
            <span className={styles.fichaDesc}>{destino.desc}</span>
            <span className={styles.fichaRating}>
              <span aria-hidden="true">★ </span>
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

        {/* ── Pista de que la página sigue ── */}
        <button
          type="button"
          onClick={maqueta}
          className={styles.cue}
          style={{ "--d": "560ms" } as React.CSSProperties}
        >
          <span aria-hidden="true" className={styles.cueMini}>
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
          <span className={styles.cueRotulo}>El recorrido</span>
          <span className={styles.cueTexto}>
            Sigue bajando
            <span aria-hidden="true" className={styles.cueFlecha}>
              <Icon name="arrow_downward" />
            </span>
          </span>
        </button>
      </div>
    </main>
  );
}
