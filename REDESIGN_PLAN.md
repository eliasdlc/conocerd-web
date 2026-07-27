# ConoceRD — Plan de Rediseño v2 (16 puntos)

> Iteración sobre el scrollytelling ya implementado (ver `MAP_SCROLL_PLAN.md`).
> Este documento es el contrato de trabajo: qué se hace, dónde (archivo:línea), en qué orden y de qué depende.

---

## 0. Decisiones fijadas (confirmadas contigo)

| Tema | Decisión |
|---|---|
| Motor de scroll (#3) | **Scroll-driven progress**: la cámara del mapa y los overlays son función continua del scroll, no de bandas discretas. |
| Librería de motion | **Framer Motion** (`motion`). Cubre además el motor de scroll (`useScroll`/`useSpring`/`useTransform`) → una sola dependencia para todo. |
| Mockup teléfono (#10) | Frame rotado con **placeholder swappable**. Asset real (video/screenshot) llega después. |
| Constructor de ruta (#9) | **Alcance medio**: agregar/quitar/reordenar paradas + polilínea + resumen. |
| Taxonomía de pines (#4/#8) | **5 categorías**: naturaleza, cultura, gastronomía, aventura + **playa**. |
| Dashboard negocios (#11) | Diseño ahora con criterio; **HTML real del dashboard llega después** para ajustar fidelidad. |
| Equipo (#13) | Hover = **redes + bio extendida**; handles reales llegan después (placeholder mientras). |
| Header (#15) | **Píldora flotante sin wordmark**: solo nav + botón Descargar. |

**Decisiones que tomo yo (PAIR) y quedan anotadas:**
- #1 sombras globo = sombreado esférico realista (terminador + halo atmosférico + sombra de contacto), no un drop-shadow plano.
- #2 globo 1.5× reposicionado para no competir con el texto del hero.
- #5 = un único `src/data/destinations.ts` como fuente de verdad de coordenadas.
- #6 = chevron recorriendo la polilínea de los 6 destinos al entrar al pan-out (one-shot, no scroll).
- #16 = rutas SVG dashed coral/mango, curvas/circulares, saliendo de detrás del globo (animación de entrada).

---

## 1. Fundaciones (cross-cutting — se hacen primero, todo lo demás depende de esto)

### 1.1 Dependencia
```bash
npm install motion
```
`@21st-sdk/agent` + `zod` ya instalados (para inspiración de componentes en #7/#8/#10/#13/#14 — requiere API key, se configura al llegar ahí).

### 1.2 Capa de datos — `src/data/destinations.ts` (NUEVO) → resuelve #5
Fuente de verdad única. Editar una coordenada = un solo lugar.
```ts
export type Category = "playa" | "naturaleza" | "cultura" | "gastronomia" | "aventura";
export type Destination = {
  id: string;
  name: string;
  province: string;
  coords: [number, number];      // [lng, lat]
  category: Category;
  image: string;                 // /assets/ph-*.png
  activities: string[];
  rating: number;                // 0–5
  desc: string;
};
export const DESTINATIONS: Destination[] = [ /* unifica POLAROIDS + MAP_PINS actuales */ ];
export const SCENE_CAMERAS = { /* keyframes de cámara por escena (migra LOCATIONS) */ };
```
Migra los datos hoy duplicados en `DestinosOverlay.tsx:10-77` (POLAROIDS) y `MapaOverlay.tsx:25-44` (MAP_PINS) a este archivo. Todos los overlays + el constructor de ruta leen de aquí.

### 1.3 Sistema de pines — `src/components/map/pins/` (NUEVO) → resuelve #4
Porta los SVG de `~/Downloads/conocerd_map_pins.html` a componentes React:
- `CategoryPin.tsx` — círculo + icono. Props: `category`, `state: "default" | "upcoming" | "done"`.
  - Colores del HTML: upcoming `#FF6B35` (fill 100%), done `#43A047` (fill 78%), borde crema, sombra.
  - Iconos: naturaleza=`forest`, cultura=`account_balance`, gastronomia=`restaurant`, aventura=`hiking`, **playa=`beach_access`** (añadida), default=`place`.
- `SelfPin.tsx` — flecha mango con gradiente `#FFAA47→#F47F0E` + borde crema; rota con heading (para #9 / mockups).
- `GoalFlag.tsx` — bandera a cuadros (meta / última parada).

Se usan como `<MarkerContent>` en Destinos, Mapa y constructor de ruta.

### 1.4 Motor de scroll — `src/hooks/useJourneyScroll.ts` (NUEVO) → resuelve #3
Reemplaza `useSceneTrigger.ts` (detección por bandas, la causa raíz).

**Diagnóstico de la causa raíz (medido en código):**
- `useSceneTrigger.ts:32-35` → escena = banda donde cae el centro del viewport. Discreto.
- Caso real A (*"scrollear mucho sin que pase nada"*): bandas de 120–140vh (`MapScrollJourney.tsx:26-29`); dentro de una banda el estado no cambia → dwell muerto de ~1 viewport.
- Caso real B (*"se salta secciones"*): un fling mueve el ancla por 2–3 bandas en un frame; solo corre el `flyTo` final (`MapScrollJourney.tsx:107`, dur. 2200ms) y los intermedios se pisan → saltos visuales.

**Diseño nuevo (scroll-linked + damping):**
```
useScroll({ target: journeyRef, offset: ["start start", "end end"] })  // Framer Motion
  → scrollYProgress (0..1 en toda la pista)
  → useSpring(scrollYProgress, { stiffness, damping })                  // suaviza el fling → mata la "sensibilidad"
  → derivar segmento de escena + progreso local 0..1
  → interpolar keyframes de cámara (center/zoom/pitch/bearing) con easing
  → map.jumpTo(camaraInterpolada)  en cada frame
```
- La cámara es **función continua del scroll** → no hay dwell muerto (siempre se mueve) ni saltos (es continua aunque scrollees rápido).
- El `useSpring` amortigua el trackpad → se acaba la sensación de "muy sensible".
- Los overlays consumen el **mismo progreso por escena** (un `MotionValue`) para entrar/salir, en vez de un booleano `isVisible`.
- Se mantiene la estructura de pista (`MapScrollJourney.tsx:111-160`) pero las alturas se recalibran para que el "tiempo en cámara" sea parejo.

**Validación obligatoria antes de seguir:** reproducir Caso A y Caso B (fling de trackpad + scroll lento) y confirmar que desaparecen. Es el cambio más arriesgado → se hace temprano y se verifica con el dev server.

---

## 2. Plan por punto (agrupado)

### HERO

**#2 — Globo 1.5×** · `HeroSection.tsx:67` (`GlobeOrb`)
- `width: clamp(300px,58vw,600px)` → `clamp(450px,80vw,880px)` (×1.5, con tope de viewport).
- Reposicionar para que no tape el texto (hoy centrado detrás del contenido, `:64-66`). Mantener gradiente sand de fondo (`:117`) para legibilidad.

**#1 — Sombras realistas del globo** · `HeroSection.tsx:58-97`
- Capa overlay sobre el canvas del orbe con `radial-gradient` que oscurece el borde inferior-derecho (terminador) → da volumen de esfera.
- Halo atmosférico (glow teal/cian sutil) en el borde.
- Sombra de contacto: elipse difuminada (`filter: blur`) debajo del orbe.
- Todo en divs absolutos hermanos del `<Map>`, no tocan el canvas.

**#16 — SVG path animations de entrada** · `HeroSection.tsx` (nuevo `<HeroRays>` detrás del globo)
- `motion.path` con `pathLength` + `strokeDasharray` animado: rutas dashed coral `#F76C4D` / mango `#FF8D16`, curvas/circulares "random", que parecen salir de detrás del globo.
- **Solo entrada** (no reacciona al scroll). `zIndex` por debajo del globo y del texto.
- Reemplaza conceptualmente al viejo `AnimatedRays` (ya borrado).

### DESTINOS

**#7 — Card deck de polaroids** · `DestinosOverlay.tsx:191-275`
- Al terminar el pan de polaroids quedan apiladas → convertir la pila en **deck interactivo**.
- Desktop: click en la polaroid de enfrente → se va hacia atrás (animación de carta), las demás avanzan, cicla. Estado = array de orden; Framer Motion `layout` + `AnimatePresence` para el reordenamiento.
- Mobile: se mantiene la degradación a fila horizontal scrolleable.

**#6 — Chevron siguiendo la ruta en el pan-out** · `DestinosOverlay` + `MapScrollJourney`
- Al entrar a `destinos-finale` (mapa en `rdOverview` con los 6 pines), one-shot: un **chevron viaja por la polilínea** que une los 6 destinos en orden.
- `MapRoute` (dashed) para la línea + un `<MapMarker>` cuya posición se interpola a lo largo de las coords del path con un tween (Framer Motion / rAF). No reacciona al scroll; se dispara una vez al activarse la escena.

### MAPA — "Arma tu recorrido"

**#4/#8 — Pines correctos + card hover con punta** · `MapaOverlay.tsx:71-96`
- Reemplazar los dots planos (`:78-92`) por `CategoryPin` (1.3).
- Hover sobre pin → **card con punta (tail)** apuntando al pin, mostrando: nombre, ubicación (provincia), imagen, actividades, rating. Datos de `destinations.ts`.
- Implementación: `MapMarker` + estado hover → card posicionada con triángulo CSS apuntando al punto.

**#9 — Constructor de ruta (alcance medio)** · `MapaOverlay.tsx` (extender)
- Click en pin → agrega parada (ordenada). `MapRoute` dibuja la polilínea entre paradas en orden.
- Panel lateral: lista de paradas con quitar/reordenar + resumen (nº paradas, distancia aprox. por haversine).
- Da la sensación de "probar crear una ruta" sin clonar la app.
- Reutiliza `SelfPin`/`GoalFlag` para inicio/meta.

### VIAJEROS

**#10 — Quitar stats → mockup de teléfono** · `ViajerosOverlay.tsx`
- Eliminar `STAT_BUBBLES` (`:17-21`, markers `:114-124`) y los stat-chips (`:193-237`).
- Añadir **frame de teléfono a la derecha**, rotado **15° a la derecha (rotateY) + 15° hacia arriba (rotateX)** con `perspective`. Pantalla = placeholder swappable (video/img). Mapa queda visible al centro.
- Las 4 feature cards (`FEATURES`, `:10-15`) se mantienen a la izquierda.

### NEGOCIOS

**#11 — Quitar dots pulsantes + líneas desde provincias + dashboard fiel** · `NegociosOverlay.tsx`
- Eliminar `HEAT_CITIES` glow pulsante (`:22-25`, markers `:100-122`).
- Pin **"Tu negocio"** (`CategoryPin`/storefront) en Santiago.
- **Arcos animados** desde varias provincias convergiendo al negocio = "personas en camino". Nuevo helper `MapArc` (curva + flujo dashed en movimiento). El nº de arcos se refleja en el dashboard ("Clientes en camino ahora").
- Dashboard (`:294-477`): mejorar fidelidad, pero version mini para que pueda caber en la pantalla sin cubrir mucho espacio. **Ajuste fino del HTML.**  [ConoceRD Dashboard.html](../../../Downloads/ConoceRD Dashboard.html) 

**#12 — Subir columna izquierda (botón recortado)** · `NegociosOverlay.tsx:136-145`

- Hoy `top:50%; translateY(-50%)` → el botón "Registrar mi negocio" (`:269`) se corta abajo.
- Subir el anclaje / reflujar para que la columna completa entre en viewport.

### EQUIPO

**#13 — Pin PUCMM + rediseño de card + hover detalle** · `EquipoOverlay.tsx`
- Pin sobre PUCMM (`:41-65`) tapado por las cards → reposicionar cards más abajo o el pin más arriba para que se vea (o ambos).
- Rediseño de card: jerarquía **imagen → nombre → posición → descripción** (layout vertical, hoy es horizontal `:153-231`). **Imagen más grande** (avatar grande; foto real cuando la mandes, hoy iniciales).
- Hover → expandir con **redes sociales + bio extendida** (links placeholder hasta tener handles).

### FOOTER / HEADER

**#14 — Footer rediseñado** · `Footer.tsx` (reescritura completa)
- Hoy solo wordmark + 3 social falsos (`href="#"`, `:21-31`) + email. Sin info útil.
- Nuevo: columnas con marca+tagline, nav (Destinos/Mapa/Viajeros/Negocios/Equipo), producto (Descargar iOS/Android, Soy negocio), contacto (email, ubicación), social real (después), legal (© + privacidad).

**#15 — Header flotante** · `Nav.tsx` (reescritura)
- Píldora flotante **sin wordmark** (`:46-48`): solo nav links + botón Descargar.
- Mantener/adaptar la lógica de fondo al hacer scroll (`:10-27`).

---

## 2.bis — Navegación móvil por pasos (decisión posterior al #3)

El motor de scroll continuo se mantiene **solo en desktop**. En móvil el scroll libre
rompe el scrollytelling: un flick se salta escenas, un scroll corto deja la cámara a
medio vuelo y el encuadre diseñado nunca llega a verse.

| Pieza | Archivo | Qué hace |
|---|---|---|
| Motor desktop | `hooks/useJourneyScroll.ts` | scroll → spring → progreso 0..1 |
| Motor móvil | `hooks/useJourneySteps.ts` | flechas/swipe → `animate()` entre `center`s de escena |
| Escritura de cámara | `lib/journeyCamera.ts` | único `jumpTo` del proyecto (los dos motores + la rotación en reposo pasan por aquí) |
| Control móvil | `components/JourneyStepper.tsx` | píldora fija abajo: prev/next + 7 capítulos tocables |

Decisiones fijadas:
- **Keyframes móviles explícitos** (`SCENE_CAMERAS[x].mobile`): a igual zoom, 390px muestra
  menos de la mitad de la isla. No se derivan del desktop con una fórmula.
- **Zona segura por escena** (`padBottom`/`padLeft` en `lib/journey.ts`): la cámara centra
  la escena en el área libre del overlay, vía `padding` de MapLibre.
- **Perfil de vuelo tipo `flyTo`**: arco de zoom + centro a velocidad constante en pantalla,
  para que los saltos largos entre destinos no barran el suelo a ciegas.
- **Bloqueo de scroll** con `overflow:hidden` en `<html>` + `<body>`, no con `touch-action`
  (anularía el scroll interno de los bottom-sheets). Se libera en la última escena para
  bajar al footer y se re-bloquea al volver arriba.
- Breakpoint único **767px** (`MOBILE_BREAKPOINT`) para cámara, layout de paneles y nav.

---

## 3. Secuencia (commits atómicos, sitio renderizable en cada paso)

| Fase | Contenido | Puntos |
|---|---|---|
| **0** | `npm install motion` | — |
| **1** | Capa de datos `destinations.ts` | #5 |
| **2** | Sistema de pines `map/pins/` | #4 |
| **3** | **Motor de scroll** `useJourneyScroll` + migrar overlays + **verificar Casos A/B** | #3 |
| **4** | Hero: globo 1.5× + sombras + SVG rays | #2, #1, #16 |
| **5** | Destinos: card deck + chevron | #7, #6 |
| **6** | Mapa: pines + hover cards + constructor de ruta | #8, #9 |
| **7** | Viajeros: mockup teléfono | #10 |
| **8** | Negocios: arcos + pin + subir columna | #11, #12 |
| **9** | Equipo: pin + rediseño card + hover | #13 |
| **10** | Footer + Header | #14, #15 |
| **11** | Pulido, mobile, swap de assets reales | todos |

Orden elegido: fundaciones primero (todo depende de datos+pines+motor), luego el motor de scroll (lo más arriesgado, se verifica temprano), después secciones de menor a mayor riesgo.

---

## 4. Assets pendientes (no bloquean empezar; se hacen con placeholder y se swappean)
- **#10** Video/screenshot de la app corriendo (mockup teléfono).
- **#11** HTML del dashboard real (para igualar fidelidad).
- **#13** Handles de redes + fotos del equipo (Brauny + Elías).

## 5. Tooling
- **Skills:** `scrollytelling` + `frontend-design` (built-in). Referencia opcional: `github/awesome-copilot@gsap-framer-scroll-animation` (partes de Framer).
- **21st.dev** (`@21st-sdk/agent`): inspiración de componentes para #7 (deck), #8 (tooltip card), #10 (phone frame), #13 (team card), #14 (footer). **Requiere API key** → la pido al llegar a esas fases.

---

*Fin del plan. Cada fase = uno o varios commits atómicos (Conventional Commits). Verificar en dev server tras la Fase 3.*
