# 01 — Forma de trabajo compartida

Lo mínimo para que dos personas trabajen sobre el mismo repo sin pisarse ni perder lo decidido. El método completo de Mateo (aprobaciones, formato de reportes, ciclo de sesión) está en `docs/trabajo/MATEO.md` y aplica solo cuando él lo pide.

## 1. Ningún dato inventado

- Un dato que el cliente o el proyecto todavía no dio (precio, dirección, teléfono, nombre de una persona, matrícula, horario, texto legal, porcentaje) **nunca se completa con un valor "típico"**.
- En la pantalla va `{{CONFIRMAR}}`. En `docs/MEMORY.md` va un `OQ-NN` con la pregunta y quién la responde.
- Se avisa en una línea y se sigue con todo lo que no depende de eso.
- Si el código y la documentación se contradicen, se dice antes de tocar nada.

## 2. Lo decidido no se vuelve a decidir

- `docs/MEMORY.md` es la memoria del proyecto. Antes de proponer algo, buscar si ya se decidió.
- Cambiar una decisión es un `D-` nuevo con "reemplaza D-0NN" y el motivo. No se borra la vieja.
- Una "mejor idea" que aparece en medio de otra tarea va como nota en `docs/MEMORY.md`, no como código.

## 3. El registro

Dos archivos, en `docs/`. Sobreviven a que se cierre el chat, a que se compacte el contexto y a que trabaje la otra persona.

### `docs/WORKLOG.md`

- **§1 ESTADO** — se sobrescribe completo: tarea actual, estado real, último chat con fecha, qué espera de cada socio, qué espera de terceros, próxima acción, qué no se toca.
- **§2 REGISTRO** — solo se agrega, nunca se borra. Una entrada por sesión o tarea:

```markdown
### AAAA-MM-DD · <tarea> · <quién>
- **Pedido:** lo que se pidió, con sus palabras.
- **Hecho:** qué se construyó.
- **Archivos:** cada archivo creado o cambiado, y qué se le hizo.
- **Verificado:** cómo se comprobó, con resultados reales. Lo que no se comprobó dice "sin verificar".
- **Resuelto en el camino:** errores encontrados y su causa real.
- **Sigue:** el próximo paso.
```

### `docs/MEMORY.md`

Series numeradas que siguen desde el número más alto:

- `D-NNN` **decisión**: qué se decidió, por qué, qué se descartó, cuándo se reabriría.
- `G-NNN` **trampa**: algo que rompió, con la causa de fondo, no el síntoma.
- `TD-NNN` **deuda técnica** asumida a propósito, y en qué unidad se paga.
- `OQ-NNN` **pregunta abierta**, y quién la responde.

**Cuándo se escribe:** al terminar una tarea que cambió algo, y al cerrar una sesión aunque la tarea haya quedado a medias. Una sesión que termina sin registro perdió su memoria.

## 4. Lo que se pidió, como se pidió

- El pedido literal de la persona es el requisito. Un plan, un criterio propio o una recomendación no lo reemplaza ni lo recorta.
- Si choca con una regla de estas, se pregunta. No se decide en silencio en ninguna de las dos direcciones.
- Lo que la persona nombró como ejemplo de un problema se arregla en la primera entrega que toca esa pantalla, no "en una ronda posterior".

## 5. Corregir solo lo señalado

- Cuando alguien dice "esto no es lo que pedí", identificar **qué elemento** lo vuelve otra cosa y cambiar solo eso. Lo que no nombró queda aprobado.
- Rehacer todo por una corrección puntual baja la calidad: se pierde lo que ya estaba bien.
- Si la misma corrección vuelve dos veces, estás tocando otra cosa. Preguntá qué está mirando y en qué momento (por ejemplo, la animación de entrada al cargar o la del cambio de estado).

## 6. Tiempo proporcional

- Antes de un paso de más de 5 minutos (una compilación de producción, una medición larga, una tanda de capturas), avisarlo en una línea con el tiempo estimado.
- Lo que se recorta es el desperdicio (compilaciones evitables, scripts rotos, rondas demasiado anchas), nunca la verificación.

## 7. Textos para gente real

- En una pantalla, nombrar una herramienta que el usuario final no conoce es un defecto aunque funcione. Si un paso se puede hacer con la cámara (un QR) en vez de copiar texto, ese es el camino por defecto.
- Cero jerga técnica en la interfaz. Los mensajes dicen qué hacer, no qué falló por dentro.

## 8. Lo que no se toca sin decirlo

- La marca del cliente: colores, logo y tipografía. Se rediseña el cómo (organización, componentes, íconos, movimiento), nunca la identidad.
- La lógica y el significado de cada texto que el cliente ya aprobó.
- Producción: toda escritura en la base de producción (migración, datos, borrado) necesita el ok explícito del dueño en ese momento.
