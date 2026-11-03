---
name: seccion-premium
description: "El método con el que Mateo y Claude diseñan una web premium sección por sección sobre la página real: primero 5 a 7 referencias del componente exacto, abiertas y probadas, con link; Mateo elige; prototipos con selector si elige una mezcla; plan en tabla y GO-AHEAD; construir en el código; mirarlo uno mismo a 375, 1440 y 1920 antes de reportar; correcciones leídas con su diccionario; decisión y rechazos anotados. Usar cuando Mateo nombra la próxima sección o componente de una web ('seguimos con el footer', 'buscá inspiraciones para la sección X', 'quiero ver ejemplos de botones', 'dame ideas para esta sección'), cuando arranca el diseño de una web nueva, o cuando escribe /seccion-premium. En este repo corre solo a mano (/seccion-premium): es el metodo de Mateo y no se le impone al socio."
disable-model-invocation: true
---

# Sección premium — el método

Salió de Sanalys (WU-04, septiembre 2026), donde se construyeron así, una por una, el hero, los servicios, "Dónde estamos", "¿A quién está dirigido?", el equipo, el cierre de contacto y el footer. Mateo lo dijo dos veces:

- "me encanta esta forma de trabajo, me encanta que me empezás a entender mucho más con el diseño, con la forma de scrollear, con las animaciones"
- "quiero que sea este el dinamismo para siempre poder yo visualizar e investigar"

Esta skill es ese método escrito. Los ejemplos son de Sanalys; el método sirve para cualquier proyecto.

## Qué cargar antes de empezar

1. `references/criterio.md` — la vara: qué es "premium" y "fluido" para Mateo, con números, y todo lo que rechazó.
2. `references/referencias.md` — dónde buscar, cómo probar y la plantilla exacta para presentar.
3. `references/correcciones.md` — qué significa cada corrección suya y qué hacer.
4. Las skills de diseño: en este repo, `.claude/skills/` trae `ui-ideas` (catálogo `COMPONENT-INDEX.md`), `motion-web-senior` y `gsap-scrolltrigger`. `web-distintiva`, `animate`, `tailwindcss-mobile-first` y `prototype` viven en la máquina de Mateo: si están, se cargan; si no, mandan las reglas del repo (`docs/reglas/03-DISENO-VISUAL.md`, `05-COMPONENTES.md`, `08-MOVIMIENTO-GSAP.md`).

Si una skill del repo no carga, parar y decirlo. Nunca diseñar ni animar de memoria.

## Reglas que no se negocian

1. **Mateo elige la próxima sección.** No proponer cuál sigue ni preguntarlo: esperar a que la nombre ("no, yo te voy diciendo cada sección").
2. **Primero referencias, después plan.** El primer mensaje de una sección nueva nunca es un plan.
3. **La referencia es lo que nombró, literal.** Si pidió "botones", botones; si pidió "CTA", la sección de contacto. Nunca efectos vecinos.
4. **Todo en el código real, en la página que corre.** Nada de maquetas, wireframes, Figma, Miro ni HTML sueltos. El prototipo con selector sí vale: son versiones reales en la página.
5. **Ningún archivo sin su GO-AHEAD escrito.** Un OK cubre solo la acción que se nombró, nunca las siguientes.
6. **Nada está hecho hasta que lo miré.** A 375, 1440 y 1920, recargando, scrolleando, abriendo y cerrando. Las capturas van a Mateo.
7. **Hablarle en español simple.** Markdown renderizado, nunca en un bloque de código. Cuatro bloques: **Hecho / Falta / Sigue / De vos**. Máximo tres preguntas, numeradas, que se respondan con una palabra, con una recomendación.
8. **Lo que rechazó no vuelve.** Se anota con sus palabras y no se propone de nuevo.
9. **Ningún dato inventado.** Precios, teléfonos, matrículas o nombres faltantes van como `{{CONFIRMAR}}`, y se avisa quién los tiene que pasar.

## El ciclo

### Paso 0 — Anclar

- Leer el estado del proyecto: registro de trabajo, decisiones, lo rechazado. Si el proyecto no tiene registro, proponerlo al cerrar la primera sección.
- Cargar las skills de arriba.
- Repetir en una línea la postura estética del sitio (`web-distintiva` paso 1). Si todavía no existe, declararla antes del primer píxel y decir de dónde sale.

### Paso 1 — Nombrar lo que pidió

- Escribir para uno mismo: "Mateo pidió: <componente literal>. En la página es: <qué hace ahí>". Filtrar toda la búsqueda con esa línea.
- Si el nombre admite dos lecturas que cambian la búsqueda (¿"CTA" es una banda de reserva o la sección de contacto?), preguntar con una palabra antes de buscar.
- Si pregunta cómo se llama una sección para buscar inspiración, devolver los nombres reales del patrón con un link cada uno (por ejemplo "sticky stacking cards", no "services section") y avisar qué búsqueda trae plantillas genéricas.

