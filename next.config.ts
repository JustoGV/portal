import type { NextConfig } from "next"
import { withSentryConfig } from "@sentry/nextjs/config"

// Headers de seguridad (docs/reglas/10 §5). La CSP con nonce por pedido la pone proxy.ts.
const seguridad = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
]

const config: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:ruta*", headers: seguridad }]
  },
}

export default withSentryConfig(config, {
  silent: true,
  // Los errores del navegador pasan por el propio dominio: la CSP no necesita abrir otro origen.
  tunnelRoute: "/monitoreo",
  telemetry: false,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
})
