"use client";

import { useEffect, useState } from "react";
import { paddingAtProgress, SCENE_BANDS } from "@/lib/journey";
import { resolveCamera } from "@/data/destinations";
import { MOBILE_BREAKPOINT } from "@/hooks/useIsMobile";

// ─────────────────────────────────────────────────────────────────────────────
//  El disco que ocupa el sitio del globo mientras el mapa todavía no existe.
//
//  Medido con perfil de teléfono (393x852, 4G, CPU 4x): la página pinta a los
//  440 ms y el globo no aparece hasta los 2572. Son 2,1 segundos de crema vacía
//  en el sitio donde va el protagonista del hero, y ese hueco no se puede
//  cerrar acelerando: 1,4 de esos segundos son hidratar 1,05 MB de JS y evaluar
//  el chunk de MapLibre, que ocurren aunque la red fuera perfecta.
//
//  Así que el hueco se ocupa. El disco sale con el primer pintado, en el mismo
//  sitio y del mismo tamaño que va a tener el globo, y se desvanece cuando el
//  mapa aparece debajo.
//
//  Ni tamaño ni posición están escritos a mano: salen del keyframe del hero y
//  del padding de la cámara, los mismos que usa `journeyCamera` para encuadrar.
//  Si alguien cambia el zoom del hero, el disco lo sigue solo.
// ─────────────────────────────────────────────────────────────────────────────

type Caja = { diametro: number; cx: number; cy: number };

/**
 * El centro del globo es el centro de cámara, y MapLibre lo coloca en el centro
 * del área libre, o sea del viewport menos el padding: por eso en desktop el
 * globo va a la derecha y en móvil arriba. Verificado contra
 * `map.project(map.getCenter())` en seis viewports, coincide dentro de 1 px.
 *
 * El diámetro es otra historia. `512 · 2^zoom / π`, que es lo que dice el
 * comentario de `SCENE_CAMERAS`, describe el ancho del mundo en Mercator, no el
 * globo: se pasa entre un 8 % en móvil y un 22 % en escritorio, porque la
 * perspectiva encoge la esfera tanto más cuanto más llena el viewport. El
 * factor de corrección está ajustado contra seis medidas del globo real,
 * tomadas por diferencia de píxeles con `~/.cache/crd-perf/mapa/globo.mjs`:
 *
 *   formula  alto   medido   modelo
 *   334      780    308      308
 *   364      852    337      336
 *   399      932    368      368
 *   922      800    720      720
 *   922      900    747      743
 *   922     1080    771      774
 *
 * Peor error 0,5 %, invisible bajo un fundido de 500 ms. Si alguien sube
 * MapLibre y el globo cambia de tamaño, esto deja de cuadrar en silencio: se
 * vuelve a medir con ese script.
 */
function cajaDelGlobo(width: number, height: number): Caja {
  const mobile = width < MOBILE_BREAKPOINT;
  const v = { width, height, mobile };
  const cam = resolveCamera(SCENE_BANDS[0].camera, mobile, width);
  const pad = paddingAtProgress(0, v);

  const mercator = (512 * 2 ** cam.zoom) / Math.PI;
  // Cuánto del alto ocuparía el globo sin corregir: cuanto más llena, más lo
  // encoge la perspectiva.
  const llenado = mercator / height;
  const factor = Math.min(0.95, Math.max(0.7, 1.0065 - 0.1956 * llenado));

  return {
    diametro: mercator * factor,
    cx: (width + pad.left - pad.right) / 2,
    cy: (height + pad.top - pad.bottom) / 2,
  };
}

export default function DiscoDelGlobo({ visible }: { visible: boolean }) {
  const [caja, setCaja] = useState<Caja | null>(null);

  useEffect(() => {
    const medir = () => setCaja(cajaDelGlobo(window.innerWidth, window.innerHeight));
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, []);

  // Antes de la primera medida no se pinta nada: un disco en la posición
  // equivocada durante un frame se ve peor que ninguno.
  if (!caja) return null;

  return (
    <div
      aria-hidden="true"
      className="crd-globo-fantasma pointer-events-none absolute rounded-full"
      style={{
        width: caja.diametro,
        height: caja.diametro,
        left: caja.cx - caja.diametro / 2,
        top: caja.cy - caja.diametro / 2,
        opacity: visible ? 1 : 0,
      }}
    />
  );
}
