# DATOS

Postgres (Neon) con Drizzle. Convenciones de `docs/reglas/11`: `snake_case`, claves `uuid` (v7 si está la extensión), `creado_en` y `actualizado_en` en `timestamptz`. Fechas mostradas en `America/Argentina/Buenos_Aires`. **No hay plata en este sistema.**

## 1. Roles de Postgres (creados por migración)

| Rol | Puede |
|---|---|
| dueño (el de la consola de Neon) | Solo migraciones |
| `portal_app` | `SELECT`, `INSERT`, `UPDATE` en sus tablas. **Sin `DELETE`** en `proyectos`, `grupos`, `usuarios`, `tarjetas`, `comentarios` y `auditoria`. **Sin `UPDATE`** en `auditoria` ni en `comentarios`. `DELETE` solo en las tablas de sesión y de límites de better-auth |

## 2. Entidades

### `usuarios` (la fila que manda en los permisos)

| Campo | Tipo | Regla |
|---|---|---|
| `id` | uuid | PK |
| `auth_user_id` | text | FK a la tabla de usuarios de better-auth, **único** |
| `nombre` | text | 1 a 80, recortado |
| `email` | text | minúsculas; **único sobre `lower(email)`** |
| `rol` | text | `check (rol in ('admin'))` |
| `activo` | boolean | default `true` |
| `debe_cambiar_clave` | boolean | default `true`: hasta que cambia la contraseña inicial, el guard lo manda a `/primer-ingreso` |
| `creado_en`, `actualizado_en` | timestamptz | `actualizado_en` lo mantiene un trigger |

- No se borra: se desactiva.
- **Trigger:** rechaza un `UPDATE` que deje cero filas con `activo = true`.

### `configuracion` (una sola fila)

| Campo | Tipo | Regla |
|---|---|---|
| `id` | boolean | PK, `check (id)`: solo puede existir una fila |
| `inactividad_minutos` | integer, null | `null` = nunca; `check (inactividad_minutos in (30, 60, 120, 240, 480))`; default `480` (supuesto de `OQ-001`) |
| `actualizado_en`, `actualizado_por` | timestamptz, uuid | |

### `grupos` (en la pantalla, «Clientes»: D-032)

| Campo | Tipo | Regla |
|---|---|---|
| `id` | uuid | PK |
| `nombre` | text | 1 a 40, recortado, espacios colapsados |
| `nombre_clave` | text | **generada**: `lower(nombre)`; **índice único** |
| `responsable_nombre` | text, null | Nombre y apellido de quien está a cargo del lado del cliente. 1 a 80, recortado (migración `0003`) |
| `responsable_cargo` | text, null | 1 a 60, recortado |
| `responsable_mail` | text, null | Hasta 254, **en minúsculas**, con forma `algo@dominio.algo` (check) |
| `responsable_telefono` | text, null | Formato internacional E.164 (`+5493424551234`), check `^\+[1-9][0-9]{7,14}$` (migración `0004`, D-033). Lo arma la app con `libphonenumber-js` |
| `responsable_dni` | text, null | 7 u 8 cifras sin puntos, check `^[0-9]{7,8}$` (migración `0004`) |
| `archivado_en` | timestamptz, null | |
| `creado_en`, `actualizado_en` | timestamptz | |

- No se borra: se archiva. Un grupo archivado no se ofrece en el formulario, pero sus proyectos lo siguen mostrando.
- **Datos personales (D-032, D-033):** los cinco `responsable_*` son de una persona. Vacío es `NULL`, nunca un texto vacío. Se corrigen y se vacían desde Editar. La auditoría (`grupo.responsable`) guarda qué campos cambiaron, nunca el valor. No van en la URL ni en los logs (`docs/reglas/10` §7). Los ven todos los que entran al portal (permiso `grupos.gestionar`). Los datos de prueba usan `example.com` y teléfonos 5555.

### `proyectos`

| Campo | Tipo | Regla |
|---|---|---|
| `id` | uuid | PK |
| `nombre` | text | 1 a 80, recortado, espacios colapsados (`lib/nombre.ts`) |
| `nombre_clave` | text | **generada**: `lower(nombre)`; **índice único**. "Panel Admin" y "panel admin" son el mismo |
| `url` | text | Forma canónica que arma `lib/url.ts` (`new URL(...).href`, host en minúsculas). `check (url ~ '^https://')` y `check (length(url) <= 2048)`. **Índice único** |
| `descripcion` | text, null | hasta 200 |
| `grupo_id` | uuid, null | FK a `grupos` |
| `archivado_en` | timestamptz, null | |
| `archivado_por` | uuid, null | FK a `usuarios`; `check ((archivado_en is null) = (archivado_por is null))` |
| `creado_por` | uuid | FK a `usuarios` |
| `creado_en`, `actualizado_en` | timestamptz | |

