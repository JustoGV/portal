"use client"
import { useRouter } from "next/navigation"
import { useActionState, useEffect, useRef, useState, type FormEvent } from "react"
import { guardarGasto } from "@/acciones/gastos"
import { Boton } from "@/components/ui/Boton"
import { Campo } from "@/components/ui/Campo"
import { IndicadorPasos, PanelesPasos } from "@/components/ui/Pasos"
import { useResultado } from "@/components/ui/Resultado"
import { Selector } from "@/components/ui/Selector"
import { enterAvanza } from "@/components/ui/use-enter-avanza"
import { comun } from "@/i18n/es/comun"
import { gastos as t } from "@/i18n/es/gastos"
import {
  cadaCuanto,
  cuandoVence,
  filtrarMonto,
  formatMonto,
  MEDIO_PAGO_MAX,
  MENSAJES_GASTO,
  MESES,
  montoParaCampo,
  NOMBRE_GASTO_MAX,
  pareceNumeroDeTarjeta,
  parsearMonto,
  proximoPago,
  type FilaGasto,
  type Frecuencia,
  type Moneda,
} from "@/lib/gasto"
import { DESCRIPCION_MAX } from "@/lib/nombre"
import { limpiarTexto, pegar } from "@/lib/texto"

export type Pagador = { id: string; nombre: string }

type Props = {
  gasto: FilaGasto | null
  pagadores: Pagador[]
  /** El id de quien carga: por defecto lo paga él. */
  yo: string
  alCambiar: (hayCambios: boolean) => void
  alGuardar: () => void
  alCancelar: () => void
}

/** En qué paso vive cada campo: un error vuelve al paso de su campo. */
const PASO_DE: Record<string, number> = { nombre: 0, descripcion: 0, monto: 1, moneda: 1, frecuencia: 1, diaPago: 1, mesPago: 1, medioPago: 2, pagaId: 2 }
const ULTIMO = t.pasos.length - 1
const DIAS = Array.from({ length: 31 }, (_, i) => ({ id: String(i + 1), texto: t.diaOpcion(i + 1) }))
const LISTA_MESES = MESES.map((m, i) => ({ id: String(i + 1), texto: m[0]!.toUpperCase() + m.slice(1) }))

/**
 * El alta y la edición de un gasto en cuatro pasos, como Servicios (D-026): «Qué es», «Cuánto y cuándo»,
 * «Cómo se paga» y «Revisar». Los paneles quedan montados: lo escrito no se pierde al ir y volver.
 */
