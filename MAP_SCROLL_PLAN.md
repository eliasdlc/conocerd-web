# ConoceRD — Map Scrollytelling Redesign Plan

## Vision

Replace the current horizontal scroll journey with a full-screen vertical scrollytelling experience where a MapLibre GL map is the permanent background of the entire site (below the hero). As the user scrolls, the map animates (flyTo) to different provinces and locations in the Dominican Republic, and content overlays fade in/out on top of the map. The map is the narrative backbone of the landing page.

The product is ConoceRD — a GPS navigation app for discovering authentic, local places in the Dominican Republic. The scrollytelling experience must feel like a tour of the country, building excitement and showcasing the diversity of RD before asking the user to download the app.

---

## Design Language

Keep all existing brand values exactly:

| Token | Value | Usage |
|---|---|---|
| `coral` | `#F76C4D` | Primary CTA, accents |
| `mango` | `#FF8D16` | Secondary accent |
| `mint` | `#25CCB8` | Features, viajeros |
| `ocean` | `#264653` | Headings, dark text |
| `sand` | `#FDF8F0` | Background base |
| `stone` | `#7A8A91` | Body text |
| `border` | `#EBE6D9` | Card borders |

Fonts: `Plus Jakarta Sans` (headings/UI), `Caveat` (handwritten labels on map), `JetBrains Mono` (stats/metadata).

Map style: **light**, using Carto Positron as base. Do NOT use the dark map style. The map must feel warm and match `#FDF8F0` — the sand background. Carto Positron is off-white/light which harmonizes naturally. Layer custom brand colors on top via MapLibre paint properties (see Map Style section).

---

## Architecture Overview

### Before (current)
```
<Nav />
<HeroSection />       ← standalone section, 100vh
<HorizontalJourney>   ← converts vertical scroll to horizontal translateX
  <DestinosSection />
  <MapaSection />
  <ViajerosSection />
  <NegociosSection />
  <EquipoSection />
  <CTASection />
</HorizontalJourney>
```

### After (target)
```
<Nav />                          ← modified (vertical scroll nav)
<HeroSection />                  ← modified (globe orb added, AnimatedRays removed)
<MapScrollJourney>               ← NEW: replaces HorizontalJourney entirely
  <Map />                        ← sticky, 100vh, full width, always visible
  <SceneTrigger scene="destinos-intro" />
  <SceneTrigger scene="polaroid-0" />   ← Bahía de las Águilas
  <SceneTrigger scene="polaroid-1" />   ← Pico Duarte
  <SceneTrigger scene="polaroid-2" />   ← Salto El Limón
  <SceneTrigger scene="polaroid-3" />   ← 27 Charcos
  <SceneTrigger scene="polaroid-4" />   ← Constanza
  <SceneTrigger scene="polaroid-5" />   ← Los Haitises
  <SceneTrigger scene="destinos-finale" />
  <SceneTrigger scene="mapa" />
  <SceneTrigger scene="viajeros" />
  <SceneTrigger scene="negocios" />
  <SceneTrigger scene="equipo" />
  <SceneTrigger scene="cta" />
  {/* Overlay layer — content rendered above map */}
  <DestinosOverlay />
  <MapaOverlay />
  <ViajerosOverlay />
  <NegociosOverlay />
  <EquipoOverlay />
  <CTAOverlay />
</MapScrollJourney>
```

---

## Dependencies to Install

```bash
npm install maplibre-gl
npm install @types/maplibre-gl   # if needed
```

The map wrapper component (see below) uses `maplibre-gl` directly. Do NOT install `react-map-gl` or `@maplibre/maplibre-gl-react` — use the custom wrapper provided.

---

## Files to Create

| File | Purpose |
|---|---|
| `src/components/map/Map.tsx` | The full map wrapper component (provided below) |
| `src/components/MapScrollJourney.tsx` | Main scroll container with sticky map |
| `src/components/overlays/DestinosOverlay.tsx` | Polaroid pile mechanic |
| `src/components/overlays/MapaOverlay.tsx` | Full RD pins and filter chips |
| `src/components/overlays/ViajerosOverlay.tsx` | Stats bubbles + feature cards |
| `src/components/overlays/NegociosOverlay.tsx` | Dashboard card + city heat viz |
| `src/components/overlays/EquipoOverlay.tsx` | Team cards |
| `src/components/overlays/CTAOverlay.tsx` | Download CTA |
| `src/context/SceneContext.tsx` | React context exposing current scene name |
| `src/hooks/useSceneTrigger.ts` | IntersectionObserver hook for scene activation |

## Files to Modify

| File | Change |
|---|---|
| `src/app/page.tsx` | Already just renders `<JourneyHome />`, no change |
| `src/components/JourneyHome.tsx` | Replace `<HorizontalJourney>` with `<MapScrollJourney>` |
| `src/components/HeroSection.tsx` | Remove `<AnimatedRays />`, add globe orb |
| `src/components/Nav.tsx` | Replace `scrollToSection` calls with direct `scrollIntoView` to scene trigger divs |
| `src/lib/journeyNav.ts` | Simplify: remove HorizontalJourney API, just do `getElementById + scrollIntoView` |

