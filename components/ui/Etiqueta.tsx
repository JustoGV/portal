/** La palabra del estado más un punto de color. Nunca solo color (docs/reglas/05 §8). */
export function Etiqueta({ tono = "neutro", children }: { tono?: "ok" | "warn" | "danger" | "neutro"; children: string }) {
  return (
    <span className="ui-etiqueta" data-tono={tono}>
      <span className="ui-etiqueta__punto" aria-hidden="true" />
      {children}
    </span>
  )
}
