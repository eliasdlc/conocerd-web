# Audit UI/UX — ConoceRD Web (julio 2026)

**Metodología.** 90 capturas reales (5 viewports: 1440×900, 1280×800, 768×1024, 390×844, 360×740 × 2 páginas × 9 posiciones de scroll), auditadas por 13 agentes especializados: 5 auditores visuales por viewport, verificadores escépticos que re-comprobaron cada hallazgo alta/media contra el screenshot citado, un crítico de tipografía/branding y un auditor de consistencia de código. Todo hallazgo marcado **[confirmado]** fue verificado por un segundo agente contra la evidencia.

**Segunda pasada (código).** Las capturas estáticas en un solo navegador tienen puntos ciegos por construcción: estados interactivos, contraste medido, metadata, resiliencia y performance. La sección 5 cubre esos ángulos auditando el código directamente; sus hallazgos marcados **[medido]** o **[confirmado en código]** están verificados contra archivo y línea.

---

## 1. Bugs confirmados (P0 — arreglar antes de cualquier rediseño)

### 1.1 Si el mapa falla, la página entera queda en blanco
Durante la captura, un fallo puntual del fetch de `https://basemaps.cartocdn.com/gl/positron-gl-style/style.json` (y, por separado, la falta de WebGL) dejó **toda la home vacía**: solo nav y fondo, sin hero, sin secciones, sin footer. El error de MapLibre no está contenido — tumba todo el árbol de `JourneyHome`. Para un público masivo (móviles viejos, WebGL desactivado, redes flojas, CDN caído) esto es el peor escenario posible: página en blanco.
- **Evidencia:** sesión de captura desktop-1440 completa en blanco + `Uncaught Error … webglcontextcreationerror` y `AJAXError: Failed to fetch … style.json` en el log del dev server. Origen: `src/components/map/Map.tsx:111` (`new maplibregl.Map(...)` sin try/catch ni error boundary en `src/components/JourneyHome.tsx:13` / `MapScrollJourney.tsx:166`).
- **Fix:** error boundary alrededor del mapa + fallback estático (imagen del mapa o fondo crema con el contenido normal fluyendo); capturar `webglcontextcreationerror`; self-host o fallback del style.json.

### 1.2 El CTA flotante del nav se solapa con el CTA final [confirmado en 3 viewports]
Al llegar al final del scroll, la píldora "Unirme a la lista" queda encima del contenido de la sección CTA:
- **mobile-390 (`home-mobile-390-s100.png`):** dos pills naranjas superpuestas — el flotante tapa el botón "Unirme" del formulario (se lee "Unirm…" cortado). Target de toque ambiguo en el momento exacto de la conversión.
- **tablet-768 (`home-tablet-768-s100.png`):** el flotante tapa casi por completo el kicker Caveat "Descubre lo nuestro" del CTA final.
- **laptop-1280 (`home-laptop-1280-s100.png`):** la píldora translúcida se superpone al arranque de la card CTA; la primera línea del párrafo queda "fantasma" debajo del pill.
- **Fix:** ocultar/fade-out la píldora del nav cuando la sección CTA/formulario entra en viewport (IntersectionObserver), en todos los viewports.

### 1.3 ~~Falta la tilde en el H1 de /lista~~ [descartado por decisión del propietario]
El audit proponía "**Se** de los primeros…" → "**Sé** de los primeros…" (imperativo de ser, tilde diacrítica según RAE). **Decisión del propietario (2026-08-01): el H1 se queda como está, sin tilde. No tocar.** No re-flaggear en audits futuros.

### 1.4 Tablet: tooltip del constructor de rutas cortado por el borde superior [confirmado]
En `home-tablet-768-s062.png` el globo "…ruta. Reordena la… distancia total." aparece con su mitad superior fuera del viewport. **Fix:** clamp/flip de posición del tooltip contra los bordes del viewport.

### 1.5 Tablet: títulos rebanados en el deck de destinos [confirmado]
En `home-tablet-768-s025/s038.png` la tarjeta trasera del mazo muestra su título cortado a media altura de los glifos ("27 Charcos" tras "Constanza"; "Pico Duarte" tras "Salto El Limón"). Parece bug de z-index, no diseño. **Fix:** la tarjeta trasera debe asomar solo borde/sombra, nunca texto a medio glifo.