## Files to Delete

| File | Reason |
|---|---|
| `src/components/HorizontalJourney.tsx` | Replaced by MapScrollJourney |
| `src/components/MapaSection.tsx` | Replaced by MapaOverlay |
| `src/components/DestinosSection.tsx` | Replaced by DestinosOverlay |
| `src/components/ViajerosSection.tsx` | Replaced by ViajerosOverlay |
| `src/components/NegociosSection.tsx` | Replaced by NegociosOverlay |
| `src/components/EquipoSection.tsx` | Replaced by EquipoOverlay |
| `src/components/CTASection.tsx` | Replaced by CTAOverlay |
| `src/components/ui/AnimatedRays.tsx` | Removed from hero |
| `src/components/journey/` | Entire directory: JourneyTrace, PathEditor, JourneyContext, variants, PreviewSwitcher — all obsolete |

---

## The Map Wrapper Component

The file `src/components/map/Map.tsx` is a pre-written, comprehensive MapLibre GL React wrapper. It was NOT written for this project specifically — it is a generic reusable component. Copy it as-is into the project.

Key exports from `Map.tsx`:
- `<Map>` — main map component. Props: `theme`, `styles`, `projection`, `viewport`, `onViewportChange`, `loading`. Use `ref` to get the `MapLibreGL.Map` instance.
- `<MapMarker>` + `<MarkerContent>` + `<MarkerPopup>` + `<MarkerTooltip>` + `<MarkerLabel>` — for placing pins.
- `<MapControls>` — zoom, compass, locate, fullscreen controls.
- `<MapPopup>` — standalone popup not attached to a marker.
- `<MapRoute>` — draws a GeoJSON LineString on the map.
- `<MapArc>` — draws curved arcs between points (not needed in MVP).
- `<MapClusterLayer>` — clusters many GeoJSON points automatically.
- `useMap()` — hook for child components to access map instance.

For this project we primarily use: `<Map>`, `<MapMarker>`, `<MarkerContent>`, `<MarkerLabel>`, `<MapControls>`.

---

## Map Configuration

### Base Style

```typescript
// Use Carto Positron (light) — warm off-white, matches #FDF8F0
const MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
```

Pass `theme="light"` to `<Map>` so it always uses Positron regardless of system dark mode. Never use the dark style.

### Initial Viewport (starting state when map mounts)

```typescript
const INITIAL_VIEWPORT = {
  center: [-70.1627, 18.7357] as [number, number],  // center of Dominican Republic
  zoom: 2.5,                                          // globe/Caribbean-wide view
  bearing: 0,
  pitch: 0,
};
```

### Globe Projection

The map uses `{ type: "globe" }` projection initially. MapLibre automatically transitions to Mercator as zoom increases (around zoom 10+). Set `projection={{ type: "globe" }}` on the `<Map>` component.

### Map Layer Customization (post-load, via map.setPaintProperty)

After the map loads, apply these paint overrides to align with brand colors:

```typescript
// Water bodies — match #25CCB8 tinted very lightly
map.setPaintProperty("water", "fill-color", "#c8ede9");

// Land (background of RD and other islands) — keep Positron's default near-white, it's fine
// No override needed for land.

// Dominican Republic border — highlight with ocean color
// Note: Positron has an "admin" layer for country borders
map.setPaintProperty("admin_country", "line-color", "#264653");
map.setPaintProperty("admin_country", "line-width", 2);
```

These are applied once on `map "load"` event and persist across `flyTo` calls.

---

## Dominican Republic — Key Coordinates

All coordinates are `[longitude, latitude]` (GeoJSON order).

```typescript
const LOCATIONS = {
  // Full country view
  rdOverview:   { center: [-70.35, 18.85] as [number, number], zoom: 7.2,  pitch: 0,  bearing: 0   },

  // Hero globe (Caribbean view)
  caribbean:    { center: [-69.50, 17.50] as [number, number], zoom: 4.5,  pitch: 20, bearing: 10  },

  // Polaroid locations (flyTo targets)
  bahiaAquilas: { center: [-71.77, 17.89] as [number, number], zoom: 11.5, pitch: 45, bearing: -20 },
  picoDuarte:   { center: [-70.99, 19.05] as [number, number], zoom: 10.5, pitch: 50, bearing: 15  },
  saltoLimon:   { center: [-69.58, 19.15] as [number, number], zoom: 11.0, pitch: 40, bearing: 5   },
  charcos27:    { center: [-70.58, 19.62] as [number, number], zoom: 11.5, pitch: 35, bearing: -10 },
  constanza:    { center: [-70.72, 18.91] as [number, number], zoom: 11.5, pitch: 50, bearing: 20  },
  losHaitises:  { center: [-69.66, 19.13] as [number, number], zoom: 11.0, pitch: 30, bearing: 0   },

  // Viajeros — slightly zoomed out to show RD + Caribbean context
  rdCaribbean:  { center: [-70.35, 18.85] as [number, number], zoom: 6.5,  pitch: 0,  bearing: 0   },

  // Negocios — frame between Santiago and Santo Domingo
  rdNorth:      { center: [-70.30, 19.00] as [number, number], zoom: 8.5,  pitch: 20, bearing: 0   },

  // Equipo — zoom into Santiago de los Caballeros
  santiago:     { center: [-70.6901, 19.4517] as [number, number], zoom: 12.5, pitch: 30, bearing: 5 },

  // CTA — back to globe/Caribbean
  globeOut:     { center: [-69.00, 17.00] as [number, number], zoom: 3.5,  pitch: 15, bearing: -5  },
};
```