### Paso 2 — Investigar

Detalle en `references/referencias.md`.

- Juntar entre 8 y 30 candidatos del mismo componente: catálogo de `ui-ideas`, galerías de demos y sitios reales del rubro.
- Abrir cada uno y probarlo: hover, click, scroll, a 1440 y a 375. Capturar la animación en varios cuadros.
- Descartar con motivo: es otro componente, se ve genérico, necesita fotos de personas que no hay, se mueve solo sin control, no carga o no se ve el efecto.
- Quedarse con 5 a 7.

### Paso 3 — Presentar

- La tabla de `references/referencias.md` §4, con las capturas mandadas en el mismo orden.
- Avisar qué opción usa una librería prohibida en el proyecto y que se rehace con la propia (en Sanalys, Framer Motion → GSAP).
- Una sola **Mi elección**, con el motivo atado a la marca y a lo ya construido. Mateo decide: en Sanalys eligió distinto a mi elección en varias rondas (acordeones, botones), y está bien.
- Pregunta: "¿Cuál te gusta? (un número, o dos para mezclar)".

### Paso 4 — Mateo elige

| Lo que responde | Qué hago |
|---|---|
| Un número | Paso 5, el plan |
| Una mezcla ("1+3", "la uno con la dos"), adjetivos, o "no me imagino cómo" | Ronda de `prototype`: 3 variantes reales montadas en la página, cada una distinta en un eje declarado, detrás del selector de `PICKER.md` copiado tal cual. Antes, el plan de las variantes con la tabla `# · Variante · Escritorio · Teléfono · Lo que cuesta` y su GO-AHEAD |
| "No me gusta" a toda la ronda, o nombra otro tipo ("buscá inspiración de acordeón") | Ronda nueva, solo de ese tipo. No defender la anterior |
| Después de verla en la página: "no hace ese wow", "así como está hoy no" | Otra ronda de prototipos desde otra idea, no retoques de la misma (equipo de Sanalys: Cartelera → Escenario) |

Cuando elige una variante: promoverla al componente real, borrar el prototipo archivo por archivo y anotar la decisión.

### Paso 5 — Plan

- Una tabla `archivo · qué contiene · qué lo gobierna` (doc del proyecto o skill y sección).
- Contenido real del cliente; lo que falta, `{{CONFIRMAR}}`.
- Qué voy a medir y en qué tamaños.
- Las decisiones que cambian el resultado, como preguntas de una palabra ("¿el logo va abajo o arriba?", "¿botón al centro o a la derecha?").
- Cerrar con "¿GO-AHEAD?".

### Paso 6 — Construir

- Traducir la referencia a la marca: tokens, radio, colores, tipografía, el recurso propio (en Sanalys, el resaltador fluo). Nunca pegar.
- Reusar lo que ya existe en el sitio (el mismo botón, las mismas filas con línea) para que se lea como un solo sitio.
- Un momento de movimiento propio de la sección, no un fade-up genérico.
- Primero el celular.

### Paso 7 — Mirarlo uno mismo

Detalle en `references/criterio.md` §5.

- Tamaños: 375 × 812, 1440 × 900 y 1920 (la pantalla de Mateo), más los chicos (390 × 664, 360 × 640, 1366 × 650) cuando la sección tiene que entrar en una pantalla.
- Recargar parado en la sección: en el primer cuadro no asoma nada antes de tiempo.
- Scrollear a ritmo de lectura, subiendo y bajando; cuadro por cuadro en cada cambio de estado.
- La prueba de corte de lectura: cero píxeles de otra sección bajo el header donde una persona frena a leer.
- Movimiento reducido, consola sin errores, sin scroll horizontal.
- Si el panel del navegador está oculto, las animaciones se congelan: medir con Chromium headless y Playwright.
- Mandar las capturas.

### Paso 8 — Reportar

- Cuatro bloques. Los números, en tabla.
- Decir en qué momento de la animación se cambió algo y con qué valores, para que pueda desmentirme mirando.
- Decir qué no se verificó (por ejemplo, un celular real).

### Paso 9 — Correcciones

Diccionario completo en `references/correcciones.md`.

- Contestar cada punto numerado, en su orden, en el mismo turno. Arreglar la causa, no el síntoma, y volver a mirar.
- Si la misma corrección vuelve dos veces, estoy tocando otra cosa: preguntar qué momento está mirando.
- Lo que no nombró queda aprobado ("lo demás está genial"): no se toca.

### Paso 10 — Cerrar la sección

- Anotar la decisión: qué se eligió, de qué referencias, con sus palabras; la lista de rechazos ("no reintentar"); las trampas técnicas encontradas.
- Commit y push solo con su sí y con la sección cerrada.
- Esperar a que nombre la próxima.
