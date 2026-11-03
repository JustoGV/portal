# 02 — Criterio de diseño para paneles operativos

> **Parte A es el documento de Mateo, textual.** Lo escribió a partir de un panel real (cámaras de clubes) y se aplicó entero en un sistema de gestión. Cada regla trae el problema que la originó: por eso no se edita. Su sección 13 ("Cómo reportar") es parte de su forma de trabajar y está en `docs/trabajo/MATEO.md`.
>
> **Parte B son sus criterios posteriores**, salidos de revisar el sistema en producción pantalla por pantalla. Donde B y A chocan, gana B, porque son sus palabras más nuevas.
>
> **Primer paso en este proyecto:** escribir el párrafo de A §1 para nuestros usuarios y guardarlo en `docs/DISENO.md`. Sin ese párrafo no se diseña ninguna pantalla.

---

# PARTE A — El documento de Mateo

## 0. Cómo usar esto

Trabajás sobre un dashboard operativo: una herramienta que alguien mira todos los días para saber si
algo anda, configurarlo una vez, y encontrar una cosa rápido cuando se la piden. **No es una landing
page.** El diseño acá no seduce: informa. Pero tampoco es un panel de admin genérico: el que paga
tiene que sentir que compró algo serio.

Tres reglas de proceso que valen más que cualquier regla visual:

1. **Nada se estima: se mide.** Contraste, duraciones, tamaños, cuántos elementos entran. Si no lo
   mediste, no lo sabés. Ver §9.
2. **El diseño sale de referencias reales, no de una postura inventada.** Antes de diseñar una
   sección, se buscan 5 a 7 ejemplos reales de *ese componente exacto*, se abren, se prueban, y la
   persona elige. Lo que se construye es una traducción a la marca, nunca una copia.
3. **Lo que el usuario rechazó no vuelve.** Se anota con sus palabras y no se propone de nuevo.

---

## 1. Primero el contexto, porque de ahí salen las reglas

No se puede diseñar esto sin saber dónde se mira. El caso real:

> El encargado está **de pie detrás de un mostrador**, con luz de tubo y un ventanal atrás. Mira la
> pantalla **de reojo** entre cobrar y atender a alguien. A la noche el salón queda en penumbra. No
> es técnico. Entra con **una pregunta concreta** y se va.

Todo lo que sigue se deduce de ahí:

- **De reojo** → el estado se lee por color y tamaño, no leyendo texto. Lo urgente se ve de lejos.
- **Ventanal de día, penumbra de noche** → los dos temas son de primera clase. No hay "el oscuro es
  el bueno y el claro lo hizo alguien apurado".
- **Entra con una pregunta** → cada pantalla contesta en la primera línea la pregunta con la que se
  abre. No hay pantalla que sea un contenedor de widgets.
- **No es técnico** → cero jerga. Los mensajes dicen **qué hacer**, no qué falló.
- **Lo mira todo el día** → nada parpadea, nada se re-anima solo. Ver §6.

**Antes de escribir una sola regla visual para otro proyecto, escribí este párrafo.** Quién mira,
dónde, con qué luz, con cuánta atención, y con qué pregunta en la cabeza. Si no podés escribirlo,
no sabés lo suficiente para diseñar.

---

## 2. Principios, en orden de prioridad

1. **Contestar al entrar.** Cada pantalla responde en su primera línea la pregunta con la que se
   abre. Si el usuario tiene que buscar la respuesta, la pantalla está mal ordenada.
2. **Un vistazo desde lejos.** Estado por color y tamaño. Lo urgente se ve sin leer.
3. **Configurar es guiado.** Lo que se hace una vez (dar de alta algo, cargar horarios) es un flujo
   de pasos, y **se dice qué va a pasar antes de guardar**.
4. **La identidad es del cliente, no tuya.** Sus colores tiñen todo. Ver §3.
5. **Nunca mentir sobre el estado.** Si algo no va a funcionar, se dice en ámbar. Jamás "todo en
   orden" cuando no lo está. Un panel que miente una vez no se vuelve a creer.

---

## 3. Color

