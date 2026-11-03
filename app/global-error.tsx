"use client"
import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"

export default function ErrorGlobal({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])
  return (
    <html lang="es-AR">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
        <h1>Algo no salió bien</h1>
        <p>Recargá la página. Si sigue igual, avisale a tu socio.</p>
      </body>
    </html>
  )
}
