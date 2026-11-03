# 11 — Datos: esquema, plata, fechas, migraciones y datos de muestra

## 1. Convenciones del esquema

- Postgres (Neon) con Drizzle ORM. Nombres en `snake_case`, en el idioma del dominio.
- Claves primarias `uuid` (v7 si está la extensión: ordenadas por tiempo). Nunca un id secuencial a la vista en una URL.
- `creado_en` y `actualizado_en` en `timestamptz`, con su default.
- Lo que no se borra (consentimientos, auditoría, movimientos de caja) **no se borra**: se anula con una marca y su motivo; el rol de la app no tiene `DELETE` sobre esas tablas.

## 2. Plata

- **`numeric(12,2)`** en Postgres. Las consultas la devuelven como texto (`monto::text`). En el código es un string o un `Decimal`; **nunca un `number` de JS** (0,1 + 0,2 ≠ 0,3).
- Las sumas se hacen en Postgres (`sum()`), no en el navegador.
- Se formatea con una sola función (`formatMoneda` → `$ 1.234.567,89`) que no arrastra la librería de cálculo a las pantallas que solo muestran.
- Si hay impuestos, se decide una vez qué guarda cada columna (por ejemplo "el monto incluye el IVA y la columna `iva` es la parte de impuesto") y queda como `D-`. Nunca se recalcula un porcentaje desde un monto que ya lo incluye.

## 3. Tiempo

- **`timestamptz` en UTC** para todo momento; `date` para un día sin hora (nacimiento).
- Se muestra en la zona del proyecto (`America/Argentina/Buenos_Aires` por defecto) con una sola función de formato.
- "Lo de este día" es un **rango sobre la columna cruda** (`07` §6), no una función aplicada a la columna: así lo sirve el índice.
- `AT TIME ZONE` con la zona escrita es `IMMUTABLE` (sirve para índices de expresión); sin zona explícita es `STABLE`. Si la zona viaja como parámetro, un índice de expresión no coincide: usar el rango.
- Un test que corre cerca de la medianoche local puede cruzar de día: leer "hoy" una vez y construir los datos desde ahí.

## 4. Las invariantes viven en Postgres

| Invariante | Cómo |
|---|---|
| Un documento no se repite | Columna generada con los dígitos + índice único (`06` §3) |
| Dos turnos no ocupan el mismo lugar a la misma hora | `EXCLUDE USING gist` (extensión `btree_gist`) sobre el lugar y el rango de tiempo |
| Números de comprobante correlativos y únicos | **Secuencia** de Postgres, nunca "el último + 1" calculado en la app |
| Un período cerrado no se toca | Trigger que rechaza escrituras con fecha dentro de un período cerrado |
| Una transición de estado válida | Trigger o check sobre los estados permitidos |
| Un valor dentro de un rango | `check` |

La validación de la app repite estas reglas para dar el mensaje, pero la base es la que las garantiza.

## 5. Migraciones

1. Se generan con `drizzle-kit generate` y **se revisa el SQL** antes de aplicarlo.
2. Se aplican primero a una **rama temporal de Neon**, después a producción **con el ok explícito del dueño en ese momento**.
3. **Una migración que ya corrió no se edita nunca**: se escribe otra.
4. **Finales de línea LF.** El registro de migraciones guarda el hash del archivo: un archivo con CRLF (git en Windows, o escrito con Python en modo texto) no coincide y la migración se vuelve a aplicar. En el proyecto anterior eso borró una restricción en producción. `.gitattributes` con `*.sql text eol=lf`, y escribir los archivos en modo binario.
5. Si el código nuevo lee una columna nueva, **la migración llega a producción antes que el código** (o antes de mandar un link de revisión que lea producción).
6. `drizzle-kit generate` no puede renombrar una columna sin una terminal interactiva: escribir el `ALTER ... RENAME` a mano.
7. El dueño de la base corre las migraciones; la app corre con su rol de permisos mínimos.

## 6. Tests

- **Nunca contra producción.** Los tests que tocan la base corren en CI sobre una **rama temporal de Neon** creada desde una rama vacía (sin personas, sin plata, sin cuentas) y borrada al terminar. Localmente, sin una base de prueba, las variables apuntan a un lugar que no existe:

```bash
export DATABASE_URL="postgresql://prueba@localhost/nada" DATABASE_URL_DIRECT="postgresql://prueba@localhost/nada"
```

- **Sin verdes silenciosos**: un test que se saltea porque falta la base tiene que fallar en CI (un test que verifica que la variable existe cuando `CI=true`). `passWithNoTests` apagado.
- Los archivos de test que comparten una base corren uno detrás de otro (`fileParallelism: false`).
- Cuando se reescribe una consulta, un **test dorado** compara la vieja con la nueva sobre los mismos datos, con empates en los datos (sin empates, el test de orden no prueba nada).
- **Romper a propósito lo que el test protege** y ver que falle. Un test que nunca falla no protege nada.
- Un test que escribe en tablas con secuencias avanza los contadores: restaurarlos al terminar.

## 7. Datos de muestra

- Para revisar una pantalla hacen falta datos que muestren **cada estado** (vacío, con datos, con errores, anulados, filtros con números).
- **Se marcan** para poder borrarlos (`notas = 'Muestra'`, un usuario de muestra) y **se borran antes de que el cliente use el sistema**. Si la muestra lleva teléfonos o emails, que no sean de nadie real (y que ningún recordatorio automático les escriba).
- Cargar muestra en producción necesita el ok del dueño.

## 8. Trampas de Postgres y Drizzle

| Trampa | Qué pasa |
|---|---|
| `order by` sobre un nombre que también es alias del `select` | Ordena por el alias: un `to_char(fecha, 'DD/MM/YYYY') as fecha` ordena el texto, no la fecha |
| `and` dentro de `count(*) filter (where …)` | Postgres no cortocircuita: un guard que evita un error tiene que ser un `case` |
| `jsonb` | No conserva el orden de las claves: dibujar en un orden fijo, no en el de `Object.keys` |
| La intercalación de la base (`C.UTF-8`) | Un nombre con tilde inicial se ordena después de la Z: elegir la intercalación o ordenar con `collate` |
| Un CTE con el nombre de una tabla | La "tapa": sirve para probar una consulta real contra producción sin escribir nada |
| Una columna generada en un `insert` | Falla (`428C9`): no se nombra |
| `drizzle.config.ts` sin la variable de la base | `drizzle-kit generate` lanza aunque no se conecte: pasarle una URL de mentira |