### 3.1 La identidad es del cliente y se calcula, no se elige

El cliente carga **dos o tres colores** (casi ningún club tiene uno solo: tiene el de la camiseta y
el que lo acompaña). De cada uno se derivan ~7 variables: el color, su hover, el texto que va
adentro, dos fondos suaves, un borde, y una versión legible sobre el fondo.

**Se calcula en el servidor, no con `color-mix()` en el navegador.** Si la máquina del cliente no
entiende la función, el panel queda sin colores y **nadie se entera**. Un cálculo en el servidor se
puede testear contra miles de colores; uno en el navegador, no.

### 3.2 Identidad ≠ estado

**Esta es la regla que más se rompe.** Los colores del cliente son identidad. El verde quiere decir
"listo", el ámbar "atención", el rojo "grabando". **El rojo de grabación no se rebrandea aunque el
club sea rojo**: el punto rojo significa "está grabando" en toda cámara que existió.

Si el estado se tiñe con la marca, un error de un cliente rojo se vuelve invisible.

### 3.3 Los neutrales también son del cliente

No son grises muertos: se tiñen hacia el color del cliente, bajando la mezcla hasta que el texto
encima siga pasando el mínimo de contraste. Un panel con neutrales de Tailwind y un acento de marca
se ve como una plantilla con un sticker.

**Todos los neutrales en OKLCH con un tono definido y croma ≠ 0.** Un gris de croma 0 es el color
de "no lo pensé".

### 3.4 Los escalones se miden en OKLCH, nunca en HSL

En HSL el mismo paso de luminosidad ensucia un amarillo y lava un azul. En OKLCH se ve igual de
grande en todos los colores. Si el color ya está pegado a un extremo (un cliente negro), los dos
escalones salen **para el mismo lado**: de un negro no se saca algo más oscuro.

Un color que la pantalla no puede mostrar se arregla **bajándole el croma**, nunca recortando canal
por canal — eso lo devuelve de otro tono.

### 3.5 Trampa: corregir varios colores por separado los vuelve idénticos

Si tenés tres familias y corregís cada una hasta que pase el mínimo de contraste, **las tres paran
en el mismo umbral**, que es casi la misma luminosidad: terminás con tres colores iguales. Hay que
mirar cuánto necesita **la peor** y mover **las tres esa misma cantidad**.

Medido sobre 2.021 colores: el par más cercano pasó de 0,000 (idénticos) a 0,143 de separación.

---

## 4. Estructura y jerarquía

### 4.1 Niveles, no colores

La separación entre zonas se hace por **nivel de superficie**, no pintando cada zona de un color:

```
lienzo  → el fondo de la ventana
capa    → la tarjeta
capa-2  → algo elevado dentro de la tarjeta
capa-3  → lo más elevado
borde / borde-2 → las dos fuerzas de línea
```

Rechazo textual del usuario al pasar de todo blanco a todo negro sin niveles: *"no se entiende dónde
está cada cosa"*. Los niveles son lo que hace que se entienda.

### 4.2 La mezcla de tarjetas

De las referencias: **tarjetas claras, UNA de color sólido del cliente, y una oscura**. Una sola
tarjeta de color sólido por pantalla — si hay dos, ninguna es "la importante".

⚠️ **Adentro de la tarjeta de color, el texto va con el color de texto puro** y las píldoras sin
fondo, con borde. Aclarar al 80 % o teñir la píldora baja el contraste a 3,63 con un cliente rojo.
**La jerarquía la hace el tamaño y el peso, nunca la transparencia.**

### 4.3 Una escala de tipografía y una de espacio, fijas

```
tipo:    xs .75rem · s .8125 · m .875 · l 1rem · xl 1.25 · 2xl 1.5 · 3xl 2 · 4xl 2.75   (ratio ~1.2)
espacio: 1 .25rem · 2 .5 · 3 .75 · 4 1rem · 5 1.25 · 6 1.5 · 7 2 · 8 2.5 · 9 3.5
radio:   s 8px · m 12px · l 16px · xl 20px · full 999px     (tarjetas 16, píldoras redondas)
```

