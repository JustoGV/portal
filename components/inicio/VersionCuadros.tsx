"use client"
import Link from "next/link"
import { useLayoutEffect, useRef, useState } from "react"
import { LISTAS } from "@/components/tablero/listas"
import { Banda } from "@/components/ui/Banda"
import type { DatosInicio } from "@/dal/inicio"
import { inicio as t } from "@/i18n/es/inicio"
import { formatMonto } from "@/lib/gasto"
import { SIN_GRUPO } from "@/lib/parametros"
import { gsap, quieto } from "@/lib/gsap"
import { LISTAS_ID } from "@/lib/tablero"
import { pegar } from "@/lib/texto"
import { Barras, Cifra, diaCorto, diaDeSemana, Linea, mesDe } from "./Graficos"
import { PilaUrgente } from "./PilaUrgente"
import { BotonIr, ListaPersonas, textoHallazgo, totalAbiertas } from "./Piezas"

const MESES_LARGOS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
const mesLargo = (fecha: string) => MESES_LARGOS[Number(fecha.slice(5, 7)) - 1]!
/**
 * Un monto corto para escribir arriba de una barra: «1,27 M», «15 mil», «140» (la moneda la dice el selector).
 * Se arma con el texto de la parte entera, sin pasar la plata por un number.
 */
const montoCorto = (valor: string) => {
  const entero = valor.split(".")[0]!.replace(/^-/, "")
  if (entero.length > 6) {
    const m = entero.slice(0, entero.length - 6)
    const dec = entero.slice(entero.length - 6, entero.length - 4).replace(/0+$/, "")
    return `${m}${dec ? `,${dec}` : ""} M`
  }
  if (entero.length > 3) return `${entero.slice(0, entero.length - 3)} mil`
  return entero
}

/**
 * Inicio (D-045), versión C · Cuadros, elegida por Mateo el 2026-11-22 con una corrección: «debemos ser más
 * explícitos en cada componente porque Claudio necesita entender cada gráfico, las urgencias». Por eso arriba va
 * Urgente (en la banda, versión C de la segunda vuelta), y cada bloque dice qué pregunta contesta, cómo se lee y qué conclusión sale del dato de hoy.
 */
