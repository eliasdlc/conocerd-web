# Brief para constructores de variantes (jul 2026)

Eres parte de un equipo generando **5 variantes de diseño** para secciones de la
landing de **ConoceRD** — app de turismo auténtico en República Dominicana
(destinos poco conocidos + negocios locales). La página es un scroll-journey
sobre un mapa MapLibre pegado (sticky): cada sección es un **overlay** sobre el
mapa, activado por escena.

## Contrato técnico de una variante

- Escribes **UN archivo**: `src/variants/<area>/v<N>.tsx` (te dirán área y N).
  Puedes definir múltiples componentes internos en ese mismo archivo. Export
  default = el componente de la variante. `"use client"` arriba.
- La variante se monta **dentro de `<Map>`** en `MapScrollJourney`, en el lugar
  de la(s) sección(es) actual(es). Tiene acceso a:
  - `useScene()` de `@/context/SceneContext` → `{ activeScene }`. Renderiza tu
    overlay con opacidad/inert según `activeScene === "<escena>"` (mira cómo lo
    hacen las secciones actuales — copia ese patrón de visibilidad).
  - Componentes del mapa (`@/components/map/Map`): `MapMarker` (portal
    posicionado por maplibre; props `longitude/latitude/anchor`), con hijos
    `MarkerContent` y `MarkerLabel position="top|right"`; `MapRoute`
    (`id, coordinates: [lng,lat][], color, width, opacity, dashArray` — la
    geometría se puede actualizar en vivo); `MapArc` (`id, from, to, color,
    width, bend, animated` — dashed "marching ants" ya respetando
    reduced-motion); `useMap()` para el objeto maplibre crudo si lo necesitas.
  - Pines: `@/components/map/pins` → `CategoryPin` (`category, state:
    "default"|"done", size`), `SelfPin`, `GoalFlag`, y `PIN_CHROME` (clase
    de borde/sombra para pines circulares custom).
- **Escenas por área** (no cambies `lib/journey.ts` ni las cámaras):
  - área `mapa` → escena `"mapa"` (isla completa, interactiva).
  - área `vn` → escenas `"viajeros"` y `"negocios"` (tu variante renderiza AMBOS
    overlays, cada uno gated por su escena).
  - área `equipo` → escena `"equipo"` (cámara sobre Santiago).
- Datos: `@/data/destinations` → `DESTINATIONS`, `FEATURED_DESTINATIONS`,
  `CATEGORIES`, `CATEGORY_META` (label/icon/color/ink por categoría). Coordenadas
  reales verificadas.
- **Rutas reales por carretera**: `src/data/routes/pairs.json` (impórtalo con
  `import pairs from "@/data/routes/pairs.json"`) trae para los 18 destinos:
  `ids: string[]`, `km: number[][]`, `min: number[][]` (matrices por índice de
  `ids`) y `legs: Record<"idA|idB", [lng,lat][]>` (geometría carretera entre
  cada par, la clave usa los ids en el orden de `ids`; para B→A invierte el
  array). Úsalo para pintar rutas que siguen las calles del país y para
  distancias/tiempos de manejo veraces. Impórtalo con `await import(...)` o
  import estático — la variante ya entra por dynamic import, no pesa si no se usa.
- Validación obligatoria antes de terminar: `npx tsc --noEmit` y
  `npx eslint src/variants --max-warnings=0` limpios.
- **Auto-verificación visual**: hay un dev server en `http://localhost:3000`.
  Captura tu variante integrada con:
  `node shot2.mjs "http://localhost:3000/?var-<area>=<N>" /tmp/v<N>.png <scrollFraction> [ancho] [alto]`
  Fracciones de scroll útiles (desktop): mapa ≈ 0.60, viajeros ≈ 0.68,
  negocios ≈ 0.78, equipo ≈ 0.88. Mobile: pasa `390 844`. MIRA tu captura
  (Read del png) y corrige lo que se vea mal. Repite hasta que se vea bien de
  verdad. Un navegador por captura (ya lo hace el script).

