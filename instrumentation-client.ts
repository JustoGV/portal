import * as Sentry from "@sentry/nextjs"
import { limpiarEvento } from "@/lib/sentry-limpiar"

// Solo errores: sin Session Replay, sin trazas (docs/reglas/09 §7).
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0,
    dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false, stackFrameVariables: false },
    integrations: [],
    beforeSend: (e) => limpiarEvento(e),
    beforeBreadcrumb: () => null,
  })
}
