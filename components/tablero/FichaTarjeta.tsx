"use client"
import { useId, type ReactNode } from "react"
import { BotonIcono } from "@/components/ui/BotonIcono"
import { TarjetaModal } from "@/components/ui/TarjetaModal"
import { comun } from "@/i18n/es/comun"
import { pegar } from "@/lib/texto"
import { Conversacion } from "./Conversacion"
import { fechaCorta, type Comentario, type ListaId, type Persona, type Tarjeta } from "./listas"
import { quienLaTiene } from "./TarjetaTablero"

type Props = {
  tarjeta: Tarjeta | null
  lista: { id: ListaId; titulo: string; tono: string } | null
  abierta: boolean
  alCerrar: () => void
  origen: () => DOMRect | null
  /** undefined mientras se trae del servidor. */
  comentarios: Comentario[] | undefined
  errorConversacion: string | null
  alReintentar: () => void
  personas: Persona[]
  yo: Persona
  /** Devuelve si se guardó. */
  alComentar: (texto: string, respuestaA?: string) => Promise<boolean>
  resuelta?: boolean
  alResolver?: () => void
  mover: ReactNode
}

/** El título de la columna izquierda, según la lista. */
const QUE: Record<ListaId, string> = {
  dudas: "La duda",
  servicios: "El servicio",
  tareas: "Qué hay que hacer",
  correcciones: "Qué hay que corregir",
}

/**
 * La ficha de una tarjeta del tablero (D-038). Crece desde la tarjeta que se tocó hasta el centro y al cerrar
 * vuelve ahí (TarjetaModal, como la ficha de Servicios: referencia F1, Aceternity · Expandable Card). Arriba la
 * banda azul de las fichas (D-037) con todo lo que identifica a la tarjeta; abajo, dos columnas (la elegida por
 * Mateo, «Al costado»): a la izquierda qué hay que resolver, a la derecha la conversación (F4). En el teléfono,
 * una columna.
 */
export function FichaTarjeta({ tarjeta: t, lista, abierta, alCerrar, origen, comentarios, errorConversacion, alReintentar, personas, yo, alComentar, resuelta, alResolver, mover }: Props) {
  const idTitulo = useId()
  const texto = t?.descripcion ?? undefined
  // La respuesta «en una línea» ya es el texto de arriba: no se repite en la lista.
  const otras = (t?.respuestas ?? []).filter((x) => x.respuesta !== texto)
  const p = t && lista ? quienLaTiene(t, lista.id) : null
  const cuando = t ? fechaCorta(t.creada) : ""

  return (
    <TarjetaModal abierto={abierta && !!t} alPedirCierre={alCerrar} idTitulo={idTitulo} ancho="68rem" origen={origen}>
      {t && lista && (
        <div className="tb-ficha">
          <div className="pr-ficha2__banda tb-ficha__banda">
            <div className="pr-ficha2__barra" data-cascada="">
              <p className="pr-ficha2__sobre">
                <span className="tb-ficha__lista-punto" data-tono={lista.tono} aria-hidden="true" />
                {pegar(lista.titulo)}
              </p>
              <div className="pr-ficha2__mandos">
                <span className="tb-ficha__mover">{mover}</span>
                <BotonIcono icono="cerrar" etiqueta={comun.cerrar} onPress={alCerrar} />
              </div>
            </div>
            <div className="pr-ficha2__cabeza" data-cascada="">
              <h2 id={idTitulo} className="pr-ficha2__nombre tb-ficha__nombre">
                {t.prioridad && <span className="tb-punto" aria-label="Prioridad alta" />}
                {pegar(t.titulo)}
              </h2>
              <div className="pr-ficha2__pastillas">
                <span className="pr-pastilla">
                  <span className="tb-ficha__servicio" data-tono={t.tono} aria-hidden="true" />
                  {t.servicio}
                </span>
                {p && (
                  <span className="pr-pastilla">
                    <span className="tb-av" data-tono={p.tono} aria-hidden="true">
                      {p.iniciales}
                    </span>
                    {p.nombre}
                  </span>
                )}
                {resuelta && (
                  <span className="pr-pastilla" data-tono="ok">
                    <span className="pr-pastilla__punto" aria-hidden="true" />
                    Resuelta
                  </span>
                )}
                <span className="tb-ficha__cuando">{cuando === "hoy" || cuando === "ayer" ? `Abierta ${cuando}` : `Abierta el ${cuando}`}</span>
              </div>
            </div>
          </div>

          <div className="tb-ficha__cuerpo">
            <div className="tb-ficha__datos" data-cascada="">
              <h3 className="tb-ficha__subtitulo">{QUE[lista.id]}</h3>
              {texto ? <p className="tb-ficha__texto">{pegar(texto)}</p> : <p className="tb-ficha__texto tb-ficha__texto--vacio">Todavía no tiene texto. Lo que haga falta saber, escribilo en la conversación.</p>}
              {otras.length > 0 && (
                <>
                  <h3 className="tb-ficha__subtitulo">Lo que se respondió al crearla</h3>
                  <dl className="tb-ficha__respuestas">
                    {otras.map((x) => (
                      <div key={x.pregunta}>
                        <dt>{pegar(x.pregunta)}</dt>
                        <dd>{x.respuesta ? pegar(x.respuesta) : "Sin responder"}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}
            </div>
            <div className="tb-ficha__lado" data-cascada="">
              <Conversacion comentarios={comentarios} error={errorConversacion} alReintentar={alReintentar} personas={personas} yo={yo} alComentar={alComentar} resuelta={resuelta} alResolver={alResolver} />
            </div>
          </div>
        </div>
      )}
    </TarjetaModal>
  )
}
