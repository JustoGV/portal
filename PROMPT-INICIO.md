# Prompt de inicio del proyecto

**Cómo se usa:** abrí Claude Code en esta carpeta (`portal-cess-gvg`), copiá todo lo que está entre las dos líneas de abajo y pegalo como primer mensaje. Antes de mandarlo, escribí en el bloque "EL PROYECTO" qué es lo que hay que hacer, con tus palabras: no hace falta que esté ordenado ni completo, Claude te va a preguntar lo que falte.

---

Vamos a arrancar un proyecto nuevo en esta carpeta. Ya están las reglas con las que se construye: no las tenés que inventar, las tenés que seguir.

## EL PROYECTO (lo cuento yo)

[Escribí acá qué es el proyecto: qué problema resuelve, para quién, qué pantallas o módulos te imaginás, qué tiene que poder hacer cada persona, si ya existe algo que reemplaza (una planilla, otro sistema), con qué te tenés que conectar, y cualquier cosa que ya tengas decidida.]

## LO QUE NECESITO DE VOS

### Paso 1: leer, sin escribir nada

Leé completos, en este orden:
1. `CLAUDE.md`
2. `docs/reglas/00-INDICE.md` y después todas las reglas de `docs/reglas/` (01 a 12)
3. `docs/WORKLOG.md` y `docs/MEMORY.md`

Esas reglas son la ley del proyecto: diseño de paneles, íconos, componentes, formularios (DNI, teléfono, duplicados, validación en vivo), tablas con paginación y filtros, movimiento con GSAP, rendimiento, seguridad del login y del sistema, datos y verificación. Si algo de lo que te cuento choca con una regla, decímelo y lo decidimos; no lo resuelvas en silencio.

`docs/trabajo/MATEO.md` es la forma de trabajar de mi socio: **no me la apliques a mí**. Conmigo seguí mi forma de pedir.

### Paso 2: entrevistarme

Con lo que conté arriba y lo que piden las reglas, preguntame lo que falte, **en tandas de hasta 5 preguntas**, cada una con tu recomendación cuando la tengas. No preguntes lo que ya está decidido en las reglas o en `CLAUDE.md`. Lo que tiene que quedar claro:

1. **El problema y el objetivo**: qué tiene que pasar para que el proyecto sea un éxito.
2. **Quién mira las pantallas**: el párrafo de `docs/reglas/02-CRITERIO-DASHBOARD.md` (Parte A §1): quién, dónde, con qué luz, con cuánta atención y con qué pregunta en la cabeza. Uno por cada tipo de usuario.
3. **Módulos y pantallas**: la lista, y qué pregunta contesta cada una al abrirla.
4. **Roles y permisos**: quién puede ver y hacer qué (sale una matriz rol × acción).
5. **Los datos**: las entidades, cuál es la clave natural de cada una (DNI, CUIT, email, código) y qué no se puede repetir; qué no se borra nunca; qué tiene plata o fechas.
6. **Las reglas del negocio**: cálculos, estados y transiciones, numeraciones, cierres de período.
7. **Integraciones**: WhatsApp, mail, pagos, archivos, otro sistema, un sitio público.
8. **La marca**: colores, logo, tipografía. Si todavía no hay, queda `{{CONFIRMAR}}` y se arranca con neutrales.
9. **Lugar**: país, zona horaria, moneda, largo del DNI, formato del teléfono.
10. **Seguridad**: si el segundo factor es obligatorio para todos, el tiempo de cierre por inactividad por defecto, si hay datos sensibles (salud, financieros).
11. **El stack**: confirmar el de `CLAUDE.md` §3 o cambiar lo que haga falta.
12. **Cuentas**: quién es dueño de GitHub, Vercel, Neon y el dominio. **Vos no creás cuentas ni escribís contraseñas**: si hace falta una, me guiás paso a paso y la creo yo.
13. **Prioridades y fechas**: qué va primero y si hay una fecha que manda.

Lo que no sepa todavía no se inventa: queda como `OQ-` en `docs/MEMORY.md` y como `{{CONFIRMAR}}` donde corresponda, y seguimos con el resto.

### Paso 3: escribir los documentos del proyecto

Cuando tengas lo suficiente, escribí:

| Archivo | Qué tiene |
|---|---|
| `docs/BRIEF.md` | El problema, el objetivo, los usuarios, el alcance (qué entra y qué queda afuera), los datos que faltan y quién los tiene que pasar |
| `docs/ARQUITECTURA.md` | El stack final, la estructura de carpetas, las rutas y módulos, la matriz de roles y permisos, el modelo de amenazas (`docs/reglas/10` §1), **los nombres** de las variables de entorno y para qué sirve cada una (nunca valores, nunca un `.env.example`) |
| `docs/DATOS.md` | Cada entidad con sus campos, claves, índices únicos, restricciones, qué no se borra, qué tiene plata o fechas, y las consultas principales con su índice |
| `docs/DISENO.md` | El párrafo de quién mira cada pantalla, los tokens con los colores de la marca (la estructura de `docs/reglas/03` §1), y la navegación |
| `docs/ROADMAP.md` | Las unidades de trabajo en orden (`WU-01`, `WU-02`…), cada una con su objetivo, **la lista de archivos que toca**, qué reglas aplican y cuándo está terminada. `WU-01` es la base: repo, la app, los tokens, la base de datos con sus roles, el login con el guard y el segundo factor, la CI con base temporal, y el `.gitattributes` con `*.sql text eol=lf` |
| `docs/MEMORY.md` | Las decisiones tomadas en la entrevista (`D-001` el stack, y las demás) y las preguntas abiertas (`OQ-`) |
| `docs/WORKLOG.md` | El ESTADO nuevo y una entrada de esta sesión |

### Paso 4: mostrarme y esperar

Mostrame un resumen de lo que escribiste, las preguntas abiertas que quedaron y el plan de `WU-01` (qué archivos se crean y qué hace cada uno). **No escribas código de la aplicación hasta que yo apruebe los documentos y ese plan.** Si querés, proponé inicializar git con un primer commit de las reglas y los documentos.

### Siempre, durante todo el proyecto

- Ningún dato inventado.
- Ningún secreto en el chat, en el código ni en un commit: solo nombres de variables; los valores los cargo yo en el panel del hosting.
- Nunca un `.env.example`.
- Nada está hecho sin mirarlo corriendo (`docs/reglas/12-VERIFICACION.md`).
- Al terminar cada tarea que cambie algo, una entrada corta en `docs/WORKLOG.md` y lo decidido en `docs/MEMORY.md`: mi socio también trabaja en este repo y tiene que poder ver qué pasó.

---