**Fijas en rem, no fluidas con `clamp()`.** Esto se mira siempre en la misma pantalla, a la misma
distancia: una escala que cambia con el ancho no aporta nada y hace que nada mida lo mismo dos
veces. (En una landing, que se mira en mil pantallas, `clamp()` sí tiene sentido. El criterio
depende del caso.)

**Cero tamaños sueltos.** Un tamaño nuevo se agrega a la escala o no existe. Si ves `font-size: 15px`
en un commit, está mal.

### 4.4 Container queries, no media queries

La única `@media` estructural es la barra lateral, que en pantalla chica se abre encima en vez de
ocupar lugar. **Todo lo demás se adapta con `@container`**, porque un componente tiene que responder
al espacio que *él* tiene, no al ancho de la ventana. Una tarjeta al lado de una barra abierta tiene
menos lugar que la misma tarjeta con la barra cerrada, y la ventana mide igual en los dos casos.

### 4.5 Solo se grafica lo que tiene historia

Un número sin serie temporal no va en un gráfico. "Cámaras en línea ahora" no tiene historia por
día; graficarlo es inventar datos. Va como estado, no como gráfico.

---

## 5. Lo que se muestra, y lo que no

- **Nada repetido.** Si el mismo dato aparece en dos lugares de la misma pantalla, sobra uno. El
  nombre del cliente va **una vez**, arriba. (Hubo una ficha al pie y el usuario la marcó como
  repetida. No volvió.)
- **Los filtros muestran solo lo que existe.** Si hay 8 categorías posibles y el cliente usa 2, se
  muestran 2. Mostrar las 8 con 6 apagadas es ruido que no se puede accionar. Sin nada que filtrar,
  la barra de filtros no aparece.
- **La pantalla dice qué se va a hacer a continuación**, no solo qué pasó. Un panel que solo muestra
  el pasado obliga a hacer la cuenta mentalmente.
- **Los errores dicen qué revisar, en orden de probabilidad.** "La cámara no responde" no sirve;
  "suele ser que se desenchufó o se cayó el wifi" sí. No enseñes a usar una app ajena: decí qué
  mirar.

---

## 6. Movimiento

**El movimiento comunica estado. No decora.** Si una animación no dice nada que el usuario necesite
saber, se saca.

```
duraciones: 150ms · 220ms · 320ms
curva:      cubic-bezier(.25, 1, .5, 1)     ← ease-out-quart
```

Nada de bounce ni elastic. Nada de entradas genéricas tipo *fade-up* en todo lo que aparece.

### 6.1 La regla que más importa: lo que se refresca solo no se vuelve a animar

Si una pantalla se actualiza cada 15 segundos y cada refresco re-corre la animación de entrada, el
panel **parpadea todo el día**. Las cosas se animan cuando **alguien hace algo**, no cuando llegan
datos nuevos.

En la práctica: las barras de un gráfico crecen al entrar y al cambiar de período; en un refresco
automático se compara con lo último que llegó y, si no cambió nada, no se toca el DOM. Si cambió, se
redibuja **sin transición**.

Igual con las entradas escalonadas: se hacen **solo la primera vez** (una bandera que se saca a los
700 ms), nunca en los refrescos.

### 6.2 La excepción: el momento que sí merece más

Hay **un** momento por sistema donde vale gastar más: acá es la tarjeta de confirmación que aparece
en el centro después de una acción. Esa se mueve con una librería de animación real (~1,1 s):
la tarjeta crece desde 0,86 en 0,9 s con `expo.out`, y **se vuelve opaca en 0,18 s** — a medio fundir
se ve la pantalla de atrás a través y parece rota. Detrás entran el círculo, los textos, el trazo y
el botón.

Si la librería no carga, queda una animación CSS más simple. **El sistema nunca depende de que la
librería esté.**

⚠️ **Lo que anima la librería va sin `transition` de CSS.** Las dos peleando dan un resultado que no
es ninguno de los dos.

### 6.3 Después de confirmar algo, NO se recarga la página