### 1.6 Desktop: etiquetas del mapa se transparentan sobre el panel de Negocios
En `home-desktop-1440-s075.png`, la tarjeta izquierda ("Tu negocio, dentro de la ruta") deja ver labels del mapa ("SAN FERNANDO…", "SAN IGNACIO DE SABANETA") flotando sobre su propio texto. El panel derecho es opaco y no lo sufre. **Fix:** fondo sólido (o blur real) en esa tarjeta. Relacionado, en `s100` quedan fragmentos de labels cortados en el borde de la card CTA final, y en `s025` el tooltip "Pico Duarte" queda ilegible debajo del titular "no has vivido".

---

## 2. Problemas de layout y organización (P1)

| # | Hallazgo | Evidencia | Fix propuesto |
|---|----------|-----------|---------------|
| 2.1 | **Titulares sobre toponimia del mapa sin scrim** — en móvil el H2 de Viajeros pelea con "DOMINICAN / HAITI"; en desktop el H2 de Destinos cae sobre las etiquetas [confirmado] | `home-mobile-390-s062.png`, destinos desktop | Generalizar el chip crema con blur que ya existe para viewports cortos (`globals.css:306-316`), o halo/stroke crema en el texto. Regla: texto de marca nunca compite píxel a píxel con texto de mapa |
| 2.2 | **Botón "Unirme" del formulario al 44% del ancho** con un vacío enorme a su derecha; todos los demás CTA van a ancho completo [confirmado, medido] | `lista-mobile-360-s000.png` | `w-full` en el botón del formulario (aplica a /lista y al CTA del home) |
| 2.3 | **Checkbox de consentimiento ~16px** — target táctil muy por debajo de 44×44, y es obligatorio para convertir [confirmado, medido] | `lista-mobile-360-s000.png` | Hit-area ampliada + label completo clicable |
| 2.4 | **Zonas muertas grandes** — en móvil, hueco enorme entre el titular de Destinos y las cards (`home-mobile-390-s050.png`); en tablet la escena Mapa es ~70% océano vacío con los pins apiñados arriba (`home-tablet-768-s062.png`) | capturas citadas | Recomponer: en móvil acercar heading y deck; en tablet subir zoom/centrar la isla para que llene el encuadre |
| 2.5 | **Carrusel de destinos cortado sin affordance** — la card "Pico Duarte" se trunca a ras del borde sin fade ni pista de que es deslizable | `home-mobile-390-s050.png` | Fade en el borde o peek más generoso con esquina redondeada visible |
| 2.6 | **Footer móvil: columna PRODUCTO con líneas huérfanas** ("próximamente" suelto ×2) | `home-mobile-360-s100.png` | Ajustar proporción de columnas del grid o el punto de quiebre del texto |
| 2.7 | **Pin "PUCMM · Santiago" tapa la etiqueta de la ciudad** (baja) | `home-laptop-1280-s088.png` | Offset del tooltip / collision padding |

---

## 3. Por qué se siente "página de Google" (diagnóstico del crítico de marca)

La sensación tiene causas literales en el código:

1. **Material Symbols Rounded** (`layout.tsx:50-55`) — el icon font oficial de Android con `FILL 1`. Campanita, `download`, `storefront`… son los glifos que todo el mundo ve en apps de Google. **Es el delator nº 1 y el fix más barato.**
2. **Inter + Plus Jakarta ExtraBold con tracking negativo** — la fórmula del titular SaaS genérico (`CTASection.tsx:42`). Nada en estas fuentes dice Caribe ni conecta con el logo (que es rotulación a mano con textura).
3. **Botones pill con glow del mismo color** (`Button.tsx:12-14`) — cliché de template 2019-2021; además, dos botones llenos del mismo peso en el hero (mango + mint) se anulan mutuamente.
4. **Gradientes radiales pastel perfectamente lisos** (`.crd-journey-sticky`, `.crd-lista-blooms`) — "gradiente de Figma", no "papel de guía de viaje".
5. **/lista es el momento más genérico**: cards blancas + borde gris + icono Material en cuadradito pastel + checkbox nativo + Instagram con su gradiente oficial a todo color.

