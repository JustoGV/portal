"use client"
import type { ReactNode } from "react"
import { CalendarDays, MessageSquare } from "lucide-react"
import { pegar } from "@/lib/texto"
import { SERVICIOS, type Persona, type Tarjeta } from "./muestra"

// La tarjeta del tablero (WU-07, D-038): mezcla de cult/ui · Kanban Board (etiqueta de color por servicio) y
// 7Ovr · Task Board Kanban (punto de prioridad, título, la persona). De tres versiones, Mateo eligió «Franja».

type Props = { t: Tarjeta; mover: ReactNode }

const Etq = ({ servicio }: { servicio: string }) => (
  <span className="tb-etq" data-tono={SERVICIOS[servicio] ?? "marca"}>
    {servicio}
  </span>
)

const Av = ({ p }: { p: Persona }) => (
  <span className="tb-av" data-tono={p.tono} title={p.nombre} aria-hidden="true">
    {p.iniciales}
  </span>
)

const Titulo = ({ t }: { t: Tarjeta }) => (
  <p className="tb-titulo">
    {t.prioridad && <span className="tb-punto" title="Prioridad alta" aria-label="Prioridad alta" />}
    {pegar(t.titulo)}
  </p>
)

const Comentarios = ({ n }: { n: number }) =>
  n > 0 ? (
    <span className="tb-meta" aria-label={`${n} comentarios`}>
      <MessageSquare size={14} strokeWidth={1.75} aria-hidden="true" />
      {n}
    </span>
  ) : null

/** La versión «Franja» (Mateo, 2026-11-18): el color del servicio como franja al costado; una sola fila con todo lo demás. */
export function TarjetaTablero({ t, mover }: Props) {
  return (
    <>
      <span className="tb-t3__franja" data-tono={SERVICIOS[t.servicio] ?? "marca"} aria-hidden="true" />
      <div className="tb-t3__arriba">
        <span className="tb-t3__fecha">
          {t.clave ? `${t.clave} · ` : ""}
          {t.fecha}
        </span>
        {mover}
      </div>
      <Titulo t={t} />
      <div className="tb-t3__pie">
        <Etq servicio={t.servicio} />
        <Comentarios n={t.comentarios} />
        <Av p={t.responsable} />
      </div>
    </>
  )
}
