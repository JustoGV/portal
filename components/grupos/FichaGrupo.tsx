"use client"
import { ChevronDown, ChevronUp, IdCard, Mail, Phone } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { Button, Link } from "react-aria-components"
import { Boton } from "@/components/ui/Boton"
import { BotonIcono } from "@/components/ui/BotonIcono"
import { Campo } from "@/components/ui/Campo"
import { Etiqueta } from "@/components/ui/Etiqueta"
import { Pista } from "@/components/ui/Pista"
import { useResultado } from "@/components/ui/Resultado"
import { TarjetaModal } from "@/components/ui/TarjetaModal"
import { comun } from "@/i18n/es/comun"
import { grupos as t } from "@/i18n/es/grupos"
import { formatDia } from "@/lib/fecha"
import { gsap, quieto } from "@/lib/gsap"
import { formatearDni, formatearTelefono, type FilaGrupo } from "@/lib/grupo"
import { iniciales } from "@/lib/nombre"
import { limpiarTexto, pegar } from "@/lib/texto"
import { sitioDe } from "@/lib/url"

type Props = {
  /** Las carpetas que se ven en la grilla: ↑ ↓ recorren estas. */
  filas: FilaGrupo[]
  id: string | null
  archivados: boolean
  origen: () => DOMRect | null
  alCambiar: (id: string) => void
  alCerrar: () => void
  alEditar: (g: FilaGrupo) => void
  alArchivo: (g: FilaGrupo) => void
}

/** Desde cuántos servicios la columna trae su buscador. */
const BUSCAR_DESDE = 7
const sinAcentos = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()

/** Lo que se marca para llamar: solo los números y el + del principio. */
const paraLlamar = (tel: string) => tel.replace(/[^0-9+]/gu, "")

/**
 * La ficha de un cliente (por dentro, un grupo: D-032), rehecha en D-033: arriba el nombre con su estado y sus
 * fechas en una línea; abajo dos columnas, a la izquierda la tarjeta de contacto del responsable y a la
 * derecha sus servicios. En el teléfono, una sola columna con el responsable primero. Es una tarjeta al
 * centro que crece desde la carpeta (D-030), nunca un panel lateral (D-029). ↑ ↓ pasan al cliente anterior
 * o siguiente sin cerrar; el contenido se cruza 16 px en 0,3 s.
 */
