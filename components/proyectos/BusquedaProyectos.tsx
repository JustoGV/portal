"use client"
import { useCallback } from "react"
import { Busqueda } from "@/components/ui/Busqueda"
import { proyectos as t } from "@/i18n/es/proyectos"
import { conParametros } from "@/lib/parametros"

export function BusquedaProyectos({ q, actuales }: { q: string; actuales: Record<string, string | null> }) {
  const href = useCallback((texto: string) => conParametros("/", actuales, { q: texto || null, pagina: null }), [actuales])
  return <Busqueda etiqueta={t.buscar} valorInicial={q} href={href} autoFocus />
}
