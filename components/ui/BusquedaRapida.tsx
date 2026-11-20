"use client"
import { useRouter } from "next/navigation"
import { useEffect, useId, useRef, useState } from "react"
import { Dialog, Modal, ModalOverlay } from "react-aria-components"
import { buscarProyectosRapido, type ResultadoRapido } from "@/acciones/proyectos"
import { IconoDuo, type IconoDuoApi, type NombreDuo } from "@/components/iconos/IconoDuo"
import { navegacion as t } from "@/i18n/es/navegacion"
import { formatDia } from "@/lib/fecha"
import { pegar } from "@/lib/texto"
import { sitioDe } from "@/lib/url"

type Pagina = { href: string; texto: string; icono: NombreDuo; ficha: string }
type Opcion = { tipo: "proyecto"; p: ResultadoRapido } | ({ tipo: "pagina" } & Pagina)

const PAGINAS: Pagina[] = [
  { href: "/", texto: t.proyectos, icono: "carpeta", ficha: t.fichaProyectos },
  { href: "/tablero", texto: t.tablero, icono: "tablero", ficha: t.fichaTablero },
  { href: "/clientes", texto: t.grupos, icono: "grupos", ficha: t.fichaGrupos },
  { href: "/usuarios", texto: t.usuarios, icono: "personas", ficha: t.fichaUsuarios },
  { href: "/cuenta", texto: t.cuenta, icono: "persona", ficha: t.fichaCuenta },
]

/**
 * Ctrl+K (docs/reglas/05 §14; WU-06 pantalla 2, D-025; referencia #1 Holo · Command Palette de 21st.dev):
 * a la izquierda la lista en dos grupos, a la derecha la ficha de lo marcado, abajo el contador y las
 * teclas. Abre y cierra al instante, sin animación. Enter abre el servicio en otra pestaña.
 */
export function BusquedaRapida() {
  const [abierta, setAbierta] = useState(false)

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setAbierta((a) => !a)
      }
    }
    const abrir = () => setAbierta(true)
    window.addEventListener("keydown", tecla)
    window.addEventListener("portal:buscar", abrir)
    return () => {
      window.removeEventListener("keydown", tecla)
      window.removeEventListener("portal:buscar", abrir)
    }
  }, [])

  return (
    <ModalOverlay isOpen={abierta} onOpenChange={setAbierta} isDismissable className="bq-velo">
      <Modal className="bq">
        <Dialog aria-label={t.busquedaTitulo} className="bq__dialogo">
          <Contenido alCerrar={() => setAbierta(false)} />
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}

