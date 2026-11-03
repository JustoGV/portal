"use client"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { POR_PAGINA } from "@/lib/parametros"
import { useNavegacionLista } from "./NavegacionLista"
import { Segmentos } from "./Segmentos"

type Props = {
  total: number
  pagina: number
  porPagina: number
  /** Arma la dirección de otra página o de otro tamaño de página. */
  href: (cambios: { pagina?: number; por?: number }) => string
  etiquetaFilas: string
}

/** El pie de toda tabla larga (docs/reglas/07 §3): filas por página, "1–10 de 243" y las páginas. */
export function Paginacion({ total, pagina, porPagina, href, etiquetaFilas }: Props) {
  const { navegar } = useNavegacionLista()
  const paginas = Math.max(1, Math.ceil(total / porPagina))
  const desde = total === 0 ? 0 : (pagina - 1) * porPagina + 1
  const hasta = Math.min(total, pagina * porPagina)
  if (total <= POR_PAGINA[0] && pagina === 1) return null

  const numeros = rango(pagina, paginas)
  const ir = (n: number) => (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return
    e.preventDefault()
    navegar(href({ pagina: n }))
  }

  return (
    <nav className="ui-paginacion" aria-label="Paginación">
      <Segmentos
        etiqueta={etiquetaFilas}
        actual={String(porPagina)}
        opciones={POR_PAGINA.map((n) => ({ valor: String(n), texto: `${n} por página`, href: href({ por: n, pagina: 1 }) }))}
      />
      <span aria-live="polite">
        {desde}–{hasta} de {total}
      </span>
      <div className="ui-paginacion__paginas">
        <a className="ui-paginacion__pagina" href={href({ pagina: pagina - 1 })} onClick={ir(pagina - 1)} aria-disabled={pagina <= 1 || undefined} aria-label="Página anterior">
          <ChevronLeft size={20} strokeWidth={1.75} aria-hidden="true" />
        </a>
        {numeros.map((n, i) =>
          n === null ? (
            <span key={`h${i}`} aria-hidden="true">
              …
            </span>
          ) : (
            <a key={n} className="ui-paginacion__pagina" href={href({ pagina: n })} onClick={ir(n)} aria-current={n === pagina ? "page" : undefined}>
              {n}
            </a>
          ),
        )}
        <a className="ui-paginacion__pagina" href={href({ pagina: pagina + 1 })} onClick={ir(pagina + 1)} aria-disabled={pagina >= paginas || undefined} aria-label="Página siguiente">
          <ChevronRight size={20} strokeWidth={1.75} aria-hidden="true" />
        </a>
      </div>
    </nav>
  )
}

/** 1 … 4 5 6 … 20 */
const rango = (actual: number, total: number): (number | null)[] => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const s = new Set([1, total, actual - 1, actual, actual + 1].filter((n) => n >= 1 && n <= total))
  const orden = [...s].sort((a, b) => a - b)
  const r: (number | null)[] = []
  orden.forEach((n, i) => {
    if (i > 0 && n - orden[i - 1]! > 1) r.push(null)
    r.push(n)
  })
  return r
}