**Lo que SÍ tiene identidad (proteger):** el logo, las polaroids (Caveat + coordenadas en mono — el mejor momento tipográfico del sitio), el mapa como escenario con la ruta coral punteada, la paleta cream/ink/coral/mango/mint, y los micro-detalles en mono ("Hecho con orgullo en RD"). **La tarea no es redecorar: es hacer que el UI hable el idioma del logo.**

### Dirección tipográfica recomendada — "Editorial caribeño"
| Rol | Fuente (next/font/google) | Pesos |
|---|---|---|
| Display (H1/H2) | **Fraunces** | 600, 700 + itálica 600 como acento |
| Body + UI | **Instrument Sans** | 400, 600 |
| Manuscrito | Caveat (se queda) | 700 |
| Datos/coordenadas | JetBrains Mono (se queda) | 600 |

Fraunces conecta con el lettering del logo y reposiciona el sitio de "producto tech" a "editorial de viajes premium-cálida". Reglas: serif solo en titulares (≥20px); botones y nav en Instrument Sans 600; la itálica coral de Fraunces sustituye al `<strong>` coral actual. Carga similar a la actual (hoy ya hay 4 familias / 8 pesos).

Alternativas evaluadas: **Bricolage Grotesque + Hanken Grotesk** (evolución de bajo riesgo, no reposiciona) y **Caprasimo + Albert Sans** (máximo carácter, riesgo de caer en infantil — solo como experimento). Detalle completo en el resultado del crítico tipográfico.

### 12 movimientos de polish (resumen priorizado)
1. **Sustituir Material Symbols por ~15-20 SVG propios** (trazo redondeado, mano imperfecta como el logo). Elimina la mitad del look Google + el stylesheet externo. *Adelantado a Fase C: también es un punto único de fallo externo — ver 5.4.*
2. **Tipografía** (arriba).
3. **Botones**: fuera el glow; sombra sticker (`0 3px 0 rgba(38,70,83,.18)`) o ambiental neutra; jerarquía primario/ghost en el hero.
4. **Grano** (noise SVG 2-4% overlay) sobre los fondos crema.
5. **Polaroids con materia**: cinta adhesiva, grano, grade cálido unificado entre fotos.
6. **Pins del mapa con el ADN del hero-pin** (borde blanco, sombra corta) en vez de círculos planos con icono Material.
7. Titulares nunca sobre toponimia (ver 2.1).
8. **Kickers en mono estilo expedición** ("01 · DESTINOS · 18.73°N") y en español — "HIDDEN GEMS" en inglés es fuga de identidad.
9. **/lista como pasaporte**: perks como sellos/tickets con borde dashed y numeración mono; Instagram monocromo ink.
10. **Motion**: el chevron EXPLORA usa `crdBob infinite` (`HeroOverlay.tsx:108`) — levitación en reposo que viola la regla del proyecto; purgar también `crdFloatX`/`crdSway` si no tienen usuarios.
11. **CTA final opaco** con luz de canto y textura topográfica sutil en vez de ink al 82% con fantasmas del mapa.
12. **Marca en el nav**: al volverse sólida la píldora, deslizar un glifo compacto (pin o "C") — desde Destinos hasta el footer hoy no hay logo en pantalla.

---

## 4. Consistencia del sistema (código) — deuda que se ve

Hallazgos del auditor de código (los tres primeros explican mucho del acabado "desprolijo"):

