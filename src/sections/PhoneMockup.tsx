"use client";

import Image from "next/image";
import Icon from "@/components/Icon";
import { SelfPin } from "@/components/map/pins";

// ─────────────────────────────────────────────────────────────────────────────
//  Mockup de teléfono (#10, rework ago 2026). La pantalla se mantiene frontal:
//  debe comunicar el producto, no convertirse en una pieza 3D ilegible.
//
//  El frame imita un Galaxy S25 Ultra (el dispositivo de las capturas reales):
//  esquinas casi cuadradas, bisel de metal finísimo, botones solo en el lado
//  derecho (volumen + encendido) y cámara punch-hole centrada en vez de
//  Dynamic Island. El aspect del frame se deriva del aspect de las capturas
//  (480×996) más 26px de franja de estado: las capturas van recortadas borde a
//  borde, así que la barra One UI y el punch-hole viven en esa franja superior
//  reservada (ver PantallaReal) en vez de tapar contenido. Sigue siendo CSS
//  puro y la pantalla intercambiable por un screenshot real vía `screen`.
// ─────────────────────────────────────────────────────────────────────────────

/** Barra de estado estilo One UI: franja blanca de 26px con hora a la
 *  izquierda y radios a la derecha. Lleva su propio fondo para que el tope se
 *  vea blanco sobre cualquier pantalla (capturas reales o pantallas CSS). */
function StatusBar() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 z-[3] flex h-[26px] items-center justify-between bg-white px-[18px] text-[11px] font-semibold tracking-[.01em] text-[#1B1F23]"
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
      {/* Riel de titanio: gradiente grafito con luz de canto arriba/abajo, como
          el "Titanium Black". De frente el metal apenas asoma (3px); el grueso
          del borde es el bisel negro uniforme del panel. 264/559 sale de la
          captura 480×996 + 26px de franja de estado + 7px por lado (3 metal +
          4 bisel). */}
      <div className="crd-phone-frame relative box-border aspect-[264/559] w-full rounded-[20px] bg-[linear-gradient(150deg,#848D94,#3A4147_18%,#23282C_50%,#3F474D_82%,#8E979E)] p-[3px] shadow-[0_50px_90px_rgba(38,70,83,0.38),0_12px_30px_rgba(38,70,83,0.25),inset_0_1px_1px_rgba(255,255,255,0.5),inset_0_-1px_1px_rgba(0,0,0,0.45)]">
        {/* Botones, todos a la derecha: balancín de volumen y encendido, del
            mismo titanio que el riel */}
        <span aria-hidden="true" className="absolute -right-[2.5px] top-[19%] h-[52px] w-[3px] rounded-r-[2px] bg-[linear-gradient(90deg,#5A6268,#23282C)] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-1px_0_rgba(0,0,0,0.4)]" />
        <span aria-hidden="true" className="absolute -right-[2.5px] top-[31%] h-[26px] w-[3px] rounded-r-[2px] bg-[linear-gradient(90deg,#5A6268,#23282C)] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-1px_0_rgba(0,0,0,0.4)]" />

        {/* Bisel negro del panel: uniforme y fino, todo pantalla */}
        <div className="relative size-full rounded-[17px] bg-black p-[4px]">
          <div className="relative size-full overflow-hidden rounded-[13px] bg-white">
            {screen ?? <DefaultScreen />}

            {chrome && (
              <>
                <StatusBar />
                {/* Cámara punch-hole centrada, con aro suave sobre el blanco */}
                <div className="absolute left-1/2 top-[7px] z-[4] size-[12px] -translate-x-1/2 rounded-full bg-[#04070A] shadow-[0_0_2px_rgba(0,0,0,0.35)]">
                  {/* lente */}
                  <span className="absolute left-1/2 top-1/2 size-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#101820] shadow-[inset_0_-0.5px_1.5px_rgba(110,140,175,0.9)]" />
                </div>
                {/* Barra de gestos */}
                <div className="absolute bottom-[6px] left-1/2 z-[4] h-[4px] w-[96px] -translate-x-1/2 rounded-full bg-black/30" />
              </>
            )}

            {/* Reflejo del cristal: diagonal y muy sutil, no lava la captura */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-[6] bg-[linear-gradient(115deg,rgba(255,255,255,0.13)_0%,rgba(255,255,255,0.04)_26%,transparent_44%)]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
