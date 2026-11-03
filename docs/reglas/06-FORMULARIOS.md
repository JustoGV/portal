# 06 — Formularios y reglas de cada campo

Un formulario bien hecho evita el error antes de guardar, lo explica en palabras de la persona y deja que se cargue rápido solo con el teclado. Estas reglas salieron de un sistema donde se cargan personas con alguien esperando del otro lado del mostrador.

## 1. Principios

1. **Cada regla se escribe una vez**, en `lib/` (`lib/dni.ts`, `lib/telefono.ts`, `lib/email.ts`…), y la leen **las dos puntas**: el campo mientras se escribe y la Server Action al guardar. Así no pueden separarse. Una regla cambia ahí, nunca de un solo lado.
2. **El servidor es la autoridad.** La pantalla ayuda; la acción valida con `zod` antes que nada; la base frena con sus restricciones (índice único, check). La validación de la pantalla es para los mensajes, no para la seguridad.
3. **Respuesta inmediata y visible.** Todo campo con regla de largo o formato muestra desde el primer dígito: un contador `n/máx`, una línea que se llena y un tilde al cumplir. **Un campo que espera a que lo dejes para decir algo parece roto** (*"no marca nada… debe ser interactivo en el momento"*).
4. **Se bloquea el exceso en vez de avisarlo**: cuando el campo llega al máximo, no deja escribir más (*"cuando llega al límite no le deje escribir más"*). Borrar siempre está permitido.
5. **El rojo puede esperar a que salgas del campo**, pero el progreso se ve siempre. Al intentar guardar, todos los errores se muestran y el foco va al primero.
6. **El mensaje de error dice qué hacer**: "El DNI tiene 7 u 8 números", no "Formato inválido".
7. **La línea de error está reservada** debajo de cada campo, aunque esté vacía: que aparezca un error no mueve nada.

## 2. Helpers de dígitos (base de DNI, teléfono, CUIT)

```ts
// lib/digitos.ts
/** Los dígitos de lo que se tipeó, con puntos, espacios o guiones incluidos. */
export const soloDigitos = (texto: string) => texto.replace(/\D/g, "")

/** El texto hasta su dígito número `maximo`: lo que deja un pegado más largo que el campo. */
export const limitarDigitos = (texto: string, maximo: number) => {
  let n = 0
  for (let i = 0; i < texto.length; i++) {
    if (/\d/.test(texto[i]!) && ++n > maximo) return texto.slice(0, i)
  }
  return texto
}

/**
 * Lo que un campo de hasta `maximo` dígitos acepta de un cambio: un dígito de más se rechaza
 * (`null`: el campo se queda como estaba), un pegado largo deja sus primeros `maximo`, y borrar
 * siempre se permite (un valor viejo puede tener de más y hay que poder corregirlo).
 */
export const aceptarDigitos = (nuevo: string, actual: string, maximo: number): string | null => {
  const n = soloDigitos(nuevo).length
  const antes = soloDigitos(actual).length
  if (n <= maximo || n < antes) return nuevo
  if (antes >= maximo) return null
  return limitarDigitos(nuevo, maximo)
}
```

En el campo: `onChange={(e) => { const v = aceptarDigitos(e.target.value, valor, MAX); if (v !== null) setValor(v) }}`.

## 3. DNI

**La regla** (`lib/dni.ts`): solo dígitos; el largo lo fija el proyecto como `D-` (Argentina: 7 u 8; si se cargan documentos viejos, de 6 a 9).

```ts
import { limitarDigitos, soloDigitos } from "./digitos"
export const DNI_MINIMO = 7   // {{CONFIRMAR}} en el arranque: D-
export const DNI_MAXIMO = 8
export const digitosDni = soloDigitos
export const dniValido = (dni: string) => {
  const n = digitosDni(dni).length
  return n >= DNI_MINIMO && n <= DNI_MAXIMO
}
export const limitarDni = (dni: string) => limitarDigitos(dni, DNI_MAXIMO)
```

**Mientras se escribe:**
- Contador `n/8` con cifras tabulares, que cambia con cada dígito.
- Una línea en el borde de abajo que se llena con cada dígito (`transform: scaleX(n / máx)`, 0,22 s). Su color cambia al instante: gris mientras falta, color de marca desde el mínimo, rojo con un error.
- El dígito de más no entra (`aceptarDigitos`). Puntos y espacios se aceptan al tipear o pegar y no cuentan.
- **El tilde aparece cuando el DNI cumple y la búsqueda de duplicado ya contestó que no existe.** Nunca primero el tilde y después "ya existe".

