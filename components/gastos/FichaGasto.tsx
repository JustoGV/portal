"use client"
import { CalendarClock, ChevronDown, ChevronUp, CreditCard, Repeat, User, Wallet } from "lucide-react"
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react"
import { Button } from "react-aria-components"
import { Boton } from "@/components/ui/Boton"
import { BotonIcono } from "@/components/ui/BotonIcono"
import { Pista } from "@/components/ui/Pista"
import { TarjetaModal } from "@/components/ui/TarjetaModal"
import { comun } from "@/i18n/es/comun"
import { gastos as t } from "@/i18n/es/gastos"
import { haceCuanto } from "@/lib/fecha"
import { cadaCuanto, cuandoVence, formatMonto, type FilaGasto } from "@/lib/gasto"
import { gsap, quieto } from "@/lib/gsap"
import { pegar } from "@/lib/texto"

type Props = {
  filas: FilaGasto[]
  id: string | null
  archivados: boolean
  origen: () => DOMRect | null
  alCambiar: (id: string) => void
  alCerrar: () => void
  alEditar: (g: FilaGasto) => void
  alArchivo: (g: FilaGasto) => void
}

/** «1250.00» anual → «104,17» por mes, con dos decimales, sin pasar por coma flotante. */
const porMes = (monto: string) => {
  const [e = "0", d = "00"] = monto.split(".")
  const centavos = BigInt(e + d.padEnd(2, "0").slice(0, 2))
  const mes = (centavos * 100n + 600n) / 1200n
  const s = mes.toString().padStart(3, "0")
  return `${s.slice(0, -2)}.${s.slice(-2)}`
}

/**
 * La ficha de un gasto, con la forma de las fichas del sistema (D-037, D-042): la banda azul con el nombre
 * y el estado y quién paga en vidrio; abajo los datos en recuadros. ↑ ↓ pasan al gasto anterior o siguiente.
 */