export function FichaGrupo({ filas, id, archivados, origen, alCambiar, alCerrar, alEditar, alArchivo }: Props) {
  const idTitulo = useId()
  const router = useRouter()
  const mostrar = useResultado()
  const cuerpo = useRef<HTMLDivElement>(null)
  const sentido = useRef(0)
  // Mientras la tarjeta se cierra sigue mostrando el último cliente.
  const [ultimo, setUltimo] = useState<FilaGrupo | null>(null)
  const i = filas.findIndex((f) => f.id === id)
  const actual = i >= 0 ? filas[i]! : null
  if (actual && actual !== ultimo) setUltimo(actual)
  const g = actual ?? ultimo

  const mover = (paso: number) => {
    if (i < 0 || filas.length < 2) return
    sentido.current = paso
    alCambiar(filas[(i + paso + filas.length) % filas.length]!.id)
  }

  // ↑ ↓ recorren; no con otra tarjeta encima ni escribiendo en el buscador de servicios.
  useEffect(() => {
    if (id === null) return
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return
      if (document.querySelectorAll('[role="dialog"], [role="alertdialog"]').length > 1) return
      if ((e.target as HTMLElement | null)?.closest("input")) return
      e.preventDefault()
      mover(e.key === "ArrowDown" ? 1 : -1)
    }
    document.addEventListener("keydown", tecla)
    return () => document.removeEventListener("keydown", tecla)
  })

  // Al pasar a otro cliente, el contenido entra desde el lado hacia donde se fue.
  useLayoutEffect(() => {
    const c = cuerpo.current
    const lado = sentido.current
    sentido.current = 0
    if (!c || !lado || quieto()) return
    gsap.fromTo(
      c.children,
      { opacity: 0, y: 16 * lado },
      { opacity: 1, y: 0, duration: 0.3, stagger: 0.03, ease: "power3.out", clearProps: "opacity,transform", overwrite: "auto" },
    )
  }, [id])

  const copiar = async (valor: string) => {
    try {
      await navigator.clipboard.writeText(valor)
      mostrar({ tipo: "guardado", titulo: t.copiado, texto: valor })
    } catch {
      mostrar({ tipo: "error", titulo: t.noCopiado })
    }
  }

  const hayResponsable = !!g && !!(g.responsableNombre || g.responsableCargo || g.responsableDni || g.responsableMail || g.responsableTelefono)

  return (
    <TarjetaModal abierto={id !== null && i >= 0} alPedirCierre={alCerrar} idTitulo={idTitulo} ancho="52rem" origen={origen}>
      {g && (
        <>
          <div className="ui-dialogo__cabecera pr-ficha__cabecera gr-ficha__cabecera">
            <div>
              <p className="pr-ficha__sobre">
                {pegar(t.fichaTitulo)}
                {i >= 0 && (
                  <span className="pr-ficha__cuenta">
                    <span className="gr-ficha__punto"> · </span>
                    {t.fichaDe(i + 1, filas.length)}
                  </span>
                )}
              </p>
              <p className="pr-ficha__ayuda">{t.fichaAyuda}</p>
            </div>
            <div className="pr-ficha__mandos">
              <Pista texto={t.anterior}>
                <Button className="ui-boton-icono" aria-label={t.anterior} isDisabled={filas.length < 2} onPress={() => mover(-1)}>
                  <ChevronUp size={20} strokeWidth={1.75} aria-hidden="true" />
                </Button>
              </Pista>
              <Pista texto={t.siguiente}>
                <Button className="ui-boton-icono" aria-label={t.siguiente} isDisabled={filas.length < 2} onPress={() => mover(1)}>
                  <ChevronDown size={20} strokeWidth={1.75} aria-hidden="true" />
                </Button>
              </Pista>
              <BotonIcono icono="cerrar" etiqueta={comun.cerrar} onPress={alCerrar} />
            </div>
          </div>
          <div ref={cuerpo} className="pr-ficha__cuerpo cf-cuerpo">
            <div className="cf-titular" data-cascada="">
              <h2 id={idTitulo} className="cf-nombre">
                {pegar(g.nombre)}
              </h2>
              <div className="cf-meta">
                <Etiqueta tono={g.archivadoEn ? "neutro" : "ok"}>{g.archivadoEn ? t.estadoArchivado : t.estadoActivo}</Etiqueta>
                <span className="pr-grupo">{g.proyectos === 0 ? t.sinServicios : t.servicios(g.proyectos)}</span>
                <span className="cf-fechas">
                  <span className="cf-fecha">{t.clienteDesde(formatDia(g.creadoEn))}</span>
                  <span className="cf-fecha">
                    <span aria-hidden="true">· </span>
                    {t.ultimoCambio(formatDia(g.actualizadoEn))}
                  </span>
                </span>
              </div>
            </div>
            <div className="cf-columnas" data-cascada="">
              <section className="cf-columna" aria-labelledby={`${idTitulo}-resp`}>
                <h3 id={`${idTitulo}-resp`} className="gr-ficha__subtitulo">
                  {t.responsable}
                </h3>
                {hayResponsable ? (
                  <div className="cf-contacto">
                    {(g.responsableNombre || g.responsableCargo) && (
                      <div className="cf-persona">
                        {g.responsableNombre && (
                          <span className="cf-iniciales" aria-hidden="true">
                            {iniciales(g.responsableNombre)}
                          </span>
                        )}
                        <div className="cf-persona__textos">
                          {g.responsableNombre && <p className="cf-persona__nombre">{g.responsableNombre}</p>}
                          {g.responsableCargo && <p className="cf-persona__cargo">{g.responsableCargo}</p>}
                        </div>
                      </div>
                    )}
                    {(g.responsableMail || g.responsableTelefono || g.responsableDni) && (
                      <dl className="cf-datos">
                        {g.responsableMail && (
                          <Dato icono={<Mail size={18} strokeWidth={1.75} aria-hidden="true" />} etiqueta={t.responsableMail} valor={g.responsableMail} partir>
                            <BotonIcono icono="copiar" etiqueta={t.copiarMail} onPress={() => copiar(g.responsableMail!)} />
                            <Pista texto={t.escribirMail}>
                              <Link className="ui-boton-icono" href={`mailto:${g.responsableMail}`} aria-label={t.escribirMail}>
                                <Mail size={20} strokeWidth={1.75} aria-hidden="true" />
                              </Link>
                            </Pista>
                          </Dato>
                        )}
                        {g.responsableTelefono && (
                          <Dato icono={<Phone size={18} strokeWidth={1.75} aria-hidden="true" />} etiqueta={t.responsableTelefono} valor={formatearTelefono(g.responsableTelefono)}>
                            <BotonIcono icono="copiar" etiqueta={t.copiarTelefono} onPress={() => copiar(formatearTelefono(g.responsableTelefono!))} />
                            <Pista texto={t.llamar}>
                              <Link className="ui-boton-icono" href={`tel:${paraLlamar(g.responsableTelefono)}`} aria-label={t.llamar}>
                                <Phone size={20} strokeWidth={1.75} aria-hidden="true" />
                              </Link>
                            </Pista>
                          </Dato>
                        )}
                        {g.responsableDni && (
                          <Dato icono={<IdCard size={18} strokeWidth={1.75} aria-hidden="true" />} etiqueta={t.responsableDni} valor={formatearDni(g.responsableDni)}>
                            <BotonIcono icono="copiar" etiqueta={t.copiarDni} onPress={() => copiar(g.responsableDni!)} />
                          </Dato>
                        )}
                      </dl>
                    )}
                  </div>
                ) : (
                  <div className="cf-vacio">
                    <p>{pegar(t.sinResponsableTexto)}</p>
                    {!archivados && (
                      <Boton variante="secundaria" icono="agregar" onPress={() => alEditar(g)}>
                        {t.cargarResponsable}
                      </Boton>
                    )}
                  </div>
                )}
              </section>
              <Servicios key={g.id} g={g} />
            </div>
          </div>
          <div className="ui-dialogo__acciones pr-ficha__acciones">
            <Boton variante={archivados ? "secundaria" : "peligro"} icono={archivados ? "restaurar" : "archivar"} onPress={() => alArchivo(g)}>
              {archivados ? t.restaurar : t.archivar}
            </Boton>
            <span className="pr-ficha__resto">
              {!archivados && (
                <Boton variante="secundaria" icono="editar" onPress={() => alEditar(g)}>
                  {t.editar}
                </Boton>
              )}
              <Boton variante="primaria" icono="proyectos" onPress={() => router.push(`/?cliente=${g.id}`)}>
                {t.verEnServicios}
              </Boton>
            </span>
          </div>
        </>
      )}
    </TarjetaModal>
  )
}

