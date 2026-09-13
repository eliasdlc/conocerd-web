"use client";

import { useEffect, useRef } from "react";
import { useMap } from "@/components/map/context";
import { montarCapasNasa, type CapasNasa } from "@/sections/espacio/capasNasa";
import { useDescenso } from "../_components/GloboHero";

/**
 * Las capas de la NASA sobre el globo del banco. El mapa llega ya cargado (el
 * contexto se monta tras `load`); el descenso viene del estado de GloboHero.
 * El estilo del banco no recorta etiquetas por zoom, así que aquí se apagan.
 */
export default function Espacio() {
  const map = useMap();
  const { t } = useDescenso();
  const capas = useRef<CapasNasa | null>(null);

  useEffect(() => {
    if (!map) return;
    capas.current = montarCapasNasa(map, { etiquetas: true });
    return () => {
      capas.current?.desmontar();
      capas.current = null;
    };
  }, [map]);

  useEffect(() => {
    capas.current?.pintar(t);
  }, [t]);

  return null;
}
