"use client"
import { useRef } from "react"
import { IconoDuo, type IconoDuoApi, type NombreDuo } from "@/components/iconos/IconoDuo"
import { useNavegacionLista } from "@/components/ui/NavegacionLista"
import { gastos as t } from "@/i18n/es/gastos"
import { formatMonto } from "@/lib/gasto"
import { pegar } from "@/lib/texto"

type Cifras = { pesos: string; dolares: string; semana: number; activos: number; archivados: number }
type Tarjeta = { id: string; valor: string; titulo: string; pista: string; icono: NombreDuo; href: string | null; actual: boolean }

/**
 * Las cuatro cifras de arriba, en la banda azul como en Servicios (D-036): cuánto se va por mes en pesos y
 * en dólares (no se suman: son monedas distintas), cuántos pagos vencen esta semana y los archivados. Las
 * dos últimas filtran la tabla. La plata no cuenta desde cero: es texto, no un número que se anima.
 */
export function CifrasGastos({ cifras, vista, hrefs }: { cifras: Cifras; vista: "activos" | "semana" | "archivados"; hrefs: { activos: string; semana: string; archivados: string } }) {
  const { navegar } = useNavegacionLista()
  const iconos = useRef<Record<string, IconoDuoApi | null>>({})
  const tarjetas: Tarjeta[] = [
    { id: "pesos", valor: formatMonto(cifras.pesos, "ARS"), titulo: t.cifraPesos, pista: t.cifraPesosPista, icono: "billete", href: hrefs.activos, actual: vista === "activos" },
    { id: "dolares", valor: formatMonto(cifras.dolares, "USD"), titulo: t.cifraDolares, pista: t.cifraDolaresPista, icono: "billete", href: hrefs.activos, actual: false },
    { id: "semana", valor: String(cifras.semana), titulo: t.cifraSemana, pista: t.cifraSemanaPista, icono: "reloj", href: hrefs.semana, actual: vista === "semana" },
    { id: "archivados", valor: String(cifras.archivados), titulo: t.cifraArchivados, pista: t.cifraArchivadosPista, icono: "archivo", href: hrefs.archivados, actual: vista === "archivados" },
  ]
  return (
    <div className="pr-cifras ga-cifras" role="group" aria-label={t.cifrasEtiqueta}>
      {tarjetas.map((c) => (
        <a
          key={c.id}
          className="pr-cifra"
          data-plata={c.id === "pesos" || c.id === "dolares" || undefined}
          data-actual={c.actual || undefined}
          href={c.href ?? undefined}
          aria-current={c.actual ? "true" : undefined}
          onPointerEnter={() => iconos.current[c.id]?.animar()}
          onFocus={() => iconos.current[c.id]?.animar()}
          onClick={(e) => {
            if (!c.href || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
            e.preventDefault()
            navegar(c.href)
          }}
        >
          <span className="pr-cifra__icono" aria-hidden="true">
            <IconoDuo
              ref={(api) => {
                iconos.current[c.id] = api
              }}
              nombre={c.icono}
              tamano={24}
            />
          </span>
          <span className="pr-cifra__texto">
            <span className="pr-cifra__titulo">{c.titulo}</span>
            <span className="pr-cifra__pista">{pegar(c.pista)}</span>
          </span>
          <span className="pr-cifra__numero">{c.valor}</span>
        </a>
      ))}
    </div>
  )
}
