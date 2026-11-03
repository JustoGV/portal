// Sentry solo con errores y sin datos personales (docs/reglas/09 §7): sin cuerpos, cookies, headers ni
// datos de navegación, y los emails y números largos se tapan.
type Evento = {
  request?: { data?: unknown; cookies?: unknown; headers?: unknown; query_string?: unknown; url?: string }
  user?: unknown
  breadcrumbs?: unknown
  message?: string
  exception?: { values?: { value?: string }[] }
}

const tapar = (s: string) => s.replace(/[^\s@]+@[^\s@]+/g, "[email]").replace(/\b\d{7,}\b/g, "[número]")

export const limpiarEvento = <T extends Evento>(e: T): T => {
  if (e.request) {
    delete e.request.data
    delete e.request.cookies
    delete e.request.headers
    delete e.request.query_string
    if (e.request.url) e.request.url = e.request.url.split("?")[0]
  }
  delete e.user
  delete e.breadcrumbs
  if (e.message) e.message = tapar(e.message)
  e.exception?.values?.forEach((v) => {
    if (v.value) v.value = tapar(v.value)
  })
  return e
}
