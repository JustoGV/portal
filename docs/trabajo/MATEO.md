# Cómo trabaja Mateo

> **Aplica solo cuando el que escribe es Mateo**: cuando usa `/retomar`, `/cerrar` o `/seccion-premium`, o dice que es él. **Nunca se le aplica al socio**, que tiene su propia forma de trabajar.

## 1. El ciclo de un chat largo

Mateo trabaja en un solo chat largo. Cuando el contexto se llena:

1. `/cerrar` — vuelca todo al registro (`docs/WORKLOG.md` y `docs/MEMORY.md`): la entrada de la sesión, el ESTADO sobrescrito, y las decisiones, trampas, deudas y preguntas nuevas. Corre aunque la tarea esté a medias. No commitea salvo que lo pida.
2. `/compact` — compacta el contexto.
3. `/retomar` — lee el registro, lo compara con el código y con git, y devuelve dónde está el proyecto y la próxima acción. **Si el registro y el código no coinciden, lo dice antes que nada.**

Nunca se le sugiere abrir un chat nuevo.

## 2. Plan y GO-AHEAD

- **Antes de tocar archivos en una tarea de varios archivos**: el plan como literales, en una tabla `archivo · qué contiene · qué lo gobierna`, marcando qué decisión es **suya** y cuál es **mía**. Después, esperar su **GO-AHEAD** escrito.
- **Un ok cubre solo la acción nombrada**, nunca las siguientes.
- Si devuelve una lista de fallas con "corregí y arreglá todo lo que te pedí", eso **es** el GO-AHEAD para toda esa lista: se arregla entera sin más preguntas y va un solo link de revisión. Lo nuevo sigue con plan.
- Lo que pidió, como lo pidió: sus palabras literales son el requisito (`docs/reglas/01-FORMA-DE-TRABAJO.md` §4).

## 3. Cómo hablarle

Siempre en español, en **markdown renderizado, nunca dentro de un bloque de código** (en la app, un bloque de código es monoespaciado y lo vuelve ilegible). Cada mensaje tiene esta forma y nada más:

> **Hecho**
> - lo que existe ahora, una viñeta corta por ítem
>
> **Falta**
> - lo que falta, una viñeta por ítem, con quién lo destraba
>
> **Sigue**
> - la próxima acción, una sola
>
> **De vos**
> - exactamente lo que se necesita de él, o "nada"

- Sin preámbulo, sin repetir lo que dijo, sin narrar el razonamiento, sin opciones que no pidió.
- **Los números van en tablas**, nunca en prosa.
- **Preguntas: tres como máximo, numeradas, cada una respondible con una palabra, con una recomendación.** En español de todos los días, sin jerga.
- Un plan es el único mensaje largo, y es una tabla.
- Si un mensaje necesita más de ~15 líneas fuera de una tabla, son dos mensajes o es demasiado.
- Tiene que poder entender el estado completo del proyecto con el último mensaje.
- Al reportar una animación: en qué momento se cambió y con qué valores, para que pueda desmentirlo mirando.

## 4. Una unidad por vez, una pantalla por unidad

- Una unidad de trabajo por vez; varias por chat. No se arranca la segunda sin cerrar la primera en el registro.
- **Una pantalla por unidad, rediseñada entera de una vez** (tarjetas, etiquetas, botones, íconos, movimiento, su ronda de referencias y su link). Una pantalla terminada no se vuelve a abrir. Probar piezas sueltas siempre en las mismas dos pantallas le dio la sensación de estar en un bucle.
- Cuando suena perdido: el mapa (etapas, unidades hechas y faltantes, en tabla) y el porqué.
- **Al cerrar una unidad**, una línea: "¿Seguimos con <la próxima pantalla>?", y esperar su sí y sus explicaciones. Nada de checklist ni plan antes.

## 5. Diseño: `/seccion-premium`

Para cada pantalla o componente nuevo:

1. 5 a 7 referencias reales de **exactamente ese componente**, abiertas y probadas, con link directo y capturas. Ronda de 15 minutos como máximo.
2. Él elige (un número, o dos para mezclar). Si mezcla o duda: prototipos reales en la página detrás de un selector.
3. El plan en tabla y su GO-AHEAD.
4. Construir en la aplicación corriendo; mirarlo a 375, 1440 y 1920.
5. El link de revisión con qué probar; se corrige en el momento; se mergea **solo después de su ok**, y se le avisa.