/** Un renglón de contacto: ícono, rótulo arriba y valor abajo, y sus botones al costado. */
function Dato({ icono, etiqueta, valor, partir, children }: { icono: ReactNode; etiqueta: string; valor: string; partir?: boolean; children: ReactNode }) {
  return (
    <div className="cf-dato">
      <span className="cf-dato__icono">{icono}</span>
      <div className="cf-dato__textos">
        <dt className="cf-dato__etiqueta">{etiqueta}</dt>
        <dd className="cf-dato__valor" data-partir={partir || undefined} title={valor}>
          {valor}
        </dd>
      </div>
      <span className="cf-dato__acciones">{children}</span>
    </div>
  )
}

/** La columna de servicios, con buscador cuando son muchos. */
function Servicios({ g }: { g: FilaGrupo }) {
  const [filtro, setFiltro] = useState("")
  const q = sinAcentos(limpiarTexto(filtro))
  const visibles = q ? g.servicios.filter((s) => sinAcentos(s.nombre).includes(q)) : g.servicios
  return (
    <section className="cf-columna" aria-label={t.serviciosTitulo}>
      <h3 className="gr-ficha__subtitulo">{t.serviciosDe(g.proyectos)}</h3>
      {g.servicios.length >= BUSCAR_DESDE && (
        <div className="cf-buscar">
          <Campo etiqueta={t.buscarServicio} name="filtroFicha" valor={filtro} alCambiar={setFiltro} icono="buscar" max={80} />
        </div>
      )}
      {g.servicios.length === 0 ? (
        <p className="gr-ficha__vacio">{pegar(t.serviciosVacio)}</p>
      ) : visibles.length === 0 ? (
        <p className="gr-ficha__vacio">{t.sinCoincidencias}</p>
      ) : (
        <ul className="gr-ficha__lista cf-lista" tabIndex={0} aria-label={t.serviciosTitulo}>
          {visibles.map((s) => (
            <li key={s.id} className="gr-ficha__servicio cf-servicio">
              <span className="cf-servicio__textos">
                <span className="gr-ficha__servicio-nombre">{s.nombre}</span>
                <span className="cf-servicio__sitio">{sitioDe(s.url)}</span>
              </span>
              <BotonIcono icono="abrir" etiqueta={`${t.abrirServicio}: ${s.nombre}`} pista={t.abrirServicio} onPress={() => window.open(s.url, "_blank", "noopener,noreferrer")} />
            </li>
          ))}
        </ul>
      )}
      {g.proyectos > g.servicios.length && <p className="gr-ficha__nota">{pegar(t.serviciosCortados(g.servicios.length, g.proyectos))}</p>}
    </section>
  )
}
