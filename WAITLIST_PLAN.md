# Plan — Lista de espera (viajeros + negocios)

Contexto: la app aún no está lanzada. La página se va a exponer en una competencia
con OZRD; al final de la presentación la gente escanea un QR. El objetivo del sitio
deja de ser "descarga" y pasa a ser **capturar contacto cualificado en menos de 30
segundos, de pie, con mala señal y con gente esperando detrás**.

---

## 1. Diagnóstico del estado actual

| Dónde | Qué dice hoy | Problema |
|---|---|---|
| `src/sections/CTASection.tsx:97` | Botones App Store / Google Play, `href="#"` | Prometen una descarga inexistente; el clic no hace nada |
| `src/components/Nav.tsx:75` | Botón "Descargar" | Mismo problema, y es el CTA más visible del sitio |
| `src/components/Footer.tsx:19` | "Descargar para iOS / Android" | Ídem |
| `src/sections/NegociosSection.tsx` | Beneficios para negocios, sin conversión propia | La audiencia B2B se queda sin acción |
| `src/components/Footer.tsx:186` | Privacidad / Términos en `href="#"` | Si vamos a recolectar correos, esto deja de ser opcional |

No hay backend: el proyecto es 100% estático (`src/app/page.tsx` → `JourneyHome`).
Todo lo de servidor hay que crearlo.

---

## 2. Decisiones de producto propuestas

### 2.1 Un solo formulario, dos audiencias
No dos formularios separados. Un componente `SubscribeForm` con un toggle
**Viajero / Negocio** arriba, campos condicionales debajo. Razones: una sola
superficie que mantener, un solo endpoint, y en móvil dos formularios compiten
entre sí y bajan la conversión de ambos.

- **Viajero:** correo (requerido) · nombre (opcional) · provincia · intereses (chips)
- **Negocio:** correo · nombre del negocio · tipo · provincia · WhatsApp (opcional)

Los "intereses" reutilizan las categorías que ya existen en `src/data/destinations.ts`
y el componente `CategoryChip`, así que se sienten parte del producto, no una encuesta.

### 2.2 Perfilado progresivo, no encuesta de entrada
Este es el punto más importante para el evento. **No pidas nada antes del correo.**

- **Paso 1 (el único obligatorio):** un campo de correo + botón. Una línea.
- **Paso 2 (después de enviar):** "Ya estás dentro ✅ — ayúdanos a priorizar",
  con 3 preguntas de un toque (chips, sin teclado): qué te interesa, de qué
  provincia eres, cómo viajas normalmente.

Así el activo valioso (el correo) se captura aunque la persona abandone en el paso 2,
y quien sí complete nos da segmentación para los correos. La tasa de abandono se
concentra donde no duele.

### 2.3 Landing dedicada para el QR
El QR **no** debe apuntar a la home. La home es un scroll journey largo con mapa
y GSAP: pesado, lento en 4G de un salón lleno, y el form queda al final.

Propuesta: ruta `/lista` — hero corto, formulario arriba del fold, tres frases de
qué es ConoceRD, sin mapa ni journey. La home queda intacta como pieza narrativa.
La landing lleva `?ref=` para saber cuánta gente vino del evento (`/lista?ref=expo-ozrd`).

### 2.4 Qué hacer con los botones de tienda
No borrarlos: convertirlos en señal de credibilidad. "Próximamente en App Store y
Google Play" en estado deshabilitado/atenuado, con el form como acción real. La
gente entiende que la app existe y viene en camino.

### 2.5 Opt-in y confirmación
Recomiendo **single opt-in + correo de bienvenida inmediato**, no doble opt-in. En
un evento presencial, pedirle a alguien que abra su correo y confirme mata un
porcentaje alto de registros. A cambio: checkbox de consentimiento explícito
guardado con timestamp, y link de baja en cada correo.

El correo de bienvenida es la primera impresión — vale la pena escribirlo bien y
que incluya el gancho de recompensa (ver 2.6).

### 2.6 Incentivo — DECIDIDO
Tres, segmentados por audiencia:

- **Viajeros:** badge de "fundador" en el perfil + acceso anticipado a la beta.
- **Negocios:** perfil destacado gratis los primeros meses tras el lanzamiento,
  además del acceso anticipado.

Consecuencia a asumir: prometer acceso anticipado implica que **tiene que existir
una beta gestionada** y una forma de invitar a esa lista. Si eso no está claro en el
roadmap de la app, hay que suavizar la redacción a "te avisamos antes que a nadie"
en vez de prometer una beta con fecha.

El badge de fundador debe existir como campo en el modelo de usuario de la app
móvil; conviene avisar a quien lleve el backend de ConoceRD para que la marca de
"registrado antes del lanzamiento" viaje desde esta lista.

---

## 3. Reorganización de la página

- **Nav** (`Nav.tsx`): "Descargar" → "Unirme a la lista", scroll al CTA.
- **CTASection**: el formulario pasa a ser el protagonista de la card; tiendas en
  estado "próximamente" debajo.