**`pitch`** creates a dramatic tilt (horizon visible). Use high pitch (40–50°) for scenic flyTo moments. Use 0° pitch for data-heavy views (Viajeros, Mapa overview) where the flat map is more legible.

**`flyTo` speed:** use `duration: 2200` for scene transitions. Use `duration: 1600` for polaroid sub-transitions. Use `duration: 3500` for the final globe zoom-out on CTA (feels cinematic).

---

## Scroll Mechanics — How Scenes Are Triggered

### Container Structure

`<MapScrollJourney>` renders:
1. A `<div style={{ position: "relative" }}>` outer container. Its `height` is `100vh + (number_of_scenes * scene_height_vh)`. This is the "scroll track."
2. Inside: a `<div style={{ position: "sticky", top: 0, height: "100vh", width: "100vw" }}>` that contains the `<Map>` and all overlay components.
3. Below the sticky div (but inside the outer): a series of invisible `<SceneTrigger>` divs spaced vertically. These are what scroll past the viewport and trigger scene changes.

### SceneTrigger Divs

Each `<SceneTrigger scene="name" />` renders a `<div style={{ height: "100vh", pointerEvents: "none" }} id="trigger-{scene}" />`. They are stacked vertically inside the outer container, below the sticky div.

Heights per scene (how long you "dwell" in each scene before scroll advances it):
```
destinos-intro:    80vh   ← brief RD overview before polaroids start
polaroid-0:       100vh   ← dwell on Bahía de las Águilas
polaroid-1:       100vh   ← dwell on Pico Duarte
polaroid-2:       100vh   ← dwell on Salto El Limón
polaroid-3:       100vh   ← dwell on 27 Charcos
polaroid-4:       100vh   ← dwell on Constanza
polaroid-5:       100vh   ← dwell on Los Haitises
destinos-finale:   80vh   ← all polaroids visible, map zooms back to full RD
mapa:             120vh   ← interactive map with pins
viajeros:         120vh   ← stats and features
negocios:         140vh   ← dashboard + city heat
equipo:           100vh   ← team cards
cta:              100vh   ← download CTA

Total: ~1240vh of scroll track
```

### IntersectionObserver Pattern

```typescript
// useSceneTrigger.ts
// Watch each trigger div. When it enters the viewport (from bottom),
// set that scene as active. This fires the map flyTo.
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const sceneName = entry.target.getAttribute("data-scene");
        setActiveScene(sceneName);
      }
    });
  },
  {
    threshold: 0,
    rootMargin: "0px 0px -40% 0px",  // trigger fires when element is 40% from bottom
  }
);
```

### Scene → Map Viewport Mapping

When `activeScene` changes, call `map.flyTo(LOCATIONS[sceneViewport])`:

```
"destinos-intro"   → rdOverview
"polaroid-0"       → bahiaAquilas
"polaroid-1"       → picoDuarte
"polaroid-2"       → saltoLimon
"polaroid-3"       → charcos27
"polaroid-4"       → constanza
"polaroid-5"       → losHaitises
"destinos-finale"  → rdOverview
"mapa"             → rdOverview (same, but pins layer activates)
"viajeros"         → rdCaribbean
"negocios"         → rdNorth
"equipo"           → santiago
"cta"              → globeOut
```

---

## SECTION 1: HERO — Modified

### What Changes
- **Remove:** `<AnimatedRays />` import and render entirely.
- **Remove:** The `AnimatedRays.tsx` file.
- **Add:** A globe orb to the right side of the hero content.

### Globe Orb in Hero

The globe orb is a `<div>` with `border-radius: 50%` and `overflow: hidden` that contains a small `<Map>` instance. This is a SEPARATE map instance from the main scrollytelling map — it's decorative only, in the hero.