**El duplicado, en vivo:**
1. Cuando hay al menos el mínimo de dígitos, se espera 300 ms sin teclear y se pregunta al servidor (una Server Action con su guard) si existe otro registro con esos dígitos, **excluyendo el propio** cuando se edita.
2. Se recuerda para qué dígitos contestó: una respuesta vieja nunca se muestra bajo un número nuevo.
3. Si existe: debajo del campo, *"Ya existe un registro con este DNI"*, el nombre de esa persona y un botón **"Ver registro existente"**.
4. Si la búsqueda falla, no se inventa nada: la base frena el duplicado igual.

**Al guardar:**
- La acción valida con la misma regla (`dniValido`) y guarda los dígitos.
- La base tiene una **columna generada con los dígitos** y un **índice único** sobre ella:

```sql
alter table personas
  add column dni_normalizado text generated always as (regexp_replace(coalesce(dni, ''), '[^0-9]', '', 'g')) stored;
create unique index personas_dni_normalizado_key on personas (dni_normalizado) where dni_normalizado <> '';
```

- Si dos personas guardan el mismo DNI al mismo tiempo, el índice frena la segunda: la acción captura el código `23505` (violación de unicidad) y devuelve *"Ya existe {nombre} con ese DNI. No se puede crear un duplicado."*, nunca el error técnico.
- Para mostrar, el DNI va con puntos (`12.345.678`); para buscar y comparar, siempre los dígitos.
- Los tests y las limpiezas buscan por `dni_normalizado`: un borrado por el DNI crudo deja atrás los que se guardaron con puntos.

## 4. Teléfono

**La regla** (`lib/telefono.ts`, Argentina): vacío (si el campo es opcional) o **los 10 dígitos de un número argentino**: el código de área sin el 0 y el número sin el 15. Es la forma que WhatsApp toma poniendo `549` adelante. Un número de otro país no entra: se decide en el arranque si hace falta (`OQ-`).

```ts
import { soloDigitos } from "./digitos"
export const TELEFONO_DIGITOS = 10
export const digitosTelefono = soloDigitos
export const telefonoValido = (tel: string) => tel.trim() === "" || digitosTelefono(tel).length === TELEFONO_DIGITOS
export const telefonoWa = (tel: string) => `549${digitosTelefono(tel)}`

/** Un chat de WhatsApp con texto escrito: por api.whatsapp.com, nunca wa.me (su redirección rompe los emojis). */
export const enlaceWhatsApp = (numero: string, texto: string) =>
  `https://api.whatsapp.com/send?phone=${numero}&text=${encodeURIComponent(texto)}`