- **NegociosSection**: CTA propia al final ("Registra tu negocio") que abre el mismo
  form con el toggle ya en Negocio.
- **Footer**: reemplazar links de descarga por un form compacto de una línea.
- **Legal**: páginas reales `/privacidad` y `/terminos`. Con recolección de datos
  personales dejan de ser placeholders.

---

## 4. Stack técnico — DECIDIDO: Resend + Neon

- **ESP:** Resend (Audiences) — el equipo ya despliega en Vercel, la integración es
  directa y el tier gratis cubre de sobra el volumen de una competencia.
- **Endpoint:** Route Handler `POST /api/subscribe` con validación **zod**
  (ya está en `package.json`), honeypot anti-bot y rate limit por IP.
- **Almacenamiento:** la audiencia del ESP es la fuente de verdad de los correos.
  Las respuestas del paso 2 y el campo `ref` necesitan tabla propia — Neon Postgres
  vía Vercel Marketplace. Si quieren el mínimo absoluto para la competencia, se puede
  arrancar solo con Resend y añadir la base después, pero entonces se pierden los
  datos de la encuesta.
- **Variables:** `RESEND_API_KEY`, `RESEND_AUDIENCE_ID`, `DATABASE_URL` en
  `vercel env`.

---

## 5. Fases

| Fase | Contenido | Criterio de cierre | Estado |
|---|---|---|---|
| **F0** | Rama desde `dev`, alta en el ESP, env vars | `vercel env` con las claves; rama creada | Rama `feat/waitlist` creada. **Env vars pendientes** (ver abajo) |
| **F1** | Esquema de datos + `POST /api/subscribe` (zod, honeypot, rate limit, dedupe por correo) | Endpoint probado con casos válidos, inválidos y duplicados | Hecho |
| **F2** | `SubscribeForm`: toggle, campos condicionales, estados loading/éxito/error, a11y, teclado móvil correcto (`inputmode="email"`) | Funciona aislado, sin depender de la página | Hecho |
| **F3** | Integración: Nav, CTASection, NegociosSection, Footer | Ningún CTA promete una descarga que no existe | Hecho |
| **F4** | Ruta `/lista` ligera + captura de `ref` + generación del QR | Carga rápida en 4G; el `ref` llega a la base | Hecho (`pnpm qr <url>`) |
| **F5** | Paso 2 (encuesta de chips) + estado de éxito + correo de bienvenida | Se puede completar o saltar; ambos caminos limpios | Pendiente |
| **F6** | `/privacidad`, `/terminos`, consentimiento, `typecheck` + `lint` | Checks verdes, legal publicado | Hecho salvo el correo de baja real (depende del ESP) |
| **F7** | Instagram del negocio + panel interno `/admin` (métricas, tabla, CSV) | El equipo puede leer las respuestas sin abrir la base | Hecho — falta `ADMIN_PASSWORD` en `vercel env` |

**Alcance decidido para la competencia: F0–F4.** F6 se adelantó porque ya se
recolectan correos: `/privacidad` y `/terminos` están publicadas y el
consentimiento se guarda con timestamp. F5 (encuesta de chips + correo de
bienvenida) queda como seguimiento.

### Cómo se resolvió el bloqueo de F0

No se aprovisionó nada en Vercel: el código se implementó contra una interfaz de
persistencia (`src/lib/waitlist/store.ts`) con dos implementaciones. Sin
`DATABASE_URL` escribe en `.waitlist/subscribers.json`; con ella usa Neon. El
alta en el ESP (`src/lib/waitlist/esp.ts`) es un no-op sin `RESEND_API_KEY`.

**Lo que falta para producción** — sólo configuración, no código:

1. Crear la audiencia en Resend y añadir `RESEND_API_KEY` y `RESEND_AUDIENCE_ID`.
2. ~~Crear la base Neon (Vercel Marketplace) y añadir `DATABASE_URL`~~. Hecho. La
   tabla `waitlist_subscribers` se crea y se migra sola en el primer arranque.
3. Regenerar el QR con el dominio real: `pnpm qr https://<dominio>/lista?ref=expo-ozrd`.
4. Añadir `ADMIN_PASSWORD` (`vercel env add ADMIN_PASSWORD`) para poder abrir
   `/admin` en producción. Sin ella el panel no deja entrar a nadie.

---

## 6. Futuro — fuera de alcance de este plan

Convertir la página en una demo interactiva: el usuario pide una ruta a un destino y
recibe información generada; equivalente para negocios (formato por definir). Esto
cambia la arquitectura del sitio (necesita cómputo por request, posiblemente IA, y
una noción de sesión). **No condiciona las decisiones de este plan**, salvo una: el
correo capturado ahora es exactamente el gancho para avisar de esa demo cuando exista.
Conviene guardarlo en base propia y no solo en el ESP, para poder relacionar
suscriptor ↔ rutas pedidas más adelante.
