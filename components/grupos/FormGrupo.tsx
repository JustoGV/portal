"use client"
import { Check } from "lucide-react"
import { useRouter } from "next/navigation"
import { useActionState, useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { ListBox, ListBoxItem, type Selection } from "react-aria-components"
import { guardarGrupo, verificarGrupo, type GrupoRepetido } from "@/acciones/grupos"
import { Boton } from "@/components/ui/Boton"
import { Campo } from "@/components/ui/Campo"
import { IndicadorPasos, PanelesPasos } from "@/components/ui/Pasos"
import { useResultado } from "@/components/ui/Resultado"
import { enterAvanza } from "@/components/ui/use-enter-avanza"
import { comun } from "@/i18n/es/comun"
import { grupos as t } from "@/i18n/es/grupos"
import {
  CAMPOS_RESPONSABLE,
  formatearDni,
  formatearTelefono,
  normalizarDni,
  normalizarMail,
  normalizarTelefono,
  RESPONSABLE_CARGO_MAX,
  RESPONSABLE_DNI_MAX,
  RESPONSABLE_MAIL_MAX,
  RESPONSABLE_NOMBRE_MAX,
  RESPONSABLE_TELEFONO_MAX,
  sugerirMail,
  validarCargo,
  validarDni,
  validarMail,
  validarNombreGrupo,
  validarResponsableNombre,
  validarTelefono,
  MENSAJES_RESPONSABLE,
  type CampoResponsable,
  type FilaGrupo,
  type Responsable,
  type ServicioElegible,
} from "@/lib/grupo"
import { NOMBRE_GRUPO_MAX } from "@/lib/nombre"
import { limpiarTexto, pegar } from "@/lib/texto"
import { Carpeta } from "./Carpeta"

type Props = {
  grupo: FilaGrupo | null
  /** Los servicios activos que se pueden marcar, con el grupo que tiene cada uno hoy. */
  elegibles: ServicioElegible[]
  alCambiar: (hayCambios: boolean) => void
  /** Se guardó: recibe el id del grupo. */
  alGuardar: (id: string) => void
  alCancelar: () => void
}

const ULTIMO = t.pasos.length - 1
const PASO_RESPONSABLE = 1

/** Cada dato del responsable con su regla (la misma que usa la acción al guardar) y lo que se manda. */
const REGLAS: Record<CampoResponsable, { validar: (v: string) => string | null; enviar: (v: string) => string }> = {
  responsableNombre: {
    validar: validarResponsableNombre,
    enviar: limpiarTexto,
  },
  responsableCargo: { validar: validarCargo, enviar: limpiarTexto },
  responsableMail: { validar: validarMail, enviar: normalizarMail },
  responsableTelefono: { validar: validarTelefono, enviar: normalizarTelefono },
  responsableDni: { validar: validarDni, enviar: normalizarDni },
}
const responsableDe = (g: FilaGrupo | null): Record<CampoResponsable, string> =>
  Object.fromEntries(
    CAMPOS_RESPONSABLE.map((c) => {
      const v = g?.[c] ?? ""
      // Lo guardado se muestra como se escribe: el teléfono como se marca acá y el DNI con puntos.
      return [c, v && c === "responsableTelefono" ? formatearTelefono(v) : v && c === "responsableDni" ? formatearDni(v) : v]
    }),
  ) as Record<CampoResponsable, string>
const sinAcentos = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()

type Repetido = {
  para: string
  estado: "nada" | "libre" | "existe"
  repetido: GrupoRepetido
}

/**
 * El aviso de nombre repetido en vivo (docs/reglas/06 §3): 300 ms sin teclear y se pregunta al servidor,
 * excluyendo el propio. Recuerda para qué nombre contestó; si la consulta falla no se inventa nada.
 */
const useRepetido = (nombre: string, listo: boolean, excluir: string | null): Repetido => {
  const [r, setR] = useState<Repetido>({
    para: "",
    estado: "nada",
    repetido: null,
  })
  const ultimo = useRef(0)
  useEffect(() => {
    if (!listo) return
    const n = ++ultimo.current
    const espera = window.setTimeout(async () => {
      try {
        const res = await verificarGrupo(nombre, excluir)
        if (n !== ultimo.current) return
        if (!res.ok) return setR({ para: nombre, estado: "nada", repetido: null })
        setR({
          para: nombre,
          estado: res.datos.repetido ? "existe" : "libre",
          repetido: res.datos.repetido,
        })
      } catch {
        if (n === ultimo.current) setR({ para: nombre, estado: "nada", repetido: null })
      }
    }, 300)
    return () => window.clearTimeout(espera)
  }, [nombre, listo, excluir])
  return listo && r.para === nombre ? r : { para: nombre, estado: "nada", repetido: null }
}

/**
 * El alta y la edición de un cliente (por dentro, un grupo: D-032) en cuatro pasos (docs/trabajo/MATEO.md
 * §10.5; D-026): "Nombre" (con el aviso de repetido en vivo), "Responsable" (cuatro datos opcionales de quien
 * está a cargo), "Servicios" (se marcan los que van en el cliente; opcional) y "Revisar" (la carpeta como va
 * a quedar, y recién ahí se guarda). Los paneles quedan montados: lo cargado en un paso no se pierde al pasar
 * a otro y viaja entero al guardar.
 */
export function FormGrupo({ grupo, elegibles, alCambiar, alGuardar, alCancelar }: Props) {
  const router = useRouter()
  const mostrar = useResultado()
  const form = useRef<HTMLFormElement>(null)
  const [inicial] = useState(() => ({
    nombre: grupo?.nombre ?? "",
    responsable: responsableDe(grupo),
    servicios: new Set(grupo ? elegibles.filter((s) => s.grupoId === grupo.id).map((s) => s.id) : []),
  }))
  const [nombre, setNombre] = useState(inicial.nombre)
  const [marcados, setMarcados] = useState<Set<string>>(inicial.servicios)
  const [resp, setResp] = useState(inicial.responsable)
  const [respTocado, setRespTocado] = useState<Partial<Record<CampoResponsable, boolean>>>({})
  const [respError, setRespError] = useState<Partial<Record<CampoResponsable, string>>>({})
  const [filtro, setFiltro] = useState("")
  const [error, setError] = useState<string | undefined>()
  const [tocado, setTocado] = useState(false)
  const [paso, setPaso] = useState(0)
  // Al editar, los tres pasos ya están completos: se puede ir directo a cualquiera.
  const [alcanzado, setAlcanzado] = useState(grupo ? t.pasos.length : 0)
  const primerPaso = useRef(true)

  const [, accion, enviando] = useActionState(async (anterior: Awaited<ReturnType<typeof guardarGrupo>> | null, datos: FormData) => {
    const estado = await guardarGrupo(anterior, datos)
    if (estado.ok) {
      alCambiar(false)
      alGuardar(estado.datos.id)
      mostrar({
        tipo: "guardado",
        titulo: t.guardado,
        texto: t.guardadoCon(estado.datos.nombre, estado.datos.entraron, estado.datos.salieron),
      })
    } else if (estado.sesion === "vencida") {
      router.replace("/ingresar?motivo=expirado")
    } else if (estado.errores?.nombre) {
      setError(estado.errores.nombre)
      setPaso(0)
      mostrar({
        tipo: "dato-mal",
        titulo: comun.datoMalTitulo,
        texto: estado.mensaje,
      })
    } else if (CAMPOS_RESPONSABLE.some((c) => estado.errores?.[c])) {
      setRespError(Object.fromEntries(CAMPOS_RESPONSABLE.filter((c) => estado.errores?.[c]).map((c) => [c, estado.errores![c]])))
      setPaso(PASO_RESPONSABLE)
      mostrar({
        tipo: "dato-mal",
        titulo: comun.datoMalTitulo,
        texto: estado.mensaje,
      })
    } else {
      mostrar({
        tipo: "error",
        titulo: comun.noGuardadoTitulo,
        texto: estado.mensaje,
      })
    }
    return estado
  }, null)

  const nombreLimpio = limpiarTexto(nombre)
  const errorNombre = validarNombreGrupo(nombre)
  const mismoNombre = !!grupo && nombreLimpio.toLowerCase() === grupo.nombre.toLowerCase()
  const dup = useRepetido(nombreLimpio, !errorNombre && !mismoNombre, grupo?.id ?? null)
  const mensajeDup = dup.estado === "existe" && dup.repetido ? (dup.repetido.archivado ? t.existeArchivado(dup.repetido.nombre) : t.existe(dup.repetido.nombre)) : null
  // El rojo puede esperar a que salgas del campo; el aviso de repetido no (06 §1.5, §3).
  const verError = error ?? mensajeDup ?? (tocado ? errorNombre : null) ?? undefined

  const cambioServicios = marcados.size !== inicial.servicios.size || [...marcados].some((id) => !inicial.servicios.has(id))
  const cambioResponsable = CAMPOS_RESPONSABLE.some((c) => resp[c] !== inicial.responsable[c])
  const hayCambios = nombre !== inicial.nombre || cambioResponsable || cambioServicios
  useEffect(() => alCambiar(hayCambios), [hayCambios, alCambiar])

  // Al cambiar de paso el foco va al primer control del paso nuevo; en "Revisar", al botón de guardar.
  useEffect(() => {
    if (primerPaso.current) {
      primerPaso.current = false
      return
    }
    const cuadro = requestAnimationFrame(() => {
      const f = form.current
      if (!f) return
      const destino = f.querySelector<HTMLElement>(".ui-pasos__panel[data-activo] input:not([type=hidden])") ?? f.querySelector<HTMLElement>('button[type="submit"]')
      destino?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(cuadro)
  }, [paso])

  /** El error del paso "Nombre", con las mismas reglas que al guardar. */
  const revisarNombre = () => errorNombre ?? mensajeDup

  /** Los errores del paso "Responsable", con las mismas reglas que al guardar. */
  const erroresResponsable = () =>
    Object.fromEntries(CAMPOS_RESPONSABLE.map((c) => [c, REGLAS[c].validar(resp[c])]).filter(([, e]) => e)) as Partial<Record<CampoResponsable, string>>
  const mostrarResponsable = (errs: Partial<Record<CampoResponsable, string>>) => {
    setRespError(errs)
    setRespTocado(Object.fromEntries(CAMPOS_RESPONSABLE.map((c) => [c, true])))
    const primero = CAMPOS_RESPONSABLE.find((c) => errs[c])
    if (primero) form.current?.querySelector<HTMLElement>(`[name="${primero}"]`)?.focus()
  }

  const irA = (destino: number) => {
    if (destino > paso && paso === 0) {
      const err = revisarNombre()
      if (err) {
        setError(err)
        setTocado(true)
        form.current?.querySelector<HTMLElement>('[name="nombre"]')?.focus()
        return
      }
    }
    if (destino > paso && paso === PASO_RESPONSABLE) {
      const errs = erroresResponsable()
      if (Object.keys(errs).length) return mostrarResponsable(errs)
    }
    setPaso(destino)
    setAlcanzado((a) => Math.max(a, destino))
  }

  const validar = (e: FormEvent<HTMLFormElement>) => {
    const err = revisarNombre()
    const errs = erroresResponsable()
    if (!err && !Object.keys(errs).length) return
    e.preventDefault()
    if (err) {
      setError(err)
      setTocado(true)
      setPaso(0)
    } else {
      setPaso(PASO_RESPONSABLE)
      requestAnimationFrame(() => mostrarResponsable(errs))
    }
    mostrar({
      tipo: "dato-mal",
      titulo: comun.datoMalTitulo,
      texto: comun.datoMalTexto,
    })
  }

  const cambiarResp = (c: CampoResponsable) => (v: string) => {
    setResp((r) => ({ ...r, [c]: v }))
    setRespError((e) => ({ ...e, [c]: undefined }))
  }
  const verErrorResp = (c: CampoResponsable) => respError[c] ?? (respTocado[c] ? (REGLAS[c].validar(resp[c]) ?? undefined) : undefined)
  const okResp = (c: CampoResponsable) => !!limpiarTexto(resp[c]) && !REGLAS[c].validar(resp[c])
  const salirResp = (c: CampoResponsable) => () => setRespTocado((r) => ({ ...r, [c]: true }))
  // Lo que se guarda y lo que se muestra en "Revisar": limpio y, el mail, en minúsculas.
  const respFinal = Object.fromEntries(CAMPOS_RESPONSABLE.map((c) => [c, REGLAS[c].enviar(resp[c]) || null])) as Responsable
  const hayResponsable = CAMPOS_RESPONSABLE.some((c) => respFinal[c])
  // «ana@gmial.com»: se pregunta si quiso decir otro dominio; no se cambia solo.
  const sugerencia = !validarMail(resp.responsableMail) ? sugerirMail(resp.responsableMail) : null

  // El paso "Servicios": lo que se ve según el filtro, y qué cambia respecto de hoy.
  const visibles = useMemo(() => {
    const q = sinAcentos(limpiarTexto(filtro))
    return q ? elegibles.filter((s) => sinAcentos(s.nombre).includes(q)) : elegibles
  }, [elegibles, filtro])
  const entran = [...marcados].filter((id) => !inicial.servicios.has(id))
  const salen = [...inicial.servicios].filter((id) => !marcados.has(id))
  const movidos = entran.filter((id) => elegibles.find((s) => s.id === id)?.grupoId).length
  const nombresMarcados = elegibles.filter((s) => marcados.has(s.id)).map((s) => pegar(s.nombre))

  const elegir = (seleccion: Selection) => {
    // La lista muestra solo lo filtrado: lo marcado que no se ve se conserva.
    const vistos = new Set(visibles.map((s) => s.id))
    const nuevo = new Set([...marcados].filter((id) => !vistos.has(id)))
    if (seleccion === "all") vistos.forEach((id) => nuevo.add(id))
    else seleccion.forEach((id) => nuevo.add(String(id)))
    setMarcados(nuevo)
  }

  return (
    <form ref={form} action={accion} onSubmit={validar} onKeyDown={enterAvanza} noValidate>
      <input type="hidden" name="id" value={grupo?.id ?? ""} />
      <input type="hidden" name="conResponsable" value="1" />
      <input type="hidden" name="conServicios" value="1" />
      <input type="hidden" name="servicios" value={[...marcados].join(",")} />
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
              setError(undefined)
            }}
            alSalir={() => setTocado(true)}
            icono="carpeta"
            max={NOMBRE_GRUPO_MAX}
            contador="siempre"
            progreso={Math.min(1, nombreLimpio.length / 3)}
            obligatorio
            autoFocus
            ayuda={t.nombreAyuda}
            ok={!errorNombre && (mismoNombre || dup.estado === "libre")}
            error={verError}
          />
        </div>
        <div className="ui-dialogo__campos gr-responsable-campos">
          <Campo
            etiqueta={t.responsableNombre}
            name="responsableNombre"
            valor={resp.responsableNombre}
            alCambiar={cambiarResp("responsableNombre")}
            alSalir={salirResp("responsableNombre")}
            max={RESPONSABLE_NOMBRE_MAX}
            contador="cerca"
            ayuda={t.responsableNombreAyuda}
            ok={okResp("responsableNombre")}
            error={verErrorResp("responsableNombre")}
          />
          <Campo
            etiqueta={t.responsableCargo}
            name="responsableCargo"
            valor={resp.responsableCargo}
            alCambiar={cambiarResp("responsableCargo")}
            alSalir={salirResp("responsableCargo")}
            max={RESPONSABLE_CARGO_MAX}
            contador="cerca"
            ayuda={t.responsableCargoAyuda}
            ok={okResp("responsableCargo")}
            error={verErrorResp("responsableCargo")}
          />
          <Campo
            etiqueta={t.responsableDni}
            name="responsableDni"
            inputMode="numeric"
            valor={resp.responsableDni}
            alCambiar={cambiarResp("responsableDni")}
            alSalir={salirResp("responsableDni")}
            max={RESPONSABLE_DNI_MAX}
            ayuda={t.responsableDniAyuda}
            ok={okResp("responsableDni")}
            error={verErrorResp("responsableDni")}
          />
          <Campo
            etiqueta={t.responsableMail}
            name="responsableMail"
            tipo="email"
            inputMode="email"
            valor={resp.responsableMail}
            alCambiar={cambiarResp("responsableMail")}
            alSalir={salirResp("responsableMail")}
            max={RESPONSABLE_MAIL_MAX}
            ok={okResp("responsableMail")}
            error={verErrorResp("responsableMail")}
          />
          {sugerencia && (
            <p className="gr-sugerencia" aria-live="polite">
              <span>{MENSAJES_RESPONSABLE.mailSugerencia(sugerencia)}</span>
              <Boton variante="secundaria" onPress={() => cambiarResp("responsableMail")(sugerencia)}>
                {t.usarSugerencia}
              </Boton>
            </p>
          )}
          <Campo
            etiqueta={t.responsableTelefono}
            name="responsableTelefono"
            inputMode="tel"
            valor={resp.responsableTelefono}
            alCambiar={cambiarResp("responsableTelefono")}
            alSalir={salirResp("responsableTelefono")}
            max={RESPONSABLE_TELEFONO_MAX}
            ayuda={t.responsableTelefonoAyuda}
            ok={okResp("responsableTelefono")}
            error={verErrorResp("responsableTelefono")}
          />
        </div>
        <div className="gr-elegir">
          {elegibles.length === 0 ? (
            <p className="gr-elegir__vacio">{pegar(t.sinServiciosParaElegir)}</p>
          ) : (
            <>
              <div className="gr-elegir__barra">
                <Campo etiqueta={t.filtrarServicios} name="filtroServicios" valor={filtro} alCambiar={setFiltro} icono="buscar" max={80} />
                <p className="gr-elegir__cuenta" aria-live="polite">
                  {t.elegidos(marcados.size)}
                </p>
              </div>
              <ListBox
                className="gr-elegir__lista"
                aria-label={t.listaServicios}
                selectionMode="multiple"
                selectedKeys={new Set(visibles.filter((s) => marcados.has(s.id)).map((s) => s.id))}
                onSelectionChange={elegir}
                items={visibles}
                renderEmptyState={() => <p className="ui-lista__vacia">{t.sinCoincidencias}</p>}
              >
                {(s: ServicioElegible) => (
                  <ListBoxItem id={s.id} textValue={s.nombre} className="gr-elegir__opcion">
                    <span className="gr-elegir__caja" aria-hidden="true">
                      <Check size={14} strokeWidth={3} />
                    </span>
                    <span className="gr-elegir__nombre">{s.nombre}</span>
                    <span className="gr-elegir__hoy" data-otro={(s.grupoId && s.grupoId !== grupo?.id) || undefined}>
                      {s.grupoId ? (s.grupoId === grupo?.id ? t.yaEsta : t.hoyEn(s.grupoNombre ?? "")) : t.hoySinGrupo}
                    </span>
                  </ListBoxItem>
                )}
              </ListBox>
            </>
          )}
        </div>
        <div className="ui-pasos__revision">
          <div className="gr-previa" role="group" aria-label={t.vistaPrevia}>
            <Carpeta hojas={marcados.size} />
            <div className="gr-previa__texto">
              <p className="gr-previa__nombre">{nombreLimpio || t.nombre}</p>
              <p className="gr-previa__responsable" data-vacio={respFinal.responsableNombre ? undefined : ""}>
                {respFinal.responsableNombre ?? t.sinResponsable}
              </p>
              <p className="gr-previa__cuenta">{marcados.size === 0 ? t.sinServicios : t.servicios(marcados.size)}</p>
            </div>
          </div>
          <dl className="ui-resumen">
            <div className="ui-resumen__fila">
              <dt>{t.nombre.split(" ")[0]}</dt>
              <dd>{pegar(nombreLimpio)}</dd>
            </div>
            <div className="ui-resumen__fila">
              <dt>{t.responsable}</dt>
              {hayResponsable ? (
                <dd className="gr-resumen-responsable">
                  {respFinal.responsableNombre && <span className="gr-resumen-responsable__nombre">{respFinal.responsableNombre}</span>}
                  {respFinal.responsableCargo && <span className="gr-resumen-responsable__cargo">{respFinal.responsableCargo}</span>}
                  {respFinal.responsableMail && <span className="gr-dato-largo">{respFinal.responsableMail}</span>}
                  {respFinal.responsableDni && (
                    <span>
                      {t.responsableDni} {formatearDni(respFinal.responsableDni)}
                    </span>
                  )}
                  {respFinal.responsableTelefono && <span>{formatearTelefono(respFinal.responsableTelefono)}</span>}
                </dd>
              ) : (
                <dd data-vacio="">{t.sinResponsable}</dd>
              )}
            </div>
            <div className="ui-resumen__fila">
              <dt>{t.resumenServicios}</dt>
              <dd data-vacio={marcados.size ? undefined : ""}>{marcados.size ? pegar(nombresMarcados.join(" · ")) : t.sinServicios}</dd>
              <p className="ui-resumen__nota">
                {pegar(
                  entran.length || salen.length
                    ? [entran.length ? t.resumenEntran(entran.length) : "", movidos ? t.resumenMovidos(movidos) : "", salen.length ? t.resumenSalen(salen.length) : ""]
                        .filter(Boolean)
                        .join(" ")
                    : t.resumenSinCambios,
                )}
              </p>
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
          <Boton key="atras" variante="secundaria" onPress={() => irA(paso - 1)}>
            {comun.atras}
          </Boton>
        )}
        {/* Dos botones distintos (con su key): si fuera el mismo, el click en "Siguiente" lo volvería de envío en el mismo gesto (G-009). */}
        {paso < ULTIMO ? (
          <Boton key="siguiente" variante="primaria" data-enter-sigue="" onPress={() => irA(paso + 1)}>
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
