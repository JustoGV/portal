# Criterio — la vara de una web premium para Mateo

Lo que sigue salió de sus correcciones en Sanalys, no de una teoría. Cada regla lleva el caso que la dejó clara.

## 1. La vara, en sus palabras

- "esto debe ser la mejor inmersión posible; al ser algo tan premium debemos ser lo mejor en esto"
- "EL GSAP ES FUNDAMENTAL" · "seamos realmente serios con esto" · "más lento, más fluido"
- "BASTA DE WEBS GENÉRICAS" · "siempre que quiero crear hace la misma web"
- "tomate el tiempo que sea necesario, pero devolveme las cosas que te pido"

## 2. Movimiento

| Regla | Cómo se ve | Caso en Sanalys |
|---|---|---|
| Atado al scroll cuando se puede | Pilas sticky, tarjetas que se achican al pasar la siguiente, fotos que se acercan mientras suben, ventanas que se abren con el scroll | Servicios: tarjetas apiladas; cierre: la imagen se abre como ventana |
| Lo que se abre crece en su lugar | GSAP Flip, y el contenido de adentro entra en secuencia | La tarjeta de servicio crece a casi toda la pantalla en 1,1 s `expo.inOut` |
| Lento y parejo | Pasos de 1,1 a 1,6 s; curvas `expo`, `power2.inOut`, `power3`; nada rápido de arranque | Cambio de persona del equipo: cortina 1,25 s `expo.inOut` e imagen 1,7 s `expo.out`; menú del celular: cortina 1,0 s `power3.inOut` y links escalonados cada 0,07 s |
| Todo sincronizado | Nada aparece mucho antes que el resto | Hero: "el círculo aparece mucho antes que lo demás y muy rápido" |
| Cero parpadeos al recargar | En el primer cuadro no asoma nada fuera de lugar | Hero: el nombre del tratamiento destellaba en fluo debajo del suero |
| La entrada se tiene que ver | Arranca con la sección ya en pantalla (`start: "top 70%"`), no cuando asoma el borde | Rechazado: "ya bajó y apareció la info, no vi la animación del GSAP" |
| Si algo llega tarde, acortar su secuencia | No adelantar el disparo: sacar tiempo de adentro de la animación | Mapa: el pin completo pasó de 2,85 s a 2,4 s |
| Suave aunque la rueda vaya rápido | Si algo atado al scroll corre demasiado rápido con la rueda, pasarlo a una duración fija larga | Telón del cierre: abría en 316 ms con la rueda; pasó a 2,2 s `sine.inOut` |
| Lo que se abre, se abre; no aparece | Crecer, cortina o apertura; nunca un fundido que "aparece de la nada" | Hero: "directamente aparece así de la nada"; el círculo de entrada pasó a abrirse |
| Carruseles lentos, solo a la vista | 7 s por imagen, fundido de 1,4 s, acercamiento 1,08 → 1; frenan fuera de pantalla, con el mouse encima y con movimiento reducido | Carrusel del cierre |
| Botones vivos | Animados al pasar el mouse y al tocar, 0,8 a 0,9 s; logos oficiales actualizados, nunca el nombre escrito | "super insulsos"; "te dije LOGOS, no nombre" |
| Solo `transform` y `opacity` | Un `clip-path` animado puede trabarse en el celular: si se traba, pasar a `transform` | El círculo de color del hero se congelaba a mitad en el teléfono |
| Movimiento reducido | La misma información, sin desplazamientos | Todas las secciones |

### El scroll

- Suave con Lenis y sensación "cinemática": `lerp 0.075`; con el dedo `syncTouchLerp 0.06` (0.03 en iPhone). Una muesca de rueda se asienta en unos 0,96 s.
- Se eligió midiendo contra sitios profesionales: una muesca tarda entre 0,59 s (lenis.dev) y 0,83 s (GTA VI), con Good Fella, Annnimate, ND Studio, Realfood, Offbrand y Team USA en el medio. Después, tres variantes en la página (Ágil, Profesional, Cinemático); eligió Cinemático.
- **Nunca** snap, tope entre secciones ni scroll que se mueva solo: "te regresa atrás", "se come la pausa de servicios".
- Cuando pide "como páginas profesionales", medir primero contra esas páginas y recién después proponer.

## 3. Composición y entorno