function Contenido({ alCerrar }: { alCerrar: () => void }) {
  const router = useRouter()
  const id = useId()
  const [texto, setTexto] = useState("")
  const [proyectos, setProyectos] = useState<ResultadoRapido[] | null>(null)
  const [error, setError] = useState(false)
  const [activo, setActivo] = useState(0)
  const [intento, setIntento] = useState(0)
  const pedido = useRef(0)
  const iconos = useRef<(IconoDuoApi | null)[]>([])

  useEffect(() => {
    const n = ++pedido.current
    const espera = window.setTimeout(
      async () => {
        try {
          const r = await buscarProyectosRapido(texto)
          if (n !== pedido.current) return // una respuesta vieja nunca pisa una nueva
          if (!r.ok) {
            if (r.sesion === "vencida") router.replace("/ingresar?motivo=expirado")
            setError(true)
            return
          }
          setError(false)
          setProyectos(r.datos)
          setActivo(0)
        } catch {
          if (n === pedido.current) setError(true)
        }
      },
      texto ? 150 : 0,
    )
    return () => window.clearTimeout(espera)
  }, [texto, router, intento])

  const q = texto.trim().toLowerCase()
  const servicios: Opcion[] = (proyectos ?? []).map((p) => ({ tipo: "proyecto", p }))
  const paginas: Opcion[] = PAGINAS.filter((p) => !q || p.texto.toLowerCase().includes(q)).map((p) => ({ tipo: "pagina", ...p }))
  const opciones = [...servicios, ...paginas]
  const marcada = opciones[Math.min(activo, opciones.length - 1)]

  // La fila marcada siempre queda a la vista al moverse con las flechas.
  useEffect(() => {
    document.getElementById(`${id}-${activo}`)?.scrollIntoView({ block: "nearest" })
  }, [activo, id])

  /** Marca una fila porque la persona se movió (flechas o mouse): ahí sí se mueve su ícono. */
  const mover = (i: number) => {
    if (i === activo || i < 0 || i >= opciones.length) return
    setActivo(i)
    iconos.current[i]?.animar()
  }

  const elegir = (o: Opcion | undefined) => {
    if (!o) return
    alCerrar()
    if (o.tipo === "proyecto") window.open(o.p.url, "_blank", "noopener,noreferrer")
    else router.push(o.href)
  }

  const fila = (o: Opcion, i: number) => (
    <li
      key={o.tipo === "proyecto" ? o.p.id : o.href}
      id={`${id}-${i}`}
      role="option"
      aria-selected={i === activo}
      className="bq__opcion"
      onPointerMove={() => mover(i)}
      onClick={() => elegir(o)}
    >
      <span className="bq__cuadro" aria-hidden="true">
        <IconoDuo
          ref={(api) => {
            iconos.current[i] = api
          }}
          nombre={o.tipo === "proyecto" ? "abrir" : o.icono}
          tamano={18}
        />
      </span>
      <span className="bq__opcion-texto">
        <span className="bq__nombre">{o.tipo === "proyecto" ? o.p.nombre : o.texto}</span>
        {o.tipo === "proyecto" && <span className="bq__sitio">{o.p.grupo ?? t.fichaSinGrupo}</span>}
      </span>
    </li>
  )

  return (
    <>
      <div className="bq__campo">
        <IconoDuo nombre="lupa" tamano={22} />
        <input
          className="bq__entrada"
          autoFocus
          value={texto}
          onChange={(e) => setTexto(e.target.value.slice(0, 80))}
          placeholder={t.busquedaEtiqueta}
          aria-label={t.busquedaEtiqueta}
          role="combobox"
          aria-expanded="true"
          aria-controls={`${id}-lista`}
          aria-activedescendant={opciones.length ? `${id}-${activo}` : undefined}
          aria-autocomplete="list"
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault()
              mover(activo + 1)
            } else if (e.key === "ArrowUp") {
              e.preventDefault()
              mover(activo - 1)
            } else if (e.key === "Enter") {
              e.preventDefault()
              elegir(marcada)
            }
          }}
        />
        <button type="button" className="bq__tecla bq__tecla--boton" onClick={alCerrar} aria-label={t.busquedaCerrar}>
          Esc
        </button>
      </div>

      {error ? (
        // Mismo alto que la lista: la paleta no cambia de tamaño al fallar.
        <div className="bq__cuerpo bq__cuerpo--error" role="status">
          <IconoDuo nombre="alerta" tamano={32} />
          <p className="bq__error-texto">{t.busquedaError}</p>
          <button type="button" className="bq__reintentar" onClick={() => setIntento((n) => n + 1)}>
            {t.busquedaReintentar}
          </button>
        </div>
      ) : (
        <div className="bq__cuerpo" data-con-ficha={marcada ? true : undefined}>
          <ul id={`${id}-lista`} className="bq__lista" role="listbox" aria-label={t.busquedaTitulo}>
            {proyectos !== null && proyectos.length === 0 && (
              <li className="bq__vacio" role="presentation">
                {q ? t.busquedaVacia : t.busquedaSinProyectos}
              </li>
            )}
            {servicios.length > 0 && (
              <li className="bq__grupo" role="presentation">
                {t.busquedaGrupoServicios}
              </li>
            )}
            {servicios.map((o, i) => fila(o, i))}
            {paginas.length > 0 && (
              <li className="bq__grupo" role="presentation">
                {t.busquedaGrupoPaginas}
              </li>
            )}
            {paginas.map((o, i) => fila(o, servicios.length + i))}
          </ul>
          {marcada && <Ficha key={marcada.tipo === "proyecto" ? marcada.p.id : marcada.href} opcion={marcada} />}
        </div>
      )}

      <div className="bq__pie">
        <span role="status">{error ? "" : opciones.length === 1 ? t.busquedaUnResultado : `${opciones.length} ${t.busquedaResultados}`}</span>
        <span className="bq__teclas" aria-hidden="true" hidden={error || opciones.length === 0}>
          <kbd className="bq__tecla">↑</kbd>
          <kbd className="bq__tecla">↓</kbd>
          {t.teclaMover}
          <kbd className="bq__tecla">↵</kbd>
          {t.teclaAbrir}
        </span>
      </div>
    </>
  )
}

/** La ficha de lo marcado: qué es y a dónde lleva, antes de abrirlo. En el teléfono no se muestra. */
function Ficha({ opcion: o }: { opcion: Opcion }) {
  const servicio = o.tipo === "proyecto"
  return (
    <aside className="bq__ficha" aria-label={t.fichaTitulo}>
      <div className="bq__ficha-cabeza" aria-hidden="true">
        <IconoDuo nombre={servicio ? "abrir" : o.icono} tamano={40} />
      </div>
      <p className="bq__ficha-nombre">{servicio ? o.p.nombre : o.texto}</p>
      <p className="bq__ficha-texto">{pegar(servicio ? (o.p.descripcion ?? t.fichaSinDescripcion) : o.ficha)}</p>
      {servicio && (
        <dl className="bq__ficha-datos">
          <div>
            <dt>{t.fichaGrupo}</dt>
            <dd>{o.p.grupo ?? t.fichaSinGrupo}</dd>
          </div>
          <div>
            <dt>{t.fichaSitio}</dt>
            <dd>{sitioDe(o.p.url)}</dd>
          </div>
          <div>
            <dt>{t.fichaActualizado}</dt>
            <dd>{formatDia(o.p.actualizadoEn)}</dd>
          </div>
        </dl>
      )}
      <p className="bq__ficha-nota">{servicio ? t.fichaOtraPestana : t.fichaEstaPestana}</p>
    </aside>
  )
}
