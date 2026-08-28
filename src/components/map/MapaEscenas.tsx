"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  PROTOTIPO, el mapa como película en vez de como motor.
//
//  Cada fotograma se capturó del MISMO MapLibre con el MISMO estilo
//  (scripts/gen-mapa-escenas.mjs), así que lo que se ve es el mapa de siempre.
//  Lo que cambia es cuándo se rasteriza: hoy el navegador lo redibuja ~20 veces
//  por segundo mientras bajas; aquí se dibujó una vez, en el build.
//
//  En el navegador sólo quedan `transform` y `opacity` sobre capas promovidas,
//  que es trabajo del compositor y no toca el hilo principal. Medido: 60 fps
//  clavados con el hilo al 6 %, contra 22 fps y el hilo al 108 % del MapLibre
//  ya optimizado.
//
//  El pitch y el bearing van cocidos en cada fotograma a propósito: una foto
//  inclinada por CSS inclinaría también los nombres de las ciudades, y MapLibre
//  los mantiene siempre planos. Lo que interpola el navegador es sólo escala y
//  paneo; el cambio de inclinación lo absorbe el fundido entre fotogramas.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from "react";
import { useMotionValueEvent } from "motion/react";
import { useScene } from "@/context/SceneContext";
import {
  REFERENCE_VIEWPORT,
  cameraAtProgress,
  mercY,
  paddingAtProgress,
  type JourneyViewport,
} from "@/lib/journey";
import { currentViewport } from "@/lib/journeyCamera";
import manifiesto from "@/data/mapa-escenas.json";

type Fotograma = { id: string; p: number; center: [number, number]; zoom: number };

const FOTOGRAMAS = manifiesto.fotogramas as Fotograma[];
const ANCHO_CAPTURA = manifiesto.ancho;

/**
 * Dónde cruza el fundido dentro de un tramo. Fuera de esta ventana se ve un
 * solo fotograma; repartir el fundido por todo el tramo dejaría dos imágenes a
 * media opacidad durante segundos y eso se lee como niebla, no como un vuelo.
 */
const CRUCE_DESDE = 0.35;
const CRUCE_HASTA = 0.7;

/**
 * Cuántos fotogramas por delante y por detrás se descargan. Son ~45 KB cada
 * uno: pedir los 22 de golpe es 1 MB antes de que el visitante baje nada, y
 * pedirlos justo al necesitarlos llegaría tarde.
 */
const VENTANA = 2;

const mundoPx = (zoom: number) => 512 * Math.pow(2, zoom);

