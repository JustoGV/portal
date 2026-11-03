# Motion for React (Framer Motion)

Reference for implementing component, gesture, and layout animations with Motion (formerly Framer Motion) in a Next.js 16 / React 19 / TypeScript / Tailwind 4 App Router codebase.

## Current as of July 2026

- **Project name:** Motion (rebranded from Framer Motion in November 2024; Framer Motion is now an independent open-source project — Framer the design tool remains its first sponsor but no longer owns the project).
- **npm package:** `motion` (NOT `framer-motion` — that package name still exists on npm for legacy installs but is no longer where active development happens; new code must use `motion`).
- **Verified version:** `12.42.2` (MIT license, confirmed via npm registry).
- **Import path:** `motion/react` (not the bare `motion` package root — that root export is the vanilla JS API).
- **Install:**
  ```bash
  npm install motion
  ```
- **Peer dependencies:** `react` and `react-dom` at `^18.0.0 || ^19.0.0` — React 19 is fully supported.
- **License/pricing:** Core library is MIT, free, no attribution required. A paid "Motion+" tier exists (premium examples, extra APIs, private Discord) — irrelevant for standard implementation work, do not suggest it unless the user asks for advanced timeline/cursor tooling.
- If you find `framer-motion` in an existing `package.json`, treat it as a straight swap: uninstall `framer-motion`, install `motion`, change every `from "framer-motion"` to `from "motion/react"`. No API rewrite needed for a v10/v11 → v12 upgrade — Motion 12 shipped with no breaking changes over 11.

## Mental model

Motion is the default choice for anything that animates in response to **component state, props, or direct user gesture** — enter/exit, hover, tap, drag, shared-element transitions, list reordering. It is declarative: you describe target states (`animate`, `variants`, `whileHover`) and let Motion figure out the transition, rather than imperatively sequencing frames.

Two animation engines coexist under one API: a hybrid engine that runs transform/opacity/filter animations off the React render thread using the WAAPI-backed "hardware accelerated" path (fast, cheap, but limited to a subset of CSS properties), and a JS-driven engine for everything else (color, layout, complex easing). You rarely choose explicitly — Motion picks per-property. This is *why* you can `animate` a dozen boxes without frame drops but shouldn't be surprised if animating `boxShadow` costs more than animating `opacity`.

The other core idea: **MotionValues bypass React's render cycle**. `useMotionValue`/`useTransform`/`useSpring` chains mutate the DOM directly on the animation frame — no re-render, no reconciliation. Reach for these whenever an animation is driven by high-frequency input (scroll, drag, pointer position) instead of `useState`, or you will visibly janky-up the interaction and trigger unnecessary re-renders throughout the subtree.

Treat `motion.div` (and friends) as the escape hatch for "this DOM node has behavior," not as a default replacement for `div`. Overusing `motion.*` on static content bloats bundles and signals AI-generated code (see Pitfalls).

## API essentials

### Motion components

Any HTML/SVG tag prefixed with `motion.` becomes animatable: `motion.div`, `motion.button`, `motion.svg`, `motion.path`, etc. Custom components need to forward Motion's ref to accept style/animation props — via `React.forwardRef` (React 18) or by taking `ref` as a plain prop (React 19's new ref-as-prop convention) — and should be wrapped with `motion.create(MyComponent)`. Don't call `motion.create()` inside a render function; it creates a new component every render and breaks the animation.

```tsx
"use client"
import { motion } from "motion/react"

<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
```

Every file using `motion.*`, hooks, or `AnimatePresence` needs `"use client"` — these all rely on `useLayoutEffect`/refs/browser APIs and cannot run as React Server Components.

### Core animation props

| Prop | Purpose |
|---|---|
| `initial` | Starting state. Object, variant label, or `false` to skip mount animation (critical for SSR — see gotchas). |
| `animate` | Target state. Object, variant label, or array of variant labels. |
| `exit` | Target state on unmount — only fires inside `AnimatePresence`. |
| `variants` | Named state map, propagates to children automatically. |
| `transition` | Timing/easing config — see transitions below. |
| `style` | Accepts MotionValues directly (`style={{ x: motionValueX }}`) in addition to normal CSS. |
| `whileHover` / `whileTap` / `whileFocus` / `whileDrag` / `whileInView` | Gesture-scoped target states. |
| `viewport` | Config for `whileInView`: `{ once, root, margin, amount }`. |
| `layout` / `layoutId` | Layout animation opt-in — see layout section. |

### Transitions and springs