Recargar corta la animación justo cuando termina de entrar, y se ve como si se hubiera roto algo.
Textual del usuario: *"parecería que recargó la página y queda super feo"*. Lo que se hace es
**ponerse al día en el lugar**: pedir lo que cambió y reemplazarlo. Si de verdad hay que cambiar de
página, se esperan ~2,2 s a que la animación termine.

### 6.4 "Menos movimiento" no puede significar "menos información"

Con `prefers-reduced-motion` la confirmación **se sigue viendo**: la saca un reloj, no el fin de la
animación, y el tilde aparece ya dibujado. Reducir movimiento apaga el movimiento, nunca el mensaje.

---

## 7. Interacción y estados

- **El estado nunca es solo color.** Siempre lleva texto o un trazo que lo diga. El tipo de una
  notificación se distingue por el dibujo adentro del círculo (tilde, cruz, exclamación, i), no solo
  por el color.
- **Lo que solo informa no frena.** Una confirmación que se va sola (2,6–3,4 s) para lo que salió
  bien; una que **espera un "Entendido"** solo para errores y cosas que hay que decidir. Si todo
  pide confirmar, nadie lee ninguna.
- **Una a la vez.** La nueva reemplaza a la anterior. Dos notificaciones apiladas no se leen.
- **El foco se maneja:** la que espera respuesta se lleva el foco, Escape la cierra sin cerrar lo de
  abajo, y al cerrarse el foco **vuelve a donde estaba**.
- **Toques ≥ 44 px.**
- **Arrastrar para elegir un rango.** 36 casilleros iguales para elegir horarios fue rechazado con
  *"no se entiende nada"*. Un rango se elige arrastrando de principio a fin.
- **En pantalla chica, menos por vez, no lo mismo apretado.** Una grilla semanal de 7 días no se
  encoge: se muestra **un día por vez** con una tira para cambiar de día. Y se abre en el día de hoy,
  desplazado hasta lo primero que todavía no pasó.

---

## 8. Accesibilidad, que acá es medición

- **Todo texto ≥ 4,5:1, medido en los dos temas y con cualquier color de cliente.** Un test recorre
  miles de colores posibles. Alguien que elige amarillo no va a reportar que no se leen las letras:
  va a pensar que es así.
- **El navegador no resuelve OKLCH en `getComputedStyle`.** Para medir hay que **rasterizar el color
  en un canvas de 1×1 y leer el píxel**.
- ⚠️ **Y hay que componer el fondo real.** Dos formas de medir mal, las dos costaron un error:
  1. Rasterizar un fondo con alpha **sobre blanco** en vez de sobre el fondo que tiene debajo. Dio
     1,67 en algo que se lee perfecto.
  2. `getComputedStyle().backgroundColor` **ignora `background-image`**. Una píldora con su tinte en
     un degradado midió 5,78 cuando lo que se ve mide 4,93.
  Componé **cada capa translúcida sobre la de atrás**, o el número es ficción.
- **Un gris apagado sobre casi-blanco es el error más común y el más caro**: el usuario cree que no
  ve bien.
- **Estados nunca solo por color** (repetido a propósito: es lo que más se olvida).

---

## 9. Trampas que costaron un error real

Estas no son teoría. Cada una rompió algo.

| Trampa | Qué pasa |
|---|---|
| Nombres de clase de una letra | `.p` era "monoespaciado" en una pantalla y "fila" en otra. No falla nada: se ve mal y nadie se entera. **Grepeá antes de crear una clase corta.** |
| CSS compartido sin `Cache-Control` | El navegador se queda con la hoja vieja y pinta el HTML nuevo con el estilo anterior. El usuario actualiza y ve "el mismo panel de siempre". |
| CSS generado en el servidor | Si lo arma el servidor, un cambio **no se ve hasta reiniciar**. Ya pasó: el modo claro sirvió la paleta oscura (contraste 1,42) porque el proceso venía de antes. |
| Píldora translúcida sobre fondo teñido | Se mezcla con el tinte y el texto cae del mínimo. Falló con **el 100 %** de los colores probados. La píldora tiene que llevar **su propia capa opaca** debajo del tinte. |
| Píldora del mismo color que su fondo | No se mezcla: **se funde**. Y moverle el fondo al otro extremo la funde con el otro estado. Se delimita con un trazo. |
| Animaciones en un navegador headless | No avanzan: una notificación queda en `opacity: 0` y los colores quedan en el estado anterior. Hay que terminarlas a mano antes de medir, o vas a "arreglar" algo que no está roto. |
| Devolver el scroll a su lugar | Dispara un evento de scroll que cierra el menú que acabás de abrir. Marcá el scroll propio para ignorarlo. |