```typescript
// Inside HeroSection, alongside the central content div:
<div
  style={{
    position: "absolute",
    right: "clamp(20px, 8vw, 140px)",
    top: "50%",
    transform: "translateY(-50%)",
    width: "clamp(240px, 30vw, 460px)",
    height: "clamp(240px, 30vw, 460px)",
    borderRadius: "50%",
    overflow: "hidden",
    boxShadow: "0 30px 80px rgba(38,70,83,0.22), 0 0 0 1px rgba(38,70,83,0.08)",
    zIndex: 4,
  }}
>
  <Map
    theme="light"
    projection={{ type: "globe" }}
    initialViewState={{
      longitude: -70.1627,
      latitude: 18.7357,
      zoom: 2.5,
      pitch: 20,
      bearing: 0,
    }}
    interactive={false}   // not interactive, decorative only
    attributionControl={false}
    scrollZoom={false}
    dragPan={false}
    dragRotate={false}
    touchZoomRotate={false}
  />
</div>
```

The decorative map slowly auto-rotates. Achieve this with a `useEffect` on the map ref:
```typescript
// After map loads, start slow auto-rotation
mapRef.current?.on("load", () => {
  let bearing = 0;
  const rotate = () => {
    bearing -= 0.06; // very slow
    mapRef.current?.setBearing(bearing);
    requestAnimationFrame(rotate);
  };
  requestAnimationFrame(rotate);
});
```

On mobile (`max-width: 768px`): hide the globe orb entirely with `display: none`. The hero goes back to centered text only.

### Layout of Hero (desktop)

```
┌─────────────────────────────────────────────────────┐
│ [Nav]                                               │
│                                                     │
│  [bird.svg top-left]          [palm.svg bot-right]  │
│                                                     │
│  ┌─── central content ──┐    ╭──── globe orb ────╮  │
│  │  [logo.png]           │    │                   │  │
│  │                       │    │   MapLibre Globe   │  │
│  │  "La app que te lleva │    │   slowly rotating  │  │
│  │   a la RD auténtica"  │    │                   │  │
│  │                       │    │                   │  │
│  │  [Descargar] [Negocios│    ╰───────────────────╯  │
│  └───────────────────────┘                          │
│                                                     │
│  ↓ Explora  (scroll cue)                            │
└─────────────────────────────────────────────────────┘
```

The existing `background: radial-gradient(...)` on the `<section>` stays — it's the warm sand gradient that harmonizes with the globe.

---

## SECTION 2: MapScrollJourney Container

`MapScrollJourney.tsx` is the new root component that replaces `HorizontalJourney`. It manages:
1. The `SceneContext` (current active scene string)
2. The sticky `<Map>` layer
3. All overlay components (positioned absolute/fixed inside sticky)
4. All `<SceneTrigger>` divs (invisible scroll triggers)

### Provider

```typescript
// SceneContext.tsx
type SceneContextValue = {
  activeScene: string;
  setActiveScene: (scene: string) => void;
};
const SceneContext = createContext<SceneContextValue>(...);
```

All overlays consume `useContext(SceneContext)` to know when they should be visible and animated in.

### Map Instance

`MapScrollJourney` holds the single `<Map ref={mapRef}>` instance that persists for the entire scroll experience. This map is `position: sticky; top: 0; height: 100vh; width: 100%;`.

When `activeScene` changes, `MapScrollJourney` calls `mapRef.current.flyTo(...)` with the appropriate viewport from `LOCATIONS`.

---

## SECTION 3: DESTINOS — Polaroid Province Tour

### Overview

This is the most complex section. It replaces `DestinosSection.tsx` entirely. The map acts as the backdrop; polaroid cards fly in one by one as the user scrolls.

### Data (same 6 polaroids, with geo coordinates added)

```typescript
const POLAROIDS = [
  {
    id: "aguilas",
    src: "/assets/ph-playa.png",
    rotate: -4,
    name: "Bahía de las Águilas",
    meta: "Pedernales · 17.88°N",
    icon: "beach_access",
    chip: "Playa virgen",
    desc: "8 km de arena sin un solo edificio.",
    scene: "polaroid-0",
    mapCoords: [-71.77, 17.89] as [number, number],
  },
  {
    id: "duarte",
    src: "/assets/ph-montana.png",
    rotate: 3,
    name: "Pico Duarte",
    meta: "La Vega · 3,098 m",
    icon: "landscape",
    chip: "Montaña",
    desc: "El techo del Caribe, a tu alcance.",
    scene: "polaroid-1",
    mapCoords: [-70.99, 19.05] as [number, number],
  },
  {
    id: "limon",
    src: "/assets/ph-cascada.png",
    rotate: -2,
    name: "Salto El Limón",
    meta: "Samaná · 40 m",
    icon: "water_drop",
    chip: "Cascada",
    desc: "A caballo entre montañas verdes.",
    scene: "polaroid-2",
    mapCoords: [-69.58, 19.15] as [number, number],
  },
  {
    id: "charcos",
    src: "/assets/ph-rio.png",
    rotate: 4,
    name: "27 Charcos",
    meta: "Puerto Plata · Damajagua",
    icon: "kayaking",
    chip: "Ecoturismo",
    desc: "Salta y nada entre cascadas turquesa.",
    scene: "polaroid-3",
    mapCoords: [-70.58, 19.62] as [number, number],
  },
  {
    id: "constanza",
    src: "/assets/ph-pueblo.png",
    rotate: -3,
    name: "Constanza",
    meta: "La Vega · 1,200 m",
    icon: "cottage",
    chip: "Pueblo & valle",
    desc: "Clima fresco, fresas y pinares.",
    scene: "polaroid-4",
    mapCoords: [-70.72, 18.91] as [number, number],
  },
  {
    id: "haitises",
    src: "/assets/ph-sunset.png",
    rotate: 2,
    name: "Los Haitises",
    meta: "Samaná · Parque Nacional",
    icon: "forest",
    chip: "Naturaleza",
    desc: "Manglares, cuevas y cayos en bote.",
    scene: "polaroid-5",
    mapCoords: [-69.66, 19.13] as [number, number],
  },
];
```

