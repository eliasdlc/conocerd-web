// Iconografía propia. Sustituye a Material Symbols Rounded (audit 5.4): era un
// stylesheet externo render-blocking y un punto único de fallo — si
// fonts.googleapis.com tardaba, el usuario leía la ligadura literal
// ("check_circle") en el aviso de éxito del formulario, justo en la conversión.
//
// Contrato de tamaño: el SVG mide 1em y se pinta con currentColor, así que
// hereda exactamente el `font-size` y el `color` del sitio donde se use. Eso
// permitió migrar cada `<span className="ms text-base">` a `<Icon>` conservando
// sus clases tal cual, sin recalcular tamaños.
//
// Trazo redondeado y geometría simple, legible desde 10px (chips del mapa)
// hasta 42px (sello del panel de éxito).

import type { SVGProps } from "react";

const PATHS: Record<string, React.ReactNode> = {
  mail: (
    <>
      <rect x="2.75" y="5" width="18.5" height="14" rx="3" />
      <path d="M3.6 7.9 10.9 13a2 2 0 0 0 2.2 0l7.3-5.1" />
    </>
  ),
  location_on: (
    <>
      <path d="M12 21.2c0 0 7-5.6 7-11.2a7 7 0 1 0-14 0c0 5.6 7 11.2 7 11.2Z" />
      <circle cx="12" cy="9.8" r="2.6" />
    </>
  ),
  phone_iphone: (
    <>
      <rect x="6.5" y="2.6" width="11" height="18.8" rx="3" />
      <path d="M10.4 18.6h3.2" />
    </>
  ),
  android: (
    <>
      <path d="M5 13.4a7 7 0 0 1 14 0v4.6a1.6 1.6 0 0 1-1.6 1.6H6.6A1.6 1.6 0 0 1 5 18Z" />
      <path d="M8.2 4.4 9.7 7.2M15.8 4.4 14.3 7.2" />
      <circle cx="9.6" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.4" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  storefront: (
    <>
      <path d="M3.4 9.2 5 5.4h14l1.6 3.8Z" />
      <path d="M5.2 9.2v10.4h13.6V9.2" />
      <path d="M9.6 19.6v-5.2h4.8v5.2" />
    </>
  ),
  add_business: (
    <>
      <path d="M3.4 9.2 5 5.4h14l1.6 3.8Z" />
      <path d="M5.2 9.2v10.4h6.4" />
      <path d="M17 13.6v6.4M13.8 16.8h6.4" />
    </>
  ),
  download: (
    <>
      <path d="M12 3.6v11" />
      <path d="m7.6 10.4 4.4 4.4 4.4-4.4" />
      <path d="M4.6 19.6h14.8" />
    </>
  ),
  notifications_active: (
    <>
      <path d="M6.4 17.4h11.2l-1.4-2.3v-4.3a4.2 4.2 0 0 0-8.4 0v4.3Z" />
      <path d="M10.1 20a2.1 2.1 0 0 0 3.8 0" />
    </>
  ),
  arrow_forward: (
    <>
      <path d="M4.2 12h15" />
      <path d="m13.2 6 6 6-6 6" />
    </>
  ),
  arrow_outward: (
    <>
      <path d="M7 17 17 7" />
      <path d="M9.2 7H17v7.8" />
    </>
  ),
  arrow_upward: (
    <>
      <path d="M12 19.8V4.8" />
      <path d="m6 10.8 6-6 6 6" />
    </>
  ),
  arrow_downward: (
    <>
      <path d="M12 4.2v15" />
      <path d="m6 13.2 6 6 6-6" />
    </>
  ),
  /** Galón del picker: es `arrow_downward` sin el asta. */
  expand_more: <path d="m6.8 9.6 5.2 5.2 5.2-5.2" />,
  close: <path d="M6.2 6.2 17.8 17.8M17.8 6.2 6.2 17.8" />,
  check: <path d="m5.2 12.4 4.6 4.6L18.8 7.4" />,
  check_circle: (
    <>
      <circle cx="12" cy="12" r="8.8" />
      <path d="m8 12.2 2.9 2.9L16.2 9.4" />
    </>
  ),
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="6.4" />
      <path d="m15.6 15.6 4.4 4.4" />
    </>
  ),
  school: (
    <>
      <path d="m12 4 9.4 4.4L12 12.8 2.6 8.4Z" />
      <path d="M6.6 10.6v4.6c0 1.7 2.4 3 5.4 3s5.4-1.3 5.4-3v-4.6" />
    </>
  ),
  groups: (
    <>
      <circle cx="9.2" cy="9.4" r="3" />
      <path d="M3.6 19.2c0-2.9 2.5-4.6 5.6-4.6s5.6 1.7 5.6 4.6" />
      <circle cx="16.8" cy="10.2" r="2.2" />
      <path d="M16.4 15.2c2.6 0 4.2 1.6 4.2 4" />
    </>
  ),
  hiking: (
    <>
      <circle cx="13.6" cy="4.6" r="1.9" />
      <path d="M13.8 8.4 11 12.2l2.8 1.9.8 5.5" />
      <path d="M11 12.2 7.4 13.8" />
      <path d="m13.8 14.1 3 2.1" />
      <path d="M18.2 6.4 17.4 20" />
    </>
  ),
  beach_access: (
    <>
      <path d="M3.6 12.4a8.4 8.4 0 0 1 16.8 0Z" />
      <path d="M12 12.4v6.2a2.2 2.2 0 0 0 2.2 2.2" />
    </>
  ),
  forest: (
    <>
      <path d="m7.6 3.8 3.4 4.8H4.2Z" />
      <path d="m7.6 8 4.4 6.2H3.2Z" />
      <path d="M7.6 14.2v6.2" />
      <path d="m16.8 8.4 2.8 4H14Z" />
      <path d="m16.8 11.8 3.4 4.6h-6.8Z" />
      <path d="M16.8 16.4v4" />
    </>
  ),
  restaurant: (
    <>
      <path d="M7.4 3.4v5.2M10.6 3.4v5.2" />
      <path d="M9 8.6v12" />
      <path d="M16.4 3.4c1.8 1.6 2.2 4.6 1.4 7.2-.3 1-1 1.6-1 1.6v8.4" />
    </>
  ),
  account_balance: (
    <>
      <path d="m12 3.6 9 4.4H3Z" />
      <path d="M6.4 11v6M12 11v6M17.6 11v6" />
      <path d="M3.6 20.4h16.8" />
    </>
  ),
  workspace_premium: (
    <>
      <circle cx="12" cy="9" r="5.6" />
      <path d="m8.6 13.6-2 7.2 5.4-2.9 5.4 2.9-2-7.2" />
    </>
  ),
  rocket_launch: (
    <>
      <path d="M12 2.8c2.5 2.4 3.7 5.4 3.7 8.5v4H8.3v-4c0-3.1 1.2-6.1 3.7-8.5Z" />
      <circle cx="12" cy="9.2" r="1.7" />
      <path d="M8.3 12.2 5.7 15.6l2.6 1M15.7 12.2l2.6 3.4-2.6 1" />
      <path d="M10.3 15.6c0 2.2 1.7 4 1.7 4s1.7-1.8 1.7-4" />
    </>
  ),
  explore: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="m15.6 8.4-2.3 5.5-5.5 2.3 2.3-5.5Z" />
    </>
  ),
  route: (
    <>
      <circle cx="6.2" cy="18" r="2.4" />
      <circle cx="17.8" cy="6" r="2.4" />
      <path d="M6.2 15.6V11a3.6 3.6 0 0 1 3.6-3.6h5.6" />
    </>
  ),
  auto_stories: (
    <>
      <path d="M12 7.6c-1.8-1.6-4.2-2.4-6.6-2.1v11.6c2.4-.3 4.8.5 6.6 2.1 1.8-1.6 4.2-2.4 6.6-2.1V5.5c-2.4-.3-4.8.5-6.6 2.1Z" />
      <path d="M12 7.6v11.6" />
    </>
  ),
  star: <path d="m12 3.6 2.6 5.5 6 .9-4.3 4.2 1 6-5.3-2.8-5.3 2.8 1-6L3.4 10l6-.9Z" />,
  support_agent: (
    <>
      <path d="M5.6 14.2v-2.4a6.4 6.4 0 0 1 12.8 0v2.4" />
      <rect x="3.4" y="13.4" width="3.4" height="5.2" rx="1.7" />
      <rect x="17.2" y="13.4" width="3.4" height="5.2" rx="1.7" />
      <path d="M18.4 18.6v.6a2.6 2.6 0 0 1-2.6 2.6h-2.6" />
    </>
  ),
  visibility: (
    <>
      <path d="M2.6 12S6.2 6.4 12 6.4 21.4 12 21.4 12 17.8 17.6 12 17.6 2.6 12 2.6 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  insights: (
    <>
      <path d="M3.6 20.4h16.8" />
      <path d="m4.6 16.4 4.4-4.4 3 3 6.4-7.6" />
      <circle cx="9" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="15" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  chat: (
    <>
      <path d="M4.4 5.4h15.2A1.8 1.8 0 0 1 21.4 7.2v7.6a1.8 1.8 0 0 1-1.8 1.8H9.6l-4.4 3.8v-3.8h-.8a1.8 1.8 0 0 1-1.8-1.8V7.2a1.8 1.8 0 0 1 1.8-1.8Z" />
    </>
  ),
  qr_code_2: (
    <>
      <rect x="3.4" y="3.4" width="6.4" height="6.4" rx="1.4" />
      <rect x="14.2" y="3.4" width="6.4" height="6.4" rx="1.4" />
      <rect x="3.4" y="14.2" width="6.4" height="6.4" rx="1.4" />
      <path d="M14.2 14.2h2.8v2.8h-2.8ZM17.8 17.8h2.8v2.8h-2.8Z" />
    </>
  ),
  lock: (
    <>
      <rect x="4.6" y="10.4" width="14.8" height="10" rx="2.6" />
      <path d="M8.2 10.4V7.6a3.8 3.8 0 0 1 7.6 0v2.8" />
    </>
  ),
  verified: (
    <>
      {/* Octógono regular (r=9 sobre el centro 12,12); con linejoin redondeado
          lee como sello, no como polígono técnico. */}
      <path d="M12 3 18.4 5.6 21 12 18.4 18.4 12 21 5.6 18.4 3 12 5.6 5.6Z" />
      <path d="m8.6 12.2 2.4 2.4 4.4-4.8" />
    </>
  ),
};

export type IconName = keyof typeof PATHS;

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  /** Texto accesible. Sin él el icono es decorativo (aria-hidden), que es el
   *  caso de casi todos: el label va en el texto contiguo. */
  label?: string;
  /** Estado activo: el MISMO glifo relleno al 22 % y a trazo 2, nunca un
   *  segundo dibujo. Es la regla de iconografía del sistema. */
  active?: boolean;
}

export default function Icon({ name, label, active, className, style, ...rest }: IconProps) {
  const path = PATHS[name];
  if (!path) return null;

  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.22 : undefined}
      stroke="currentColor"
      strokeWidth={active ? 2 : 1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      {...rest}
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      // `verticalAlign` replica el comportamiento que tenía `.ms`: la mayoría de
      // los iconos viven en cajas flex, pero unos pocos van en línea con texto.
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }}
    >
      {path}
    </svg>
  );
}