## Sistema de diseño (obligatorio)

- Tailwind v4 con tokens del proyecto: colores `ink #264653 / ink-2 #1D3A45 /
  coral #F76C4D / coral-soft / coral-ink #B23410 / mango #FF8D16 / mango-soft /
  mango-ink #985409 / mint #25CCB8 / mint-soft / mint-ink #0C6A60 / cream
  #FDF8F0 / cream-2 / line #EBE6D9 / muted / muted-2`. Radios: `rounded-card`,
  `rounded-panel`, `rounded-tile`, `rounded-chip`. Sombras: `shadow-card`,
  `shadow-panel`, `shadow-modal`, y `crd-sticker` (sombra offset dura).
- Tipografía: Fraunces (`font-display`) SOLO en titulares ≥20px; itálica coral
  vía `<em className="crd-accent">`; texto correr en Instrument Sans
  (default); `font-mono` para datos/kickers; `font-hand` (caveat-style) para
  acentos manuscritos tipo polaroid.
- Superficies sobre el mapa: `PANEL_GLASS` / `PANEL_SOLID` de `@/lib/surfaces`
  (+ `rounded-panel`). SOLID obligatorio bajo texto largo (la toponimia del
  mapa se transparenta con glass).
- Kicker de sección: `<Kicker icon="..." index="0X">Nombre</Kicker>`
  (`@/components/Kicker`). SIN coordenadas (se eliminaron a propósito).
- Botones: `@/components/Button` (`primary` mango con TEXTO BLANCO, `outline`,
  `mint`). Iconos: `@/components/Icon` (set propio: mail, location_on,
  storefront, add_business, download, notifications_active, arrow_forward,
  arrow_outward, arrow_upward, arrow_downward, close, check, check_circle,
  search, school, groups, hiking, beach_access, forest, restaurant,
  account_balance, workspace_premium, rocket_launch, explore, route,
  auto_stories, star, support_agent, visibility, insights, chat, qr_code_2,
  lock, verified, phone_iphone, android). Si necesitas un glifo que no está,
  dibújalo inline como SVG de trazo 1.9 redondeado, 24×24, currentColor.
- Teléfono: `PhoneMockup` de `@/sections/PhoneMockup` acepta `screen={<tu UI/>}`
  para reemplazar la pantalla completa.
- Animación: `motion/react` (framer) y GSAP disponibles. **PROHIBIDO el motion
  en reposo** (nada de levitar/bob infinito): todo movimiento nace de scroll,
  hover, tap o de un evento (p. ej. la llegada de un dato). Respeta
  `useReducedMotion`. Entradas con `animate-slide-up` + `animationDelay` es el
  patrón de la casa.
- Móvil (≤899px): los paneles laterales se convierten en bottom-sheet con la
  clase `crd-ol-panel` (ya definida en globals.css, con asa y max-height).
  Puedes usarla o proponer tu propio reflow móvil, pero móvil TIENE que quedar
  bien: targets ≥44px, sin overflow horizontal, el mapa visible.
- Copy en español dominicano neutro, directo, sin filler. Nada de lorem ipsum:
  copy real y creíble.

## Reglas duras

1. NO toques archivos fuera de tu `src/variants/<area>/v<N>.tsx` (excepto
   capturas en /tmp). Nada de editar globals.css, journey, datos ni secciones.
2. NO añadas dependencias.
3. NO uses coordenadas decorativas ("18.73°N") ni menciones PUCMM.
4. La variante debe ser COMPLETA y funcional: estados, interacción, móvil,
   accesibilidad (aria, foco visible, reduced motion). No un mockup a medias.
5. La estética base de la marca (crema cálido, polaroid/expedición, sticker)
   se respeta — tu variante explora DIRECCIÓN de layout/interacción/jerarquía,
   no un rebrand. Diferénciate de verdad de las otras variantes según la
   dirección que te asignen.
