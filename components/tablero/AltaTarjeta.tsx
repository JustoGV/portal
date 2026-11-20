"use client"
import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react"
import { Label, Radio, RadioGroup } from "react-aria-components"
import { AlertCircle, Check } from "lucide-react"
import { Boton } from "@/components/ui/Boton"
import { Campo } from "@/components/ui/Campo"
import { Dialogo } from "@/components/ui/Dialogo"
import { IndicadorPasos, PanelesPasos } from "@/components/ui/Pasos"
import { comun } from "@/i18n/es/comun"
import type { NuevaTarjeta } from "@/lib/tablero"
import { pegar } from "@/lib/texto"
import { LISTAS, type ListaId, type Persona } from "./listas"
import { PREGUNTAS, type Opcion, type Pregunta } from "./preguntas"

type Elegible = { id: string; nombre: string }
type Props = {
  abierta: boolean
  alCerrar: () => void
  origen: () => DOMRect | null
  /** Los servicios activos del portal: la pregunta «¿De qué sistema es?». */
  sistemas: Elegible[]
  clientes: Elegible[]
  personas: Persona[]
  yo: Persona
  /** Guarda en el servidor; devuelve si se guardó (el alta se cierra solo entonces). */
  alCrear: (n: NuevaTarjeta) => Promise<boolean>
}
const OTRO = "otro"

/** El paso de la lista y el del título valen para todas; después, las preguntas de esa lista (`preguntas.ts`). */
const PREG_LISTA: Pregunta = { id: "lista", paso: "Lista", titulo: "¿En qué lista va?", ayuda: "Si es un servicio, después vienen unas preguntas para entenderlo mejor.", tipo: "opciones", opciones: LISTAS.map((l) => ({ valor: l.id, titulo: l.titulo, detalle: l.pista })) }
const PREG_TITULO: Pregunta = { id: "titulo", paso: "Título", titulo: "¿Cómo la llamamos?", ayuda: "El título que se ve en la tarjeta.", tipo: "texto", max: 90, ejemplo: "Formulario de admisión de la clínica" }

/**
 * El alta de una tarjeta (D-038; referencia A3, uğur sözen · Appointment Intake Match, 21st.dev): una pregunta
 * por paso, opciones con título y una línea que las explica, aviso si se quiere seguir sin responder, y el
 * resumen que se va armando al costado (abajo en el teléfono). Los pasos son los del portal (D-026).
 */