1. **[alta]** El panel "glass" sobre el mapa está implementado 3 veces distinto: `MapaSection.tsx:27-28` (20px, cream/92), `NegociosSection.tsx:110,169` (22px, white/96 y white sin borde), `ViajerosSection.tsx:48-49` (16px, cream/88). Mismo concepto, tres radios y tres fondos entre escenas consecutivas.
2. **[alta]** `PolaroidCard` duplicado: `PolaroidDeck.tsx:20-43` vs reimplementación inline en `DestinosSection.tsx:124-161`, ya con drift real (sombra .24 vs .22, clamp vs altura fija).
3. **[media]** **17 box-shadows ad-hoc** sobre el mismo ink para lo que son 3-4 niveles de elevación → definir `--shadow-card/panel/modal` en `@theme`.
4. **[media]** **17 tamaños de fuente arbitrarios** con saltos de medio píxel (9.5→10→10.5→…→42px) → consolidar escala.
5. **[media]** Eyebrow/kicker copiado carácter por carácter en 4 sitios (`ViajerosSection.tsx:33`, `EquipoSection.tsx:140`, `ListaExperience.tsx:64,149`) → componente `Kicker`.
6. **[media]** Radios de icon-tile sin criterio (9px asimétrico / 7px / 11px / full para el mismo tipo de elemento).
7. **[baja]** `#FBF7EF` hardcodeado como "cream" en 3 sitios pero el token real es `#FDF8F0`; `#1a9b8c` para "EN VIVO" en vez de `text-mint-ink`; **13 radios arbitrarios** conviviendo con la escala de Tailwind.

---

## 5. Segunda pasada — lo que las capturas no podían ver

### 5.1 No hay red de seguridad de ruta: `error.tsx` y `not-found.tsx` no existen [confirmado en código]
El fix de 1.1 (boundary alrededor del mapa) es correcto pero local: hoy no existe **ningún** `error.tsx` ni `not-found.tsx` en `src/app`, así que cualquier error futuro de render vuelve a dejar la página en blanco, y el 404 es el de Next por defecto — en inglés y sin marca, en un sitio que aspira a editorial premium.
- **Fix:** `src/app/error.tsx` con marca (crema + ink, mensaje en español, botón "Reintentar" via `reset()`) y `src/app/not-found.tsx` con el mismo lenguaje visual (pin perdido / "esta ruta no existe" encaja con la metáfora del sitio). Criterio de aceptación de 1.1: con WebGL desactivado y CDN caído, **todo el contenido fluye sin el mapa** — el fallback es contenido real, no una disculpa.

### 5.2 Focus invisible en los campos del formulario [confirmado en código]
Existe un anillo de focus global bien hecho (`globals.css:374`, coral, en `@layer base`) y un skip-link funcional (`JourneyHome.tsx:8`). Pero los campos del formulario lo anulan: `FIELD` incluye `outline-none` (`SubscribeForm.tsx:66`), y las utilities de Tailwind le ganan a `@layer base` por orden de capas — exactamente el comportamiento que documenta el comentario de `globals.css:372`. Resultado: navegando con teclado, **ningún input del formulario de conversión muestra dónde está el focus**. Los botones no llevan `outline-none` y sí reciben el anillo.
- **Fix:** quitar `outline-none` de `FIELD` y dejar actuar el anillo global; si el coral resulta duro sobre los campos, sustituir por focus propio (`focus-visible:border-coral` + sombra suave). Un cambio de una línea con impacto directo en el embudo.

### 5.3 Los CTA rellenos fallan contraste AA [medido]
Ratios calculados sobre los tokens reales (`globals.css:20-37`):

| Combinación | Ratio | Umbral (texto 13.5–15px) | Dónde |
|---|---|---|---|
| blanco sobre mango `#FF8D16` | **2.31:1** | 4.5:1 — falla incluso 3:1 | `Button.tsx:12` (primary), submit del form (`SubscribeForm.tsx:435`), pill del nav |
| blanco sobre mint `#25CCB8` | **2.02:1** | 4.5:1 | CTA de Negocios (`NegociosSection.tsx:160`) |
| blanco sobre coral `#F76C4D` | **2.91:1** | 4.5:1 | usos puntuales |
| ink-2 sobre mango | **5.2:1** | ✓ pasa AA | — |
| ink-2 sobre mint | ✓ pasa | ✓ | `Button.tsx:14` (variante mint) **ya lo hace bien** |

