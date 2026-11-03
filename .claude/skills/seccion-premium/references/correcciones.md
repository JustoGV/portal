# Correcciones — cómo corrige Mateo y qué hacer con cada una

Mateo decide mirando, no leyendo descripciones. Sus correcciones son la mejor fuente de su gusto: cada una dice algo más que lo que dice literalmente.

## 1. Cómo llegan

- **Con capturas**, a veces marcadas, de su Chrome a 1920 o de su iPhone, y a veces con un dibujo a mano. La captura manda sobre el texto.
- **Escritas rápido**, con errores de tipeo. Leer la intención, no la letra ("insulos" es "insulsos"; "venta" es la variante "Ventana").
- **Numeradas** ("1 - … 2 - …"): contestar cada punto en ese orden, sin saltear ninguno.
- **Respuestas en una línea** a las preguntas: "1 si 2 cortina 3 GO-AHEAD". Cada número responde a la pregunta con ese número.
- **En mayúsculas**, cuando algo se repite: no alcanza con arreglar el caso. Hay que encontrar la causa y dejar una regla medible para todas las secciones.

## 2. Diccionario

| Lo que dice | Qué significa | Qué hago | Caso en Sanalys |
|---|---|---|---|
| "más rápido" o "más lento", y la segunda vez "sigue igual" | Estoy tocando otro momento u otro elemento | Parar y preguntar con una palabra: "¿el de la entrada al cargar o el de cuando cambiás de suero?" | Pidió cuatro veces un círculo más rápido; yo cambiaba el del cambio de suero y él miraba el de la entrada al cargar |
| "¿qué tiene que ver esto con…?", "te pedí X" | Traje otro componente | Rehacer la ronda filtrando por el nombre literal | Efectos de texto para "CTA"; menús y listas para "botones" |
| "no me gusta" a toda la ronda, más un tipo nombrado | La dirección está mal, no las opciones | Ronda nueva solo de ese tipo | "buscá inspiración de acordeón" |
| "la uno con la dos", "no sé cómo te imaginás eso" | Le gusta una idea que todavía no existe | No decidir por él: 3 variantes con `prototype` en la página | Equipo (Hover Members + Directors); cierre (Snellenberg con el lugar de fondo) |
| "hasta no verlo no puedo saber" | Necesita verlo funcionando | Prototipo en la página, no más descripciones | Segunda ronda del equipo |
| "no hace ese wow", "me molesta", "así como está hoy no" | La composición no sirve, aunque la idea sí | Otra ronda desde otra composición; no retocar la misma | Cartelera rechazada → Escenario, "ahora me gusta muchísimo más" |
| "me gusta la 1 pero le falta fluidez, profesionalismo, hay bugs" | La idea está aprobada; falta terminación | Pulir: sincronía, recarga, cuadro por cuadro, todos los tamaños | Cartelera, antes de verla terminada |
| "lo demás está genial", "perfecto, dejamos ese" | Aprobado | No tocar lo que no nombró | Servicios, equipo |
| "no vi la animación" | Arrancó antes de que estuviera a la vista | Volver el disparo; si algo llega tarde, acortar su secuencia interna | Entradas adelantadas y revertidas; el mapa acortado por dentro |
| "debe ser suave y fluido" sobre algo atado al scroll | Con la rueda corre demasiado rápido | Duración fija larga, disparada al llegar | Telón del cierre: 316 ms → 2,2 s |
| "te regresa atrás", "hace un tope o scroll solo" | El scroll se movió sin él | Nunca mover el scroll; resolverlo con la altura de las secciones | Snap entre secciones, quitado |
| "sigue existiendo blanco muerto", "¿cuántas veces más va a pasar lo mismo?" | Un problema recurrente arreglado caso por caso | Regla medible en todas las secciones y todos los tamaños | Prueba de corte de lectura: 0 px en 30 casos |
| "super insulsos" | Sin movimiento ni carácter | Referencias animadas del mismo componente | Botones de contacto |
| "te dije LOGOS, no nombre" | Lo pidió literal y no se cumplió | Hacerlo literal: logo oficial actualizado | Instagram, Google Maps, Gmail, WhatsApp |
| "le tocaba blanco" | Rompí una regla ya acordada | Aplicar la regla sin preguntar | Alternancia de fondos |
| "que entre todo en la pantalla", "prioridad el mobile" | La sección no se ve completa en algún tamaño | Medir en 375, 360 × 640 y 1366 × 650 que todo entre | Cierre de contacto |
| "un poco más alto", "más a lo largo, no tanto a lo ancho" | Ajuste de proporción | Cambiarlo y reportar los px de antes y de después | Carrusel del cierre: de 470 a 550 px, después 590 |
| "no, dejalo como estaba antes" | Rechazo | Volver exacto a lo anterior (sin diferencias contra el commit) y anotarlo como rechazado | Entradas adelantadas |
| "te pedí … y nunca lo hiciste" | Un pedido viejo quedó sin hacer | Hacerlo primero y revisar si quedó otro pendiente | El mapa y el carrusel más anchos |
| "sin tecnicismos, porque si no no sé qué decirte" | La pregunta lo bloquea | Palabras de todos los días, una recomendación, respuesta de una palabra | Pesos de tipografía |
| "no, yo te voy diciendo cada sección" | Él marca el orden | No proponer la próxima sección | Después de la sección 4 |
| "tomate el tiempo, pero devolveme lo que te pido" | Importa más la exactitud que la velocidad | Cumplir cada punto pedido antes de sumar ideas propias | Cierre de contacto |

## 3. Lo que hizo que me entendiera más rápido

- **Nombrar el momento y los números** en cada reporte ("la cortina del menú: 1,0 s; los links entran desde 0,45 s"), para que pueda desmentirme mirando.
- **Mandar las capturas en el mismo orden que la tabla.** En las animaciones, varios cuadros: la llegada, la mitad, el final.
- **Dar "lo que cuesta" de cada opción**, no solo lo lindo: "en 360 × 640 el carrusel bajaría de 260 a 176 px".
- **Medir antes de opinar** cuando pide "como las páginas profesionales": el scroll se decidió con números de ocho sitios.
- **Mostrar el movimiento arriesgado a la vista**, para que lo pueda rechazar en vez de descubrirlo después.
- **Preguntar con opciones de una palabra** atadas a lo que se ve ("¿abajo o arriba?", "¿centro o derecha?", "¿cortina o círculo?").
- **Anotar cada rechazo con sus palabras.** Lo que rechazó una vez y vuelve a aparecer le hace perder tiempo y confianza.