- **No se borra**: se archiva y se restaura.
- Los únicos valen también contra los archivados. Si el nombre o el link ya están en un proyecto archivado, el aviso lo dice y ofrece restaurarlo.
- Al chocar con un único, la acción captura `23505` y devuelve *"Ya existe el proyecto {nombre} con ese link"*, nunca el error técnico.

### `tarjetas` (el tablero de trabajo: D-038, D-040)

| Campo | Tipo | Regla |
|---|---|---|
| `id` | uuid | PK |
| `lista` | text | `check (lista in ('dudas', 'servicios', 'tareas', 'correcciones'))` |
| `posicion` | integer | Su lugar en la lista, de 0 en adelante (`check >= 0`). Lo reescribe la acción de mover para toda la lista |
| `titulo` | text | 1 a 120, sin espacios en los bordes |
| `descripcion` | text, null | 1 a 2.000 |
| `proyecto_id` | uuid, null | FK a `proyectos`: el sistema de la tarjeta |
| `grupo_id` | uuid, null | FK a `grupos`: el cliente, en la lista «Servicios». La app no deja poner los dos |
| `responsable_id` | uuid, null | FK a `usuarios`. **Las dudas no tienen**: son para Claudio, y la pantalla lo muestra por la lista |
| `prioridad` | boolean | default `false` |
| `respuestas` | jsonb | Lo que se respondió al crearla, copiado: lista de `{ pregunta, respuesta }`, hasta 12 (`check`) |
| `resuelta_en`, `resuelta_por` | timestamptz, uuid, null | Los dos o ninguno (`check`); solo en la lista `dudas` (`check`) |
| `creado_por` | uuid | FK a `usuarios` |
| `creado_en`, `actualizado_en` | timestamptz | `actualizado_en` lo mantiene un trigger |

- **No se borra** (sin `DELETE` para la app). Índice `(lista, posicion, id)`.
- Las escrituras del tablero se hacen de a una con `pg_advisory_xact_lock(hashtext('tablero'))`: así el orden de una lista nunca queda a medias con dos personas moviendo a la vez.
- Una duda resuelta que sale de «Dudas» deja de estar resuelta (lo hace la acción; el `check` frena lo contrario).

### `comentarios` (la conversación de una tarjeta, solo inserciones)

| Campo | Tipo | Regla |
|---|---|---|
| `id` | uuid | PK |
| `tarjeta_id` | uuid | FK a `tarjetas` |
| `autor_id` | uuid | FK a `usuarios`: la cuenta de la sesión, nunca un dato del pedido |
| `respuesta_a` | uuid, null | FK a `comentarios`: el mensaje que se cita. **Trigger** `exigir_respuesta_valida`: tiene que ser de la misma tarjeta (`23514`). Desde la migración `0007` (D-041) se puede responder también a una respuesta, como en WhatsApp |
| `texto` | text | 1 a 2.000, sin espacios en los bordes. Se dibuja como texto, nunca como HTML |
| `creado_en` | timestamptz | |

- La app tiene `SELECT` e `INSERT`: no se editan ni se borran. Índice `(tarjeta_id, creado_en, id)`.
- **Riesgo aceptado (D-040):** es texto libre. No es el lugar para datos de pacientes de un cliente (eso es el registro de casos, `WU-08`).

### `auditoria` (solo inserciones)

| Campo | Tipo |
|---|---|
| `id` | uuid |
| `usuario_id` | uuid, FK a `usuarios` |
| `accion` | text (`proyecto.crear`, `proyecto.editar`, `proyecto.archivar`, `proyecto.restaurar`, `grupo.*`, `usuario.*`, `configuracion.editar`, `tarjeta.crear`, `tarjeta.mover`, `tarjeta.resolver`) |
| `tabla`, `fila_id` | text, uuid |
| `detalle` | jsonb (lo que cambió, sin contraseñas) |
| `creado_en` | timestamptz |

### `limites_escritura`

Límite de escrituras por usuario (120 por minuto, `docs/reglas/10` §4): `usuario_id`, `ventana` (timestamptz truncado al minuto), `cuenta`. PK `(usuario_id, ventana)`. Se limpia lo viejo con `DELETE` (el rol de la app lo tiene en esta tabla).

