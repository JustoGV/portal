"use client"
import type { ReactNode } from "react"
import { MessageSquare } from "lucide-react"
import { pegar } from "@/lib/texto"
import { CLAUDIO, fechaCorta, type ListaId, type Persona, type Tarjeta } from "./listas"

// La tarjeta del tablero (WU-07, D-038): mezcla de cult/ui · Kanban Board (etiqueta de color por servicio) y
// 7Ovr · Task Board Kanban (punto de prioridad, título, la persona). De tres versiones, Mateo eligió «Franja».

type Props = { t: Tarjeta; lista: ListaId; mover: ReactNode }

/** Quién la tiene: las dudas, Claudio (es la lista de sus dudas); el resto, la persona guardada. */
export const quienLaTiene = (t: Tarjeta, lista: ListaId): Persona | null => t.responsable ?? (lista === "dudas" ? CLAUDIO : null)

const Av = ({ p }: { p: Persona }) => (
  <span className="tb-av" data-tono={p.tono} title={p.nombre} aria-hidden="true">
    {p.iniciales}
  </span>
)

const Comentarios = ({ n }: { n: number }) =>
  n > 0 ? (
    <span className="tb-meta" aria-label={`${n} comentarios`}>
      <MessageSquare size={14} strokeWidth={1.75} aria-hidden="true" />
      {n}
    </span>
  ) : null

/** La versión «Franja» (Mateo, 2026-11-18): el color del servicio como franja al costado; una sola fila con todo lo demás. */
export function TarjetaTablero({ t, lista, mover }: Props) {
  const p = quienLaTiene(t, lista)
  return (
    <>
      <span className="tb-t3__franja" data-tono={t.tono} aria-hidden="true" />
      <div className="tb-t3__arriba">
        <span className="tb-t3__fecha">{fechaCorta(t.creada)}</span>
        {mover}
      </div>
      <p className="tb-titulo">
        {t.prioridad && <span className="tb-punto" title="Prioridad alta" aria-label="Prioridad alta" />}
        {pegar(t.titulo)}
      </p>
      <div className="tb-t3__pie">
        <span className="tb-etq" data-tono={t.tono}>
          {t.servicio}
        </span>
        <Comentarios n={t.comentarios} />
        {p && <Av p={p} />}
      </div>
    </>
  )
}
