import { NextResponse, type NextRequest } from "next/server"

const PUBLICAS = ["/ingresar", "/primer-ingreso", "/api/auth"]
const COOKIES_SESION = ["portal.session_token", "__Secure-portal.session_token"]

/**
 * CSP con nonce por pedido y 'strict-dynamic' (docs/reglas/10 §5). Next lee el nonce del header y lo
 * pone en sus propios scripts.
 *
 * Además, un chequeo optimista: sin cookie de sesión, una ruta protegida redirige al login con un 307
 * antes de dibujar nada. NO es la seguridad (una cookie vencida o falsa pasa este filtro): la
 * seguridad es el guard de cada página y cada acción (docs/reglas/10 §3).
 */
export function proxy(request: NextRequest) {
  const ruta = request.nextUrl.pathname
  const publica = PUBLICAS.some((p) => ruta === p || ruta.startsWith(`${p}/`))
  if (!publica && !COOKIES_SESION.some((c) => request.cookies.has(c))) {
    const destino = new URL("/ingresar", request.url)
    if (ruta !== "/") destino.searchParams.set("volver", `${ruta}${request.nextUrl.search}`)
    return NextResponse.redirect(destino)
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64")
  const desarrollo = process.env.NODE_ENV === "development"
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${desarrollo ? " 'unsafe-eval'" : ""}`,
    // React y React Aria escriben estilos en línea (posiciones de popovers, variables CSS).
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self'${desarrollo ? " ws:" : ""}`,
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'none'",
    "object-src 'none'",
    // Solo en Vercel (https): en un servidor local por http rompería las cargas.
    ...(process.env.VERCEL ? ["upgrade-insecure-requests"] : []),
  ].join("; ")

  const headers = new Headers(request.headers)
  headers.set("x-nonce", nonce)
  headers.set("Content-Security-Policy", csp)
  const respuesta = NextResponse.next({ request: { headers } })
  respuesta.headers.set("Content-Security-Policy", csp)
  return respuesta
}

export const config = {
  matcher: [{ source: "/((?!_next/static|_next/image|favicon.ico|monitoreo).*)", missing: [{ type: "header", key: "next-router-prefetch" }] }],
}