El propio código contiene la solución: la variante `mint` de `Button` ya usa `text-ink-2`. La paleta tiene además variantes `*-ink` creadas justo para esto (`--color-coral-ink`, etc., `globals.css:33-37`).
- **Fix:** estandarizar texto `ink-2` en todos los botones rellenos de mango/mint (además queda más editorial, menos template), o oscurecer los fondos a las variantes `-ink` con texto blanco. Decidirlo una sola vez en Fase C (tokens) y ejecutarlo junto al movimiento de polish #3 (quitar glow) — son los mismos archivos.
- **Restricción del propietario (2026-08-01):** no aplicar texto oscuro a ciegas — hay botones donde el texto blanco queda mejor aunque falle AA y el oscuro se ve feo. La decisión se toma **botón por botón con comparativa visual** antes de aplicar; donde el blanco gane estéticamente, la vía es oscurecer el fondo a la variante `-ink` (mantiene blanco y pasa AA), no cambiar el texto.

### 5.4 Material Symbols es el segundo punto único de fallo externo [confirmado en código]
Los iconos son **ligaduras** de un stylesheet externo (`layout.tsx`). Si `fonts.googleapis.com` falla o tarda — las mismas "redes flojas" del hallazgo 1.1 — el usuario ve el texto literal: "`check_circle`" escrito en el aviso de éxito del formulario (el momento exacto de conversión), "`arrow_forward`" en el botón. Es la misma clase de fallo que el style.json de Carto, y además un stylesheet render-blocking.
- **Fix:** el movimiento de polish #1 (sustituir por ~15-20 SVG propios) **se adelanta de Fase D a Fase C**: no es solo identidad, es eliminar el segundo SPOF y el FOUT de palabras. Un componente `Icon` con los SVG inline y fuera el `<link>` de `layout.tsx`.

### 5.5 No existe metadata de compartido social [confirmado en código]
`layout.tsx` define solo `title` y `description`. Sin Open Graph, sin Twitter card, sin imagen, sin `metadataBase`. Para una waitlist que se difunde por WhatsApp e Instagram en RD, **la preview del enlace es la primera impresión** — hoy sale sin imagen ni marca. Tampoco hay `robots.ts` ni `sitemap.ts`.
- **Fix:** `metadataBase` + `openGraph` completo (título, descripción, `siteName`, `locale: "es_DO"`, imagen 1200×630 — una composición de polaroids sobre el mapa es la imagen OG natural de este sitio) + `twitter: summary_large_image`; metadata propia para `/lista`; `robots.ts` y `sitemap.ts`. Barato, impacto directo en la conversión del enlace compartido.

### 5.6 Performance: el audit cita "móviles viejos y redes flojas" pero nadie midió nada
MapLibre + tiles de Carto cargan en el primer viewport, hay 4 familias tipográficas + un stylesheet externo, y ningún `loading` diferido. No existe línea base de Core Web Vitals, así que la Fase D podría empeorar la carga sin que nadie lo note.
- **Fix:** (a) Lighthouse móvil throttled **antes de empezar y al cierre de cada fase** como línea base; (b) diferir el montaje del mapa hasta acercarse al viewport, con un póster estático debajo — **el mismo asset sirve de fallback para 1.1**, un asset y dos problemas; (c) presupuesto tipográfico: Fraunces entra cuando Inter y Plus Jakarta salen (neto sigue en 4 familias), nunca conviviendo.

### 5.7 El embudo de conversión completo quedó fuera del audit
Las capturas vieron el formulario en reposo. Nunca se auditó: estados de error por campo, "Enviando…", éxito, "ya estabas en la lista", el paso 2 de perfilado post-submit, el toggle Viajero/Negocio con sus campos condicionales, ni el flujo del QR (`/lista?ref=...`). Es la parte del sitio que paga todo lo demás.
- **Fix:** checklist manual de estados del form — {idle, focus, error, submitting, éxito, ya-registrado} × {viajero, negocio} × {tone light/dark} × {full/compact} — al cierre de Fase C y de Fase D, más una prueba real del `?ref`. Y **analítica mínima antes de Fase D** (evento de vista, submit y éxito con `source` — el prop ya existe en `SubscribeForm` esperando esto): sin línea base de conversión, nunca sabrás si el rediseño funcionó.