Lo que más pesa en sus elecciones:
- **Elige lo más animado.** Si mi recomendación es la más quieta, digo por qué y nombro cuál es la más animada.
- **Referencias de catálogos premium** (Aceternity, Magic UI, Cult UI, SmoothUI, Animate UI, Origin UI, 21st.dev), nunca software de gestión viejo.
- **Corregir solo lo señalado**: lo que no nombró queda aprobado.
- Si dice "no hace ese wow" después de verla: otra ronda desde otra idea, no retoques de la misma.
- Lo que rechazó se anota con sus palabras y no vuelve.

## 6. Pruebas

- Él prueba en el link de revisión. La sesión corre `typecheck` y `lint` (y los tests de la unidad), sube los cambios y le manda el link con una tabla de qué probar.
- Antes del link: datos de muestra que muestren cada estado y la entrada animada ya hecha.
- Lo 3D y lo muy visual se mira en capturas propias antes del link.

## 7. Producción y acciones que no se deshacen

- Toda escritura en la base de producción (migración, datos de muestra, borrados) necesita su ok en ese momento.
- En paneles de servicios (Vercel, Neon, GitHub, Cloudflare): un paso por mensaje, sobre su captura de pantalla; nunca la lista entera.
- Nunca se imprimen secretos ni connection strings: solo los nombres de las variables.
- Nunca se crea, modifica ni commitea un `.env.example`.

## 8. Tiempo

Ronda de referencias ≤ 15 minutos. Verificación proporcional al cambio. Antes de cualquier paso de más de 5 minutos (una compilación, una medición larga), avisarle en una línea con el tiempo estimado. Él mide el avance en minutos de reloj, pero no quiere que se recorte calidad: se recorta el desperdicio.

## 9. Sección 13 de su documento de criterio ("Cómo reportar"), textual

> Cuatro bloques, siempre: **Hecho / Falta / Sigue / De vos**.
>
> - Los números, en tabla.
> - Decir **en qué momento** de una animación cambiaste algo y **con qué valores**, para que te puedan desmentir mirando.
> - Máximo tres preguntas, numeradas, que se respondan con una palabra, y **con una recomendación**.
> - Nada de datos inventados. Lo que falta va marcado como que falta, y se dice quién lo tiene que pasar.

## 10. El rediseño del portal: lo que pidió el 2026-11-12 (vale para cada pantalla)

Sus palabras: *"todo siempre sea lo más profesional posible, acá no hay apuro, acá debe haber profesionalidad"*. Y cuando nos fuimos de pieza en pieza sin orden: *"estamos dando una banda de vueltas, y debemos ser organizados"*. Por eso: **el orden de `docs/ROADMAP.md` WU-06 manda**, una pantalla entera por vez (§4), y no se salta a otra sin su OK.

1. **Siempre con todas las habilidades cargadas**, antes de diseñar nada: `/dashboard:diseno`, `/dashboard:datos`, `/dashboard:seguridad`, `/diseno`, `/seccion-premium`, `/web-distintiva`, `motion-web-senior` (GSAP, animaciones, scroll), `ui-ideas` (componentes), y de la biblioteca `animate`, `gsap-scrolltrigger`, `prototype` y `break-ui`. Más las reglas de `docs/reglas/` que toca la pantalla (`04` íconos, `05` componentes, `06` formularios, `07` tablas). Si una no carga, se para y se dice.
2. **Íconos propios, nunca Lordicon** (D-018): se miran las referencias de cómo anima Lordicon y se dibujan en SVG propio, profesionales, que se entienda para qué sirve cada uno, **con combinación de colores** (no de un solo color) y animados con GSAP.
3. **Etiquetas claras en todo**: cada ícono con su nombre y su tooltip, cada estado con su palabra, cada campo con su etiqueta. Que se entienda qué es cada cosa sin adivinar.
4. **Formularios, alertas y resultados en tarjetas que aparecen en el medio**, con todos sus datos completos.
5. **Formularios en pasos**, no todos los campos juntos: *"que los formularios no pongas todo junto porque satura, dividilo en pasos"*.
6. **Validaciones en cada campo** que lo tenga (DNI, teléfono, email…) con las reglas de `docs/reglas/06`: contador, línea que se llena, tilde, no deja escribir de más, mensaje que dice qué hacer.
7. **Sin saltos de línea feos**: `pegar()` (`lib/texto.ts`) en todo texto que se muestra, `text-wrap` en la base, y el chequeo a 360, 375, 390, 768, 1440 y 1920 en 0 antes de mostrarle nada.
8. **Ningún dato inventado** y las pruebas con datos de peor caso (nombre de 80, descripción de 200, cero filas) antes de mostrarle.
