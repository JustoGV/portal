import { beforeEach, describe, expect, it, vi } from "vitest"

// El guard con la sesión y la fila simuladas: prueba el orden de los rechazos sin base ni Next.
const estado = vi.hoisted(() => ({
  sesion: null as null | { user: { id: string; twoFactorEnabled: boolean } },
  usuario: null as null | { id: string; rol: string; activo: boolean; debeCambiarClave: boolean },
}))

vi.mock("@/dal/sesion", () => ({
  sesion: async () => estado.sesion,
  usuarioPorAuthId: async () => estado.usuario,
}))
vi.mock("@/db", () => ({ db: {} }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))

const { exigir } = await import("@/dal/guard")

const motivo = async () => {
  try {
    await exigir("proyectos.ver")
    return "ok"
  } catch (e) {
    return `${(e as { status: number }).status} ${(e as { motivo: string }).motivo}`
  }
}

describe("exigir()", () => {
  beforeEach(() => {
    estado.sesion = { user: { id: "a", twoFactorEnabled: true } }
    estado.usuario = { id: "u", rol: "admin", activo: true, debeCambiarClave: false }
  })

  it("sin sesión: 401", async () => {
    estado.sesion = null
    expect(await motivo()).toBe("401 sin-sesion")
  })
  it("sesión sin fila en usuarios: 401", async () => {
    estado.usuario = null
    expect(await motivo()).toBe("401 sin-usuario")
  })
  it("cuenta desactivada: 401 en el próximo pedido", async () => {
    estado.usuario!.activo = false
    expect(await motivo()).toBe("401 inactivo")
  })
  it("sin segundo factor: pasa (D-013)", async () => {
    estado.sesion!.user.twoFactorEnabled = false
    expect(await motivo()).toBe("ok")
  })
  it("con la contraseña inicial: 403 y va al primer ingreso", async () => {
    estado.usuario!.debeCambiarClave = true
    expect(await motivo()).toBe("403 primer-ingreso-pendiente")
  })
  it("rol que no existe: 403", async () => {
    estado.usuario!.rol = "otro"
    expect(await motivo()).toBe("403 sin-permiso")
  })
  it("todo en orden: pasa", async () => {
    expect(await motivo()).toBe("ok")
  })
})
