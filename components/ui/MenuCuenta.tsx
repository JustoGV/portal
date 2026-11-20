"use client"
import { ChevronsUpDown } from "lucide-react"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { Button, Menu, MenuItem, MenuTrigger, Popover } from "react-aria-components"
import { IconoDuo, type IconoDuoApi } from "@/components/iconos/IconoDuo"
import { cuenta as t } from "@/i18n/es/cuenta"
import { authClient } from "@/lib/auth-client"
import { gsap, quieto } from "@/lib/gsap"
import { iniciales } from "@/lib/nombre"

/**
 * El pie de la barra como entrada a la cuenta (D-024, D-035): tus iniciales, tu nombre y tu mail (Catalyst ·
 * Settings). Al tocarlo se abre hacia arriba una tarjeta con «Mi cuenta» y «Salir» (shadcn/ui · sidebar-07):
 * crece desde el pie en 0,3 s y sus dos filas caen una detrás de otra. Con la barra achicada quedan las
 * iniciales y el nombre aparece al pasar el mouse.
 */
export function MenuCuenta({ nombre, email }: { nombre: string; email: string }) {
  const router = useRouter()
  const [saliendo, setSaliendo] = useState(false)
  const persona = useRef<IconoDuoApi>(null)
  const salida = useRef<IconoDuoApi>(null)

  const salir = async () => {
    setSaliendo(true)
    await authClient.signOut()
    router.replace("/ingresar")
  }

  return (
    <MenuTrigger
      onOpenChange={(abierto) => {
        if (!abierto || quieto()) return
        // La tarjeta vive en otra capa: se busca recién cuando ya está pintada.
        requestAnimationFrame(() => {
          const tarjeta = document.querySelector<HTMLElement>(".bl-menu")
          if (!tarjeta) return
          gsap.fromTo(tarjeta, { opacity: 0, y: 10, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: "power3.out", transformOrigin: "bottom left", clearProps: "opacity,transform" })
          gsap.fromTo(tarjeta.querySelectorAll(".bl-menu__item"), { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.25, delay: 0.06, stagger: 0.05, ease: "power2.out", clearProps: "opacity,transform" })
        })
      }}
    >
      <Button className="bl__item bl__cuenta" aria-label={`${t.menuCuenta}: ${nombre}`} isDisabled={saliendo}>
        <span className="bl__avatar bl__iniciales" aria-hidden="true">
          {iniciales(nombre)}
        </span>
        <span className="bl__texto bl__cuenta-textos">
          <span className="bl__cuenta-nombre">{saliendo ? t.saliendo : nombre}</span>
          <span className="bl__cuenta-mail">{email}</span>
        </span>
        <ChevronsUpDown className="bl__cuenta-pico" size={16} strokeWidth={1.75} aria-hidden="true" />
      </Button>
      <Popover className="ui-popover bl-menu" placement="top start" offset={8}>
        <Menu className="ui-lista bl-menu__lista" aria-label={t.menuCuenta}>
          <MenuItem id="cuenta" href="/cuenta" className="ui-lista__opcion bl-menu__item" onHoverStart={() => persona.current?.animar()}>
            <IconoDuo ref={persona} nombre="persona" tamano={18} />
            {t.irACuenta}
          </MenuItem>
          <MenuItem id="salir" className="ui-lista__opcion bl-menu__item bl-menu__salir" onAction={salir} onHoverStart={() => salida.current?.animar()}>
            <IconoDuo ref={salida} nombre="salir" tamano={18} />
            {t.salir}
          </MenuItem>
        </Menu>
      </Popover>
    </MenuTrigger>
  )
}