- **Anti-genérico.** Vetado de arranque: hero partido con texto a la izquierda y foto a la derecha, header con números, los mismos botones de siempre, grilla de tres columnas iguales, `rounded-2xl` en todo, fade-up en todo, gradiente centrado con dos botones. Mostrar el movimiento arriesgado explícito para que lo pueda rechazar.
- **Todo lo importante entra en una pantalla**, en escritorio y en celular: header + título + contenido. "que entre todo en la pantalla".
- **El celular es prioridad**: "debe ser una prioridad el mobile". Se prueba también en 360 × 640 y 390 × 664.
- **El header acompaña**: toma el color de la sección que tiene debajo, como si fuera transparente.
- **Los fondos alternan** (en Sanalys blanco y verde): "la idea es alternar entre esos dos"; "el color de fondo y header le tocaba blanco".
- **Sin franjas de otro color ni espacio muerto** donde una persona frena a leer: se resuelve con la altura de cada sección, nunca moviendo el scroll. Regla medible en §5.
- **Usar el ancho**: el contenido va del logo (izquierda) al botón del header (derecha). "me quita mucho espacio en DESKTOP", "no me gusta que esté todo amontonado y chico". Revisar siempre a 1920.
- **Un solo tamaño** de título y de bajada para todas las secciones: "no podés estar variando cada vez que hacemos una sección".
- **Proporción según el contenido**: "usá el carrusel más a lo largo, no tanto a lo ancho", pensando en qué fotos va a haber.
- **Imagen limpia**: sin contador ni pausa visibles encima si la pide limpia; la pausa queda para teclado y mouse.
- **La referencia se traduce**: radio, colores y recurso de la marca, y lo que ya existe en el sitio (el mismo botón, las mismas filas con línea).
- **Datos reales**: el mapa con las calles reales ("buscá bien en Google Maps"); las secuencias en el orden del relato ("empieza con la dirección y recién ahí dibuja el mapa").
- **Sin caras generadas con IA.** Sin fotos reales todavía: renders de marca o espacios, nunca personas inventadas.

## 4. Lo que rechazó en Sanalys

No reintentarlo; en otro proyecto, preguntar antes de volver a usarlo.

| Rechazado | Sus palabras | Qué quedó |
|---|---|---|
| Una web tradicional y estática | "no me gusta nada… BASTA PORFAVOR" | Hero con los sueros girando como ruleta y la paleta que cambia con cada uno |
| Referencias de otro componente | "¿qué tiene que ver esto con la sección de CTA?"; "te pedí botones" | Rondas filtradas por el nombre literal |
| Scroll y efectos de texto para una sección de perfiles | "no me gusta, buscá inspiración de acordeón" | Acordeón Marquee Header |
| La cinta que corría con el nombre abierto | "quitala… un solo título con el logo" | Título fijo con el isotipo |
| Bordes en el botón secundario | "sacale los bordes… dejalo como el del hero" | El link del hero |
| Algo que se abre solo al cargar | "no quiero que se abra solo el de Detox" | La sección arranca cerrada |
| Tope o snap entre secciones | "te regresa atrás… no me gusta ni para desktop ni para mobile" | Lenis suave sin snap |
| Entradas disparadas antes de verse | "no vi la animación… dejalo como estaba" | `top 70%` otra vez |
| El telón atado al scroll con la rueda | "hace la cortina muy rápido, debe ser suave y fluido" | Duración fija de 2,2 s |
| Nombres gigantes sobre una foto velada (equipo) | "no hace ese wow, me molesta… así como está hoy no" | Escenario: la foto de la persona se ve entera |
| Contador y pausa sobre la imagen | "sacalo, que quede limpia la imagen" | Pausa con mouse y teclado |
| Botones anchos con nombre y dato | "super insulsos" | Botones cuadrados con logo y relleno que sube |
| Barra fija abajo en el celular | Prefirió un botón en el header | "Reservar turno" entre el logo y el menú |
| Menú del celular abriéndose en círculo | Eligió "cortina" | El menú baja como cortina |
| Bento de servicios | Lo cambió él por tarjetas apiladas con scroll | Sticky stacking cards rehechas en GSAP |

## 5. Cómo se mira antes de reportar

- **Tamaños.** 375 × 812, 1440 × 900, 1920 × 1080 y 1920 × 911 (Mateo usa 1920). Si la sección tiene que entrar en una pantalla, también 1366 × 650, 390 × 664 y 360 × 640.
- **Recarga.** Parado en la sección, capturar el primer cuadro y el primer segundo.
- **Prueba de corte de lectura.** Bajando, frenar cuando el último contenido se ve entero a 0, 45 y 100 px del borde de abajo. Subiendo, frenar cuando el título se ve entero a 0, 45 y 100 px debajo del header. En todos los casos, 0 px de otra sección.
- **Ritmo de lectura.** 100 px cada 200 ms. Para comparar un antes y un después, leer el estado en la **misma posición de scroll**, no a los mismos segundos.
- **Cuadro por cuadro** en cada cambio de estado: que nunca se vea el fondo entre dos imágenes ni un elemento a medio camino.
- **Panel oculto.** Si el panel del navegador no se está mostrando, `requestAnimationFrame`, los eventos de scroll y ScrollTrigger se frenan y todo lo medido es falso. Usar Chromium headless con Playwright.
- **Un footer que se destapa** (`sticky bottom-0`) nunca puede ser más alto que la pantalla: medirlo en los tamaños chicos.
- **Una clase que oculta** un elemento que GSAP ya animó no hace nada: GSAP deja estilos inline que le ganan. Ocultar un envoltorio interno.
- **Sin evidencia no hay "hecho".** Un comentario en el código que explica por qué algo está bien no prueba que se vea. El primer hero salió con media línea del título invisible y un párrafo explicando por qué eso no podía pasar.
