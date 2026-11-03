import type { Metadata, Viewport } from "next"
import localFont from "next/font/local"
import { SpeedInsights } from "@vercel/speed-insights/next"
import type { ReactNode } from "react"
import { NOMBRE_VISIBLE } from "@/lib/marca"
import "./globals.css"

// Una sola familia, en el repo, con cifras tabulares (docs/reglas/03 §1.5). Provisoria hasta OQ-004.
const manrope = localFont({
  src: "./fuentes/manrope-latin.woff2",
  weight: "200 800",
  display: "swap",
  variable: "--fuente-manrope",
  preload: true,
  adjustFontFallback: "Arial",
})

export const metadata: Metadata = {
  title: { default: NOMBRE_VISIBLE, template: `%s · ${NOMBRE_VISIBLE}` },
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eff3f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1014" },
  ],
}

export default function RaizLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-AR" className={manrope.variable}>
      <body>
        {children}
        {/* Solo existe en Vercel: fuera de ahí su script no está y ensucia la consola. */}
        {process.env.VERCEL ? <SpeedInsights /> : null}
      </body>
    </html>
  )
}