```

- Mismo comportamiento que el DNI: contador `n/10`, línea que se llena, tilde, exceso bloqueado.
- Ayuda bajo el campo: *"Código de área sin 0 y número sin 15. Ej.: 11 2345 6789"*.
- Se guardan los dígitos. Si el teléfono identifica a alguien (un login por teléfono), también lleva índice único.
- **`wa.me` con texto destruye los emojis** (su redirección los convierte en "�"). Todo enlace de WhatsApp con texto pasa por `enlaceWhatsApp`.

## 5. CUIT / CUIL (si el proyecto los usa)

11 dígitos con dígito verificador. Regla (`lib/cuit.ts`):

```ts
const PESOS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
export const cuitValido = (cuit: string) => {
  const d = soloDigitos(cuit)
  if (d.length !== 11) return false
  const suma = PESOS.reduce((s, p, i) => s + p * Number(d[i]), 0)
  const v = 11 - (suma % 11)
  const verificador = v === 11 ? 0 : v
  return v !== 10 && verificador === Number(d[10])
}
```

Se muestra `20-12345678-9`; se guardan los dígitos con índice único si identifica a alguien.

## 6. Email

- `trim()` y minúsculas antes de validar y de guardar. `z.email()` en el servidor.
- Si identifica una cuenta: índice único sobre `lower(email)`.
- En el login y en la recuperación **nunca se revela si un email existe**: el mismo mensaje en los dos casos.

## 7. Nombres y textos libres

- `trim()` y espacios repetidos colapsados. Acentos y ñ siempre aceptados.
- Topes con contador cuando se acerca al límite: nombre ≤ 80, notas ≤ 2000, mensajes ≤ 2000. El tope está en la regla de `zod` y en el campo.
- Una expresión regular sobre texto con acentos lleva la bandera `u`: sin ella, `\b` no reconoce la ñ ni las vocales con tilde ("mañana" se parte en "mañ").
- La búsqueda que ignora acentos ("maria" encuentra "María") es una decisión de producto, no un detalle: queda como `D-`.

## 8. Fechas

- **Selector de fecha diseñado** (React Aria), nunca el nativo.
- Se guarda `date` para un día (nacimiento) y `timestamptz` para un momento. Se muestran en la zona horaria del proyecto.
- Fecha de nacimiento: no futura, edad razonable (por ejemplo menos de 120 años).
- **Se comparan fechas como fechas**, nunca como textos con formato local: `"9/10/2026" < "23/9/2026"` da falso porque compara el primer carácter.
- Un rango "desde / hasta" valida que desde ≤ hasta y tiene un tope (por ejemplo un año).

## 9. Plata

- Campo de texto con `inputMode="decimal"`, en formato local (`1.234.567,89`), que se convierte a un string decimal (`"1234567.89"`) para la acción. **Nunca pasa por un `number` de JS.**
- `zod`: un string con hasta 2 decimales. En la base: `numeric(12,2)`.
- Se muestra con `formatMoneda` (`$ 1.234.567,89`), alineada y con cifras tabulares.
- Una cantidad entera (unidades, billetes) es un campo propio con su tope, que se puede cargar solo con el teclado.

## 10. Selects, opciones y dependencias

- **Un desplegable sin opciones explica por qué** y lleva a donde se configuran ("Todavía no hay salas. Crealas en Configuración → Salas").
- Mostrar solo las opciones que existen; nunca 8 opciones con 6 apagadas.
- Un campo que depende de otro (la hora depende de la sala) se habilita cuando el primero tiene valor, y lo dice.

## 11. Teclado y flujo

- **Enter pasa al campo siguiente y el último Enter guarda** (`useEnterAvanza`). En un textarea, Enter es salto de línea.
- Tab sigue el orden visual. Escape cierra la tarjeta (con la guardia de cambios sin guardar).
- El foco entra al primer campo al abrir.
- **Obligatorios marcados** desde el principio, no descubiertos al guardar.
- Al guardar con errores: todos se muestran, el foco va al primero y aparece un aviso "dato mal".

## 12. Guardar

- Server Action con `useActionState`: estado de envío, errores devueltos, y **el formulario conserva lo escrito si hay error**.
- Doble click protegido: el botón queda en "Guardando…" mientras la acción corre.
- Si sale bien: tarjeta de resultado "guardado", el bloque que cambió se vuelve a leer en el lugar (sin recargar la página) y el formulario se reinicia.
- `useOptimistic` solo para cambios rápidos, reversibles y sin plata ni stock (mover una tarjeta, archivar). Lo que la base puede rechazar no se pinta antes de que lo acepte.
- **No guardar en cada tecla**: las Server Actions de una página corren una detrás de otra; un panel que guarda campo por campo mientras se escribe hace esperar a las demás acciones.

## 13. Del lado del servidor

```ts
"use server"
const esquema = z.object({
  nombre: z.string().trim().min(1, "Falta el nombre").max(80),
  dni: z.string().refine(dniValido, "El DNI tiene 7 u 8 números"),
  telefono: z.string().refine(telefonoValido, "El teléfono tiene 10 números"),
  email: z.email().transform((e) => e.toLowerCase()).optional(),
})

export async function guardarPersona(_: Estado, datos: FormData): Promise<Estado> {
  const u = await exigir("personas")                 // el guard, siempre primero
  const r = esquema.safeParse(Object.fromEntries(datos))
  if (!r.success) return { errores: z.flattenError(r.error).fieldErrors }
  // … insertar; capturar 23505 → mensaje de duplicado con el nombre del existente
}
```

- **Rechazar, nunca "arreglar"** un campo estructurado que llega mal.
- `z.record(z.enum([...]), …)` exige todas las claves del enum; para un subconjunto, `z.partialRecord`.
- **Toda función async exportada desde un archivo `"use server"` es una acción pública**, se llame como se llame: no se exporta nada sin su guard. Una constante o un tipo no se exportan desde ahí (Next lo prohíbe): van a otro archivo.

## 14. Otros duplicados

Toda clave natural (email de una cuenta, CUIT, código de producto, número de comprobante) lleva su índice único en la base. Donde ayuda a la persona, se avisa en vivo como el DNI; siempre se frena en la base. Los números de comprobante salen de una **secuencia** de Postgres, nunca de "el último + 1" calculado en la app (dos personas sacarían el mismo número).
