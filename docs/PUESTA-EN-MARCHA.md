# Puesta en marcha

Lo que hay que hacer **una vez** para que el portal corra en internet. Lo hace el dueño de las cuentas (OQ-002): Claude no crea cuentas ni escribe contraseñas. Ningún valor de los que aparecen acá se escribe en el repo ni en el chat: se cargan en el panel de Vercel o en los secretos de GitHub.

## 1. Neon (la base)

1. Crear el proyecto en Neon, en la región **AWS São Paulo (`aws-sa-east-1`)**, la misma que las funciones de Vercel (`vercel.json` → `gru1`). Si se elige otra región, cambiar las dos.
2. De la rama principal, copiar la conexión **directa** (sin `-pooler`) del rol dueño. Es `DATABASE_URL_DIRECT`.
3. Crear una rama vacía llamada `ci-vacia` (la CI copia de ahí y la borra al terminar, OQ-008).
4. En una terminal, con `DATABASE_URL_DIRECT` cargada solo en esa terminal:
   - `pnpm db:migrate` → crea las tablas, el rol `portal_app` y los permisos.
   - `pnpm clave-rol-app` → habilita `portal_app` y muestra **una vez** su contraseña. Con ella se arma `DATABASE_URL` (usuario `portal_app`, conexión con `-pooler`).

## 2. Vercel

1. Importar el repo de GitHub.
2. En **Settings → Environment Variables** cargar: `DATABASE_URL`, `DATABASE_URL_DIRECT`, `BETTER_AUTH_SECRET` (32 bytes al azar, por ejemplo `openssl rand -base64 32`), `BETTER_AUTH_URL` (solo en Production: la dirección del portal) y, si se usa Sentry, `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` y `SENTRY_AUTH_TOKEN`.
3. Activar Speed Insights en el proyecto.

## 3. GitHub

- Secreto `NEON_API_KEY`; variable `NEON_PROJECT_ID` (y `NEON_RAMA_VACIA` si la rama vacía no se llama `ci-vacia`).

## 4. La primera cuenta

**Desde la web (D-015):** con la base sin ninguna cuenta, el login manda a `/configurar`: nombre, email y una contraseña propia. Apenas existe una cuenta, esa página deja de existir. Hacelo **apenas termina el primer deploy**: mientras no hay cuentas, cualquiera que llegue a la URL podría crear la primera.

**O desde la terminal:** con `DATABASE_URL` cargada: `pnpm crear-admin "Nombre Apellido" persona@dominio.com`. Muestra la contraseña inicial **una vez**. Esa persona entra, cambia la contraseña, escanea el QR con la app de códigos del celular y guarda los 10 códigos de respaldo. La cuenta del otro socio se crea desde **Usuarios → Nueva cuenta**.

## 5. Antes de usarlo de verdad

La lista de `docs/reglas/10` §8: headers (`curl -I`), una acción de administración sin sesión que rechace, Sentry probado con un error de prueba, **un backup y una restauración de prueba con fecha**, y la velocidad medida en el preview (LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1).

## Para trabajar en local

Un Postgres de prueba en Docker, sin contraseña y solo en esta máquina:

```bash
docker run -d --name portal-cess-pg -e POSTGRES_HOST_AUTH_METHOD=trust -e POSTGRES_USER=dueno -e POSTGRES_DB=portal -p 127.0.0.1:55432:5432 postgres:17-alpine
DATABASE_URL_DIRECT="postgresql://dueno@127.0.0.1:55432/portal" pnpm db:migrate
docker exec portal-cess-pg psql -U dueno -d portal -c "alter role portal_app login"   # solo en local
DATABASE_URL_DIRECT="postgresql://dueno@127.0.0.1:55432/portal" pnpm test
```

Para ver las pantallas con datos de muestra, `scripts/sembrar-prueba.ts` (solo corre contra `localhost`) crea cuentas y proyectos marcados "Muestra" y una sesión de prueba.
