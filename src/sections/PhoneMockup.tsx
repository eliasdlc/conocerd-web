"use client";

import Image from "next/image";
import Icon from "@/components/Icon";
import { SelfPin } from "@/components/map/pins";

// ─────────────────────────────────────────────────────────────────────────────
//  Mockup de teléfono (#10, rework ago 2026). La pantalla se mantiene frontal:
//  debe comunicar el producto, no convertirse en una pieza 3D ilegible.
//
//  El frame dejó de ser "una card con notch": bisel fino de metal con botones
//  laterales, aro negro de pantalla, Dynamic Island flotante, barra de estado
//  (hora + señal/wifi/batería) y home indicator. Sigue siendo CSS puro y la
//  pantalla sigue siendo intercambiable por un screenshot real vía `screen`
//  (cuando lleguen las capturas reales de la app, pasar `chrome={false}` si ya
//  traen su propia barra de estado).
// ─────────────────────────────────────────────────────────────────────────────

/** Barra de estado estilo iOS: hora a la izquierda, radios a la derecha. */
function StatusBar() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 z-[3] flex items-center justify-between px-[22px] pt-[9px] text-[11px] font-bold tracking-[.01em] text-ink-2"
    >
      <span>9:41</span>
      <span className="flex items-center gap-[5px]">
        {/* señal */}
        <svg width="15" height="10" viewBox="0 0 15 10" fill="currentColor">
          <rect x="0" y="6" width="2.6" height="4" rx="0.8" />
          <rect x="4" y="4" width="2.6" height="6" rx="0.8" />
          <rect x="8" y="2" width="2.6" height="8" rx="0.8" />
          <rect x="12" y="0" width="2.6" height="10" rx="0.8" opacity="0.35" />
        </svg>
        {/* wifi */}
        <svg width="14" height="10" viewBox="0 0 14 10" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <path d="M1.5 3.4a8.4 8.4 0 0 1 11 0" />
          <path d="M3.6 5.8a5.2 5.2 0 0 1 6.8 0" />
          <circle cx="7" cy="8.4" r="1" fill="currentColor" stroke="none" />
        </svg>
        {/* batería */}
        <svg width="23" height="11" viewBox="0 0 23 11">
          <rect x="0.5" y="0.5" width="19" height="10" rx="3" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
          <rect x="2" y="2" width="13" height="7" rx="1.6" fill="currentColor" />
          <path d="M21.5 3.6v3.8a2 2 0 0 0 0-3.8Z" fill="currentColor" opacity="0.5" />
        </svg>
      </span>
    </div>
  );
}

function DefaultScreen() {
  return (
    <div className="absolute inset-0 bg-[linear-gradient(160deg,#EAF6F4,#DCEFEA)]">
      {/* trazas de calles falsas */}
      <svg viewBox="0 0 270 560" className="absolute inset-0 size-full">
        <path d="M-10,180 C80,150 150,260 300,210" fill="none" stroke="#ffffff" strokeWidth="14" opacity="0.7" />
        <path d="M40,-10 C70,140 20,320 120,580" fill="none" stroke="#ffffff" strokeWidth="12" opacity="0.6" />
        {/* ruta activa dashed mango */}
        <path d="M135,470 C120,360 180,300 150,180" fill="none" stroke="#FF8D16" strokeWidth="4" strokeDasharray="2 5" strokeLinecap="round" />
      </svg>

      {/* barra de búsqueda */}
      <div className="absolute inset-x-4 top-11 flex h-[38px] items-center gap-2 rounded-full bg-white px-3.5 shadow-card">
        <Icon name="search" className="text-lg text-muted" />
        <span className="text-tiny text-muted">¿A dónde vamos?</span>
      </div>

      {/* self-pin en el centro */}
      <div className="absolute left-1/2 top-[196px] -translate-x-1/2">
        <SelfPin heading={18} size={44} />
      </div>

      {/* card inferior estilo bottom-sheet */}
      <div className="absolute inset-x-3 bottom-4 flex items-center gap-[11px] rounded-panel bg-white p-3 shadow-card">
        <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-cream-2">
          <Image src="/assets/destino-aguilas.webp" alt="" fill sizes="56px" className="object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-copy font-bold text-ink">Bahía de las Águilas</div>
          <div className="mt-0.5 font-mono text-micro text-muted">★ 4.8 · a 2.4 km</div>
        </div>
        <div className="shrink-0 rounded-full bg-coral-ink px-4 py-[9px] text-xs font-bold text-white">
          Ir
        </div>
      </div>
    </div>
  );
}

export default function PhoneMockup({
  screen,
  chrome = true,
}: {
  screen?: React.ReactNode;
  /** false = la pantalla trae su propia barra de estado (screenshots reales). */
  chrome?: boolean;
}) {
  return (
    <div className="crd-phone-device">
      {/* Bisel de metal: fino, con luz de canto y botones laterales */}
      <div className="crd-phone-frame relative box-border aspect-[132/278] w-full rounded-[46px] bg-[linear-gradient(155deg,#43606C,#22414D_45%,#2E4F5B_85%,#43606C)] p-[7px] shadow-[0_50px_90px_rgba(38,70,83,0.38),0_12px_30px_rgba(38,70,83,0.25),inset_0_1px_1px_rgba(255,255,255,0.35),inset_0_-1px_1px_rgba(0,0,0,0.25)]">
        {/* Botones: acción + volumen (izq.), encendido (der.) */}
        <span aria-hidden="true" className="absolute -left-[2px] top-[15%] h-[22px] w-[2.5px] rounded-l-[2px] bg-[#16303A]" />
        <span aria-hidden="true" className="absolute -left-[2px] top-[23%] h-[38px] w-[2.5px] rounded-l-[2px] bg-[#16303A]" />
        <span aria-hidden="true" className="absolute -left-[2px] top-[33%] h-[38px] w-[2.5px] rounded-l-[2px] bg-[#16303A]" />
        <span aria-hidden="true" className="absolute -right-[2px] top-[26%] h-[58px] w-[2.5px] rounded-r-[2px] bg-[#16303A]" />

        {/* Aro negro de pantalla (el borde OLED de un teléfono real) */}
        <div className="relative size-full rounded-[39px] bg-black p-[3px]">
          <div className="relative size-full overflow-hidden rounded-[36px] bg-[#EAF6F4]">
            {screen ?? <DefaultScreen />}

            {chrome && (
              <>
                <StatusBar />
                {/* Dynamic Island: pastilla flotante, separada del borde */}
                <div className="absolute left-1/2 top-[9px] z-[4] h-[22px] w-[76px] -translate-x-1/2 rounded-full bg-black">
                  {/* lente de la cámara */}
                  <span className="absolute right-[7px] top-1/2 size-[9px] -translate-y-1/2 rounded-full bg-[#10151a] shadow-[inset_0_0_2px_rgba(90,120,150,0.8)]" />
                </div>
                {/* Home indicator */}
                <div className="absolute bottom-[7px] left-1/2 z-[4] h-[4px] w-[100px] -translate-x-1/2 rounded-full bg-ink/40" />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
