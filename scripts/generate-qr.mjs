// Genera el QR que se proyecta al final de la presentación (§2.3 / F4).
//
//   pnpm qr                              → usa la URL por defecto de abajo
//   pnpm qr https://conocerd.app/lista?ref=expo-ozrd
//
// Escribe public/assets/qr-lista.svg (para imprimir/proyectar sin pixelar) y
// qr-lista.png (para slides que no aceptan SVG). Corrección de errores alta:
// el QR se escanea desde lejos, de pie y con reflejos en la pantalla.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";

const DEFAULT_URL = "https://conocerd.app/lista?ref=expo-ozrd";

const url = process.argv[2] ?? process.env.WAITLIST_QR_URL ?? DEFAULT_URL;
const outDir = path.join(process.cwd(), "public", "assets");

const options = {
  errorCorrectionLevel: "H",
  margin: 2,
  color: { dark: "#0F1A2Eff", light: "#FDF8F0ff" },
};

await mkdir(outDir, { recursive: true });

const svg = await QRCode.toString(url, { ...options, type: "svg" });
await writeFile(path.join(outDir, "qr-lista.svg"), svg, "utf8");

await QRCode.toFile(path.join(outDir, "qr-lista.png"), url, { ...options, width: 1024 });

console.log(`QR generado para ${url}`);
console.log("  public/assets/qr-lista.svg");
console.log("  public/assets/qr-lista.png");