### 5.8 Cobertura: un solo navegador, dos páginas, sin viewport grande
`shot.mjs` captura solo Chromium headless con SwiftShader. Safari iOS — probablemente el navegador dominante del público objetivo — difiere justo en lo que este sitio más usa: `backdrop-filter` (paneles glass), `position: sticky` (el journey entero), `100vh` vs barras dinámicas. Tampoco hay viewport >1440 (1920×1080 es el desktop más común) ni móvil apaisado. Y quedaron fuera las páginas legales y el 404, que tras la Fase D quedarían con el estilo viejo.
- **Fix:** añadir 1920×1080 a la suite de capturas; verificación WebKit al cierre de Fase B y Fase D — el entorno de desarrollo es Linux (sin Safari), así que la vía es **Playwright WebKit** (mismo motor: cubre `backdrop-filter`, sticky y dvh) más una **pasada manual del propietario en un iPhone real** cuando esté disponible; incluir `(legal)` y `not-found` en el alcance del restyling de Fase D; verificación puntual de accesibilidad del journey (orden del DOM sin el mapa, `aria-hidden` en el canvas, jerarquía de headings). El skip-link ya existe y funciona.

---

## 6. Plan de ejecución

**Convenciones de ejecución (2026-08-01):** los porcentajes de avance en reportes y cierres de fase se dan **redondeados a enteros** (sin decimales). La verificación "Safari iOS" se ejecuta como Playwright WebKit en Linux + pasada manual del propietario en iPhone (ver 5.8). El hallazgo 1.3 está descartado — no tocar el H1 de /lista. La decisión de contraste (5.3) se toma botón a botón con comparativa visual, nunca en bloque.

- **Fase A — Bugs + red de seguridad (P0):** 1.1 (sin 1.3, descartado) a 1.6, más `error.tsx`/`not-found.tsx` (5.1) y el focus de los campos (5.2 — una línea). *Criterio de salida:* la home es usable sin WebGL y sin CDN (contenido fluyendo, no página en blanco); suite de capturas re-corrida sin regresiones.
- **Fase B — Layout (P1):** sección 2 completa. *Criterio de salida:* re-captura + pasada manual en Safari iOS (5.8).
- **Fase C — Sistema:** tokens de sombra/radio/tipo en `@theme` + deduplicar panel glass, PolaroidCard y Kicker (sección 4) + **decisión de contraste de botones** (5.3) + **iconos SVG propios** (5.4, adelantado desde Fase D). Hacerlo antes del restyling para que la Fase D toque un solo sitio. *Criterio de salida:* cero regresión visual en capturas; todos los CTA rellenos pasan AA; sin stylesheets externos.
- **Pre-D — Medición:** metadata OG completa (5.5), analítica mínima de conversión y línea base Lighthouse móvil (5.6, 5.7). Va antes del rediseño para poder medir su efecto.
- **Fase D — Identidad:** **primero** la tipografía (Fraunces/Instrument) con re-captura inmediata — el cambio de métricas tipográficas puede reabrir hallazgos de la sección 2, y es mejor descubrirlo al principio de la fase que al final. Después: botones (con la decisión de 5.3 ya tomada), texturas, y el resto de los 12 movimientos. Cierra extendiendo el restyle a `/lista`, páginas legales y 404 (5.8).
- **Regla transversal:** cada fase termina re-corriendo la suite de 90 capturas (+1920) y comparando contra las de este audit; el checklist del embudo (5.7) se pasa al cierre de C y D.

**Nota de verificación:** los auditores trabajaron sobre capturas con scroll instantáneo; los estados intermedios de animación se descartaron como falsos positivos vía verificadores. El hallazgo del nav laptop (1.2c) fue degradado de "corta el titular" a "solapa el arranque de la card" por el verificador — la versión aquí descrita es la verificada. Los hallazgos de la sección 5 fueron verificados contra el código fuente (archivo:línea citados) y los ratios de contraste calculados con la fórmula WCAG sobre los valores hex reales de los tokens.