export function VersionCuadros({ d }: { d: DatosInicio }) {
  const abiertas = totalAbiertas(d)
  const total30 = d.dias.reduce((a, x) => a + x.movimientos, 0)
  const pico = d.dias.reduce((m, x) => (x.movimientos > m.movimientos ? x : m), d.dias[0]!)
  const [moneda, setMoneda] = useState<"ARS" | "USD">("ARS")
  const mosaico = useRef<HTMLDivElement>(null)
  const totalServ = d.clientes.clientes.reduce((a, c) => a + c.servicios, 0) || 1
  const maxLista = Math.max(1, ...LISTAS_ID.map((l) => d.tablero.abiertas[l]))

  const meses = d.gastos?.meses ?? []
  const prop = (i: number) => (moneda === "ARS" ? meses[i]!.pPesos : meses[i]!.pDolares)
  const monto = (i: number) => (moneda === "ARS" ? meses[i]!.pesos : meses[i]!.dolares)
  const iCaro = meses.findIndex((_, i) => prop(i) === 1)
  const todosIgual = meses.every((_, i) => prop(i) === prop(0))

  useLayoutEffect(() => {
    const m = mosaico.current
    if (!m || quieto()) return
    const tw = gsap.fromTo(m.querySelectorAll(".in-cuadrito"), { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.5, stagger: 0.05, ease: "power3.out", delay: 0.25, clearProps: "opacity,transform" })
    return () => void tw.progress(1).kill()
  }, [])

  return (
    <>
      <Banda
        sobre={t.sobre}
        titulo={t.titulo}
        bajada={textoHallazgo(d)}
        accion={
          <div className="in-banda-acciones">
            <PilaUrgente urgencias={d.urgencias} />
            <BotonIr href="/tablero">{t.verTablero}</BotonIr>
          </div>
        }
      />
      <div className="in-cuadros">

        <section className="in-oscuro in-cuadros__mitad" aria-labelledby="in-uso">
          <div className="in-oscuro__dato">
            <h2 id="in-uso" className="in-oscuro__titulo">
              {t.usoTitulo}
            </h2>
            <p className="in-oscuro__bajada">{pegar(t.usoBajada)}</p>
            <p className="in-oscuro__n">
              <Cifra valor={total30} />
            </p>
            <p className="in-oscuro__nota">{t.usoTotal(total30)}</p>
            <p className="in-oscuro__conclusion">{pegar(total30 === 0 ? t.usoNada : t.usoPico(`${diaDeSemana(pico.dia)} ${diaCorto(pico.dia)}`, pico.movimientos))}</p>
          </div>
          <div className="in-oscuro__grafico" data-tono="lima">
            <Linea
              valores={d.dias.map((x) => x.movimientos)}
              etiquetas={d.dias.map((x) => x.dia)}
              detalle={(i) => `${diaDeSemana(d.dias[i]!.dia)} ${diaCorto(d.dias[i]!.dia)}: ${d.dias[i]!.movimientos} ${t.movimientos(d.dias[i]!.movimientos)}`}
              desde={diaCorto(d.dias[0]!.dia)}
              hasta={t.hoy}
            />
          </div>
        </section>

        {d.gastos && (
          <section className="in-oscuro in-cuadros__mitad" aria-labelledby="in-pagos">
            <div className="in-oscuro__dato">
              <h2 id="in-pagos" className="in-oscuro__titulo">
                <Link href="/gastos">{t.pagosTitulo}</Link>
              </h2>
              <p className="in-oscuro__bajada">{pegar(t.pagosBajada)}</p>
              <div className="in-segmento" role="group" aria-label="Moneda">
                {(["ARS", "USD"] as const).map((m) => (
                  <button key={m} type="button" aria-pressed={moneda === m} onClick={() => setMoneda(m)}>
                    {m === "ARS" ? t.pesos : t.dolares}
                  </button>
                ))}
              </div>
              <p className="in-oscuro__conclusion">
                {pegar(todosIgual ? t.pagosIgual : iCaro >= 0 ? t.pagosPico(mesLargo(meses[iCaro]!.mes), formatMonto(monto(iCaro), moneda)) : "")}
              </p>
              <p className="in-oscuro__nota">{t.pagosPorMes(formatMonto(d.gastos.pesos, "ARS"), formatMonto(d.gastos.dolares, "USD"))}</p>
            </div>
            <div className="in-oscuro__grafico" data-tono="durazno">
              <Barras
                key={moneda}
                className="in-barras--oscuro"
                valores={meses.map((_, i) => prop(i))}
                textos={meses.map((_, i) => montoCorto(monto(i)))}
                etiquetas={meses.map((m) => mesDe(m.mes))}
                detalle={(i) => `${mesLargo(meses[i]!.mes)}: ${formatMonto(monto(i), moneda)}`}
                resaltar={iCaro >= 0 && !todosIgual ? iCaro : undefined}
              />
            </div>
          </section>
        )}

        <section className="in-blanco in-cuadros__mosaico" aria-labelledby="in-clientes">
          <header className="in-blanco__cabeza">
            <div className="in-blanco__textos">
              <h2 id="in-clientes" className="in-bloque__titulo">
                <Link href="/clientes">{t.clientesTitulo}</Link>
              </h2>
              <p className="in-blanco__bajada">{pegar(t.clientesBajada)}</p>
            </div>
            <dl className="in-cuadros__datos">
              <div>
                <dt>{t.servicios}</dt>
                <dd>
                  <Cifra valor={d.clientes.activos} />
                </dd>
              </div>
              <div>
                <dt>{t.clientes}</dt>
                <dd>
                  <Cifra valor={d.clientes.cuantosClientes} />
                </dd>
              </div>
              <div>
                <dt>{t.archivados}</dt>
                <dd>
                  <Cifra valor={d.clientes.archivados} />
                </dd>
              </div>
            </dl>
          </header>
          <div ref={mosaico} className="in-cuadritos">
            {d.clientes.clientes.map((c, i) => (
              <Link
                key={c.id ?? "sin"}
                href={c.id ? `/clientes?q=${encodeURIComponent(c.nombre)}` : `/servicios?cliente=${SIN_GRUPO}`}
                className="in-cuadrito"
                data-tono={c.id ? String(i % 6) : "gris"}
                style={{ flexGrow: c.servicios, flexBasis: `${Math.max(8, (c.servicios / totalServ) * 100)}%` }}
                aria-label={`${c.nombre || t.sinCliente}: ${t.serviciosN(c.servicios)}`}
              >
                <span className="in-cuadrito__nombre">{c.nombre || t.sinCliente}</span>
                <span className="in-cuadrito__pie">
                  <span>
                    <Cifra valor={c.servicios} className="in-cuadrito__n" />
                    <span className="in-cuadrito__unidad">{c.servicios === 1 ? "servicio" : "servicios"}</span>
                  </span>
                  <span className="in-cuadrito__pct">{Math.round((c.servicios / totalServ) * 100)} %</span>
                </span>
              </Link>
            ))}
          </div>
          {d.clientes.restantes > 0 && <p className="in-nota">{t.restantes(d.clientes.restantes)}</p>}
        </section>

        <section className="in-blanco in-cuadros__lado" aria-labelledby="in-tablero">
          <header className="in-blanco__textos">
            <h2 id="in-tablero" className="in-bloque__titulo">
              <Link href="/tablero">{t.tableroTitulo}</Link>
            </h2>
            <p className="in-blanco__bajada">
              {abiertas} {t.abiertas(abiertas)}. {pegar(t.tableroBajadaLado)}
            </p>
          </header>
          <ul className="in-listas">
            {LISTAS.map((l) => (
              <li key={l.id} data-lista={l.id}>
                <span className="in-listas__cabeza">
                  <span className="in-listas__nombre">{l.titulo}</span>
                  <span className="in-listas__n">{t.tarjetasN(d.tablero.abiertas[l.id])}</span>
                </span>
                <span className="in-listas__pista">
                  <span className="in-listas__barra" style={{ width: `${(d.tablero.abiertas[l.id] / maxLista) * 100}%` }} />
                </span>
                <span className="in-listas__para">{pegar(l.pista)}</span>
              </li>
            ))}
          </ul>
          <div className="in-blanco__textos in-blanco__sub-cabeza">
            <h3 className="in-blanco__sub">{t.quien}</h3>
            <p className="in-blanco__bajada">{pegar(t.quienBajadaLado)}</p>
          </div>
          <ListaPersonas personas={d.personas} />
        </section>
      </div>
    </>
  )
}