### The "Pile" Mechanic — Detailed Behavior

The polaroids accumulate on the lower-left quadrant of the screen, overlapping like a physical stack of photos.

**State:** `DestinosOverlay` tracks `visibleCount` — how many polaroids have been revealed so far. It reads `activeScene` from `SceneContext`.

```
activeScene === "destinos-intro"  → visibleCount = 0  (no polaroids)
activeScene === "polaroid-0"      → visibleCount = 1  (first drops in)
activeScene === "polaroid-1"      → visibleCount = 2
...
activeScene === "polaroid-5"      → visibleCount = 6
activeScene === "destinos-finale" → visibleCount = 6  (all visible, map zooms out)
activeScene starts "mapa"         → visibleCount fades to 0 (all fade out together)
```

**Position of each polaroid in the pile:**
Each card has a fixed position in the lower-left of the viewport. Cards are `position: absolute` relative to the sticky container. They overlap each other slightly. The exact offsets create the "scattered pile" look:

```typescript
const PILE_OFFSETS = [
  { left: "4%",  bottom: "8%",  extraRotate: 0   },   // polaroid 0
  { left: "7%",  bottom: "6%",  extraRotate: -1  },   // polaroid 1 (slightly overlapping)
  { left: "5%",  bottom: "10%", extraRotate: 1.5 },   // polaroid 2
  { left: "9%",  bottom: "7%",  extraRotate: -2  },   // polaroid 3
  { left: "3%",  bottom: "12%", extraRotate: 0.5 },   // polaroid 4
  { left: "8%",  bottom: "9%",  extraRotate: -1  },   // polaroid 5
];
```

The final rotation of each polaroid = its original `rotate` value + its `extraRotate` from the pile offset. This creates natural scattered variety.

**Drop-in animation:**
When a polaroid becomes visible (index < visibleCount), it animates:
```css
/* Initial state */
transform: translateY(-120px) rotate(var(--r)) scale(0.85);
opacity: 0;

/* Final state (when visible) */
transform: translateY(0) rotate(var(--r)) scale(1);
opacity: 1;

transition: transform 0.55s cubic-bezier(0.2, 0.8, 0.3, 1), opacity 0.4s ease;
```
The card "drops" from above and settles. It feels like physically placing a photo.

**Section heading:**

The heading from the original `DestinosSection` appears ABOVE the polaroid pile, also in the lower-left, fading in with the first polaroid:
```
"Hidden gems · Lo nuestro"          ← small uppercase label in mint
"Recuerdos que aún no has vivido"   ← h2 in ocean color
```

It does NOT appear as a centered section header anymore — it's a smaller floating label in the overlay.

**Map pin per polaroid:**

When a polaroid activates, a `<MapMarker>` is added at its `mapCoords`. The marker content is a simple glow dot in coral color, with a `<MarkerLabel>` showing the location name.

```typescript
// Inside DestinosOverlay or MapScrollJourney
POLAROIDS.filter((_, i) => i < visibleCount).map(pol => (
  <MapMarker longitude={pol.mapCoords[0]} latitude={pol.mapCoords[1]}>
    <MarkerContent>
      <div style={{
        width: 14, height: 14,
        background: "#F76C4D",
        borderRadius: "50%",
        border: "2.5px solid #fff",
        boxShadow: "0 0 0 6px rgba(247,108,77,0.25)",
      }} />
    </MarkerContent>
    <MarkerLabel position="top">{pol.name}</MarkerLabel>
  </MapMarker>
))
```

---

## SECTION 4: MAPA — Full RD Overview (New)

This replaces the old `MapaSection` entirely. When `activeScene === "mapa"`, the overlay shows:

### Content Overlay (bottom-left, glassmorphism card)

```
┌────────────────────────┐
│  Arma tu recorrido     │  ← small heading
│                        │
│  🟠  🟢  🔴  🔵  🟡   │  ← category filter chips
│  Playas Natural Gastro │
└────────────────────────┘
```

Card styling: white with `backdrop-filter: blur(16px)`, `background: rgba(253,248,240,0.88)`, `border: 1px solid #EBE6D9`, `border-radius: 20px`, `padding: 18px 20px`.

### Map Pins

