"use client";

import { useMemo, useState } from "react";
import GloboHero from "../_components/GloboHero";
import CapaPines from "./CapaPines";
import { CintaContext } from "./estado";
import Overlay from "./Overlay";
import s from "./estilos.module.css";

export default function Cinta() {
  const [activo, setActivo] = useState<string | null>(null);
  const valor = useMemo(() => ({ activo, setActivo }), [activo]);

  return (
    <CintaContext.Provider value={valor}>
      <main>
        <GloboHero
          // El globo se corre a la derecha lo justo para dejar la columna
          // editorial libre arriba a la izquierda; en móvil sube a la mitad
          // superior y la cinta se apoya en su borde.
          encuadre={{ padLeft: 0.34, padBottom: 0.62 }}
          alturaVh={260}
          className={s.escena}
          capasDelMapa={<CapaPines />}
        >
          <Overlay />
        </GloboHero>
      </main>
    </CintaContext.Provider>
  );
}
