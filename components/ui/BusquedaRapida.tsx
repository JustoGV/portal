"use client"
import { useRouter } from "next/navigation"
import { useEffect, useId, useRef, useState } from "react"
import { Dialog, Modal, ModalOverlay } from "react-aria-components"
import { buscarProyectosRapido, type ResultadoRapido } from "@/acciones/proyectos"
import { Icono } from "@/components/iconos/Icono"
import type { NombreIcono } from "@/components/iconos/trazos"
import { navegacion as t } from "@/i18n/es/navegacion"
import { sitioDe } from "@/lib/url"

type Opcion = { tipo: "proyecto"; p: ResultadoRapido } | { tipo: "pagina"; href: string; texto: string; icono: NombreIcono }

const PAGINAS = [
  { href: "/", texto: "Proyectos", icono: "proyectos" },
  { href: "/grupos", texto: "Grupos", icono: "grupos" },
  { href: "/usuarios", texto: "Usuarios", icono: "usuarios" },
] as const

/**
 * Ctrl+K (docs/reglas/05 §14): abre y cierra al instante, sin animación. Enter abre el proyecto en otra
 * pestaña. Los resultados cambian mientras se escribe.
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
  const pedido = useRef(0)

  useEffect(() => {
    const n = ++pedido.current
    const t = window.setTimeout(
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
    return () => window.clearTimeout(t)
  }, [texto, router])

  const q = texto.trim().toLowerCase()
  const paginas: Opcion[] = PAGINAS.filter((p) => !q || p.texto.toLowerCase().includes(q)).map((p) => ({ tipo: "pagina", ...p }))
  const opciones: Opcion[] = [...(proyectos ?? []).map((p) => ({ tipo: "proyecto" as const, p })), ...paginas]

  const elegir = (o: Opcion | undefined) => {
    if (!o) return
    alCerrar()
    if (o.tipo === "proyecto") window.open(o.p.url, "_blank", "noopener,noreferrer")
    else router.push(o.href)
  }

  return (
    <>
      <div className="bq__campo">
        <Icono nombre="buscar" tamano={24} />
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
              setActivo((a) => Math.min(opciones.length - 1, a + 1))
            } else if (e.key === "ArrowUp") {
              e.preventDefault()
              setActivo((a) => Math.max(0, a - 1))
            } else if (e.key === "Enter") {
              e.preventDefault()
              elegir(opciones[activo])
            }
          }}
        />
      </div>
      {error ? (
        <p className="bq__vacio" role="status">
          {t.busquedaError}
        </p>
      ) : (
        <ul id={`${id}-lista`} className="bq__lista" role="listbox" aria-label={t.busquedaTitulo}>
          {proyectos !== null && proyectos.length === 0 && (
            <li className="bq__vacio" role="presentation">
              {q ? t.busquedaVacia : t.busquedaSinProyectos}
            </li>
          )}
          {opciones.map((o, i) => (
            <li
              key={o.tipo === "proyecto" ? o.p.id : o.href}
              id={`${id}-${i}`}
              role="option"
              aria-selected={i === activo}
              className="bq__opcion"
              onPointerMove={() => setActivo(i)}
              onClick={() => elegir(o)}
            >
              <Icono nombre={o.tipo === "proyecto" ? "abrir" : o.icono} />
              <span className="bq__opcion-texto">
                <span className="bq__nombre">{o.tipo === "proyecto" ? o.p.nombre : `${t.irA} ${o.texto}`}</span>
                {o.tipo === "proyecto" && (
                  <span className="bq__sitio">
                    {o.p.grupo ? `${o.p.grupo} · ` : ""}
                    {sitioDe(o.p.url)}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="bq__pie">{t.busquedaAyuda}</p>
    </>
  )
}