When this scene is active, display ~18-20 pins across RD representing diverse places. They use `<MapClusterLayer>` with the GeoJSON FeatureCollection of all places. Or alternatively manual `<MapMarker>` components for each pin category.

Category colors:
- Playas (`beach_access`): `#25CCB8` teal
- Naturaleza (`forest`): `#4CAF50` green
- Gastronomía (`restaurant`): `#F76C4D` coral
- Cultura (`account_balance`): `#2D9CDB` blue
- Aventura (`kayaking`): `#FF8D16` mango

Suggested pin locations (spread across RD for visual balance):
```typescript
const MAP_PINS = [
  // Playas
  { name: "Bahía de las Águilas", lng: -71.77, lat: 17.89,  category: "playa"     },
  { name: "Playa Rincón",         lng: -69.55, lat: 19.33,  category: "playa"     },
  { name: "Playa Frontón",        lng: -69.47, lat: 19.38,  category: "playa"     },
  { name: "Las Terrenas",         lng: -69.54, lat: 19.30,  category: "playa"     },
  // Naturaleza
  { name: "Los Haitises",         lng: -69.66, lat: 19.13,  category: "naturaleza"},
  { name: "Pico Duarte",          lng: -70.99, lat: 19.05,  category: "aventura"  },
  { name: "Salto El Limón",       lng: -69.58, lat: 19.15,  category: "naturaleza"},
  { name: "27 Charcos",           lng: -70.58, lat: 19.62,  category: "aventura"  },
  { name: "Lago Enriquillo",      lng: -71.62, lat: 18.48,  category: "naturaleza"},
  { name: "Constanza",            lng: -70.72, lat: 18.91,  category: "naturaleza"},
  // Gastronomía
  { name: "Santiago",             lng: -70.70, lat: 19.45,  category: "gastro"    },
  { name: "Zona Colonial",        lng: -69.89, lat: 18.47,  category: "cultura"   },
  { name: "Cabarete",             lng: -70.40, lat: 19.76,  category: "aventura"  },
  // Cultura
  { name: "Altos de Chavón",      lng: -68.97, lat: 18.42,  category: "cultura"   },
  { name: "Jarabacoa",            lng: -70.64, lat: 19.11,  category: "aventura"  },
  { name: "Barahona",             lng: -71.10, lat: 18.21,  category: "playa"     },
  { name: "Puerto Plata",         lng: -70.69, lat: 19.79,  category: "cultura"   },
  { name: "La Romana",            lng: -68.97, lat: 18.43,  category: "gastro"    },
];
```

Filter chips toggle which categories are visible. Inactive categories have their pins hidden (opacity 0 or removed from DOM).

---

## SECTION 5: VIAJEROS — Stats on Map

When `activeScene === "viajeros"`, the map shows RD + Caribbean context (zoom 6.5). Overlay:

### Left Column (floating card, fixed to left side of sticky container)

The 4 feature cards from the original `ViajerosSection` appear stacked vertically as a glassmorphism column on the left:

```
┌──────────────────────────────┐
│  ✦ Lugares auténticos        │
│    Destinos poco conocidos…  │
├──────────────────────────────┤
│  ✦ Info confiable            │
│    Datos actualizados…       │
├──────────────────────────────┤
│  ✦ Diario de viaje           │
│    Guarda tu historial…      │
├──────────────────────────────┤
│  ✦ Contacto directo          │
│    Habla con cada negocio…   │
└──────────────────────────────┘
```

### Stat Bubbles on Map

The 3 stats appear as floating bubbles positioned over the map at relevant geographic coordinates. They use `<MapPopup>` with `closeButton={false}`:

```typescript
const STAT_BUBBLES = [
  {
    longitude: -70.3,
    latitude: 19.2,  // northern RD area
    count: "97.7",
    suffix: "%",
    label: "quiere conocer más lugares",
    color: "#F76C4D",
  },
  {
    longitude: -69.93,
    latitude: 18.48, // Santo Domingo
    count: "90.3",
    suffix: "%",
    label: "ya hace turismo en RD",
    color: "#25CCB8",
  },
  {
    longitude: -71.50,
    latitude: 18.50, // southwest
    count: "81",
    suffix: "%",
    label: "quiere recomendaciones de hidden gems",
    color: "#FF8D16",
  },
];
```

Each bubble is a white card with the big stat number in the brand color. The number does a count-up animation when the bubble first appears (reuse the `data-count` pattern from `useReveal.ts`).

Bubbles use CSS `animation: mapBubbleIn 0.5s cubic-bezier(0.2,0.8,0.3,1) both` to scale in from 0 when the scene activates.

---

## SECTION 6: NEGOCIOS — City Business View

When `activeScene === "negocios"`, map flies to `rdNorth` — framing both Santiago and Santo Domingo simultaneously (zoom 8.5).

### Map Additions

Two glowing heat circles appear over each city representing the business density data:

