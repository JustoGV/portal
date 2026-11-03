# 09 — Rendimiento

*"Lo más veloz posible."* Con números, medidos donde corre de verdad.

## 1. Metas y cómo se miden

| Métrica | Meta (p75) | Bloquea |
|---|---|---|
| LCP (lo principal aparece) | ≤ 2,5 s | Sí |
| INP (respuesta a un click o una tecla) | ≤ 200 ms | Sí |
| CLS (cosas que saltan) | ≤ 0,1 | Sí, en todas las pantallas |

- **Se mide en el despliegue de prueba (preview), no en la laptop**, en frío y en caliente, de click a contenido. Las funciones del servidor **corren en la misma región que la base de datos**: en el proyecto anterior corrían en Washington contra una base en San Pablo, cada pantalla hacía 6 a 18 pedidos a la base en serie, y nadie lo midió hasta que el dueño lo notó.
- En laboratorio: build de producción, Chromium con red 4G y CPU 4× más lenta, tres cargas, la mediana. LCP y saltos con `PerformanceObserver`; INP con el peor evento de la interacción principal.
- Una laptop con batería mide varias veces más lento y se desvía: medir enchufado.

## 2. Cómo llegan los datos (nueve reglas)

1. **El guard corre una vez por pedido**: `sesion()` envuelta en `cache()` de React. Leer la sesión cuatro veces por pantalla fue un costo real.
2. **El marco nunca espera datos**: el layout dibuja la barra y el esqueleto sin `await`; lo que depende del usuario va en su propio `<Suspense>` con un esqueleto de la misma altura.
3. **Primero el guard, después todo en paralelo**: la página verifica el permiso, arranca todas las lecturas sin esperarlas y le pasa cada promesa a un bloque en su propio `<Suspense>`. Ningún bloque espera a otro salvo que lo necesite.
4. **Ningún dato inicial desde el cliente**: el primer dato de un bloque viene del servidor como prop. Nada de leer en un `useEffect` al montar (eso es un segundo render y un segundo viaje).
5. **Los filtros viven en la URL** (`searchParams`).
6. **Las escrituras son Server Actions con `useActionState`**; `useOptimistic` solo para lo rápido, reversible y sin plata.
7. **Después de escribir, el bloque se vuelve a leer a sí mismo** (la acción devuelve las filas nuevas). `router.refresh()` de toda la ruta solo cuando cambió lo que dibuja el servidor para toda la ruta.
8. **Los refrescos automáticos comparan antes de actualizar**: un hook `usePoll(leer, { cadaMs, alEnfocar })` guarda un hash de la última respuesta y solo actualiza si cambió; no corre con la pestaña oculta; refresca al volver a la pestaña. Un refresco que falla deja los números y lo dice en una línea.
9. **Si se cachea algo**, se cachean copias de lectura con nombre propio para mostrar; **las acciones nunca leen de la caché** (en serverless, otra instancia puede tener un valor viejo, y eso nunca puede calcular plata ni stock).

## 3. Base de datos

- Consultas acotadas y con índice (`07` §6). `EXPLAIN` de cada consulta nueva.
- Nada de N+1: una consulta con `join` o `in (...)`, nunca una por fila.
- El driver HTTP de Neon **no soporta transacciones interactivas** (`db.transaction()` lanza un error): se usa `db.batch([...])`, que manda todo junto y atómico.
- En el `sql` de Drizzle, un arreglo interpolado se convierte en una lista de parámetros, no en un parámetro arreglo; y la misma expresión escrita dos veces son dos parámetros distintos para Postgres (un `group by` con la misma expresión que el `select` falla). Pasar el arreglo como uno solo y nombrar la expresión una vez.

## 4. Lo que se descarga

- **Las librerías pesadas se cargan al hacer click** con `await import()`: PDF (jsPDF), Excel, Markdown, 3D, captura de pantalla. Ninguna en la carga de una pantalla.
- `next/dynamic` para componentes pesados que arrancan cerrados (la búsqueda rápida, un gráfico que solo está en una pantalla, una ayuda larga).
- **Textos por módulo**: un archivo de idioma por módulo, sin un índice que los reúna (eso los mete todos en cada pantalla).
- **CSS por módulo**: una hoja global con lo común y los componentes, y una hoja por módulo que solo cargan sus rutas.
- Lo que solo calcula (por ejemplo `decimal.js`) no entra en el paquete de las pantallas que solo muestran: formatear no necesita la librería de cálculo.
- **La fuente se precarga** (`<link rel="preload" as="font">`) con la URL que emite el build.
- Un presupuesto de JS por ruta (gzip), medido siempre con el mismo Node: después de cada unidad, ninguna ruta lo supera.

## 5. Lo que se dibuja

- **Una lista larga dibuja 50 filas y 50 más al scrollear.** Abrir un `<dialog>` modal recalcula el estilo de toda la página: su costo es la cantidad de elementos de la página.
- **Un tablero no lleva un componente completo por tarjeta**: un menú con siete opciones en cada una de 200 tarjetas dio 15.000 nodos y 7 s de LCP. Un menú compartido que se abre sobre la tarjeta.
- **Los formularios pesados se montan mientras no se usa nada** (como transición de baja prioridad) y se reinician al cerrar; nunca se montan con el click (`05` §4).
- `memo` con callbacks estables en lo que se repite (filas, tarjetas).
- **Cifras tabulares** en todo número que se refresca, y un ancho mínimo en `ch` para las grandes: un 9 → 10 proporcional mueve a sus vecinos.
- **Una barra de herramientas que se parte en dos líneas con la fuente de respaldo** y vuelve a una cuando llega la fuente web mueve la página: reservar el ancho o ajustar el respaldo.
- Un reloj que cambia cada segundo escribe `textContent` desde un efecto, nunca re-renderiza su componente.

## 6. Límites de la plataforma

- Las Server Actions de una página corren **una detrás de otra**: no guardar en cada tecla.
- Una función de Vercel rechaza cuerpos de más de **4,5 MB**: un archivo grande se sube directo al almacenamiento con una URL firmada, y el servidor lo verifica después.
- La base gratuita se duerme: su despertar se cubre con la carga con mensaje.

## 7. Observabilidad

- **Sentry, solo errores**: sin Session Replay, sin trazas (`tracesSampleRate: 0`), `sendDefaultPii: false`, y un `beforeSend` que saca cuerpos de pedidos, cookies, headers y datos de navegación, y reemplaza números de 7 u 8 dígitos por `[dni]`.
- Speed Insights de Vercel como única señal de campo (las metas de §1 son de laboratorio).
