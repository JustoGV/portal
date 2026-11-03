# 10 — Seguridad

Un sistema interno guarda datos de personas y plata. Lo que sigue salió de auditar un sistema heredado donde cualquier usuario logueado podía hacerse administrador desde las herramientas del navegador, y de reconstruirlo bien.

## 1. Modelo de amenazas (se escribe para este proyecto en el arranque)

En `docs/ARQUITECTURA.md`, una tabla `amenaza · probabilidad · impacto · cómo se mitiga`. Como mínimo:

| Amenaza | Mitigación de base |
|---|---|
| Un empleado se sube sus propios permisos | Los permisos los escribe solo la acción de administración; se verifican en el servidor en cada lectura y escritura; el login no trae roles |
| Un ex empleado conserva acceso | `usuarios.activo = false` y el guard rechaza en el **próximo pedido**, con cookie o sin ella |
| PC compartida en un mostrador | Cierre de sesión por inactividad (§2.5); una cuenta por persona |
| Fuerza bruta al login | Límite de intentos guardado en la base (§2.3) |
| XSS con texto guardado (notas, novedades en Markdown) | Sanitizador con lista permitida al dibujar; nunca HTML crudo de la base |
| Credencial filtrada (base, almacenamiento, mail, secreto de sesión) | Valores solo en el panel del hosting; búsqueda de secretos después del build; procedimiento de rotación (§6) |
| Firma o auditoría editada después | Tablas que solo aceptan inserciones: el rol de la app no tiene `UPDATE` ni `DELETE` |

## 2. Login y sesión

1. **Login propio** (`better-auth` sobre nuestra base), salvo un `D-` que elija otro. Email y contraseña, **mínimo 15 caracteres**, con el hash de la librería (scrypt/argon2). **Sin registro público** (`disableSignUp`) salvo que el producto lo necesite.
2. **Segundo factor (TOTP)**: obligatorio para toda cuenta con acceso a datos personales o plata (`D-` en el arranque). La librería lo trata como opcional, así que lo exige el guard: una cuenta sin segundo factor va a `/primer-ingreso` antes de ver cualquier otra cosa. El alta muestra un **QR para la cámara** (Google Authenticator, la app que la persona ya conoce), con la dirección para copiar plegada para el caso raro. Diez códigos de respaldo.
3. **Límite de intentos**: 5 cada 15 minutos por IP (y por cuenta), **guardado en Postgres**, nunca en el navegador. El segundo factor con su propio límite. Mensaje genérico: *"Email o contraseña incorrectos"*, igual exista o no la cuenta.
4. **Sesión**: cookie propia `httpOnly`, `Secure`, `SameSite=Lax`, con prefijo del proyecto; sesiones guardadas en el servidor y revocables; vida máxima fija (por ejemplo 30 a 180 días) y renovación como mucho una vez por día. **Sin caché de sesión dentro de la cookie**: con caché, una cuenta desactivada seguiría funcionando hasta que vence. **Nada en `localStorage`.**
5. **Cierre por inactividad** configurable por el administrador (Nunca, 30 min, 1 h, 2 h, 4 h, 8 h):
   - cuenta como uso un toque, una tecla, la rueda o el puntero moviéndose, **en cualquier pestaña** (la última actividad se comparte por `localStorage` con una marca que incluye el inicio de la sesión, así una marca vieja nunca cierra una sesión nueva);
   - un refresco automático **no** es uso;
   - revisa cada 30 s y al volver a la pestaña; al vencer, cierra la sesión en el servidor y manda a `/ingresar?motivo=expirado` ("Tu sesión expiró. Ingresá de nuevo.");
   - si el almacenamiento del navegador está bloqueado (ventana privada), cada pestaña cuenta sola.