### `intentos_ingreso`

Límite de intentos por cuenta (5 cada 15 minutos): `email_clave`, `creado_en`, índice `(email_clave, creado_en)`. Se borran los de una cuenta cuando entra bien. El límite por IP lo lleva better-auth en `auth_rate_limit`.

### Tablas de better-auth

`auth_user`, `auth_session`, `auth_account`, `auth_verification`, `auth_two_factor` y `auth_rate_limit` (`db/schema/auth.ts`), escritas a mano desde `getSchema()` de better-auth 1.7 con columnas en snake_case. `tests/auth-esquema.test.ts` avisa si una versión nueva de better-auth agrega campos. Sin registro público. Sesiones en la base, sin caché en la cookie.

### Migraciones

| Archivo | Qué hace |
|---|---|
| `0000_extensiones_roles.sql` | `pg_trgm`; el rol `portal_app` **sin login y sin contraseña** (la pone el dueño con `pnpm clave-rol-app`); `REVOKE ALL ON SCHEMA public FROM PUBLIC` |
| `0001_tablas.sql` | Generada por drizzle-kit y revisada: tablas, únicos, checks, índices (incluidos los GIN de trigramas) |
| `0002_permisos_triggers.sql` | Los permisos de la tabla de §1, `actualizado_en` automático, el trigger de "al menos una cuenta activa" y la fila única de `configuracion` |
| `0003_responsable.sql`, `0004_responsable_dni.sql` | El responsable de cada cliente (D-032, D-033) |
| `0005_tablero.sql` | Generada y revisada: `tarjetas` y `comentarios` con sus checks, FK e índices (D-040) |
| `0006_tablero_permisos.sql` | Permisos de la app sobre esas dos tablas, `actualizado_en` de `tarjetas` y el trigger de las respuestas |
| `0007_respuestas_libres.sql` | El trigger de las respuestas deja responder a cualquier mensaje de la misma tarjeta (D-041) |

## 3. Consultas principales

| Consulta | Forma | Índice |
|---|---|---|
| Lista de proyectos (activos o archivados, por grupo, paginada) | `where (archivado_en is null) = :activos and (:grupo is null or grupo_id = :grupo) order by nombre_clave, id limit/offset`, con `count(*) over ()` | `(nombre_clave, id) where archivado_en is null` y otro igual para archivados; `grupo_id` |
| Búsqueda en la lista y en `Ctrl+K` | `ilike '%texto%'` con `%` y `_` escapados sobre `nombre`, `descripcion` y `url`; tope de 8 resultados en `Ctrl+K` | GIN `pg_trgm` sobre `nombre`, `descripcion` y `url` |
| Contadores de los filtros (por grupo y por estado) | Una consulta agrupada | La misma de la lista |
| ¿Existe ya este nombre o este link? (aviso en vivo) | `where nombre_clave = lower(:nombre) and id <> :propio` / `where url = :url and id <> :propio` | Los índices únicos |
| Grupos para el formulario | `where archivado_en is null order by nombre_clave` | Excepción acotada: un catálogo de decenas de filas |
| Usuarios | Sin paginar | Excepción acotada: dos filas |
| El tablero | Las cuatro listas en una consulta, con `row_number() over (partition by lista order by posicion, creado_en desc, id)` y tope de 200 por lista (trae 201 para saber si quedaron afuera); la cantidad de comentarios con una subconsulta por tarjeta | `(lista, posicion, id)`; `(tarjeta_id, creado_en, id)` |
| La conversación de una tarjeta | Al abrir su ficha: los últimos 500 mensajes, en orden | `(tarjeta_id, creado_en, id)` |

El orden alfabético es `nombre_clave collate "es-x-icu"` (ICU, verificado en Postgres 17: «Ábaco, árbol, Banco, nube, ñandú, zeta»). Con la intercalación explícita el índice `(nombre_clave, id)` no sirve el `order by`: con decenas o cientos de proyectos el orden en memoria es despreciable; si algún día son miles, un índice de expresión con la misma intercalación. **Pendiente:** el `EXPLAIN (ANALYZE, BUFFERS)` de cada consulta contra Neon con datos de volumen real (sin hacer: hoy la base de prueba tiene 35 filas).

## 4. Datos de muestra

Las tarjetas de muestra del tablero las crea la cuenta de prueba (`creado_por`), así se borran juntas. Proyectos y grupos marcados con `descripcion = 'Muestra'`, con links a `https://example.com/...` (dominio reservado, no es de nadie). Se borran antes del uso real, con el ok del dueño.
