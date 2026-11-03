import { defineConfig } from "vitest/config"
import path from "node:path"

export default defineConfig({
  resolve: {
    alias: {
      "@": import.meta.dirname,
      // "server-only" lanza fuera del servidor de React; en los tests no hace falta.
      "server-only": path.join(import.meta.dirname, "tests/vacio.ts"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    passWithNoTests: false,
    fileParallelism: false,
    environment: "node",
  },
})