Three transition `type`s: `"tween"` (duration + easing, default `0.3`s, `0.8`s for multi-keyframe), `"spring"` (physics or duration based), `"inertia"` (velocity-based deceleration, used for drag momentum).

Spring is the default for physical properties (x, y, scale, rotate); tween is default for visual properties (opacity, color, backgroundColor). Don't override this without reason — it's tuned to feel right.

**Spring options:**

| Option | Default | Meaning |
|---|---|---|
| `bounce` | `0.25` | 0 = no overshoot, 1 = extremely bouncy. Duration-based spring. |
| `visualDuration` | — | Time (s) by which the animation should *look* finished; bounce may continue after. Preferred over `duration` for designer-friendly tuning. |
| `damping` | `10` | Opposing force. `0` = infinite oscillation. |
| `stiffness` | `100` | Spring tension; higher = snappier. |
| `mass` | `1` | Higher = more lethargic. |
| `restSpeed` / `restDelta` | `0.1` / `0.01` | Thresholds for considering the spring "at rest". |

```tsx
<motion.div
  animate={{ rotateX: 90 }}
  transition={{ type: "spring", visualDuration: 0.5, bounce: 0.25 }}
/>
```

Use `visualDuration + bounce` for designer-specified motion ("this should feel done in ~400ms with a touch of bounce"). Use `stiffness/damping/mass` only when you need physically precise, velocity-continuous motion (e.g., matching a drag release).

### Variants and orchestration

```tsx
const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { delayChildren: stagger(0.1) },
  },
}
const item = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
}

<motion.ul initial="hidden" animate="visible" variants={container}>
  {items.map((it) => (
    <motion.li key={it.id} variants={item} />
  ))}
</motion.ul>
```

- Variants propagate down through `motion` components automatically — children with matching variant keys pick up the parent's `animate`/`initial` state without needing their own `animate` prop, just `variants`.
- `stagger(duration, options?)` (import from `motion/react`) is the **current** API for staggering — pass it to `delayChildren` (or `staggerChildren` position) inside `transition`.
  - `from`: `"first"` (default) | `"center"` | `"last"` | numeric index.
  - `ease`: easing to redistribute stagger timing, default `"linear"`.
  - `startDelay`: initial offset before the first stagger delay.
- **`staggerChildren` and `staggerDirection` as bare numeric transition props are deprecated** (since v12.22.0, July 2025) in favor of `delayChildren: stagger(...)`. If you see `transition: { staggerChildren: 0.1 }` in an existing codebase it still runs, but write new code with `stagger()`.
- `when: "beforeChildren" | "afterChildren"` sequences parent-vs-children animation order.
- `custom` prop passes dynamic data into variant functions: `variants={{ visible: (i) => ({ opacity: 1, transition: { delay: i * 0.1 } }) }}`.

### Gestures

```tsx
<motion.button
  whileHover={{ scale: 1.04 }}
  whileTap={{ scale: 0.96 }}
  transition={{ type: "spring", visualDuration: 0.2, bounce: 0.3 }}
/>
```

Recognized gestures: hover, tap, pan, drag, focus, inView. `whileTap` is keyboard-accessible (fires on Enter) for free — do not reimplement.

**Drag:**

```tsx
const constraintsRef = useRef<HTMLDivElement>(null)

<motion.div ref={constraintsRef} className="relative h-64">
  <motion.div
    drag
    dragConstraints={constraintsRef}   // or explicit {top,left,right,bottom}
    dragElastic={0.15}                  // 0 = hard stop, 1 = full elastic (default is 0.35)
    dragMomentum={true}                 // inertia on release, default true
    dragSnapToOrigin={false}
    onDragEnd={(_, info) => console.log(info.offset, info.velocity)}
  />
</motion.div>
```

- `dragConstraints`: pixel object `{top,left,right,bottom}` or a `ref` to a bounding container.
- `dragElastic`: 0–1, resistance beyond constraints (default `0.35`; `true` also resolves to `0.35`, `false`/`0` is a hard stop, `1` is full unconstrained movement).
- `dragTransition={{ bounceStiffness, bounceDamping }}` tunes the release/momentum physics.
- `dragDirectionLock` locks to whichever axis moves first — use for horizontal card carousels that live inside vertical scroll.
- `useDragControls()` for starting a drag from an external "handle" element instead of the whole node.

### AnimatePresence and exit animations

```tsx
<AnimatePresence mode="wait">
  {isOpen && (
    <motion.div
      key="panel"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
    />
  )}
</AnimatePresence>
```