---

## 10. Vetado, y por qué

Esto se rechazó explícitamente. No vuelve:

- **Una plantilla SaaS genérica**: Inter o Geist, grises de Tailwind, todo centrado, `rounded-2xl` en
  todo, grilla de 3 columnas con icono + título + texto.
- **Tipografía monoespaciada como voz principal.** Parece una consola, no un producto. (Si necesitás
  cifras que no bailen, buscá una familia con **cifras tabulares de verdad** y medilo: `1111` y
  `0000` tienen que ocupar lo mismo. Así no hace falta una mono.)
- **Todo blanco y negro insulso, sin nada animado.** Rechazo textual.
- **Raya de color al costado de una tarjeta** como acento.
- **Texto con degradé.**
- **Tramas `repeating-*`** de fondo.
- **Borde y sombra difusa en el mismo elemento.** Una o la otra.
- **Efectos de adorno**: border beam, spotlight, glassmorphism decorativo, máscaras de entrada.
- **La raya larga (—) en los textos.** Coma, dos puntos, punto o paréntesis.

---

## 11. Dependencias

- **Las fuentes y las librerías viven en el repo, no en un CDN.** La máquina del cliente puede
  quedarse sin internet. Un panel sin tipografía porque se cayó un CDN es un panel roto.
- **Una sola familia tipográfica** si tiene los pesos y las cifras que necesitás. Tres familias
  compitiendo se lee como indecisión.
- **Si cargás una librería de animación, que sea para un momento concreto y con plan B.**

---

## 12. Cómo se verifica antes de decir que está listo

1. **Mirarlo uno mismo**, a 375, 1440 y 1920. Recargando parado en la sección, scrolleando a ritmo
   de lectura, abriendo y cerrando.
2. **Medir el contraste** de lo nuevo, en los dos temas, componiendo bien el fondo (§8).
3. **Sin scroll horizontal** en ningún ancho.
4. **Consola sin errores.**
5. **Con `prefers-reduced-motion`**, que la información siga llegando.
6. **Romper a propósito lo que acabás de proteger.** Si escribiste un test, cambiá el código para que
   falle y confirmá que el test se da cuenta. Un test que nunca falla no protege nada, y no hay forma
   de saberlo mirándolo.
7. **Decir qué NO verificaste.** Un celular real, un lector de pantalla, un caso que no pudiste
   reproducir. La lista de lo pendiente vale más cuando es honesta.

---

# PARTE B — Sus criterios posteriores (revisión en producción)

Revisó el sistema terminado, pantalla por pantalla, y su veredicto fue: *"No se usó nada de lo que pedí: no hay rapidez, no hay fluidez"*. El plan había reemplazado lo que él pidió con lo que el planificador creía correcto. Lo que sigue es lo que pidió, y vale desde la primera pantalla.

## B1. Reglas duras

1. **La lógica no cambia con el diseño.** Se rediseña el cómo y la organización, nunca el porqué ni el significado de lo que dice una pantalla.
2. **La marca no cambia.** Colores, logo y tipografía son los del cliente, en el sistema y en cada PDF.
3. **Lo que pide, como lo pide.** Ningún criterio, plan o recomendación reemplaza o modera un pedido suyo. Un choque es una pregunta, nunca una decisión silenciosa.
4. **Nada está hecho sin mirarlo** a 375, 1440 y 1920, en la aplicación corriendo, con la velocidad medida en el despliegue de prueba y no en una laptop.
5. **Movimiento con medida.** *"Tampoco excederse… que sea movimiento, movimiento, movimiento… estamos buscando también rendimiento; lo que voy a buscar es ese diferencial de las cosas."*

