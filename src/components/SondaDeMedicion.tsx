"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
import { midiendo } from "@/lib/medicion";

// El panel de medición se carga aparte y sólo cuando la URL trae `?medir=1`:
// para cualquier visitante normal su chunk no existe en el grafo de la home.
//
// La decisión se lee con `useSyncExternalStore` y no en el render: el servidor
// no ve la query, así que leerla directamente daría un árbol distinto en el
// servidor y en el cliente. El snapshot del servidor es siempre `false`, y el
// del cliente no cambia nunca durante la vida de la página, así que no hace
// falta suscribirse a nada.
const Panel = dynamic(() => import("@/components/PanelDeMedicion"), { ssr: false });

const sinCambios = () => () => {};

export default function SondaDeMedicion() {
  const activa = useSyncExternalStore(sinCambios, midiendo, () => false);
  return activa ? <Panel /> : null;
}