6. **Primer ingreso**: el administrador crea la cuenta con una contraseña inicial; la persona la cambia y activa el segundo factor en `/primer-ingreso` antes de nada.
7. **Recuperación de contraseña**: por mail solo cuando hay dominio verificado y servicio de mail; mientras tanto, el administrador pone una contraseña inicial nueva. La pantalla de ingreso lo dice sin revelar si un email existe.
8. **Redirección después del login** (`?volver=`): el valor no es confiable. `startsWith("/") && !startsWith("//")` **no alcanza**: el parser de URLs ignora tabulaciones y saltos de línea y trata `\` como `/`, así que `/\evil.com` y `/%09/evil.com` salen del sitio. Se resuelve con `new URL(valor, base)` y se compara el origen; esos cuatro casos quedan como tests.

```ts
// lib/destino.ts
const BASE = "https://proyecto.invalid"
export const destinoSeguro = (volver?: string | null) => {
  if (!volver || !volver.startsWith("/")) return "/"
  try {
    const u = new URL(volver, BASE)
    return u.origin === BASE ? `${u.pathname}${u.search}${u.hash}` : "/"
  } catch { return "/" }
}
```

9. **El secreto de sesión** (`BETTER_AUTH_SECRET`) firma las sesiones **y cifra los secretos del segundo factor**: rotarlo cierra todas las sesiones y obliga a todos a volver a activar el segundo factor. Se rota solo ante una sospecha real, avisando.

## 3. Autorización: el guard

Toda Server Action, todo route handler y **toda página que lee datos** empieza por el guard:

```ts
// dal/guard.ts
export const exigir = async (permiso: Permiso) => {
  const s = await sesion()                                   // identidad, cacheada por pedido
  if (!s) throw new AuthError("sin-sesion")                  // 401
  const u = await usuarioPorAuthId(s.user.id)                // la fila de la base, cacheada por pedido
  if (!u) throw new AuthError("sin-usuario")                 // 401
  if (!u.activo) throw new AuthError("inactivo")             // 401: revocado
  if (!s.user.twoFactorEnabled) throw new AuthError("dos-factores-pendiente")  // 403
  if (!tienePermiso(u, permiso)) throw new AuthError("sin-permiso")            // 403
  return u
}
```

- **Los permisos salen de la fila `usuarios` de la base**, nunca del pedido, nunca de los datos de sesión del proveedor.
- Las reglas puras (`tienePermiso`) viven aparte y tienen tests sin base ni Next.
- **Un layout de Next no protege las páginas de abajo**: layout y página se dibujan en paralelo, y cuando el layout muestra su rechazo la página ya corrió y sus datos viajaron. Cada página verifica su permiso arriba.
- Esconder una entrada del menú es UX; el guard es la seguridad. Un `if (u.rol === "admin")` suelto en un componente se rechaza en la revisión.
- Las acciones sobre una fila verifican además la fila (que pertenezca, que el período esté abierto).
- 401 = no sabemos quién es; 403 = sabemos y no puede.
- El mensaje del error (`sin-permiso`) es un código interno: **nunca se muestra a una persona**.
- **Toda función async exportada desde un archivo `"use server"` es una acción pública**, aunque se llame `leerPagina`: no se exporta nada sin guard.
- Una **matriz rol × acción** en `docs/ARQUITECTURA.md`, y un test que la compara con el código.

## 4. Entrada de datos

- **Un esquema `zod` por acción, validado primero.** Topes en todo texto libre. Rechazar, nunca "arreglar", un campo estructurado.
- Límite de escrituras por usuario (por ejemplo 120 por minuto), en una tabla de Postgres.
- Formularios públicos: campo trampa oculto + trampa de tiempo (≥ 2 s) + límite por IP. CAPTCHA solo si se ve abuso.
- **Archivos**: lista permitida de tipos (PDF, JPG, PNG, WebP), tamaño máximo, verificación de los bytes mágicos, nombre aleatorio en el servidor, **SVG rechazado**, imágenes re-codificadas (saca los datos EXIF y GPS). Archivos grandes por URL firmada (`09` §6).
- **Markdown y texto enriquecido**: sanitizado con lista permitida al dibujar.
- **Exportes**: escapar la inyección de fórmulas en CSV y Excel (`07` §7).

## 5. Headers

```
Strict-Transport-Security: max-age=63072000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()   ← habilitar solo lo que una pantalla usa (un dictado necesita microphone=(self))
Content-Security-Policy: nonce por pedido + 'strict-dynamic'; frame-ancestors 'none'; connect-src solo los orígenes que se usan
```

## 6. Secretos

- **Valores solo en el panel de variables del hosting** (y en el gestor de contraseñas del dueño). En la documentación (`docs/ARQUITECTURA.md`) van **los nombres** y para qué sirve cada uno.
- **Nunca un `.env.example`**, nunca un `.env.local` en git, nunca un valor en un commit, un log o el chat. Nunca se imprime una connection string: se nombra la variable.
- Después de cada build de producción: buscar en `.next/static` el **valor** de cada secreto. Cero coincidencias.
- En CI, los valores que se generan en el momento (la URL de una base temporal) se enmascaran antes de usarlos y no se exportan.
- **Rotación**: ante cualquier sospecha, la salida de alguien con acceso de administrador o una filtración. Orden: rotar → desplegar → revocar el viejo → revisar los logs del proveedor → arreglar la causa → `G-` en `docs/MEMORY.md`. Borrar el commit no es un arreglo.

## 7. Base de datos y datos personales

- **Roles de Postgres con lo mínimo**: un dueño (solo migraciones), un rol de la app (lectura y escritura en sus tablas; sin `UPDATE`/`DELETE` en las tablas que solo aceptan inserciones) y, si hay sitio público, un rol propio sin acceso a las tablas sensibles. **Los roles se crean por migración**: en Neon, un rol creado desde la consola es miembro de `neon_superuser` y todos los permisos por tabla quedan decorativos.
- **Auditoría**: quién, qué, cuándo y sobre qué fila, en una tabla que solo acepta inserciones. Toda acción privilegiada y todo exporte escriben su fila (con la cantidad de filas exportadas).
- **Datos personales nunca en logs** (DNI, teléfono, email, textos clínicos, firmas, tokens) **ni en la URL**: en la URL solo identificadores opacos (uuid). Un prellenado entre pantallas viaja por `sessionStorage`, no por la dirección.
- Una página pública lee solo su propia fila y valida la forma del código antes de leer.
- Acceso a producción por persona, nunca una cuenta compartida.
- Sin píxeles de marketing en páginas con datos sensibles sin decidirlo con el cliente.

## 8. Antes de publicar (lista corta)

- [ ] HTTPS y HSTS · headers de §5 · CSP aplicada
- [ ] Búsqueda de secretos después del build: cero · ningún secreto en el historial de git · ningún `.env.example`
- [ ] Lockfile y `--frozen-lockfile` · `pnpm audit` sin altas ni críticas
- [ ] Una acción de administración llamada sin sesión (con `curl`) devuelve 401
- [ ] La matriz de roles coincide con el código · segundo factor en toda cuenta
- [ ] Límites de intentos activos · fila de auditoría en cada acción privilegiada
- [ ] Sentry sin datos personales, verificado con un error de prueba
- [ ] Existe un backup **y se hizo una restauración de prueba** (con fecha)
- [ ] El build de producción no muestra stack traces

## 9. Paquetes nuevos (cadena de suministro)

Antes de instalar: abrir su página del registro ese día (versión, licencia, descargas semanales, fecha de la última versión, dependencias, scripts de instalación) y registrar el veredicto en `docs/MEMORY.md`. Nada de paquetes abandonados ni con vulnerabilidades conocidas (el `xlsx` de npm, por ejemplo). Versiones exactas en el lockfile.

## 10. Antes de cada PR

Revisión de seguridad del diff: autorización en cada acción y página nueva, validación de entrada, datos personales en logs o URLs, secretos, redirecciones, archivos, inyección SQL (siempre consultas parametrizadas, nunca texto concatenado). Lo que se encuentra se arregla antes de mergear o queda como `TD-` con fecha.