## B2. Estructura: la navegación

- **Barra lateral izquierda**, "como todos los dashboards", con los módulos agrupados. **Cada grupo es un desplegable** con sus páginas. Sin cabecera arriba: la búsqueda, el logo y el usuario van dentro de la barra.
- **Un ícono propio por página**, que corresponda a lo que hay adentro y tenga coherencia con los demás, premium y animado (`04-ICONOS.md`).
- Los grupos **se abren al pasar el mouse** en escritorio (con 120 ms de reposo antes de abrir, para que pasar de largo no abra nada; al salir se cierra lo que abrió el hover) y **al tocar** en el teléfono. **Sin flecha** (chevron). Al abrirse, los íconos del grupo se animan **en cascada**.
- La barra colapsada se abre tocándola en cualquier parte.
- `Ctrl+K` abre una búsqueda rápida; su botón vive en la barra.

## B3. Composición de cada página

1. **Los datos del día a día primero.** Las listas y las tablas son la página, y tienen que seguir leyéndose cuando haya años de datos reales.
2. **Los formularios de alta y edición viven detrás de un botón**, nunca fijos en la página: *"no poner los formularios dentro de la misma pantalla porque se confunde"*. El botón dice qué hay adentro (`Nuevo usuario`, `Alta de insumo`), y el formulario abre rápido en una tarjeta centrada con animación. Un bloque chico que de golpe crece está rechazado.
3. **Las herramientas grandes y secundarias** (importar un Excel, un texto de ayuda largo) van detrás de un botón que las abre con una explicación corta, no como bloques en la página.
4. **Tablas de verdad.** Filas y columnas ordenadas, usando el ancho. Nada de "nombre y documento apilados a la izquierda de una pantalla de 1920". Cada fila tiene sus acciones como íconos claros (`07-TABLAS-PAGINACION-FILTROS.md`).
5. **Filtros que se lean como filtros**: diseñados como controles de filtro, no como texto suelto.
6. **Equilibrado, centrado, ordenado.** Nada empujado a la izquierda de una pantalla vacía, nada de grillas desparejas (4 tarjetas arriba y 2 abajo), nada amontonado. Un poco más grande y ordenado, no todo agrandado.
7. **Cada elemento tiene una razón y un lugar**, con prioridad y estructura.
8. **Lo que va lado a lado va parejo:** columnas del mismo ancho y la misma altura. Una columna vacía muestra su ícono y su frase en el medio, sin recuadro punteado (se lee como zona para soltar archivos). Un botón al lado de un campo queda a la altura del campo. Una tabla nunca va en una columna angosta al costado de un formulario: va abajo, a todo el ancho.
9. **Una sección muestra lo que tiene primero** (historial, tarjetas, lista) y abre el alta desde un botón chico al lado de su título. Lo que solo se edita (los datos de una ficha) puede quedar como formulario.

## B4. Componentes (detalle en `05-COMPONENTES.md`)

1. **Íconos premium, animados y más grandes.** *"No podés poner un ícono de una X insulsa cuando hay montones de íconos con animaciones que son realmente atractivos."* Ejemplos rechazados: una ✕ quieta como acción de fila, un ícono de Excel que "parece una calculadora", un disquete para guardar.
2. **Un tooltip diseñado** al pasar el mouse, que explica en pocas palabras qué hace un botón (nunca el `title` del navegador).
3. **Una sola familia de botones**, atractiva, con borde visible y contraste contra lo que tiene atrás. Acciones distintas se ven distintas; una sola forma; un solo tamaño de letra.
4. **Controles propios, nunca los del navegador**: select, combobox, checkbox, radio, switch y **el selector de fecha** (el calendario nativo es "horrible").
5. **Validación en vivo**: el DNI y el teléfono marcan válido o inválido mientras se escriben (`06-FORMULARIOS.md`).
6. **Formularios solo con teclado**: Enter pasa al campo siguiente y el último Enter guarda, "como los sistemas grandes, para más velocidad".
7. **Un desplegable vacío explica por qué** y lleva a donde se configura.
8. **Gráficos que informan y se mueven**: con etiquetas y valores legibles, que entran con movimiento.
9. **La tarjeta de resultado**: después de crear, guardar o generar algo, una tarjeta centrada con animación y un ícono animado según el resultado (guardado, no se guardó, dato mal, PDF generado).