export function AltaTarjeta({ abierta, alCerrar, origen, sistemas, clientes, personas, yo, alCrear }: Props) {
  const [r, setR] = useState<Record<string, string>>({})
  const [guardando, setGuardando] = useState(false)
  // Las opciones que no están escritas en `preguntas.ts`: los servicios del portal y las cuentas activas.
  const SISTEMAS: Opcion[] = [...sistemas.map((x) => ({ valor: x.id, titulo: x.nombre })), { valor: OTRO, titulo: "Otro", detalle: "No es de ningún sistema" }]
  const PERSONAS: Opcion[] = personas.map((p) => ({ valor: p.id, titulo: p.nombre, detalle: p.id === yo.id ? "Vos" : "Socio de la consultora" }))
  const [paso, setPaso] = useState(0)
  const [alcanzado, setAlcanzado] = useState(0)
  const [falta, setFalta] = useState(false)
  const caja = useRef<HTMLDivElement>(null)

  // Con muchos pasos el indicador se corre de costado adentro suyo: el paso actual queda a la vista.
  useLayoutEffect(() => {
    const ol = caja.current?.querySelector<HTMLElement>(".ui-pasos")
    const el = ol?.querySelector<HTMLElement>('[aria-current="step"]')?.parentElement
    if (ol && el) ol.scrollLeft = el.offsetLeft - (ol.clientWidth - el.offsetWidth) / 2
  }, [paso])

  const deLaLista = r.lista ? PREGUNTAS[r.lista as ListaId] : []
  const preguntas: Pregunta[] = [PREG_LISTA, PREG_TITULO, ...deLaLista]
  const nombres = preguntas.map((p) => p.paso)
  const actual = preguntas[paso]!
  const ultimo = r.lista !== undefined && paso === preguntas.length - 1

  const opcionesDe = (p: Pregunta): Opcion[] =>
    p.tipo === "opciones" ? p.opciones : p.tipo === "cliente" ? clientes.map((c) => ({ valor: c.id, titulo: c.nombre, detalle: "Cliente del portal" })) : p.tipo === "sistema" ? SISTEMAS : p.tipo === "persona" ? PERSONAS : []
  const legible = (p: Pregunta) => {
    const v = r[p.id]
    if (!v) return null
    return p.tipo === "texto" ? v : (opcionesDe(p).find((o) => o.valor === v)?.titulo ?? v)
  }

  const reiniciar = () => {
    setR({})
    setPaso(0)
    setAlcanzado(0)
    setFalta(false)
  }
  const cerrar = () => {
    alCerrar()
    window.setTimeout(reiniciar, 450)
  }

  const irA = (n: number) => {
    setFalta(false)
    setPaso(n)
  }
  const seguir = async () => {
    if (guardando) return
    if (!r[actual.id]?.trim()) {
      setFalta(true)
      return
    }
    if (!ultimo) {
      setAlcanzado((a) => Math.max(a, paso + 1))
      irA(paso + 1)
      return
    }
    const lista = r.lista as ListaId
    const con = (rol: Pregunta["rol"]) => deLaLista.find((p) => p.rol === rol)
    const quien = con("responsable")
    // Las dudas no tienen persona (son para Claudio: D-040); si la lista no pregunta quién, la tiene quien la crea.
    const responsableId = lista === "dudas" ? null : quien ? (r[quien.id] ?? yo.id) : yo.id
    const servicio = con("servicio")
    const elegido = servicio ? r[servicio.id] : undefined
    const texto = con("texto")
    setGuardando(true)
    const ok = await alCrear({
      lista,
      titulo: r.titulo!.trim(),
      proyectoId: servicio?.tipo === "sistema" && elegido && elegido !== OTRO ? elegido : null,
      grupoId: servicio?.tipo === "cliente" && elegido ? elegido : null,
      responsableId,
      descripcion: (texto && r[texto.id]?.trim()) || "",
      // El sistema, la persona y el texto ya se ven en la ficha: la lista lleva el resto.
      respuestas: deLaLista.filter((p) => !p.rol).map((p) => ({ pregunta: p.titulo, respuesta: legible(p) ?? "" })),
      prioridad: deLaLista.some((p) => p.tipo === "opciones" && p.opciones.some((o) => o.urgente && o.valor === r[p.id])),
    })
    setGuardando(false)
    if (ok) cerrar()
  }
  const responder = (id: string, valor: string) => {
    setFalta(false)
    setR((x) => {
      const n = { ...x, [id]: valor }
      // Cambiar de lista cambia las preguntas que siguen: se olvida lo que era de la otra.
      if (id === "lista" && x.lista !== valor) {
        for (const p of Object.values(PREGUNTAS).flat()) delete n[p.id]
        setAlcanzado(1)
      }
      return n
    })
  }
  const tecla = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") {
      e.preventDefault()
      void seguir()
    }
  }

  const cambios = Object.keys(r).length > 0

  return (
    <Dialogo abierto={abierta} alCerrar={cerrar} titulo="Nueva tarjeta" bajada={pegar("Unas preguntas cortas, una por paso.")} hayCambios={cambios} ancho="60rem" origen={origen}>
      <div ref={caja} className="tb-alta" onKeyDown={tecla}>
        <div className="tb-alta__preguntas">
          <IndicadorPasos pasos={nombres} actual={paso} alcanzado={alcanzado} alIr={irA} etiqueta="Pasos de la tarjeta nueva" />
          <PanelesPasos actual={paso} nombres={nombres}>
            {preguntas.map((p) => (
              <div key={p.id} className="tb-alta__panel">
                <p className="tb-alta__de">{`Pregunta ${preguntas.indexOf(p) + 1} de ${preguntas.length}`}</p>
                {p.tipo === "texto" ? (
                  <>
                    <h3 className="tb-alta__titulo">{p.titulo}</h3>
                    <p className="tb-alta__ayuda">{pegar(p.ayuda)}</p>
                    <Campo
                      etiqueta={p.id === "titulo" ? "Título" : p.paso}
                      name={p.id}
                      valor={r[p.id] ?? ""}
                      alCambiar={(v) => responder(p.id, v)}
                      max={p.max}
                      contador="cerca"
                      multilinea={p.rol === "texto"}
                      ayuda={`Por ejemplo: ${p.ejemplo}`}
                      error={falta && p === actual ? "Escribilo para seguir." : undefined}
                      ancho
                    />
                  </>
                ) : (
                  <RadioGroup className="tb-alta__grupo" value={r[p.id] ?? null} onChange={(v) => responder(p.id, v)} isInvalid={falta && p === actual}>
                    <Label className="tb-alta__titulo">{p.titulo}</Label>
                    <p className="tb-alta__ayuda">{pegar(p.ayuda)}</p>
                    <div className="tb-alta__opciones" data-pocas={opcionesDe(p).length <= 3 || undefined} data-desplaza={p.tipo === "cliente" || p.tipo === "sistema" || undefined}>
                      {opcionesDe(p).length === 0 && <p className="tb-alta__ayuda">No hay clientes cargados en el portal.</p>}
                      {opcionesDe(p).map((o) => (
                        <Radio key={o.valor} value={o.valor} className="tb-opcion">
                          <span className="tb-opcion__marca" aria-hidden="true">
                            <Check size={14} strokeWidth={3} />
                          </span>
                          <span className="tb-opcion__textos">
                            <span className="tb-opcion__titulo">{o.titulo}</span>
                            {o.detalle && <span className="tb-opcion__detalle">{pegar(o.detalle)}</span>}
                          </span>
                        </Radio>
                      ))}
                    </div>
                    {falta && p === actual && (
                      <p className="tb-alta__falta" role="alert">
                        <AlertCircle size={16} strokeWidth={2} aria-hidden="true" />
                        Elegí una respuesta para seguir.
                      </p>
                    )}
                  </RadioGroup>
                )}
              </div>
            ))}
          </PanelesPasos>
        </div>

        <aside className="tb-alta__resumen" aria-label="Resumen de la tarjeta nueva">
          <p className="tb-alta__resumen-titulo">Así queda</p>
          <dl>
            {preguntas.map((p) => (
              <div key={p.id} data-vacio={!legible(p) || undefined} data-actual={p === actual || undefined}>
                <dt>{p.paso}</dt>
                <dd>{pegar(legible(p) ?? "Falta")}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
      <div className="ui-dialogo__acciones ui-dialogo__acciones--pasos">
        {paso === 0 ? (
          <Boton key="cancelar" variante="secundaria" onPress={cerrar}>
            {comun.cancelar}
          </Boton>
        ) : (
          <Boton key="atras" variante="secundaria" onPress={() => irA(paso - 1)}>
            {comun.atras}
          </Boton>
        )}
        {ultimo ? (
          <Boton key="crear" variante="primaria" icono="tilde" onPress={() => void seguir()} cargando={guardando} textoCargando={comun.guardando}>
            Crear tarjeta
          </Boton>
        ) : (
          <Boton key="siguiente" variante="primaria" onPress={() => void seguir()}>
            {comun.siguiente}
          </Boton>
        )}
      </div>
    </Dialogo>
  )
}
