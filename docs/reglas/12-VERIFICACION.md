# 12 — Verificación: cuándo algo está hecho

**Nada está hecho hasta que se miró.** Un comentario en el código que explica por qué algo es correcto no es evidencia de que se vea bien.

## 1. Antes de decir "hecho"

1. **El diff contra la lista de archivos** de la tarea: nada de más, nada de menos.
2. **`typecheck`, `lint` y `test`** en verde, con la salida real. Si alguno no se corrió, se dice.
3. **Mirar la pantalla corriendo** a **375, 1440 y 1920** de ancho:
   - recargando parado en la pantalla (nada asoma antes de tiempo en el primer cuadro);
   - scrolleando a ritmo de lectura, subiendo y bajando;
   - abriendo y cerrando cada diálogo, menú y panel;
   - con cada estado: cargando, vacío, con datos, con error.
4. **Sin scroll horizontal** en ningún ancho.
5. **Consola sin errores.**
6. **Con `prefers-reduced-motion`**: la información sigue llegando.
7. **El contraste** de cada par nuevo, en cada tema, con el método de `03` §3.
8. **La fluidez** de cada animación nueva que cambia tamaño o posición, cuadro por cuadro (`08` §5).
9. **El teclado**: se puede llegar a todo, el foco se ve, Enter avanza en los formularios, Escape cierra.
10. **Romper a propósito** lo que un test nuevo protege, y ver que falle.
11. **Decir qué NO se verificó**: un teléfono real, Safari, un lector de pantalla, un caso que no se pudo reproducir. La lista honesta vale más que un "todo ok".

## 2. Antes de mandar algo a revisar

- **Datos de muestra que muestren cada estado** de la pantalla (`11` §7). Una pantalla vacía no se puede revisar.
- **La entrada animada ya hecha**: una pantalla quieta se lee como sin terminar.
- **Un link de revisión** (el despliegue de prueba del PR) y una tabla corta: `qué hacer · qué tendría que pasar`.
- Si el link lee la base de producción, la migración que el código necesita ya está aplicada.
- Recién con el ok de quien revisa se mergea, y después se mira producción (la pantalla carga, el login responde).

## 3. Herramientas y sus trampas

| Trampa | Qué hacer |
|---|---|
| Un panel de navegador oculto congela `requestAnimationFrame`: GSAP no interpola y una captura muestra un estado intermedio | Medir animaciones en Chromium headless con Playwright |
| Capturas seguidas pueden salir antes del pintado que disparó un script | Esperar un cuadro (o confirmar en el DOM) antes de capturar |
| Con el viewport emulado, `scrollWidth - clientWidth` no detecta el scroll horizontal | Medir el ancho del documento contra el ancho emulado |
| El `:hover` no se puede probar moviendo el puntero en algunos paneles de navegador | Probarlo con Playwright (`page.hover`) |
| Un navegador headless no avanza algunas animaciones | Terminarlas a mano antes de medir colores o posiciones |
| Iniciar sesión en el navegador para probar | Claude no escribe contraseñas en un navegador: una cuenta de prueba creada por un script de seed en una base de prueba, y su sesión cargada por el script |
| Un simulador de teléfono dentro del navegador de escritorio | Puede romper acciones del servidor: probar en un teléfono real o en la emulación de Playwright |

## 4. Medir velocidad

Proporcional al cambio: si el cambio no toca la carga (un hover, el CSS de un componente), una medición alcanza. Una comparación A/B solo si un número rompe una meta y el cambio pudo causarla. Antes de un paso de más de 5 minutos, avisar con el tiempo estimado.

## 5. Después de mergear

- Producción carga (la página de ingreso responde 200; una página protegida sin sesión redirige).
- Lo que cambió en la base está como se esperaba (una lectura de solo lectura).
- La entrada en `docs/WORKLOG.md` y lo decidido en `docs/MEMORY.md`.
