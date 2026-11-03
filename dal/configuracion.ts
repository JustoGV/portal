import "server-only"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { configuracion } from "@/db/schema"

export const leerConfiguracion = async () => {
  const [c] = await db.select({ inactividadMinutos: configuracion.inactividadMinutos }).from(configuracion).where(eq(configuracion.id, true)).limit(1)
  return { inactividadMinutos: c ? c.inactividadMinutos : 480 }
}