```typescript
// Santiago: 86% of businesses want to appear in app
// Santo Domingo: 64%

// These are rendered as large, semi-transparent circles using <MapPopup>
// or as GeoJSON circle layers added to the map
const CITY_GLOW = [
  { lng: -70.6901, lat: 19.4517, pct: 86, color: "#F76C4D", name: "Santiago"      },
  { lng: -69.9312, lat: 18.4861, pct: 64, color: "#FF8D16", name: "Santo Domingo" },
];
```

Each glow is a `<MapMarker>` whose `<MarkerContent>` is a large div with `border-radius: 50%`, `background: radial-gradient(circle, rgba(color, 0.15), transparent 70%)`, roughly 200–300px in size. It pulses gently: `animation: crdPulse 2.5s ease-in-out infinite`.

### Right Side Overlay

The business dashboard mockup from `NegociosSection` appears on the right side of the screen as a floating card. It is the same existing dashboard JSX (the white card with "Panel de tu negocio", live dot, stats, bar chart) just repositioned as an overlay.

### Left Side Overlay

The benefit list (Más visibilidad, Decisiones basadas en datos, Trato especial con QR) and the two percentage stats (74.6%, 60.6%) appear as a floating column on the left, with the "Registrar mi negocio" button at the bottom.

---

## SECTION 7: EQUIPO — Santiago Close-Up

When `activeScene === "equipo"`, map flies to Santiago de los Caballeros (zoom 12.5, pitch 30°). This is where PUCMM Campus Santiago is located — where ConoceRD was born.

### Map Additions

A special marker at PUCMM Santiago (`[-70.6930, 19.4457]`):

```typescript
<MapMarker longitude={-70.6930} latitude={19.4457}>
  <MarkerContent>
    <div style={{
      background: "#264653",
      color: "#fff",
      borderRadius: 12,
      padding: "6px 12px",
      fontFamily: "'Caveat', cursive",
      fontWeight: 700,
      fontSize: 16,
      whiteSpace: "nowrap",
      boxShadow: "0 8px 20px rgba(38,70,83,0.35)",
    }}>
      Aquí nació ConoceRD ✦
    </div>
  </MarkerContent>
</MapMarker>
```

### Bottom Overlay

The two team cards from `EquipoSection` appear as a centered row at the bottom of the screen, overlapping the map slightly from below. They slide up (`translateY` animation) when the scene activates.

Section header appears above the cards:
```
"El equipo"  ← small uppercase label in coral
"Hecho por dominicanos, para descubrir lo nuestro"  ← h2
"Un equipo multidisciplinario de la PUCMM, Campus Santiago."  ← subtitle
```

Team card design: same as existing (initials avatar + name + role + bio), but with a lighter glassmorphism background so the map shows through slightly.

---

## SECTION 8: CTA — Globe Zoom Out (Bookend)

When `activeScene === "cta"`, map flies to `globeOut` — the Caribbean from a wide angle (zoom 3.5, pitch 15°). This mirrors the hero globe orb, creating a satisfying bookend.

### Center Overlay

A large glassmorphism card appears centered on the full-screen map:

```
┌──────────────────────────────────────────┐
│  [bird.svg, faint, top-right]            │
│                                          │
│  "Descubre lo nuestro"  ← Caveat, mint  │
│                                          │
│  "Tu próxima aventura                    │
│   empieza aquí"         ← Plus Jakarta,  │
│                            white, large  │
│                                          │
│  "Descarga ConoceRD y empieza a          │
│   explorar la República Dominicana       │
│   que no aparece en las guías."          │
│                                          │
│  [App Store]  [Google Play]              │
│                                          │
│  ¿Tienes un negocio? Súmate como aliado→ │
│                                          │
│  [palm.svg, faint, bottom-left]          │
└──────────────────────────────────────────┘
```

The card has a dark overlay: `background: rgba(38,70,83,0.72)`, `backdrop-filter: blur(24px)`, rounded corners 28px, generous padding. Text is white, as in the current `CTASection`. The palm.svg and bird.svg decorations from the current CTASection are kept as subtle opacity-0.2 elements.

The CTA card is NOT a narrow card — it spans 60% of the viewport width, centered.

---

## SECTION 9: FOOTER

The `<Footer />` component renders normally below the `<MapScrollJourney>` container, as a standard vertical section. It does not interact with the map.

---

## Navigation — Modified Nav

`Nav.tsx` currently uses `scrollToSection` from `journeyNav.ts` which has horizontal journey awareness. This is simplified:

### New `journeyNav.ts`

Remove all `JourneyAPI` / `registerJourney` logic. Replace with:

```typescript
export function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (el) {
    window.scrollTo({
      top: el.getBoundingClientRect().top + window.scrollY - 72,
      behavior: "smooth",
    });
  }
}
```

### Nav Link Targets

Each nav link scrolls to the corresponding `<SceneTrigger>` div by ID:

