import * as Sentry from "@sentry/nextjs"
import { limpiarEvento } from "@/lib/sentry-limpiar"

export async function register() {
  if (!process.env.SENTRY_DSN) return
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0,
    dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false, stackFrameVariables: false },
    beforeSend: (e) => limpiarEvento(e),
    beforeBreadcrumb: () => null,
  })
}

export const onRequestError = Sentry.captureRequestError
