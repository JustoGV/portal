import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Icono } from "@/components/iconos/Icono"
import { Llegada } from "@/components/ui/Llegada"
import { sesion, usuarioPorAuthId } from "@/dal/sesion"
import { ingreso as t } from "@/i18n/es/ingreso"
import { destinoSeguro } from "@/lib/destino"
import { NOMBRE_VISIBLE } from "@/lib/marca"
import { FormIngreso } from "./FormIngreso"
import "@/styles/ingreso.css"

export const metadata: Metadata = { title: t.titulo }

export default async function PaginaIngresar({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const p = await searchParams
  const volver = destinoSeguro(typeof p.volver === "string" ? p.volver : null)
  const motivo = p.motivo === "expirado" ? "expirado" : p.motivo === "inactiva" ? "inactiva" : null

  // Con sesión completa no tiene sentido ver el login.
  const s = await sesion()
  if (s && !motivo) {
    const u = await usuarioPorAuthId(s.user.id)
    if (u?.activo) redirect(u.debeCambiarClave ? "/primer-ingreso" : volver)
  }

  return (
    <main className="in-pagina in-pagina--partida">
      <div className="in-partida">
        <section className="in-lado" aria-label={NOMBRE_VISIBLE}>
          <div className="in-lado__marca">
            <span className="in-marca__logo" aria-hidden="true">
              <Icono nombre="carpeta" />
            </span>
            {NOMBRE_VISIBLE}
          </div>
          <p className="in-lado__lema">{t.lema}</p>
          <ul className="in-lado__ventajas">
            {t.ventajas.map((v) => (
              <li key={v.icono}>
                <span className="in-lado__icono" aria-hidden="true">
                  <Icono nombre={v.icono} />
                </span>
                {v.texto}
              </li>
            ))}
          </ul>
        </section>
        <div className="in-partida__form">
          <Llegada className="in-tarjeta">
            <div className="in-marca" data-llega="" style={{ "--llega-i": 0 } as React.CSSProperties}>
              <span className="in-marca__logo" aria-hidden="true">
                <Icono nombre="carpeta" />
              </span>
              {NOMBRE_VISIBLE}
            </div>
            {motivo && (
              <div className="ui-aviso in-aviso" data-tono={motivo === "inactiva" ? "warn" : "info"} role="status">
                <Icono nombre={motivo === "inactiva" ? "alerta" : "reloj"} />
                {motivo === "inactiva" ? t.inactiva : t.expirado}
              </div>
            )}
            <FormIngreso volver={volver} />
          </Llegada>
        </div>
      </div>
    </main>
  )
}
