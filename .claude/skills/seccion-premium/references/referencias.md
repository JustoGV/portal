# Referencias — dónde buscarlas, cómo probarlas y cómo presentarlas

Mateo: "quiero que sea este el dinamismo para siempre poder yo visualizar e investigar". Una idea que no puede abrir es un párrafo, no una idea.

## 1. Qué cuenta como referencia

- **El mismo componente o la misma sección** que nombró, funcionando en una demo o en un sitio real.
- **Nivel premium**: un estudio, una marca cuidada o una demo de autor. No una plantilla.
- **Se descarta**, y se dice por qué:
  - es otro componente, aunque sea hermoso;
  - es la plantilla genérica del componente (FAQ con esquinas redondeadas, carrusel de avatares redondos, tarjeta oscura con estadísticas);
  - depende de fotos de personas que el proyecto no tiene;
  - se mueve sola sin control;
  - no carga, da error, tiene publicidad o no se llega a ver el efecto;
  - se ve vieja;
  - repite una opción que ya está en la lista, peor hecha.

## 2. Dónde buscar

Buscar por el **nombre del patrón**, no por el nombre genérico de la sección: "sticky stacking cards" y no "services section". "Feature section" trae las tres columnas iguales con ícono, que es justo el molde genérico.

| Fuente | Para qué sirvió en Sanalys | Link |
|---|---|---|
| Catálogo de `ui-ideas` | Punto de partida: componentes por tipo, con demo | `C:\Users\mateo\.claude\skills\ui-ideas\COMPONENT-INDEX.md` |
| Codrops | Hover de listas e imágenes, menús, formularios, tipografía con scroll, botones | [tympanus.net/codrops/hub](https://tympanus.net/codrops/hub/all) |
| Olivier Larose | Sticky footer, creative buttons, text parallax, transiciones entre secciones | [blog.olivierlarose.com](https://blog.olivierlarose.com/) |
| Demos de GSAP y CodePen (GreenSock, Fabio Ottaviani) | Scroll, Flip, acordeones con scroll | [demos.gsap.com](https://demos.gsap.com/) |
| CodeFronts | Acordeones en CSS (de ahí salió el Marquee Header) | [codefronts.com](https://codefronts.com/navigation/css-accordions/) |
| Skiper UI | Tarjetas apiladas con scroll, hover de miembros de equipo | [skiper-ui.com](https://skiper-ui.com/) |
| Aceternity, Magic UI, Animate UI, hover.dev, 21st.dev, smoothui | Componentes animados. Muchos usan Framer Motion: se rehacen | [ui.aceternity.com](https://ui.aceternity.com/components) · [magicui.design](https://magicui.design/docs/components) · [animate-ui.com](https://animate-ui.com/) · [hover.dev](https://www.hover.dev/components) |
| Sitios reales del rubro | Cómo resuelve el rubro la reserva, el contacto y el footer, en escritorio y en celular | Sanalys (clínicas y bienestar): SHA Wellness, Aman, Othership, Clinique La Prairie, Lanserhof, Chenot, Remedy Place, Neko Health, Parsley Health, Function Health |
| Estudios premium | Composición y movimiento de nivel | Dennis Snellenberg, Locomotive, Basement, darkroom.engineering, Rhode, Lusion |
| Showcase de la librería | Medir la sensación del scroll con números | [lenis.dev](https://lenis.dev/) y los sitios que enlaza |
| Galerías | Ver más cuando lo anterior no alcanza | Awwwards, Godly, Land-book, Webflow Made in Webflow |

## 3. Cómo probarlas

- **Abrir cada una.** En el panel del navegador de la app, o con Chromium headless y Playwright cuando son muchas o el panel está oculto.
- **Dos tamaños**: 1440 × 900 y 375 × 812, con user agent de iPhone para el celular.
- **Probar lo que hace**: pasar el mouse, tocar, scrollear, completar campos. En los hover, capturar la animación en 4 momentos; en las llegadas con scroll, cuadros al 20, 45, 70 y 100 %.
- **Esperar a que cargue** (unos 6 s) y ocultar los carteles de cookies con CSS antes de capturar.
- **Mirar el código del ganador en vivo** (markup y CSS) antes de escribir el plan.
- **Anotar la librería que usa**, para avisar si está prohibida.
- **Nunca mandar datos personales** a un sitio de terceros: ni en el user agent ni en la URL.

Esqueleto del script de capturas de Sanalys (simplificado de `footer-refs.js`; el ejecutable de Chromium y el `require` de Playwright dependen de la máquina):

```js
const SITIOS = [["larose-sticky-footer", "https://blog.olivierlarose.com/demos/sticky-footer"], ["sha", "https://shawellness.com/en/"] /* … */]
for (const [nombre, url] of SITIOS) for (const movil of [false, true]) {
  const vp = movil ? { width: 375, height: 812 } : { width: 1440, height: 900 }
  const ctx = await browser.newContext({ viewport: vp, userAgent: movil ? IPHONE : DESK, ...(movil ? { isMobile: true, hasTouch: true } : {}) })
  const page = await ctx.newPage()
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 })
  await espera(6000)
  await page.addStyleTag({ content: OCULTAR_COOKIES })
  await bajarConRueda(page, vp.height) // la rueda de a 500 px hasta el final, para que corran las animaciones
  await page.screenshot({ path: `${OUT}/${nombre}-${movil ? "m" : "d"}-pie.png` })
}
```

## 4. Cómo presentarlas — plantilla

> Te dejo **N** [componente literal] para [la sección]. Abrí cada una y probé [el hover / el scroll / los campos]; las capturas van en el mismo orden que la tabla.
>
> [Condiciones que valen para todas, si hay: "hoy no hay fotos del equipo y no usamos caras hechas con IA".]
>
> | # | Inspiración | Qué hace (lo probé) | En [la marca] | Esfuerzo |
> |---|---|---|---|---|
> | 1 | [Autor · Nombre real](link directo a la demo) | Lo que pasa, en palabras simples, como lo vi al probarlo | Cómo quedaría con la marca: colores, recurso propio, contenido real | bajo / medio / alto |
>
> Las [números] usan [librería prohibida]; si elegís alguna, la hago con [la del proyecto].
>
> **Hecho**
> - Revisé [X] y descarté [Y]: [motivo corto de cada descarte].
> - **Mi elección es la [N]**: [por qué, atado a la marca y a lo ya construido; que funcione igual en el celular; que no se mueva sola].
>
> **Falta**
> - [Datos del cliente que la sección va a necesitar.]
>
> **Sigue**
> - Cuando elijas una (o dos para mezclar), te paso el plan con los archivos y espero tu GO-AHEAD.
>
> **De vos**
> 1. ¿Cuál te gusta? (un número, o dos para mezclar)

Cuando la ronda viene de una búsqueda amplia, sumar al final "Búsquedas usadas, por si querés ver más" con los links de las colecciones.

## 5. Una ronda real completa: acordeones para "¿A quién está dirigido?"

La primera ronda (scroll y efectos de texto) fue rechazada: "no me gusta, buscá inspiración de acordeón". Se revisaron 16 demos y se descartaron las genéricas. Esta fue la segunda:

| # | Inspiración | En Sanalys | Esfuerzo |
|---|---|---|---|
| 1 | [CodeFronts · Color Block](https://codefronts.com/navigation/css-accordions/color-block/) | Paneles verticales con los fondos de las etiquetas del suero; el nombre en vertical, como en el hero | medio |
| 2 | [CodeFronts · Numbered Spine](https://codefronts.com/navigation/css-accordions/numbered-spine/) | Números gigantes como lomos de libro, todo tipografía sobre blanco | medio |
| 3 | [CodeFronts · Underline Reveal](https://codefronts.com/navigation/css-accordions/underline-reveal/) | Filas grandes con un filete que se dibuja al abrir | bajo |
| 4 | [CodeFronts · Marquee Header](https://codefronts.com/navigation/css-accordions/marquee-header/) | Al abrir, el título corre como cinta y abajo aparece el detalle | medio |
| 5 | [CodeFronts · Brutalist Stamp](https://codefronts.com/navigation/css-accordions/brutalist-stamp/) | Cajas rectas con canto sólido, como el botón de reservar | bajo |
| 6 | [CodePen · Fabio Ottaviani · Elastic Accordion](https://codepen.io/supah/pen/rNKraQJ) | Referencia de movimiento: tiras que se ensanchan con rebote en GSAP | medio |
| 7 | [CodePen · Fabio Ottaviani · ScrollTrigger accordion](https://codepen.io/supah/pen/jOZezwa) | Se abre con el scroll; riesgo: se parece a la pila de servicios | alto |

Mi elección fue la 1; Mateo eligió la 4 y la ajustó a su idea: "a quién está dirigido, el título, y cada tratamiento cuando se despliega dice a quién está dirigido". Después sacó la cinta.

## 6. Resultado de cada ronda en Sanalys

| Sección | Revisadas → mandadas | Eligió | Qué pasó después |
|---|---|---|---|
| Servicios | Nombres del patrón con link | Bento de Magic UI | La cambió por las tarjetas apiladas de Skiper UI, rehechas en GSAP |
| ¿A quién está dirigido? | 1.ª ronda rechazada; 16 → 7 acordeones | Marquee Header (CodeFronts) | Sin cinta, con el isotipo |
| Equipo | 8 → 6 | 1 + 2 (Skiper Hover Members + O Positive Directors) | Dos rondas de prototipos; ganó Escenario |
| Cierre de contacto | 1.ª ronda rechazada; 12 → 7 secciones de contacto; 13 sitios del rubro | 1 (Dennis Snellenberg) | Prototipos Sobre el lugar, Etiqueta y Ventana; ganó Ventana, con cuatro rondas de correcciones |
| Botones de contacto | 1.ª ronda rechazada; 12 fuentes y 38 hovers → 7 | 2 (Olivier Larose · Creative Buttons) | Más lentos, con logos oficiales y canto 3D |
| Footer | 28 sitios → 7 | 1 + 3 (Larose Sticky Footer + Rhode) | Logo en fluo abajo; botón de reserva al centro en el header del celular |
| Scroll | 8 sitios medidos → 3 variantes | Cinemático | — |
