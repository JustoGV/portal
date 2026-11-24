# Mensajes pendientes

Textos para terceros redactados en el chat, literales, en su última versión. Los enviados se marcan, no se borran.

## M-1 · Para Justo · publicar el portal

- **Para qué:** que Justo dé acceso a Neon, mire el PR #2 y acepte limpiar la base de producción.
- **Estado:** enviado 2026-11-19, por Mateo.

> Justo, para dejar el portal en producción con la base limpia necesito:
>
> 1. Que me agregues como colaborador en el proyecto de Neon del portal.
> 2. Tu OK al PR #2: https://github.com/JustoGV/portal/pull/2
>    - «Proyectos» pasa a «Servicios» y «Grupos» a «Clientes».
>    - Tocar un servicio abre su ficha, no el link.
>    - El portal queda siempre en claro.
>    - El nombre visible es «CESS - GVG · Portal»: tu rama del nombre queda afuera.
> 3. Tu OK para borrar la base de producción y arrancar de cero. Después te creo la cuenta a vos y a Claudio desde el portal.
> 4. Segundo factor activado en Vercel, Neon y GitHub.
> 5. Cambiar la contraseña de la base (pasó por un chat en noviembre).

## M-2 · Para Justo · llave de Neon para la CI

- **Para qué:** que Justo cree la llave de Neon solo para el proyecto `portal` y la cargue como secreto en GitHub, así `verificar` deja de fallar (OQ-008).
- **Estado:** descartado 2026-11-24, no se manda: los tests pasaron a manual (D-048).

> Justo, para que los tests automáticos del portal anden en cada PR me falta una sola cosa que solo podés hacer vos, porque en la organización de Neon soy miembro y no me deja crear llaves.
>
> 1. En Neon, en tu organización, entrá a Settings → API keys y creá una llave nueva con alcance de proyecto, solo para `portal`. Ponele de nombre `ci-portal`.
> 2. En GitHub, en el repo `portal`, andá a Settings → Secrets and variables → Actions → New repository secret. De nombre poné `NEON_API_KEY` y pegá la llave.
>
> Lo demás ya lo dejé hecho: una rama vacía en Neon (`ci-vacia`) de la que se copian las bases de prueba, sin ningún dato de gente real, y la variable con el id del proyecto en GitHub. La llave no me la pases a mí, cargala directo ahí. Cuando esté, avisame y relanzo los tests para ver que pasen.
