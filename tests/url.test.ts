import { describe, expect, it } from "vitest"
import { normalizarUrl, sitioDe } from "@/lib/url"

describe("normalizarUrl (D-003)", () => {
  it.each([
    ["https://misitio.com", "https://misitio.com/"],
    ["misitio.com", "https://misitio.com/"],
    ["  HTTPS://MiSitio.com/Panel?x=1  ", "https://misitio.com/Panel?x=1"],
    ["https://app.misitio.com.ar/admin#ventas", "https://app.misitio.com.ar/admin#ventas"],
  ])("acepta %j", (entrada, salida) => {
    expect(normalizarUrl(entrada)).toEqual({ ok: true, url: salida })
  })

  it.each([
    ["", "vacio"],
    ["javascript:alert(1)", "https"],
    ["JaVaScRiPt:alert(1)", "https"],
    ["data:text/html,<script>alert(1)</script>", "https"],
    ["http://misitio.com", "https"],
    ["ftp://misitio.com", "https"],
    ["https://usuario:clave@misitio.com", "formato"],
    ["https://mi sitio.com", "formato"],
    ["misitio", "formato"],
    [`https://misitio.com/${"a".repeat(2100)}`, "largo"],
  ])("rechaza %j", (entrada, error) => {
    expect(normalizarUrl(entrada)).toEqual({ ok: false, error })
  })

  it("muestra el sitio sin el esquema", () => {
    expect(sitioDe("https://misitio.com/")).toBe("misitio.com")
    expect(sitioDe("https://misitio.com/panel")).toBe("misitio.com/panel")
  })
})