export function FormGasto({ gasto, pagadores, yo, alCambiar, alGuardar, alCancelar }: Props) {
  const router = useRouter()
  const mostrar = useResultado()
  const form = useRef<HTMLFormElement>(null)
  const [inicial] = useState(() => ({
    nombre: gasto?.nombre ?? "",
    descripcion: gasto?.descripcion ?? "",
    monto: gasto ? montoParaCampo(gasto.monto) : "",
    moneda: (gasto?.moneda ?? "USD") as Moneda,
    frecuencia: (gasto?.frecuencia ?? "mensual") as Frecuencia,
    dia: String(gasto?.diaPago ?? 1),
    mes: String(gasto?.mesPago ?? 1),
    medio: gasto?.medioPago ?? "",
    paga: gasto?.pagaId ?? (pagadores.some((p) => p.id === yo) ? yo : (pagadores[0]?.id ?? "")),
  }))
  const [nombre, setNombre] = useState(inicial.nombre)
  const [descripcion, setDescripcion] = useState(inicial.descripcion)
  const [monto, setMonto] = useState(inicial.monto)
  const [moneda, setMoneda] = useState<Moneda>(inicial.moneda)
  const [frecuencia, setFrecuencia] = useState<Frecuencia>(inicial.frecuencia)
  const [dia, setDia] = useState(inicial.dia)
  const [mes, setMes] = useState(inicial.mes)
  const [medio, setMedio] = useState(inicial.medio)
  const [paga, setPaga] = useState(inicial.paga)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [tocado, setTocado] = useState<Record<string, boolean>>({})
  const [paso, setPaso] = useState(0)
  const [alcanzado, setAlcanzado] = useState(gasto ? t.pasos.length : 0)
  const foco = useRef<string | null>(null)
  const primerPaso = useRef(true)

  const irAlError = (err: Record<string, string>) => {
    const campo = Object.keys(err)[0]
    if (!campo) return
    foco.current = campo
    setPaso(PASO_DE[campo] ?? 0)
  }

  const [, accion, enviando] = useActionState(async (anterior: Awaited<ReturnType<typeof guardarGasto>> | null, datos: FormData) => {
    const estado = await guardarGasto(anterior, datos)
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

  const hayCambios =
    nombre !== inicial.nombre ||
    descripcion !== inicial.descripcion ||
    monto !== inicial.monto ||
    moneda !== inicial.moneda ||
    frecuencia !== inicial.frecuencia ||
    dia !== inicial.dia ||
    mes !== inicial.mes ||
    medio !== inicial.medio ||
    paga !== inicial.paga
  useEffect(() => alCambiar(hayCambios), [hayCambios, alCambiar])

  // Al cambiar de paso, el foco va al primer campo del paso nuevo (o al del error); en «Revisar», a Guardar.
  useEffect(() => {
    if (primerPaso.current) {
      primerPaso.current = false
      return
    }
    const cuadro = requestAnimationFrame(() => {
      const f = form.current
      if (!f) return
      const campo = foco.current
      foco.current = null
      const destino =
        (campo && f.querySelector<HTMLElement>(`[name="${campo}"]:not([type=hidden])`)) ||
        f.querySelector<HTMLElement>(".ui-pasos__panel[data-activo] input:not([type=hidden]), .ui-pasos__panel[data-activo] textarea, .ui-pasos__panel[data-activo] [data-campo]") ||
        f.querySelector<HTMLElement>('button[type="submit"]')
      destino?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(cuadro)
  }, [paso])

  const nombreLimpio = limpiarTexto(nombre)
  const medioLimpio = limpiarTexto(medio)
  const descripcionLimpia = limpiarTexto(descripcion)
  const m = parsearMonto(monto)
  const errorNombre = !nombreLimpio ? MENSAJES_GASTO.nombreFalta : nombreLimpio.length > NOMBRE_GASTO_MAX ? MENSAJES_GASTO.nombreLargo : null
  const errorMedio = !medioLimpio ? MENSAJES_GASTO.medioFalta : pareceNumeroDeTarjeta(medioLimpio) ? MENSAJES_GASTO.medioNumero : null
  const errorMonto = m.ok ? null : m.error

  /** Los errores de los pasos de `desde` a `hasta`, con las mismas reglas que al guardar (lib/gasto). */
  const revisar = (desde: number, hasta: number) => {
    const err: Record<string, string> = {}
    const en = (n: number) => desde <= n && hasta >= n
    if (en(0)) {
      if (errorNombre) err.nombre = errorNombre
      if (descripcionLimpia.length > DESCRIPCION_MAX) err.descripcion = MENSAJES_GASTO.descripcionLarga
    }
    if (en(1) && errorMonto) err.monto = errorMonto
    if (en(2)) {
      if (errorMedio) err.medioPago = errorMedio
      if (!paga) err.pagaId = MENSAJES_GASTO.pagaMal
    }
    return err
  }

  const irA = (destino: number) => {
    if (destino > paso) {
      const err = revisar(paso, destino - 1)
      if (Object.keys(err).length) {
        setErrores(err)
        setTocado({ nombre: true, monto: true, medioPago: true })
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
    setTocado({ nombre: true, monto: true, medioPago: true })
    if (Object.keys(err).length) {
      e.preventDefault()
      irAlError(err)
      mostrar({ tipo: "dato-mal", titulo: comun.datoMalTitulo, texto: comun.datoMalTexto })
    }
  }

  const sacar = (campo: string) => setErrores(({ [campo]: _, ...r }) => r)
  const mesNum = frecuencia === "anual" ? Number(mes) : null
  const prox = proximoPago(Number(dia), mesNum)
  const pagaNombre = pagadores.find((p) => p.id === paga)?.nombre ?? ""

  return (
    <form ref={form} action={accion} onSubmit={validar} onKeyDown={enterAvanza} noValidate>
      <input type="hidden" name="id" value={gasto?.id ?? ""} />
      {frecuencia === "mensual" && <input type="hidden" name="mesPago" value="" />}
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
              sacar("nombre")
            }}
            alSalir={() => setTocado((x) => ({ ...x, nombre: true }))}
            icono="texto"
            max={NOMBRE_GASTO_MAX}
            contador="cerca"
            obligatorio
            autoFocus
            ok={!errorNombre}
            error={errores.nombre ?? (tocado.nombre ? (errorNombre ?? undefined) : undefined)}
          />
          <Campo
            etiqueta={t.descripcion}
            name="descripcion"
            valor={descripcion}
            alCambiar={(v) => {
              setDescripcion(v)
              sacar("descripcion")
            }}
            multilinea
            max={DESCRIPCION_MAX}
            contador="siempre"
            error={errores.descripcion}
          />
        </div>
        <div className="ui-dialogo__campos">
          <div className="ga-form__par">
            <Campo
              etiqueta={t.monto}
              name="monto"
              valor={monto}
              alCambiar={(v) => {
                setMonto(v)
                sacar("monto")
              }}
              filtrar={filtrarMonto}
              alSalir={() => setTocado((x) => ({ ...x, monto: true }))}
              inputMode="decimal"
              obligatorio
              ayuda={t.montoAyuda}
              ok={m.ok}
              error={errores.monto ?? (tocado.monto && monto ? (errorMonto ?? undefined) : undefined)}
            />
            <Selector etiqueta={t.moneda} name="moneda" valor={moneda} alCambiar={(v) => setMoneda(v as Moneda)} opciones={[{ id: "USD", texto: t.monedas.USD }, { id: "ARS", texto: t.monedas.ARS }]} />
          </div>
          <Selector
            etiqueta={t.frecuencia}
            name="frecuencia"
            valor={frecuencia}
            alCambiar={(v) => setFrecuencia(v as Frecuencia)}
            icono="reloj"
            opciones={[
              { id: "mensual", texto: t.frecuencias.mensual },
              { id: "anual", texto: t.frecuencias.anual },
            ]}
          />
          <div className="ga-form__par">
            <Selector etiqueta={t.dia} name="diaPago" valor={dia} alCambiar={setDia} opciones={DIAS} />
            {frecuencia === "anual" && <Selector etiqueta={t.mes} name="mesPago" valor={mes} alCambiar={setMes} opciones={LISTA_MESES} />}
          </div>
          <p className="ga-form__nota">{pegar(`${cadaCuanto(frecuencia, Number(dia), mesNum)}. ${t.diaAyuda}`)}</p>
        </div>
        <div className="ui-dialogo__campos">
          <Campo
            etiqueta={t.medio}
            name="medioPago"
            valor={medio}
            alCambiar={(v) => {
              setMedio(v)
              sacar("medioPago")
            }}
            alSalir={() => setTocado((x) => ({ ...x, medioPago: true }))}
            icono="llave"
            max={MEDIO_PAGO_MAX}
            contador="cerca"
            obligatorio
            ayuda={t.medioAyuda}
            ok={!errorMedio}
            error={errores.medioPago ?? (tocado.medioPago || pareceNumeroDeTarjeta(medioLimpio) ? (errorMedio ?? undefined) : undefined)}
          />
          <Selector etiqueta={t.paga} name="pagaId" valor={paga} alCambiar={setPaga} icono="persona" opciones={pagadores.map((p) => ({ id: p.id, texto: p.nombre }))} />
          {errores.pagaId && <p className="ga-form__error">{errores.pagaId}</p>}
        </div>
        <div className="ui-pasos__revision">
          <div className="ga-previa" role="group" aria-label={t.vistaPrevia}>
            <div>
              <p className="ga-previa__nombre">{nombreLimpio || t.nombre}</p>
              <p className="ga-previa__cuando">{cadaCuanto(frecuencia, Number(dia), mesNum)}</p>
            </div>
            <p className="ga-previa__monto">
              {m.ok ? formatMonto(m.valor, moneda) : "—"}
              <span>{frecuencia === "anual" ? t.porAnio : t.porMes}</span>
            </p>
          </div>
          <dl className="ui-resumen">
            <div className="ui-resumen__fila">
              <dt>{t.resumenProximo}</dt>
              <dd>
                {cuandoVence(prox.faltan, prox.fecha)}
                {prox.faltan > 30 ? "" : ` · ${prox.fecha.split("-").reverse().join("/")}`}
              </dd>
            </div>
            <div className="ui-resumen__fila">
              <dt>{t.resumenMedio}</dt>
              <dd>{medioLimpio || "—"}</dd>
            </div>
            <div className="ui-resumen__fila">
              <dt>{t.resumenPaga}</dt>
              <dd>{pagaNombre || "—"}</dd>
            </div>
            <div className="ui-resumen__fila">
              <dt>{t.resumenPara}</dt>
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