- Direct children need a stable, unique `key` — use IDs, never array index, or exit/enter tracking breaks.
- `mode`:
  - `"sync"` (default) — enter/exit happen simultaneously.
  - `"wait"` — waits for the exiting child to finish before mounting the entering one (good for single-item transitions like tab panels).
  - `"popLayout"` — removes exiting element from layout flow immediately so siblings reflow around it while it animates out; pairs with `layout` prop for reordering lists/grids. Custom components under `popLayout` must use `forwardRef`.
- `initial={false}` on `AnimatePresence` (or on the child) skips the mount animation for content already present on first render — required to avoid animating in content that should just "be there" (e.g., after client hydration of server-rendered state).
- `onExitComplete` fires once all exiting nodes finish — use for cleanup, not for triggering the next state change synchronously.
- **AnimatePresence must wrap the conditional**, not sit inside it. Put it around the `{isOpen && <motion.div exit .../>}` expression, never inside a component that itself unmounts.

### Layout animations and layoutId

```tsx
// Auto layout animation on size/position change
<motion.div layout className="rounded-xl p-4" />

// Shared element transition between two different DOM nodes
<AnimatePresence>
  {activeTab === tab.id && (
    <motion.div layoutId="active-tab-underline" className="absolute inset-0" />
  )}
</AnimatePresence>
```

- `layout` (bool) animates both size and position on any re-render that changes layout (Flexbox/Grid reflow, content change, etc.). `layout="position"` skips size animation — use for elements whose aspect ratio must not distort (images, icons).
- `layoutId` is the shared-element primitive: give two different elements (even in different components) the same `layoutId` and Motion morphs one into the other's position/size when swapped — the classic "active tab indicator slides" or "card expands into modal" effect. Always pair with `AnimatePresence` if the outgoing element unmounts.
- `LayoutGroup` synchronizes layout measurement across sibling components that don't re-render together (e.g., independent accordion items affecting a shared list height).
- **Gotchas:**
  - Layout animation uses `transform: scale()` under the hood — nested text/children can visually distort unless they also have `layout` (Motion auto-corrects `borderRadius`/`boxShadow` scale distortion, but only when those are set via `style`/`animate`, not via a Tailwind class/CSS file).
  - Elements need `display` other than `inline` — transforms don't apply to inline boxes.
  - SVG elements don't support `layout` — animate attributes directly instead.
  - Fixed-position elements need `layoutRoot` to account for page scroll correctly.
  - Scrollbar appearance/disappearance triggers layout recalculation — set `scrollbar-gutter: stable` in CSS to avoid a jump.

### MotionValues — animate without re-renders

```tsx
"use client"
import { motion, useMotionValue, useTransform, useSpring, useScroll, useVelocity } from "motion/react"

function Parallax() {
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 500], [0, 150])
  const smoothY = useSpring(y, { stiffness: 100, damping: 30 })
  return <motion.div style={{ y: smoothY }} />
}
```

| Hook | Use for |
|---|---|
| `useMotionValue(initial)` | Manual value you `.set()`/`.get()` outside React state — e.g. cursor position tracked in a `pointermove` handler. |
| `useTransform(value, input, output)` | Derive one MotionValue from another via range mapping (also accepts a function form for custom math). |
| `useSpring(source, config?)` | Wrap any value/MotionValue in spring smoothing — great for "lag behind cursor" effects. |
| `useVelocity(value)` | Live velocity of a MotionValue as its own MotionValue — feed into rotation/skew for a "flick" feel. |
| `useScroll(options?)` | Returns `{ scrollX, scrollY, scrollXProgress, scrollYProgress }`. Options: `target` (ref to track instead of viewport), `container` (custom scroll container ref), `offset` (intersection points, e.g. `["start end", "end start"]`), `axis`. |

Golden rule: if a value changes on every animation frame (scroll, drag, pointer), it belongs in a MotionValue, not `useState`. `style={{ x: motionValue }}` writes straight to the DOM.

### useAnimate and the animate() mini API

```tsx
"use client"
import { useEffect } from "react"
import { useAnimate, stagger } from "motion/react"

function List() {
  const [scope, animate] = useAnimate()

  useEffect(() => {
    animate("li", { opacity: 1, y: 0 }, { delay: stagger(0.05) })
  }, [animate])

  return (
    <ul ref={scope}>
      {items.map((i) => <li key={i.id} style={{ opacity: 0 }}>{i.label}</li>)}
    </ul>
  )
}
```