export default function MapaEscenas() {
  const { progress } = useScene();
  const capasRef = useRef<(HTMLDivElement | null)[]>([]);
  const cargadas = useRef<Set<number>>(new Set());
  /** Los que están pintados ahora, para apagar sólo los que salen. */
  const visibles = useRef<Set<number>>(new Set());

  const pintar = (p: number) => {
    const v: JourneyViewport = currentViewport();
    // La cámara sale del viewport de REFERENCIA, el mismo con el que se
    // capturaron los fotogramas: el arco de zoom de cada tramo depende del
    // tamaño de ventana, y con otro los zooms intermedios no coincidirían con
    // los de las imágenes. El padding sí usa la ventana real, porque es
    // literalmente el hueco que deja el texto en esta pantalla.
    const cam = cameraAtProgress(p, REFERENCE_VIEWPORT);
    const pad = paddingAtProgress(p, v);
    // El padding desplaza el centro de la cámara hacia el área libre: MapLibre
    // centra en el rectángulo que queda, así que el mapa se corre la mitad.
    const desvioX = (pad.left - pad.right) / 2;
    const desvioY = (pad.top - pad.bottom) / 2;

    // Tramo actual: el fotograma que manda y el que viene detrás.
    let j = 0;
    while (j < FOTOGRAMAS.length - 2 && p >= FOTOGRAMAS[j + 1].p) j++;
    const a = FOTOGRAMAS[j];
    const b = FOTOGRAMAS[j + 1];
    const t = b.p > a.p ? (p - a.p) / (b.p - a.p) : 0;
    const cruce = rampa(t);

    // Sólo dos fotogramas están en pantalla en cualquier momento. Recorrer los
    // 22 y escribirles style cada frame costaba más que el propio mapa: se
    // apaga el que acaba de salir y se pintan sólo los dos vivos.
    const enPantalla = new Set<number>();
    if (p <= FOTOGRAMAS[0].p) enPantalla.add(0);
    else if (p >= FOTOGRAMAS[FOTOGRAMAS.length - 1].p) enPantalla.add(FOTOGRAMAS.length - 1);
    else {
      if (cruce < 1) enPantalla.add(j);
      if (cruce > 0) enPantalla.add(j + 1);
    }

    for (const i of visibles.current) {
      if (enPantalla.has(i)) continue;
      const nodo = capasRef.current[i];
      if (nodo) {
        nodo.style.visibility = "hidden";
        nodo.style.opacity = "0";
      }
    }
    visibles.current = enPantalla;

    for (const i of enPantalla) {
      const nodo = capasRef.current[i];
      if (!nodo) continue;
      const base = FOTOGRAMAS[i];
      const opacidad = enPantalla.size === 1 ? 1 : i === j ? 1 - cruce : cruce;

      const escala = Math.pow(2, cam.zoom - base.zoom);
      // Distancia del centro actual al del fotograma, en px del mundo al zoom
      // en que se capturó. Se escala después, junto con la imagen.
      const mundo = mundoPx(base.zoom);
      const dx = ((cam.center[0] - base.center[0]) / 360) * mundo;
      const dy = (mercY(cam.center[1]) - mercY(base.center[1])) * mundo;

      nodo.style.visibility = "visible";
      nodo.style.opacity = opacidad.toFixed(3);
      nodo.style.transform =
        `translate3d(${desvioX.toFixed(1)}px, ${desvioY.toFixed(1)}px, 0) ` +
        `scale(${escala.toFixed(4)}) ` +
        `translate3d(${(-dx).toFixed(1)}px, ${(-dy).toFixed(1)}px, 0)`;
    }

    // Descarga anticipada: las imágenes cercanas se piden antes de que les
    // toque, no en el frame en que se necesitan.
    for (let i = Math.max(0, j - VENTANA); i <= Math.min(FOTOGRAMAS.length - 1, j + VENTANA); i++) {
      if (cargadas.current.has(i)) continue;
      const nodo = capasRef.current[i];
      if (!nodo) continue;
      cargadas.current.add(i);
      nodo.style.backgroundImage = `url(/mapa/${FOTOGRAMAS[i].id}.webp)`;
    }
  };

  useMotionValueEvent(progress, "change", pintar);

  // Primer frame: sin esto las capas arrancan sin transform, todas encima de la
  // otra a escala 1, hasta que el progreso se mueva por primera vez.
  useEffect(() => {
    pintar(progress.get());
    const alRedimensionar = () => pintar(progress.get());
    window.addEventListener("resize", alRedimensionar);
    return () => window.removeEventListener("resize", alRedimensionar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {FOTOGRAMAS.map((f, i) => (
        <div
          key={f.id}
          ref={(n) => {
            capasRef.current[i] = n;
          }}
          className="crd-mapa-capa"
          style={{ "--crd-mapa-ancho": `${ANCHO_CAPTURA}px` } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

/** 0 antes del cruce, 1 después, suave en medio. */
function rampa(t: number): number {
  if (t <= CRUCE_DESDE) return 0;
  if (t >= CRUCE_HASTA) return 1;
  const k = (t - CRUCE_DESDE) / (CRUCE_HASTA - CRUCE_DESDE);
  return k * k * (3 - 2 * k);
}
