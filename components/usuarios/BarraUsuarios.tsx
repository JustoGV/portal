"use client"
import { useCallback, type ReactNode } from "react"
import { LinkNavegar, Menu, Pastilla } from "@/components/ui/BarraFiltros"
import { Busqueda } from "@/components/ui/Busqueda"
import { Paginacion } from "@/components/ui/Paginacion"
import { usuarios as t } from "@/i18n/es/usuarios"
import { conParametros, ORDENES_USUARIOS, POR_PAGINA_USUARIOS, VISTAS_USUARIOS, type OrdenUsuarios, type VistaUsuarios } from "@/lib/parametros"

type Actuales = Record<string, string | null>

const ir = (actuales: Actuales, cambios: Actuales) => conParametros("/usuarios", actuales, { ...cambios, pagina: null })

/**
 * La barra de filtros de Usuarios (D-034), la misma pieza que Clientes (D-033): el buscador y, al lado,
 * Estado y Ordenar del alto de un campo. Debajo, lo que filtra en pastillas que se sacan de a una y cuántas
 * cuentas se ven. Todo vive en la dirección (07 §3). Estado arranca en «Activas»: no se resalta ahí.
 */
export function BarraUsuarios({ q, ver, orden, actuales, cuenta }: { q: string; ver: VistaUsuarios; orden: OrdenUsuarios; actuales: Actuales; cuenta: ReactNode }) {
  const hrefQ = useCallback((texto: string) => ir(actuales, { q: texto || null }), [actuales])
  const activos = [
    q ? { clave: "q", texto: t.chipBusqueda(q), href: ir(actuales, { q: null }) } : null,
    ver !== "activas" ? { clave: "ver", texto: t.vistas[ver], href: ir(actuales, { ver: null }) } : null,
  ].filter((a): a is { clave: string; texto: string; href: string } => a !== null)

  return (
    <div className="cl-barra">
      <div className="cl-barra__fila">
        <div className="cl-barra__busqueda">
          <Busqueda etiqueta={t.buscar} valorInicial={q} href={hrefQ} autoFocus />
        </div>
        <div className="cl-barra__filtros us-barra__filtros">
          <Menu
            etiqueta={t.filtroEstado}
            actual={ver}
            porDefecto="activas"
            opciones={VISTAS_USUARIOS.map((v) => ({ valor: v, texto: t.vistas[v], href: ir(actuales, { ver: v === "activas" ? null : v }) }))}
          />
          <Menu
            etiqueta={t.ordenar}
            actual={orden}
            neutro
            icono
            opciones={ORDENES_USUARIOS.map((o) => ({ valor: o, texto: t.ordenes[o], href: ir(actuales, { orden: o === "nombre" ? null : o }) }))}
          />
        </div>
      </div>
      <div className="cl-barra__estado">
        {activos.length > 0 && (
          <ul className="cl-barra__activos" aria-label={t.filtrando}>
            {activos.map((a) => (
              <li key={a.clave}>
                <Pastilla texto={a.texto} href={a.href} quitar={t.quitarFiltro(a.texto)} />
              </li>
            ))}
            {activos.length > 1 && (
              <li>
                <LinkNavegar className="cl-barra__limpiar" href={ir(actuales, { q: null, ver: null })}>
                  {t.limpiarFiltros}
                </LinkNavegar>
              </li>
            )}
          </ul>
        )}
        <p className="cl-barra__cuenta" aria-live="polite">
          {cuenta}
        </p>
      </div>
    </div>
  )
}

/** Las páginas de a 12 abajo de la tabla, con la misma pieza que Clientes. Con 12 o menos no se ven. */
export function PaginasUsuarios({ actuales, total, pagina }: { actuales: Actuales; total: number; pagina: number }) {
  if (total <= POR_PAGINA_USUARIOS) return null
  return (
    <div className="cl-paginas">
      <Paginacion
        total={total}
        pagina={pagina}
        porPagina={POR_PAGINA_USUARIOS}
        conTamanos={false}
        etiquetaFilas={t.paginas}
        href={({ pagina: n }) => conParametros("/usuarios", actuales, { pagina: n && n > 1 ? String(n) : null })}
      />
    </div>
  )
}
