import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// El alias `@/` de tsconfig, para que las pruebas puedan importar módulos que
// a su vez importan por alias (lib/clima trae el catálogo de destinos).
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
