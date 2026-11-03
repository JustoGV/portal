import Link from "next/link"
import { Icono } from "@/components/iconos/Icono"

export default function NoEncontrada() {
  return (
    <main className="ui-pagina">
      <div className="ui-vacio">
        <Icono nombre="buscar" tamano={48} className="ui-vacio__icono" />
        <h1 className="ui-vacio__titulo">Esta página no existe</h1>
        <p>Puede que el link esté mal copiado.</p>
        <div className="ui-vacio__accion">
          <Link href="/" className="ui-boton ui-boton--secundaria">
            <span className="ui-boton__contenido">Ir a Proyectos</span>
          </Link>
        </div>
      </div>
    </main>
  )
}