## B5. Movimiento (detalle en `08-MOVIMIENTO-GSAP.md`)

- GSAP está permitido y es la herramienta. Framer Motion no.
- **Entre páginas**: una transición que fluya; si queda una espera, una animación de carga **con un mensaje**.
- **Al llegar a una pantalla**: sus filas y bloques entran con movimiento. **Nunca en un refresco automático** (A §6.1 sigue vigente).
- Los paneles y la tarjeta de resultado abren y cierran con GSAP. Los íconos se animan al pasar el mouse o al cambiar de estado.
- Con `prefers-reduced-motion` todo sigue funcionando: estados finales visibles, sin movimiento.
- **"Fluido" se mide, no se mira.** Un salto se lee como *"bugueado, tildado"*. Toda animación que cambia tamaño o posición se muestrea cuadro por cuadro antes de mandarla a revisar.

## B6. Velocidad

- Las funciones del servidor corren en la **misma región que la base de datos**. En el proyecto anterior corrían en otro continente y nadie lo midió hasta que él lo notó.
- Cada pantalla se mide de click a contenido en el despliegue de prueba, en frío y en caliente.
- Si la base gratuita "se duerme", su despertar se cubre con la carga con mensaje.

## B7. Paneles con números (dashboards)

1. **La primera línea de cada bloque contesta la pregunta** con la que alguien abre la pantalla. La pregunta de cada bloque se escribe en el plan antes de diseñarlo.
2. **Solo se grafica lo que tiene historia.** Una serie en el tiempo es una línea. Comparar cantidades entre categorías es una **tabla con una barra por fila** (nombre, barra, valor; la barra más grande en el color de la marca, el resto apagado). Una parte de un todo sin historia son los números que ya muestran las partes. **Nunca una dona**, nunca un gráfico de una sola barra.
3. **Cada bloque tiene sus estados**:
   - un skeleton quieto, de la altura final, mientras carga;
   - un vacío que distingue "todavía no hay nada" (con la acción para crear lo primero) de "el filtro no encontró nada" (con la acción para ampliar el filtro);
   - un error que dice qué revisar, en orden de probabilidad, y deja intactos los otros bloques.
4. **Un refresco que falla no borra los números**: los deja y muestra una sola línea, debajo del título: *"No se pudo actualizar: se muestran los datos de las HH:MM."* Si la sesión venció, manda al login.
5. **Un mismo dato aparece una sola vez por pantalla.**
6. **Una sola tarjeta de color sólido por pantalla**, la del dato más importante. Adentro solo texto en el color de texto puro, píldoras con borde y botones con borde.
7. Entre 5 y 7 indicadores grandes como máximo por pantalla. Sin métricas de vanidad.
8. Números siempre con cifras tabulares (`font-variant-numeric: tabular-nums`), para que un refresco no mueva lo que está al lado.

## B8. Referencias de diseño

- Cada pantalla o componente nuevo sale de 5 a 7 referencias reales de **exactamente ese componente**, abiertas y probadas, con link directo (`/seccion-premium`).
- Las referencias salen de catálogos de componentes premium y animados (Aceternity, Magic UI, Cult UI, SmoothUI, Animate UI, Origin UI, ejemplos de shadcn, 21st.dev), **nunca de software de gestión viejo aunque sea del rubro**. Paneles de planilla grises sin movimiento fueron rechazados con un "horrible". El rubro aporta qué contenido va, no la forma.
- Cuando duda, elige la opción con más movimiento. Una opción correcta pero quieta la lee como "insulsa".
- Una referencia hecha con Framer Motion se rehace con GSAP o CSS.
