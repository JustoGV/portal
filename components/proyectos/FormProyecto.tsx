"use client"
import { useRouter } from "next/navigation"
import { useActionState, useEffect, useRef, useState, type FormEvent } from "react"
import { guardarProyecto } from "@/acciones/proyectos"
import { Boton } from "@/components/ui/Boton"
import { Campo } from "@/components/ui/Campo"
import { IndicadorPasos, PanelesPasos } from "@/components/ui/Pasos"
import { useResultado } from "@/components/ui/Resultado"
import { enterAvanza } from "@/components/ui/use-enter-avanza"
import { comun } from "@/i18n/es/comun"
import { proyectos as t } from "@/i18n/es/proyectos"
import { DESCRIPCION_MAX, NOMBRE_PROYECTO_MAX } from "@/lib/nombre"
import { MENSAJES_PROYECTO, validarNombreProyecto, type FilaProyecto } from "@/lib/proyecto"
import { limpiarTexto, pegar } from "@/lib/texto"
import { MENSAJE_URL, normalizarUrl } from "@/lib/url"
import { ComboGrupo, type Grupo } from "./ComboGrupo"
import { useDuplicado, type EstadoDuplicado } from "./use-duplicado"

type Props = {
  proyecto: FilaProyecto | null
  grupos: Grupo[]
  alCambiar: (hayCambios: boolean) => void
  alGuardar: () => void
  alCancelar: () => void
  /** Cierra sin preguntar (para ir al servicio existente). */
  alCerrar: () => void
}

/** En qué paso vive cada campo: un error vuelve al paso de su campo. */
const PASO_DE: Record<string, number> = { nombre: 0, url: 0, grupo: 1, descripcion: 1 }
const ULTIMO = t.pasos.length - 1

/**
 * El alta y la edición de un servicio en tres pasos (docs/trabajo/MATEO.md §10.5; D-026): "Datos"
 * (nombre y link, con el aviso de repetido en vivo), "Grupo" (grupo y descripción, opcionales) y
 * "Revisar" (todo lo cargado, y recién ahí se guarda). Los tres paneles quedan montados: lo escrito en
 * un paso no se pierde al pasar a otro y viaja entero al guardar.
 */