- `useAnimate()` returns `[scope, animate]`. `scope` is a ref you attach to a container; every selector passed to `animate()` (e.g. `"li"`, `".card"`) is scoped to that container's descendants only — never queries the whole document.
- `animate()` accepts `(target, keyframes, options)` for a single animation, or a sequence array for choreography:
  ```tsx
  animate([
    ["ul", { opacity: 1 }, { duration: 0.3 }],
    ["li", { opacity: 1, x: 0 }, { at: "<", delay: stagger(0.05) }],
  ])
  ```
- Time positioning in sequences via `at`: absolute seconds, `"<"` (start with previous segment), `"+0.2"` (0.2s after previous ends), `"<0.2"` (0.2s after previous starts).
- Animations started with `useAnimate` clean up automatically on unmount — no manual cancellation needed for the common case.
- Combine with `useInView` for scroll-triggered imperative sequences, and `usePresence` when you need manual control over exit timing instead of `AnimatePresence`'s declarative `exit` prop.

### MotionConfig

```tsx
<MotionConfig transition={{ duration: 0.4, ease: "easeOut" }} reducedMotion="user">
  <App />
</MotionConfig>
```

- `transition`: default transition applied to all descendant `motion` components that don't specify their own.
- `reducedMotion`: `"user"` (respect OS-level `prefers-reduced-motion`, recommended default for production), `"always"` (force reduced, useful for testing/demos), `"never"` (ignore the preference — avoid this; it's an accessibility regression).
  - When reduced motion is active, transform/layout animations are disabled; opacity/color animations still play — so a well-built page degrades gracefully rather than going fully static.
- `nonce`: pass your CSP nonce so Motion's injected `<style>` blocks don't get blocked.
- Wrap this once near the app root (e.g. in a client layout wrapper), not per-page.

### LazyMotion + m — bundle trimming

Full `motion` import can't be tree-shaken below ~34kb gzipped. For marketing sites where most of the page is simple fades/slides, trim to just under ~4.6kb:

```tsx
"use client"
import { LazyMotion, domAnimation } from "motion/react"
import * as m from "motion/react-m"

export function Section({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <m.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
        {children}
      </m.div>
    </LazyMotion>
  )
}
```

- `m.*` components are the stripped-down primitives (no animations wired in until `LazyMotion` injects features) — same JSX API as `motion.*`, swap the import.
- `domAnimation` (+15kb): variants, exit animations, hover/tap/focus gestures, `whileInView` — covers the large majority of marketing-site needs.
- `domMax` (+25kb): adds pan/drag and layout animations on top of `domAnimation`.
- Load `features` synchronously (bundled, shown above) for above-the-fold content, or lazily via `features={() => import("./features").then(m => m.default)}` for below-the-fold sections that can defer.
- `strict` prop on `LazyMotion` throws if a full `motion.*` component sneaks in anywhere inside — use it to prevent someone silently re-inflating the bundle.
- Default to `motion.*` + full import for app/dashboard UI where DX and bundle budget matter less. Reach for `LazyMotion`/`m` specifically on public marketing pages judged on Lighthouse/INP.

## Integration gotchas (Next.js App Router / React 19)

- **`"use client"` is mandatory** on any file importing from `motion/react` — Motion relies on refs, effects, and browser APIs incompatible with Server Components. Keep the client boundary as low in the tree as possible (wrap just the animated section, not the whole page) to preserve RSC benefits.
- **Hydration mismatch on `initial`:** if a component's `animate` state depends on data only known client-side (e.g., `localStorage`, media query), don't drive `initial` from that data directly on first render — you'll get a flash or hydration warning. Compute it in a `useEffect` and default `initial={false}` for the SSR pass, or gate rendering until mounted.
- **`AnimatePresence` + SSR:** since exit animations require the previous DOM node to still exist, and SSR only ever renders the "current" state, there's nothing to animate out on the initial load — this is expected, not a bug. Don't chase it.
- **React 19 / StrictMode double-invoke:** effects mount→unmount→mount in dev StrictMode. `useAnimate`'s cleanup is automatic and StrictMode-safe; if you hand-roll `animate()` calls in a raw `useEffect`, return a cleanup that calls `.stop()` on the returned controls, or you'll get stacked/duplicate animations in dev (harmless in prod but confusing to debug).
- **Emotion's `@emotion/is-prop-valid`** is an optional peer dep Motion uses to avoid leaking custom props onto DOM nodes for styled-components/emotion setups. Irrelevant for a Tailwind-only stack — ignore the peer warning if it appears.
- **Next.js dynamic import for below-the-fold heavy motion:** for `domMax`-tier features (drag, complex layout) used only in an interactive widget far down the page, `next/dynamic` with `ssr: false` combined with `LazyMotion`'s async `features` loader compounds the savings — don't pay for drag physics on a page that only scrolls past it.
- **Tailwind 4 + `layout` prop:** Tailwind's `transition-*` utility classes on the same element as `layout`/`animate` will fight Motion's inline styles. Never mix a Tailwind `transition` class with a `motion.*` element that also animates that same property — pick one system per element.

## Pitfalls

- **`motion.div` on everything.** Wrapping every static container in `motion.div` with no actual animation on it is the single biggest AI-generated-code tell. Only reach for a motion component when something on it actually animates.
- **Every element fades up on scroll, identically.** `whileInView={{ opacity: 1, y: 0 }}` copy-pasted onto every section with the same duration/easing/distance reads as templated, not designed. Vary timing, distance, and which property leads (sometimes it's a scale, sometimes a clip, sometimes nothing at all — stillness is a choice too).
- **Springs with default config everywhere.** Every hover using the untouched default spring produces uniform, mushy motion. Senior work tunes `visualDuration`/`bounce` per interaction — a button tap should feel snappier (short `visualDuration`, low bounce) than a card lifting on hover.
- **Ignoring `prefers-reduced-motion`.** Shipping without `MotionConfig reducedMotion="user"` (or manual `useReducedMotion()` checks) is an accessibility gap that also tends to be the first thing an Awwwards-style review flags.
- **Layout thrash from unscoped `layout` prop.** Slapping `layout` on a deeply nested tree of unrelated elements forces Motion to measure far more of the DOM than necessary, causing jank on rerender-heavy pages (search results, live-updating lists). Scope `layout` to only the elements whose position/size actually needs to animate.
- **Using `useState` + inline style for scroll/drag-driven values.** This re-renders the whole subtree every animation frame. Any value fed by `pointermove`, `scroll`, or `requestAnimationFrame` belongs in a MotionValue.
- **Forgetting `key` stability in `AnimatePresence` lists.** Using array index as `key` causes React to reuse DOM nodes across reordering, breaking exit animations silently (the wrong item appears to "exit").
- **Mixing CSS `transition`/`animation` with Motion on the same property of the same element.** They fight for control of the computed style; the result is visually inconsistent between the first paint and subsequent renders.
- **Chaining unrelated `whileHover` transforms without a shared origin.** Rotating and scaling simultaneously from default `transformOrigin` on an off-center element produces visibly "swimming" motion. Set `style={{ transformOrigin: "..." }}` deliberately when combining transforms.
- **Full `motion` bundle on content-heavy marketing pages with dozens of simple fades.** Default to `LazyMotion`/`m` there; reserve the full `motion` import for app shells and dashboards where the DX tradeoff is worth it.

## Division of labor: Motion vs GSAP

In a codebase that uses both (common on Awwwards-tier Next.js builds):

- **Motion for React** owns anything tied to **component lifecycle, gesture, or layout state**: enter/exit transitions, hover/tap/drag micro-interactions, shared-element (`layoutId`) transitions, list reordering, form field states, modal/drawer open-close, variant-driven orchestration scoped to a component tree. It's declarative and React-idiomatic — use it wherever the animation is a direct function of props/state.
- **GSAP (+ ScrollTrigger)** owns **complex timeline choreography and scroll-driven narrative**: pinned sections, scrubbed multi-stage scroll sequences, cross-component/cross-DOM-tree timelines, canvas/WebGL-adjacent animation, anything requiring frame-accurate sequencing across elements that don't share a natural React component boundary. GSAP's timeline model and `ScrollTrigger`'s pinning/scrub primitives have no equivalent depth in Motion's `useScroll`.
- **Don't animate the same element's same property with both.** Pick one system per element to avoid fighting for transform/style control. It's fine (and common) for a page to have Motion driving a nav bar's hover states while GSAP drives a pinned hero scroll sequence one section down — just don't let both touch the same node.
- Default assumption when scoping new work: if it's inside a single component and reacts to state/props/gesture, reach for Motion first. If it's a full-viewport scroll-orchestrated sequence spanning multiple sections, reach for GSAP ScrollTrigger first. Escalate to GSAP only when Motion's `useScroll`/`whileInView` genuinely can't express the choreography — don't reach for GSAP by default out of habit.
