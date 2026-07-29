"use client";

import Image from "next/image";
import { SelfPin } from "@/components/map/pins";

// ─────────────────────────────────────────────────────────────────────────────
//  Mockup de teléfono (#10). La pantalla se mantiene frontal y proporcionada:
//  debe comunicar el producto, no convertirse en una pieza 3D ilegible. Sigue
//  siendo intercambiable por un video o screenshot real mediante `screen`.
// ─────────────────────────────────────────────────────────────────────────────

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
      <div className="absolute inset-x-4 top-11 flex h-[38px] items-center gap-2 rounded-full bg-white px-3.5 shadow-[0_6px_18px_rgba(38,70,83,0.16)]">
        <span className="ms text-lg text-muted">search</span>
        <span className="font-display text-[12.5px] text-muted">¿A dónde vamos?</span>
      </div>

      {/* self-pin en el centro */}
      <div className="absolute left-1/2 top-[196px] -translate-x-1/2">
        <SelfPin heading={18} size={44} />
      </div>

      {/* card inferior estilo bottom-sheet */}
      <div className="absolute inset-x-3 bottom-4 flex items-center gap-[11px] rounded-[20px] bg-white p-3 shadow-[0_-2px_20px_rgba(38,70,83,0.14)]">
        <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-cream-2">
          <Image src="/assets/ph-playa.png" alt="" fill sizes="56px" className="object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-[13px] font-extrabold text-ink">Bahía de las Águilas</div>
          <div className="mt-0.5 font-mono text-[10px] text-muted">★ 4.9 · a 2.4 km</div>
        </div>
        <div className="shrink-0 rounded-full bg-coral px-4 py-[9px] font-display text-xs font-extrabold text-white">
          Ir
        </div>
      </div>
    </div>
  );
}

export default function PhoneMockup({ screen }: { screen?: React.ReactNode }) {
  return (
    <div className="crd-phone-device">
      <div className="crd-phone-frame relative box-border aspect-[264/548] w-full rounded-[44px] bg-[linear-gradient(155deg,#33545F,#1D3A45)] p-3 shadow-[0_50px_90px_rgba(38,70,83,0.38),0_12px_30px_rgba(38,70,83,0.25),inset_0_1px_2px_rgba(255,255,255,0.18)]">
        <div className="relative size-full overflow-hidden rounded-[33px] bg-[#EAF6F4]">
          {screen ?? <DefaultScreen />}
        </div>
        {/* notch */}
        <div className="absolute left-1/2 top-3 z-[2] h-[22px] w-[92px] -translate-x-1/2 rounded-b-[14px] bg-ink-2" />
      </div>
    </div>
  );
}
