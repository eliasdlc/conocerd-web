This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Lista de espera

La página no ofrece descarga: captura correos para la lista de espera (ver
`WAITLIST_PLAN.md`). Piezas:

- `POST /api/subscribe` — validación zod, honeypot, rate limit por IP y dedupe
  por correo (`src/app/api/subscribe/route.ts`).
- `SubscribeForm` — formulario único con toggle Viajero/Negocio, usado en el CTA
  del journey, en el footer y en `/lista`.
- `/lista` — landing ligera a la que apunta el QR del evento. Acepta `?ref=` para
  saber de qué canal vino cada registro.
- `/privacidad` y `/terminos` — obligatorias desde que se recolectan correos.
- `/admin` — panel interno con las respuestas de `/lista` (ver abajo).

Los negocios dan además su Instagram: para muchos es su única vitrina en línea,
así que es de donde saldrán las fotos y horarios de su perfil. Se guarda
normalizado como handle (`lacasona_rd`), acepte lo que acepte el formulario:
`@handle`, la URL completa o la que copia la app al compartir.

### Panel interno (`/admin`)

Totales por audiencia, altas por día de los últimos 14 días, negocios por tipo,
origen (`ref`), cobertura de contacto, tabla filtrable y exportación a CSV
(`GET /api/admin/export`).

El acceso es una contraseña compartida (`ADMIN_PASSWORD`) que canja una cookie
firmada con HMAC-SHA256 y una semana de vigencia. Cambiar la contraseña invalida
todas las sesiones abiertas. No es multiusuario ni tiene roles: si algún día
entra más gente al panel, hay que sustituirlo por auth de verdad.

### Variables de entorno

| Variable | Efecto si falta |
|---|---|
| `DATABASE_URL` (Neon) | Los registros se guardan en `.waitlist/subscribers.json` (ignorado por git) en vez de en Postgres |
| `RESEND_API_KEY` | No se da de alta el contacto en el ESP; el registro se guarda igual |
| `RESEND_AUDIENCE_ID` | Ídem |
| `ADMIN_PASSWORD` | `/admin` no se puede abrir: el login queda deshabilitado con un aviso |

Con las cuatro definidas (`vercel env`) no hay que tocar código: la selección de
almacenamiento, el alta en el ESP y el acceso al panel dependen sólo de su
presencia.

La tabla `waitlist_subscribers` se crea y se migra sola al primer arranque
(`src/lib/waitlist/store.ts`); las columnas añadidas después de la creación
inicial viven en el array `MIGRATIONS`.

### QR del evento

```bash
pnpm qr https://<dominio>/lista?ref=expo-ozrd
```

Escribe `public/assets/qr-lista.svg` y `qr-lista.png` con corrección de errores
alta, para proyectar o imprimir.