export function FichaGasto({ filas, id, archivados, origen, alCambiar, alCerrar, alEditar, alArchivo }: Props) {
  const idTitulo = useId()
  const cuerpo = useRef<HTMLDivElement>(null)
  const cabeza = useRef<HTMLDivElement>(null)
  const sentido = useRef(0)
  const [ultimo, setUltimo] = useState<FilaGasto | null>(null)
  const i = filas.findIndex((f) => f.id === id)
  const actual = i >= 0 ? filas[i]! : null
  if (actual && actual !== ultimo) setUltimo(actual)
  const g = actual ?? ultimo

  const mover = (paso: number) => {
    if (i < 0 || filas.length < 2) return
    sentido.current = paso
    alCambiar(filas[(i + paso + filas.length) % filas.length]!.id)
  }

  useEffect(() => {
    if (id === null) return
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return
      if (document.querySelectorAll('[role="dialog"], [role="alertdialog"]').length > 1) return
      e.preventDefault()
      mover(e.key === "ArrowDown" ? 1 : -1)
    }
    document.addEventListener("keydown", tecla)
    return () => document.removeEventListener("keydown", tecla)
  })

  useLayoutEffect(() => {
    const c = cuerpo.current
    const lado = sentido.current
    sentido.current = 0
    if (!c || !lado || quieto()) return
    const piezas = [...(cabeza.current?.children ?? []), c.querySelector(".pr-ficha2__descripcion"), ...c.querySelectorAll(".pr-recuadro")].filter(Boolean)
    gsap.fromTo(piezas, { opacity: 0, y: 16 * lado }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.03, ease: "power3.out", clearProps: "opacity,transform", overwrite: "auto" })
  }, [id])

  return (
    <TarjetaModal abierto={id !== null && i >= 0} alPedirCierre={alCerrar} idTitulo={idTitulo} ancho="62rem" origen={origen}>
      {g && (
        <>
          <div className="pr-ficha2__banda ga-ficha-banda">
            <div className="pr-ficha2__barra" data-cascada="">
              <div>
                <p className="pr-ficha2__sobre">
                  {pegar(t.fichaTitulo)}
                  {i >= 0 && (
                    <span className="pr-ficha2__cuenta">
                      <span className="ga-ficha-punto"> · </span>
                      {t.fichaDe(i + 1, filas.length)}
                    </span>
                  )}
                </p>
                <p className="pr-ficha2__ayuda">{t.fichaAyuda}</p>
              </div>
              <div className="pr-ficha2__mandos">
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
            <div ref={cabeza} className="pr-ficha2__cabeza">
              <h2 id={idTitulo} className="pr-ficha2__nombre" data-cascada="">
                {pegar(g.nombre)}
              </h2>
              <div className="pr-ficha2__pastillas" data-cascada="">
                <span className="pr-pastilla" data-tono={g.archivadoEn ? "neutro" : "ok"}>
                  <span className="pr-pastilla__punto" aria-hidden="true" />
                  {g.archivadoEn ? t.estadoArchivado : t.estadoActivo}
                </span>
                <span className="pr-pastilla">
                  <User size={16} strokeWidth={1.75} aria-hidden="true" />
                  {g.pagaNombre}
                </span>
                <span className="pr-pastilla">
                  <Repeat size={16} strokeWidth={1.75} aria-hidden="true" />
                  {cadaCuanto(g.frecuencia, g.diaPago, g.mesPago)}
                </span>
              </div>
            </div>
          </div>

          <div ref={cuerpo} className="pr-ficha2__cuerpo">
            <p className="pr-ficha2__descripcion" data-cascada="" data-vacio={g.descripcion ? undefined : ""}>
              {g.descripcion ? pegar(g.descripcion) : t.sinDescripcion}
            </p>
            <div className="pr-ficha2__grilla">
              <section className="pr-recuadro pr-recuadro--link ga-recuadro-monto" data-cascada="" aria-label={t.fichaMonto}>
                <span className="pr-recuadro__icono" aria-hidden="true">
                  <Wallet size={24} strokeWidth={1.75} />
                </span>
                <div className="pr-recuadro__textos">
                  <span className="pr-recuadro__rotulo">{t.fichaMonto}</span>
                  <span className="pr-recuadro__sitio ga-cifra">
                    {formatMonto(g.monto, g.moneda)} <span className="ga-cifra__cada">{g.frecuencia === "anual" ? t.porAnio : t.porMes}</span>
                  </span>
                  {g.frecuencia === "anual" && <span className="pr-recuadro__nota">{t.equivaleMes(formatMonto(porMes(g.monto), g.moneda))}</span>}
                </div>
              </section>
              <section className="pr-recuadro" data-cascada="" aria-label={t.fichaProximo}>
                <span className="pr-recuadro__icono" aria-hidden="true">
                  <CalendarClock size={22} strokeWidth={1.75} />
                </span>
                <div className="pr-recuadro__textos">
                  <span className="pr-recuadro__rotulo">{t.fichaProximo}</span>
                  <span className="pr-recuadro__valor">{g.archivadoEn ? "—" : cuandoVence(g.faltan, g.proximoPago)}</span>
                  {!g.archivadoEn && <span className="pr-recuadro__nota">{g.proximoPago.split("-").reverse().join("/")}</span>}
                </div>
              </section>
              <section className="pr-recuadro" data-cascada="" aria-label={t.fichaMedio}>
                <span className="pr-recuadro__icono" aria-hidden="true">
                  <CreditCard size={22} strokeWidth={1.75} />
                </span>
                <div className="pr-recuadro__textos">
                  <span className="pr-recuadro__rotulo">{t.fichaMedio}</span>
                  <span className="pr-recuadro__valor">{g.medioPago}</span>
                  <span className="pr-recuadro__nota">{t.fichaActualizadoHace(haceCuanto(g.actualizadoEn))}</span>
                </div>
              </section>
            </div>
          </div>
          <div className="ui-dialogo__acciones pr-ficha__acciones">
            <Boton variante={archivados ? "secundaria" : "peligro"} icono={archivados ? "restaurar" : "archivar"} onPress={() => alArchivo(g)}>
              {archivados ? t.restaurar : t.archivar}
            </Boton>
            <span className="pr-ficha__resto">
              <Boton variante="primaria" icono="editar" onPress={() => alEditar(g)}>
                {t.editar}
              </Boton>
            </span>
          </div>
        </>
      )}
    </TarjetaModal>
  )
}