export function FormProyecto({ proyecto, grupos, alCambiar, alGuardar, alCancelar, alCerrar }: Props) {
  const router = useRouter()
  const mostrar = useResultado()
  const form = useRef<HTMLFormElement>(null)
  const [inicial] = useState(() => ({
    nombre: proyecto?.nombre ?? "",
    url: proyecto?.url ?? "",
    grupo: proyecto?.grupoNombre ?? "",
    descripcion: proyecto?.descripcion ?? "",
  }))
  const [nombre, setNombre] = useState(inicial.nombre)
  const [url, setUrl] = useState(inicial.url)
  const [grupo, setGrupo] = useState(inicial.grupo)
  const [descripcion, setDescripcion] = useState(inicial.descripcion)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [tocado, setTocado] = useState<Record<string, boolean>>({})
  const [paso, setPaso] = useState(0)
  // Al editar, los tres pasos ya están completos: se puede ir directo a cualquiera.
  const [alcanzado, setAlcanzado] = useState(proyecto ? t.pasos.length : 0)
  const foco = useRef<string | null>(null)
  const primerPaso = useRef(true)

  /** Va al paso del primer campo con error y le deja el foco. */
  const irAlError = (err: Record<string, string>) => {
    const campo = Object.keys(err)[0]
    if (!campo) return
    foco.current = campo
    setPaso(PASO_DE[campo] ?? 0)
  }

  // La respuesta del servidor se atiende dentro de la acción (corre en la transición del envío).
  const [, accion, enviando] = useActionState(async (anterior: Awaited<ReturnType<typeof guardarProyecto>> | null, datos: FormData) => {
    const estado = await guardarProyecto(anterior, datos)
    if (estado.ok) {
      alCambiar(false)
      alGuardar()
      mostrar({ tipo: "guardado", titulo: t.guardado, texto: estado.datos.nombre })
    } else if (estado.sesion === "vencida") {
      router.replace("/ingresar?motivo=expirado")
    } else if (estado.errores) {
      setErrores(estado.errores)
      irAlError(estado.errores)
      mostrar({ tipo: "dato-mal", titulo: comun.datoMalTitulo, texto: estado.mensaje })
    } else {
      mostrar({ tipo: "error", titulo: comun.noGuardadoTitulo, texto: estado.mensaje })
    }
    return estado
  }, null)

  const excluir = proyecto?.id ?? null
  const nombreLimpio = limpiarTexto(nombre)
  const errorNombre = validarNombreProyecto(nombre)
  const u = normalizarUrl(url)
  const dupNombre = useDuplicado("nombre", nombreLimpio, !errorNombre && nombreLimpio.toLowerCase() !== (proyecto?.nombre ?? "").toLowerCase(), excluir)
  const dupUrl = useDuplicado("url", u.ok ? u.url : "", u.ok && (!proyecto || u.url !== proyecto.url), excluir)

  const hayCambios =
    nombre !== inicial.nombre || url !== inicial.url || grupo !== inicial.grupo || descripcion !== inicial.descripcion
  useEffect(() => alCambiar(hayCambios), [hayCambios, alCambiar])

  // Al cambiar de paso el foco va al primer campo del paso nuevo (o al campo con error); en "Revisar",
  // al botón de guardar, así el Enter guarda. Espera un cuadro: el panel deja de estar inerte al pintar.
  useEffect(() => {
    if (primerPaso.current) {
      primerPaso.current = false
      return
    }
    const enfocar = () => {
      const f = form.current
      if (!f) return
      const campo = foco.current
      foco.current = null
      const destino =
        (campo && f.querySelector<HTMLElement>(`[name="${campo}"]`)) ||
        f.querySelector<HTMLElement>(".ui-pasos__panel[data-activo] input:not([type=hidden]), .ui-pasos__panel[data-activo] textarea") ||
        f.querySelector<HTMLElement>('button[type="submit"]')
      // El desplegable del grupo se abre al recibir el foco: espera a que el panel termine de entrar,
      // así la lista se ubica en su lugar final.
      if (destino?.getAttribute("role") === "combobox") espera = window.setTimeout(() => destino.focus({ preventScroll: true }), 460)
      else destino?.focus({ preventScroll: true })
    }
    let espera = 0
    const cuadro = requestAnimationFrame(enfocar)
    return () => {
      cancelAnimationFrame(cuadro)
      window.clearTimeout(espera)
    }
  }, [paso])

  const errorUrl = !u.ok ? MENSAJE_URL[u.error] : null
  const mensajeDup = (d: EstadoDuplicado, campo: "nombre" | "url") =>
    d.estado === "existe" && d.duplicado ? (d.duplicado.archivado ? t.existeArchivado(d.duplicado.nombre) : t.existe(d.duplicado.nombre)) + (campo === "url" ? " " + MENSAJES_PROYECTO.urlRepetida + "." : "") : null

  // El rojo puede esperar a que salgas del campo; el aviso de repetido no (06 §1.5, §3).
  const verErrorNombre = errores.nombre ?? mensajeDup(dupNombre, "nombre") ?? (tocado.nombre ? errorNombre : null) ?? undefined
  const verErrorUrl = errores.url ?? mensajeDup(dupUrl, "url") ?? (tocado.url && url ? errorUrl : null) ?? (tocado.url && !url ? MENSAJE_URL.vacio : null) ?? undefined

  /** Los errores de los pasos de `desde` a `hasta` (los dos incluidos), con las mismas reglas que al guardar. */
  const revisar = (desde: number, hasta: number) => {
    const err: Record<string, string> = {}
    if (desde <= 0 && hasta >= 0) {
      if (errorNombre) err.nombre = errorNombre
      else if (dupNombre.estado === "existe") err.nombre = mensajeDup(dupNombre, "nombre")!
      if (errorUrl) err.url = errorUrl
      else if (dupUrl.estado === "existe") err.url = mensajeDup(dupUrl, "url")!
    }
    if (desde <= 1 && hasta >= 1 && limpiarTexto(descripcion).length > DESCRIPCION_MAX) err.descripcion = MENSAJES_PROYECTO.descripcionLarga
    return err
  }

  /** Cambia de paso. Hacia adelante, solo si los pasos que se dejan atrás están bien. */
  const irA = (destino: number) => {
    if (destino > paso) {
      const err = revisar(paso, destino - 1)
      if (Object.keys(err).length) {
        setErrores(err)
        setTocado({ nombre: true, url: true })
        const campo = Object.keys(err)[0]!
        if ((PASO_DE[campo] ?? 0) === paso) form.current?.querySelector<HTMLElement>(`[name="${campo}"]`)?.focus()
        else irAlError(err)
        return
      }
    }
    setPaso(destino)
    setAlcanzado((a) => Math.max(a, destino))
  }

  const validar = (e: FormEvent<HTMLFormElement>) => {
    const err = revisar(0, ULTIMO)
    setErrores(err)
    setTocado({ nombre: true, url: true })
    if (Object.keys(err).length) {
      e.preventDefault()
      irAlError(err)
      mostrar({ tipo: "dato-mal", titulo: comun.datoMalTitulo, texto: comun.datoMalTexto })
    }
  }

  const grupoLimpio = limpiarTexto(grupo)
  const exacto = grupos.find((g) => g.nombre.toLowerCase() === grupoLimpio.toLowerCase())
  const descripcionLimpia = limpiarTexto(descripcion)
  const verExistente = (d: EstadoDuplicado) =>
    d.estado === "existe" && d.duplicado ? (
      <button
        type="button"
        className="ui-enlace"
        onClick={() => {
          alCerrar()
          router.push(`/servicios?q=${encodeURIComponent(d.duplicado!.nombre)}${d.duplicado!.archivado ? "&estado=archivados" : ""}`)
        }}
      >
        {t.verExistente}
      </button>
    ) : null

  return (
    <form ref={form} action={accion} onSubmit={validar} onKeyDown={enterAvanza} noValidate>
      <input type="hidden" name="id" value={proyecto?.id ?? ""} />
      <input type="hidden" name="grupoId" value={exacto?.id ?? ""} />
      <input type="hidden" name="grupoNuevo" value={exacto ? "" : grupoLimpio} />
      <IndicadorPasos pasos={t.pasos} actual={paso} alcanzado={alcanzado} alIr={irA} etiqueta={t.pasosEtiqueta} />
      <div className="ui-pasos__encabezado" aria-live="polite">
        <p className="ui-pasos__paso-de">
          {comun.pasoDe(paso + 1, t.pasos.length)} · <strong>{t.pasos[paso]}</strong>
        </p>
        <p className="ui-pasos__ayuda">{pegar(t.pasosBajada[paso] ?? "")}</p>
      </div>
      <PanelesPasos actual={paso} nombres={t.pasos}>
        <div className="ui-dialogo__campos">
          <div>
            <Campo
              etiqueta={t.nombre}
              name="nombre"
              valor={nombre}
              alCambiar={(v) => {
                setNombre(v)
                setErrores(({ nombre: _, ...r }) => r)
              }}
              alSalir={() => setTocado((x) => ({ ...x, nombre: true }))}
              icono="texto"
              max={NOMBRE_PROYECTO_MAX}
              contador="cerca"
              obligatorio
              autoFocus
              ok={!errorNombre && (dupNombre.estado === "libre" || (!!proyecto && nombreLimpio.toLowerCase() === proyecto.nombre.toLowerCase()))}
              error={verErrorNombre}
            />
            {verExistente(dupNombre)}
          </div>
          <div>
            <Campo
              etiqueta={t.link}
              name="url"
              tipo="url"
              valor={url}
              alCambiar={(v) => {
                setUrl(v)
                setErrores(({ url: _, ...r }) => r)
              }}
              alSalir={() => setTocado((x) => ({ ...x, url: true }))}
              icono="link"
              max={2048}
              inputMode="url"
              obligatorio
              ayuda={t.linkAyuda}
              progreso={u.ok ? 1 : 0}
              ok={u.ok && (dupUrl.estado === "libre" || (!!proyecto && u.url === proyecto.url))}
              error={verErrorUrl}
            />
            {verExistente(dupUrl)}
          </div>
        </div>
        <div className="ui-dialogo__campos">
          <ComboGrupo grupos={grupos} texto={grupo} alCambiar={setGrupo} error={errores.grupo} />
          <Campo
            etiqueta={t.descripcion}
            name="descripcion"
            valor={descripcion}
            alCambiar={(v) => {
              setDescripcion(v)
              setErrores(({ descripcion: _, ...r }) => r)
            }}
            multilinea
            max={DESCRIPCION_MAX}
            contador="siempre"
            error={errores.descripcion}
          />
        </div>
        <div className="ui-pasos__revision">
          <div className="pr-previa-fila" role="group" aria-label={t.vistaPrevia}>
            <div>
              <p className="pr-nombre">{nombreLimpio || t.nombre}</p>
              {descripcionLimpia && <p className="pr-descripcion">{descripcionLimpia}</p>}
            </div>
            {grupoLimpio ? <span className="pr-grupo">{exacto?.nombre ?? grupoLimpio}</span> : <span className="pr-grupo pr-grupo--sin">{t.sinGrupo}</span>}
          </div>
          <dl className="ui-resumen">
            <div className="ui-resumen__fila">
              <dt>{t.nombre}</dt>
              <dd>{nombreLimpio}</dd>
            </div>
            <div className="ui-resumen__fila">
              <dt>{t.link}</dt>
              <dd>{u.ok ? u.url : url}</dd>
            </div>
            <div className="ui-resumen__fila">
              <dt>{t.grupo}</dt>
              <dd data-vacio={grupoLimpio ? undefined : ""}>{exacto?.nombre ?? (grupoLimpio || t.sinGrupo)}</dd>
              {grupoLimpio && !exacto && <p className="ui-resumen__nota">{pegar(t.grupoNuevo(grupoLimpio))}</p>}
            </div>
            <div className="ui-resumen__fila">
              <dt>{t.resumenDescripcion}</dt>
              <dd data-vacio={descripcionLimpia ? undefined : ""}>{descripcionLimpia ? pegar(descripcionLimpia) : t.sinDescripcion}</dd>
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
        {/* Dos botones distintos (con su key): si fuera el mismo, el click en "Siguiente" lo volvería de envío en el mismo gesto. */}
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
