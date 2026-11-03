import next from "eslint-config-next"

const config = [
  { ignores: [".next/**", "node_modules/**", "db/migrations/**", "next-env.d.ts"] },
  ...next,
  {
    rules: {
      // Nada de controles nativos del navegador a la vista ni confirm()/prompt() (CLAUDE.md §2.12).
      "no-restricted-globals": ["error", { name: "confirm", message: "Usá useConfirmar()" }, { name: "prompt", message: "Usá un diálogo propio" }],
      "no-restricted-properties": ["error", { object: "window", property: "confirm", message: "Usá useConfirmar()" }, { object: "window", property: "prompt", message: "Usá un diálogo propio" }],
      "no-restricted-imports": ["error", { paths: [{ name: "framer-motion", message: "El movimiento es GSAP y CSS" }, { name: "motion", message: "El movimiento es GSAP y CSS" }, { name: "xlsx", message: "Tiene vulnerabilidades conocidas" }] }],
    },
  },
]

export default config