```
"Destinos"  → scrollTo("trigger-destinos-intro")
"Mapa"      → scrollTo("trigger-mapa")
"Viajeros"  → scrollTo("trigger-viajeros")
"Negocios"  → scrollTo("trigger-negocios")
"Equipo"    → scrollTo("trigger-equipo")
"Descargar" → scrollTo("trigger-cta")
```

The Nav's scroll-detection background logic stays exactly as-is (it already works with vertical scroll).

---

## Overlay Visibility Pattern

All overlays use the same pattern to show/hide based on `activeScene`. This pattern ensures smooth transitions:

```typescript
// In any overlay component:
const { activeScene } = useScene(); // from SceneContext

const ACTIVE_SCENES = ["mapa", "destinos-finale"]; // scenes where this overlay shows
const isVisible = ACTIVE_SCENES.includes(activeScene);

return (
  <div
    style={{
      position: "absolute",
      inset: 0,
      pointerEvents: isVisible ? "auto" : "none",
      opacity: isVisible ? 1 : 0,
      transition: "opacity 0.5s ease",
      zIndex: 10,
    }}
  >
    {/* overlay content */}
  </div>
);
```

The sticky container has `position: relative` so all absolute-positioned overlays are relative to the viewport correctly.

---

## Animation Keyframes Needed

Add to `globals.css`:

```css
@keyframes mapBubbleIn {
  from { opacity: 0; transform: scale(0.7) translateY(12px); }
  to   { opacity: 1; transform: scale(1)   translateY(0);     }
}

@keyframes crdPulse {
  0%, 100% { transform: scale(1);    opacity: 0.6; }
  50%       { transform: scale(1.08); opacity: 0.9; }
}

@keyframes polaroidDrop {
  from { opacity: 0; transform: translateY(-80px) rotate(var(--r)) scale(0.88); }
  to   { opacity: 1; transform: translateY(0)     rotate(var(--r)) scale(1);    }
}

@keyframes slideUpIn {
  from { opacity: 0; transform: translateY(40px); }
  to   { opacity: 1; transform: translateY(0);    }
}
```

---

## MapLibre CSS Import

In `globals.css`, add at the very top (before `@import "tailwindcss"`):

```css
@import url("maplibre-gl/dist/maplibre-gl.css");
```

Or in `layout.tsx`:
```typescript
import "maplibre-gl/dist/maplibre-gl.css";
```

The import in `layout.tsx` is preferred to avoid CSS order issues.

---

## Mobile Behavior

On `max-width: 768px`:
- Hero: globe orb hidden, hero is centered text only (current mobile behavior preserved)
- MapScrollJourney: the sticky map becomes a normal full-width, fixed-height `300px` section at the top of the journey. Overlay sections fall below it as normal vertical blocks (not overlays).
- Polaroids: displayed as a simple horizontal scrollable row (same as current `crd-pol-row`).
- This progressive degradation keeps mobile fast and legible even without the scrollytelling.

---

## Implementation Order

Follow this order to keep the site functional at every step:

1. Install `maplibre-gl`. Import CSS in `layout.tsx`.
2. Copy the Map wrapper to `src/components/map/Map.tsx`.
3. Create `SceneContext.tsx` and `useSceneTrigger.ts`.
4. Create `MapScrollJourney.tsx` with just the sticky map (no overlays yet). Replace `HorizontalJourney` in `JourneyHome.tsx`. Verify the map renders.
5. Add `SceneTrigger` divs and verify `flyTo` works as you scroll.
6. Build `DestinosOverlay.tsx` with the polaroid pile mechanic.
7. Build `MapaOverlay.tsx` with pins.
8. Build `ViajerosOverlay.tsx`.
9. Build `NegociosOverlay.tsx`.
10. Build `EquipoOverlay.tsx`.
11. Build `CTAOverlay.tsx`.
12. Modify `HeroSection.tsx` (add globe orb, remove AnimatedRays).
13. Simplify `journeyNav.ts`.
14. Update `Nav.tsx` link targets.
15. Delete obsolete files.
16. Polish: timing, easing, mobile layout.

---

## What Is Preserved From the Current Site

- All text content (headings, descriptions, stats, names)
- All photos (`/assets/ph-*.png`)
- All decorative SVGs (bird, palm, flower)
- The `<Nav>` component structure and visual design
- The `<Footer>` component
- The `<Button>` component
- The `useReveal` hook (reused in overlays for count-up animations)
- The `CategoryChip` component
- Brand colors, fonts, and spacing tokens
- The `crd-pol` polaroid card visual design (white background, photo, Caveat font)
- The business dashboard mockup JSX
- The team member data and card design

## What Is Completely Replaced

- `HorizontalJourney` → `MapScrollJourney` (vertical sticky scrollytelling)
- `AnimatedRays` → removed, replaced by the hero globe orb
- `MapaSection` (SVG fake map) → real MapLibre map with actual geo coordinates
- `JourneyTrace` / `PathEditor` → deleted, no equivalent
- The horizontal navigation paradigm → vertical scroll with sticky map

---

*End of plan. Implement in the order specified above. Do not skip steps — each step keeps the site renderable.*
