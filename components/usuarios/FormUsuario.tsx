"use client"
import { useRouter } from "next/navigation"
import { createContext, useActionState, useContext, useEffect, useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from "react"
import { crearCuenta, editarCuenta } from "@/acciones/usuarios"
import { Boton } from "@/components/ui/Boton"
import { BotonIcono } from "@/components/ui/BotonIcono"
import { Campo } from "@/components/ui/Campo"
import { useConfirmar } from "@/components/ui/Confirmar"
import { Dialogo } from "@/components/ui/Dialogo"
import { IndicadorPasos, PanelesPasos } from "@/components/ui/Pasos"
import { useResultado } from "@/components/ui/Resultado"
import { enterAvanza } from "@/components/ui/use-enter-avanza"
import { comun } from "@/i18n/es/comun"
import { usuarios as t } from "@/i18n/es/usuarios"
import { EMAIL_MAX, normalizarEmail, validarEmail, validarNombreCuenta, type FilaUsuario } from "@/lib/cuenta"
import { gsap, quieto } from "@/lib/gsap"
import { sugerirMail } from "@/lib/mail"
import { iniciales, NOMBRE_PERSONA_MAX } from "@/lib/nombre"
import { limpiarTexto, pegar } from "@/lib/texto"

/** Lo que se le pasa a la persona: se muestra una sola vez. */
export type DatosCuenta = { nombre: string; email: string; clave: string }

type Editor = {
  abrirNueva: (desde?: Element | null) => void
  abrirEdicion: (u: FilaUsuario, desde?: Element | null) => void
  /** La contraseña inicial nueva de una cuenta que ya existía: se muestra en su tarjeta. */
  mostrarClave: (d: DatosCuenta, desde?: Element | null) => void
}
const Contexto = createContext<Editor | null>(null)

export const useEditorUsuario = () => {
  const c = useContext(Contexto)
  if (!c) throw new Error("useEditorUsuario fuera de EditorUsuario")
  return c
}

/**
 * El alta, la edición del nombre y la contraseña inicial nueva de una cuenta (D-034), cada una en una tarjeta
 * centrada que crece desde el botón o la fila que la abrió (D-030). El alta va en tres pasos (D-026, como
 * EDV): «Quién es», «Revisar» y, ya creada, «Pasale los datos». Lo escrito se limpia al abrir de nuevo.
 */
export function EditorUsuario({ children }: { children: ReactNode }) {
  const [modo, setModo] = useState<"nueva" | "editar" | "clave" | null>(null)
  const [cuenta, setCuenta] = useState<FilaUsuario | null>(null)
  const [clave, setClave] = useState<DatosCuenta | null>(null)
  const [apertura, setApertura] = useState(0)
  const [cambios, setCambios] = useState(false)
  const desde = useRef<Element | null>(null)
  const reciente = useRef<string | null>(null)
  const confirmar = useConfirmar()

  const abrir = (m: "nueva" | "editar" | "clave", origen?: Element | null) => {
    desde.current = origen ?? document.activeElement
    setApertura((n) => n + 1)
    setCambios(false)
    setModo(m)
  }
  const cerrar = () => {
    setModo(null)
    // La cuenta recién creada se marca una vez en la tabla, cuando la tarjeta ya volvió (1,2 s, en CSS).
    const id = reciente.current
    reciente.current = null
    if (!id) return
    window.setTimeout(() => {
      const fila = document.querySelector(`tr[data-flip-id="${id}"]`)
      fila?.classList.add("us-tr--reciente")
      window.setTimeout(() => fila?.classList.remove("us-tr--reciente"), 1300)
    }, 420)
  }
  const cancelar = async () => {
    if (cambios && !(await confirmar({ titulo: comun.descartarTitulo, texto: comun.descartarTexto, accion: comun.descartar, cancelar: comun.seguirEditando, peligro: true }))) return
    cerrar()
  }
  const origen = () => (desde.current?.isConnected ? desde.current.getBoundingClientRect() : null)

  return (
    <Contexto.Provider
      value={{
        abrirNueva: (d) => abrir("nueva", d),
        abrirEdicion: (u, d) => {
          setCuenta(u)
          abrir("editar", d)
        },
        mostrarClave: (c, d) => {
          setClave(c)
          abrir("clave", d)
        },
      }}
    >
      {children}
      <Dialogo abierto={modo === "nueva"} alCerrar={cerrar} titulo={t.tituloNueva} bajada={pegar(t.bajadaNueva)} hayCambios={cambios} ancho="36rem" origen={origen}>
        <FormAlta
          key={`n${apertura}`}
          alCambiar={setCambios}
          alCrear={(id) => {
            reciente.current = id
            setCambios(false)
          }}
          alCancelar={cancelar}
          alTerminar={cerrar}
        />
      </Dialogo>
      <Dialogo abierto={modo === "editar"} alCerrar={cerrar} titulo={t.tituloEditar} bajada={pegar(t.bajadaEditar)} hayCambios={cambios} ancho="34rem" origen={origen}>
        {cuenta && <FormEditar key={`e${apertura}`} cuenta={cuenta} alCambiar={setCambios} alGuardar={cerrar} alCancelar={cancelar} />}
      </Dialogo>
      <Dialogo abierto={modo === "clave"} alCerrar={cerrar} titulo={t.claveNuevaTitulo} ancho="34rem" origen={origen}>
        {clave && (
          <>
            <DatosParaPasar datos={clave} explicar />
            <div className="ui-dialogo__acciones">
              <CopiarTodo datos={clave} />
              <Boton variante="primaria" icono="tilde" onPress={cerrar}>
                {t.listo}
              </Boton>
            </div>
          </>
        )}
      </Dialogo>
    </Contexto.Provider>
  )
}

export function BotonNuevaCuenta() {
  const { abrirNueva } = useEditorUsuario()
  return (
    <Boton variante="primaria" icono="agregar" onPress={(e) => abrirNueva(e.target)}>
      {t.nueva}
    </Boton>
  )
}

const ULTIMO_ALTA = t.pasos.length - 1

/** El alta en tres pasos. El tercero aparece recién cuando la cuenta ya existe: no se puede volver atrás. */
function FormAlta({ alCambiar, alCrear, alCancelar, alTerminar }: { alCambiar: (c: boolean) => void; alCrear: (id: string) => void; alCancelar: () => void; alTerminar: () => void }) {
  const router = useRouter()
  const mostrar = useResultado()
  const form = useRef<HTMLFormElement>(null)
  const [nombre, setNombre] = useState("")
  const [email, setEmail] = useState("")
  const [tocado, setTocado] = useState<{ nombre?: boolean; email?: boolean }>({})
  const [errores, setErrores] = useState<{ nombre?: string; email?: string }>({})
  const [paso, setPaso] = useState(0)
  const [alcanzado, setAlcanzado] = useState(0)
  const [creada, setCreada] = useState<DatosCuenta | null>(null)
  const primerPaso = useRef(true)

  const [, accion, enviando] = useActionState(async (anterior: Awaited<ReturnType<typeof crearCuenta>> | null, datos: FormData) => {
    const estado = await crearCuenta(anterior, datos)
    if (estado.ok) {
      alCrear(estado.datos.id)
      setCreada({ nombre: estado.datos.nombre, email: estado.datos.email, clave: estado.datos.clave })
      setPaso(ULTIMO_ALTA)
      setAlcanzado(ULTIMO_ALTA)
    } else if (estado.sesion === "vencida") router.replace("/ingresar?motivo=expirado")
    else if (estado.errores?.nombre || estado.errores?.email) {
      setErrores({ nombre: estado.errores.nombre, email: estado.errores.email })
      setPaso(0)
      mostrar({ tipo: "dato-mal", titulo: comun.datoMalTitulo, texto: estado.mensaje })
    } else mostrar({ tipo: "error", titulo: comun.noGuardadoTitulo, texto: estado.mensaje })
    return estado
  }, null)

  const errNombre = validarNombreCuenta(nombre)
  const errEmail = validarEmail(email)
  const mailFinal = normalizarEmail(email)
  const sugerencia = !errEmail ? sugerirMail(email) : null

  useEffect(() => alCambiar(!creada && (nombre !== "" || email !== "")), [nombre, email, creada, alCambiar])

  // Al cambiar de paso el foco va al primer campo del paso nuevo, o al botón principal.
  useEffect(() => {
    if (primerPaso.current) {
      primerPaso.current = false
      return
    }
    const cuadro = requestAnimationFrame(() => {
      const f = form.current
      const destino = f?.querySelector<HTMLElement>(".ui-pasos__panel[data-activo] input:not([type=hidden])") ?? f?.querySelector<HTMLElement>(".ui-dialogo__acciones .ui-boton--primaria")
      destino?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(cuadro)
  }, [paso])

  const revisarPrimerPaso = () => {
    const e = { nombre: errNombre ?? undefined, email: errEmail ?? undefined }
    setErrores(e)
    setTocado({ nombre: true, email: true })
    const primero = e.nombre ? "nombre" : e.email ? "email" : null
    if (primero) form.current?.querySelector<HTMLElement>(`[name="${primero}"]`)?.focus()
    return !primero
  }

  const irA = (destino: number) => {
    if (creada) return
    if (destino > 0 && !revisarPrimerPaso()) return
    setPaso(destino)
    setAlcanzado((a) => Math.max(a, destino))
  }

  const validar = (e: FormEvent<HTMLFormElement>) => {
    if (creada || !revisarPrimerPaso()) {
      e.preventDefault()
      if (!creada) setPaso(0)
    }
  }

  const verError = (c: "nombre" | "email") => errores[c] ?? (tocado[c] ? ((c === "nombre" ? errNombre : errEmail) ?? undefined) : undefined)

  return (
    <form ref={form} action={accion} onSubmit={validar} onKeyDown={enterAvanza} noValidate>
      <IndicadorPasos pasos={t.pasos} actual={paso} alcanzado={alcanzado} alIr={irA} etiqueta={t.pasosEtiqueta} />
      <div className="ui-pasos__encabezado" aria-live="polite">
        <p className="ui-pasos__paso-de">
          {comun.pasoDe(paso + 1, t.pasos.length)} · <strong>{t.pasos[paso]}</strong>
        </p>
        <p className="ui-pasos__ayuda">{pegar(t.pasosBajada[paso] ?? "")}</p>
      </div>
      <PanelesPasos actual={paso} nombres={t.pasos}>
        <div className="ui-dialogo__campos">
          <Campo
            etiqueta={t.nombre}
            name="nombre"
            valor={nombre}
            alCambiar={(v) => {
              setNombre(v)
              setErrores((e) => ({ ...e, nombre: undefined }))
            }}
            alSalir={() => setTocado((x) => ({ ...x, nombre: true }))}
            icono="persona"
            max={NOMBRE_PERSONA_MAX}
            contador="cerca"
            obligatorio
            autoFocus
            ayuda={t.nombreAyuda}
            ok={!errNombre}
            error={verError("nombre")}
          />
          <Campo
            etiqueta={t.email}
            name="email"
            tipo="email"
            inputMode="email"
            autoComplete="off"
            valor={email}
            alCambiar={(v) => {
              setEmail(v)
              setErrores((e) => ({ ...e, email: undefined }))
            }}
            alSalir={() => setTocado((x) => ({ ...x, email: true }))}
            icono="sobre"
            max={EMAIL_MAX}
            obligatorio
            ayuda={t.emailAyuda}
            ok={!errEmail}
            error={verError("email")}
          />
          {sugerencia && (
            <p className="gr-sugerencia" aria-live="polite">
              <span>{`¿Quisiste decir ${sugerencia}?`}</span>
              <Boton variante="secundaria" onPress={() => setEmail(sugerencia)}>
                {t.usarSugerencia}
              </Boton>
            </p>
          )}
        </div>
        <div className="ui-pasos__revision">
          <div className="us-previa" role="group" aria-label={t.vistaPrevia}>
            <span className="cf-iniciales" aria-hidden="true">
              {iniciales(limpiarTexto(nombre)) || "?"}
            </span>
            <span className="us-previa__textos">
              <span className="us-persona__nombre">{limpiarTexto(nombre) || t.nombre}</span>
              <span className="us-persona__mail">{mailFinal || t.email}</span>
            </span>
            <span className="ui-etiqueta" data-tono="warn">
              <span className="ui-etiqueta__punto" aria-hidden="true" />
              {t.primerIngreso}
            </span>
          </div>
          <dl className="ui-resumen">
            <div className="ui-resumen__fila">
              <dt>{t.resumenNombre}</dt>
              <dd>{pegar(limpiarTexto(nombre))}</dd>
            </div>
            <div className="ui-resumen__fila">
              <dt>{t.resumenMail}</dt>
              <dd className="gr-dato-largo">{mailFinal}</dd>
            </div>
            <div className="ui-resumen__fila">
              <dt>{t.resumenContrasena}</dt>
              <dd>{pegar(t.resumenContrasenaTexto)}</dd>
            </div>
            <div className="ui-resumen__fila">
              <dt>{t.resumenEstado}</dt>
              <dd>{pegar(t.resumenEstadoTexto)}</dd>
            </div>
          </dl>
        </div>
        <div className="ui-pasos__revision">{creada ? <DatosParaPasar datos={creada} /> : null}</div>
      </PanelesPasos>
      <div className="ui-dialogo__acciones ui-dialogo__acciones--pasos">
        {creada ? (
          <>
            <CopiarTodo datos={creada} />
            <Boton key="listo" variante="primaria" icono="tilde" onPress={alTerminar}>
              {t.listo}
            </Boton>
          </>
        ) : (
          <>
            {paso === 0 ? (
              <Boton key="cancelar" variante="secundaria" onPress={alCancelar}>
                {comun.cancelar}
              </Boton>
            ) : (
              <Boton key="atras" variante="secundaria" onPress={() => irA(paso - 1)}>
                {comun.atras}
              </Boton>
            )}
            {/* Dos botones distintos, con su key (G-009). */}
            {paso === 0 ? (
              <Boton key="siguiente" variante="primaria" data-enter-sigue="" onPress={() => irA(1)}>
                {comun.siguiente}
              </Boton>
            ) : (
              <Boton key="crear" type="submit" variante="primaria" icono="agregar" cargando={enviando} textoCargando={t.creando}>
                {t.crear}
              </Boton>
            )}
          </>
        )}
      </div>
    </form>
  )
}

/** Editar el nombre en dos pasos: «Nombre» y «Revisar». */
function FormEditar({ cuenta, alCambiar, alGuardar, alCancelar }: { cuenta: FilaUsuario; alCambiar: (c: boolean) => void; alGuardar: () => void; alCancelar: () => void }) {
  const router = useRouter()
  const mostrar = useResultado()
  const form = useRef<HTMLFormElement>(null)
  const [nombre, setNombre] = useState(cuenta.nombre)
  const [error, setError] = useState<string | undefined>()
  const [tocado, setTocado] = useState(false)
  const [paso, setPaso] = useState(0)

  const [, accion, enviando] = useActionState(async (anterior: Awaited<ReturnType<typeof editarCuenta>> | null, datos: FormData) => {
    const estado = await editarCuenta(anterior, datos)
    if (estado.ok) {
      alCambiar(false)
      alGuardar()
      mostrar({ tipo: "guardado", titulo: t.nombreGuardado, texto: estado.datos.nombre })
    } else if (estado.sesion === "vencida") router.replace("/ingresar?motivo=expirado")
    else if (estado.errores?.nombre) {
      setError(estado.errores.nombre)
      setPaso(0)
      mostrar({ tipo: "dato-mal", titulo: comun.datoMalTitulo, texto: estado.mensaje })
    } else mostrar({ tipo: "error", titulo: comun.noGuardadoTitulo, texto: estado.mensaje })
    return estado
  }, null)

  const err = validarNombreCuenta(nombre)
  useEffect(() => alCambiar(nombre !== cuenta.nombre), [nombre, cuenta.nombre, alCambiar])

  const irA = (destino: number) => {
    if (destino > 0 && err) {
      setError(err)
      setTocado(true)
      form.current?.querySelector<HTMLElement>('[name="nombre"]')?.focus()
      return
    }
    setPaso(destino)
  }

  return (
    <form
      ref={form}
      action={accion}
      onSubmit={(e) => {
        if (err) {
          e.preventDefault()
          setError(err)
          setPaso(0)
        }
      }}
      onKeyDown={enterAvanza}
      noValidate
    >
      <input type="hidden" name="id" value={cuenta.id} />
      <IndicadorPasos pasos={t.pasosEditar} actual={paso} alcanzado={t.pasosEditar.length} alIr={irA} etiqueta={t.pasosEtiqueta} />
      <div className="ui-pasos__encabezado" aria-live="polite">
        <p className="ui-pasos__paso-de">
          {comun.pasoDe(paso + 1, t.pasosEditar.length)} · <strong>{t.pasosEditar[paso]}</strong>
        </p>
        <p className="ui-pasos__ayuda">{pegar(t.pasosBajadaEditar[paso] ?? "")}</p>
      </div>
      <PanelesPasos actual={paso} nombres={t.pasosEditar}>
        <div className="ui-dialogo__campos">
          <Campo
            etiqueta={t.nombre}
            name="nombre"
            valor={nombre}
            alCambiar={(v) => {
              setNombre(v)
              setError(undefined)
            }}
            alSalir={() => setTocado(true)}
            icono="persona"
            max={NOMBRE_PERSONA_MAX}
            contador="cerca"
            obligatorio
            autoFocus
            ok={!err}
            error={error ?? (tocado ? (err ?? undefined) : undefined)}
          />
        </div>
        <div className="ui-pasos__revision">
          <dl className="ui-resumen">
            <div className="ui-resumen__fila">
              <dt>{t.resumenNombre}</dt>
              <dd>{pegar(limpiarTexto(nombre))}</dd>
            </div>
            <div className="ui-resumen__fila">
              <dt>{t.resumenMail}</dt>
              <dd className="gr-dato-largo">{cuenta.email}</dd>
            </div>
          </dl>
        </div>
      </PanelesPasos>
      <div className="ui-dialogo__acciones ui-dialogo__acciones--pasos">
        {paso === 0 ? (
          <Boton key="cancelar" variante="secundaria" onPress={alCancelar}>
            {comun.cancelar}
          </Boton>
        ) : (
          <Boton key="atras" variante="secundaria" onPress={() => irA(0)}>
            {comun.atras}
          </Boton>
        )}
        {paso === 0 ? (
          <Boton key="siguiente" variante="primaria" data-enter-sigue="" onPress={() => irA(1)}>
            {comun.siguiente}
          </Boton>
        ) : (
          <Boton key="guardar" type="submit" variante="primaria" icono="tilde" cargando={enviando} textoCargando={comun.guardando}>
            {t.guardar}
          </Boton>
        )}
      </div>
    </form>
  )
}

/**
 * «Pasale los datos» (EDV D-016): la dirección, el mail y la contraseña, cada uno con su botón de copiar, y
 * todo junto en un mensaje. La contraseña aparece escrita de izquierda a derecha en 0,5 s (D-034).
 */
export function DatosParaPasar({ datos, explicar }: { datos: DatosCuenta; explicar?: boolean }) {
  const copiar = useCopiar()
  const clave = useRef<HTMLParagraphElement>(null)
  const [url] = useState(urlIngreso)

  useLayoutEffect(() => {
    const letras = clave.current?.querySelectorAll("span[aria-hidden]")
    if (!letras?.length || quieto()) return
    const tl = gsap.fromTo(letras, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.18, stagger: 0.5 / letras.length, delay: 0.3, ease: "power2.out", clearProps: "opacity,transform" })
    return () => {
      tl.progress(1).kill()
    }
  }, [datos.clave])

  const fila = (rotulo: string, valor: string, extra?: ReactNode) => (
    <div className="us-dato" data-cascada="">
      <div className="us-dato__textos">
        <dt className="cf-dato__etiqueta">{rotulo}</dt>
        <dd className="us-dato__valor">{extra ?? conCortes(valor)}</dd>
      </div>
      <BotonIcono icono="copiar" etiqueta={t.copiar(rotulo.toLowerCase())} onPress={() => copiar(valor)} />
    </div>
  )

  return (
    <div className="us-datos">
      {explicar && <p className="us-datos__texto">{pegar(t.datosTexto(datos.nombre))}</p>}
      <dl className="us-datos__lista">
        {fila(t.direccion, url)}
        {fila(t.resumenMail, datos.email)}
        {fila(
          t.contrasenaInicialRotulo,
          datos.clave,
          <p ref={clave} className="us-clave ui-mono">
            <span className="sr-solo">{datos.clave}</span>
            {Array.from(datos.clave, (c, i) => (
              <span key={i} aria-hidden="true">
                {c}
              </span>
            ))}
          </p>,
        )}
      </dl>
    </div>
  )
}

/**
 * Una dirección o un mail largos se parten después de «@» o de un punto, o antes de una «/» suelta (nunca
 * dentro de «//»), no en medio de una palabra.
 */
const conCortes = (v: string) => v.split(/(?<=[@.])|(?<!\/)(?=\/(?!\/))/u).flatMap((p, i) => (i ? [<wbr key={i} />, p] : [p]))

/** Solo se usa en el navegador: después de crear la cuenta o de pedir la contraseña nueva. */
const urlIngreso = () => (typeof window === "undefined" ? "" : `${window.location.origin}/ingresar`)

const useCopiar = () => {
  const mostrar = useResultado()
  return async (valor: string) => {
    try {
      await navigator.clipboard.writeText(valor)
      mostrar({ tipo: "guardado", titulo: t.copiado })
    } catch {
      mostrar({ tipo: "error", titulo: t.noCopiado })
    }
  }
}

/** Todo junto en un mensaje para pegar en WhatsApp. Va al pie de la tarjeta, al lado de «Listo». */
function CopiarTodo({ datos }: { datos: DatosCuenta }) {
  const copiar = useCopiar()
  return (
    <Boton variante="secundaria" icono="copiar" onPress={() => copiar(t.mensaje(datos.nombre.split(" ")[0] ?? datos.nombre, urlIngreso(), datos.email, datos.clave))}>
      {t.copiarTodo}
    </Boton>
  )
}
