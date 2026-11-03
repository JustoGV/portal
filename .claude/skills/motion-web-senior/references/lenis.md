# Lenis Smooth Scroll
Reference for implementing Lenis-driven smooth scroll in Next.js 16 / React 19 / TypeScript / Tailwind 4 App Router projects, including the canonical GSAP ScrollTrigger sync.

## Current as of July 2026

| | |
|---|---|
| Package | `lenis` on npm — maintained by **darkroom.engineering** |
| Version | `1.3.25` (verified via `registry.npmjs.org/lenis/latest`) |
| Install | `npm i lenis` (also `yarn add lenis` / `pnpm add lenis`) |
| React integration | **Not a separate package.** Ships as the `lenis/react` subpath export inside the `lenis` package itself (`./dist/lenis-react.mjs`) |
| Snap plugin | `lenis/snap` subpath export, for CSS-scroll-snap-like behavior |
| Vue/Nuxt | `lenis/vue`, `lenis/nuxt` subpath exports |
| License | MIT, free, no paid tier |
| Bundle size | Documented as under 4kb (core) |
| Peer deps | `react >=17` optional, `vue >=3` optional — not required unless you import the framework subpaths |

**Deprecated — do not use:** `@studio-freight/lenis` and `@studio-freight/react-lenis`. That scope is the old pre-darkroom.engineering naming; all current development happens under the unified `lenis` package. If you see either of those in a lockfile or a tutorial, treat it as stale.

**Adjacent fact relevant to the GSAP section below:** since Webflow's April 2025 move, GSAP core plus every formerly-paid Club GreenSock plugin (ScrollTrigger, SplitText, MorphSVG, DrawSVG, ScrollSmoother, Inertia) is 100% free, including commercial use. No license gate applies to anything in the sync pattern below.

## Mental model

Lenis is not a physics engine and not a virtual-scroll replacement — it is a **scroll input interpolator that sits on top of native scroll**. It intercepts wheel/touch delta, applies lerp smoothing to a target value, and then drives the real `window.scrollTo` / element `scrollTop` every frame. This is the entire reason it's the current default over older approaches (`locomotive-scroll` v3-style `transform: translateY` virtual scroll, `scroll-hijacking` libraries): `position: sticky`, native anchor jumps, browser find-in-page, and screen-reader/keyboard scroll all keep working against a real scroll position, because Lenis never detaches scroll from the document.

Because the scroll position stays real, Lenis and GSAP ScrollTrigger read the *same* value — the only integration work is making sure they update on the *same* render loop (one `requestAnimationFrame` tick driving both), not two independent loops racing each other. Skipping that step is the #1 source of jitter under pinning.

Treat Lenis as an aesthetic choice, not a default. It adds real interaction cost (input lag by design, since lerp always trails the raw input) and real accessibility risk (see Pitfalls). Reach for it on editorial/portfolio/luxury-brand sites where the "weighty" scroll feel is part of the brand; leave it off content-dense apps, docs, dashboards, and anything where fast, literal scroll response matters more than mood.

## API essentials

### Constructor options that actually matter

| Option | Default | Notes |
|---|---|---|
| `lerp` | `0.1` | Interpolation intensity, 0–1. Higher = snappier/less smoothed, lower = heavier drag. This is the main "feel" dial. Takes priority over `duration`/`easing` if set. |
| `duration` + `easing` | `1.2` / ease-out-ish fn | Alternative to `lerp` — duration-based instead of velocity-based smoothing. Use one system, not both; `lerp` is ignored if `duration` is explicitly the driver you're tuning. |
| `wheelMultiplier` | `1` | Scales mouse-wheel delta. Bump slightly (1.0–1.2) on sites with tall sections so wheel scroll doesn't feel sluggish relative to the smoothing. |
| `smoothWheel` | `true` | Whether wheel input gets smoothed at all. |
| `syncTouch` | `false` | Applies the same smoothing model to touch. **Leave this false in almost every real project** — see Pitfalls. |
| `touchMultiplier` | `1` | Scales touch delta (only relevant when `syncTouch: true`). |
| `orientation` / `gestureOrientation` | `'vertical'` | Set both to `'horizontal'` for horizontal scroll sections; `gestureOrientation: 'both'` lets vertical wheel drive horizontal scroll. |
| `wrapper` / `content` | `window` / `document.documentElement` | Only set when smooth-scrolling a specific container instead of the whole page (rare in a standard Next.js layout). |
| `anchors` | `false` | `true` makes Lenis intercept in-page `#hash` links and smooth-scroll to them automatically. |
| `prevent` | `undefined` | `(node) => boolean` — programmatic alternative to `data-lenis-prevent`. |
| `infinite` | `false` | Infinite/looping scroll; needs `syncTouch: true` to work on touch devices (one of the few legitimate reasons to enable it). |
| `autoRaf` | `false` (vanilla) / **`true`** (`ReactLenis` default) | Whether Lenis runs its own rAF loop. Must be `false` when another loop (GSAP ticker) drives `.raf()` — see sync pattern. |

Full option list (`allowNestedScroll`, `autoResize`, `autoToggle`, `eventsTarget`, `naiveDimensions`, `overscroll`, `stopInertiaOnNavigate`, `syncTouchLerp`, `touchInertiaExponent`, `virtualScroll`) exists for edge cases — check the GitHub README before reaching for them; the table above is what real implementations actually touch.

### Instance methods

| Method | Use |
|---|---|
| `lenis.raf(time)` | Advance one frame. Required every frame if `autoRaf` is off. |
| `lenis.scrollTo(target, options)` | Animate to a number, selector string, or `HTMLElement`. |
| `lenis.on('scroll', cb)` / `.off(...)` | Subscribe/unsubscribe to scroll updates — this is the GSAP sync hook. |
| `lenis.stop()` / `lenis.start()` | Pause/resume — use for modals, drawers, lightboxes. |
| `lenis.resize()` | Manual recalculation if `autoResize: false`. |
| `lenis.destroy()` | Full teardown — call in cleanup, always. |

`scrollTo` options: `offset`, `lerp`, `duration`, `easing`, `immediate` (skip animation entirely — this is what you want for route-change resets), `lock`, `force`, `onComplete`, `userData`.

Useful read-only properties: `lenis.progress` (0–1), `lenis.isScrolling` (`'smooth' | 'native' | false`), `lenis.velocity`, `lenis.direction` (`1 | -1 | 0`, `0` before any scroll has occurred), `lenis.isStopped`.

### Nested scrollables

```html
<div data-lenis-prevent>native-scrolling content inside the smooth page</div>
```
Variants: `data-lenis-prevent-wheel`, `data-lenis-prevent-touch`, `data-lenis-prevent-vertical`, `data-lenis-prevent-horizontal`. Put this on any modal body, dropdown menu, code block, or `overflow-auto` panel nested inside a Lenis-managed page — otherwise the background page scrolls through it.

## Patterns

### 1. Root provider — Next.js App Router

`app/layout.tsx` is a Server Component by default. Never import `lenis/react` there directly — wrap it in a small client component.

```tsx
// app/providers/smooth-scroll-provider.tsx
'use client'

import { ReactLenis } from 'lenis/react'
import type { ReactNode } from 'react'

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  return (
    <ReactLenis
      root
      options={{
        lerp: 0.1,
        wheelMultiplier: 1,
        syncTouch: false,
      }}
    >
      {children}
    </ReactLenis>
  )
}
```

```tsx
// app/layout.tsx (Server Component — unchanged shape)
import { SmoothScrollProvider } from './providers/smooth-scroll-provider'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
      </body>
    </html>
  )
}
```

`root` (boolean, or `'asChild'`) controls scope:
- `root={true}` — no wrapper `<div>`s are rendered, Lenis smooths the real document scroll, and the instance is pushed into a **module-level store** (`rootLenisContextStore`), so `useLenis()` works from *any* client component in the tree, even ones not nested under the provider. This is the correct choice for a whole-page layout.
- `root={false}` (default) or `'asChild'` — Lenis renders its own `wrapper`/`content` `<div>` pair and smooth-scrolls that container only. Use this for an isolated smooth-scroll panel inside an otherwise normal-scrolling page.

Import the stylesheet once, alongside the provider or in the root layout's global CSS entry:
```tsx
import 'lenis/dist/lenis.css'
```

### 2. `useLenis` — read the instance / scroll callback

```tsx
'use client'

import { useLenis } from 'lenis/react'

export function ScrollProgressBar() {
  const lenis = useLenis(({ progress }) => {
    document.documentElement.style.setProperty('--scroll-progress', String(progress))
  })

  return null
}
```

Signature: `useLenis(callback?, deps: unknown[] = [], priority = 0)`. Without a callback it just returns the instance (or `undefined` before mount) for imperative calls like `lenis.scrollTo(...)`.

### 3. Canonical GSAP ScrollTrigger sync

The non-negotiable rule: **one raf loop drives both**. Disable Lenis's own `autoRaf`, feed `lenis.raf()` from `gsap.ticker`, and feed `ScrollTrigger.update` from Lenis's scroll event.

Vanilla / non-React module:
```ts
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const lenis = new Lenis({ autoRaf: false })

lenis.on('scroll', ScrollTrigger.update)

gsap.ticker.add((time) => {
  lenis.raf(time * 1000) // gsap.ticker time is in seconds, Lenis expects ms
})

gsap.ticker.lagSmoothing(0) // don't let GSAP "catch up" after a tab goes idle — fights Lenis's own smoothing
```

React/App Router equivalent — a headless client component mounted once inside the root provider:
```tsx
// app/providers/gsap-lenis-sync.tsx
'use client'

import { useLenis } from 'lenis/react'
import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function GsapLenisSync() {
  const lenis = useLenis(ScrollTrigger.update) // lenis.on('scroll', ScrollTrigger.update) equivalent

  useEffect(() => {
    if (!lenis) return

    function update(time: number) {
      lenis.raf(time * 1000)
    }

    gsap.ticker.add(update)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(update)
    }
  }, [lenis])

  return null
}
```

```tsx
// smooth-scroll-provider.tsx
export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  return (
    <ReactLenis root options={{ autoRaf: false }}>
      <GsapLenisSync />
      {children}
    </ReactLenis>
  )
}
```
`options={{ autoRaf: false }}` is required here — `ReactLenis` defaults `autoRaf` to `true` (unlike the vanilla `Lenis` class, which defaults to `false`), so it silently runs its own loop unless you override it. Forgetting this is the single most common cause of double-updating jitter under ScrollTrigger pinning.

### 4. `scrollTo` and anchor links

```tsx
'use client'
import { useLenis } from 'lenis/react'

export function JumpToSection() {
  const lenis = useLenis()

  return (
    <button onClick={() => lenis?.scrollTo('#pricing', { offset: -80, duration: 1.5 })}>
      See pricing
    </button>
  )
}
```
For plain `<a href="#pricing">` links to smooth-scroll automatically without JS handlers, set `anchors: true` in the provider's `options` — Lenis intercepts hash navigation itself. `offset` respects the target's `scroll-margin-top`/`scroll-padding-top` (1.3.20+), so section headers with a sticky nav can set `scroll-margin-top` in CSS instead of hardcoding pixel offsets everywhere.

### 5. `stop()` / `start()` for modals and drawers

```tsx
'use client'
import { useLenis } from 'lenis/react'
import { useEffect } from 'react'

export function Modal({ open, children }: { open: boolean; children: React.ReactNode }) {
  const lenis = useLenis()

  useEffect(() => {
    if (!lenis) return
    if (open) lenis.stop()
    else lenis.start()
    return () => lenis.start() // never leave scroll locked on unmount
  }, [open, lenis])

  if (!open) return null
  return <div data-lenis-prevent>{children}</div>
}
```
`stop()` pauses Lenis's interpolation loop, which (combined with the fact that Lenis wraps native scroll) effectively locks background scroll. Still add `data-lenis-prevent` on the modal's own internal scroll container in case it has independently scrollable content.

### 6. Route-change scroll reset (App Router)

Next.js's own navigation scroll-restoration jumps the *native* scroll position instantly, but Lenis's internal `animatedScroll` state doesn't know that happened — the next frame can visibly "catch up" from wherever it thought it was. Force-sync it on every pathname change:

```tsx
// app/providers/route-scroll-reset.tsx
'use client'

import { usePathname } from 'next/navigation'
import { useLenis } from 'lenis/react'
import { useEffect } from 'react'

export function RouteScrollReset() {
  const pathname = usePathname()
  const lenis = useLenis()

  useEffect(() => {
    lenis?.scrollTo(0, { immediate: true })
  }, [pathname, lenis])

  return null
}
```
Mount this once inside the root `ReactLenis` provider, next to `GsapLenisSync`. `immediate: true` is the key option — it skips the animation and hard-syncs Lenis's internal scroll value instead of smoothly re-scrolling to the top on every navigation.

### 7. `prefers-reduced-motion`

Server and first client render must agree, so don't branch on `matchMedia` during render (hydration mismatch). Start enabled, flip after mount:

```tsx
// app/providers/smooth-scroll-provider.tsx
'use client'

import { ReactLenis } from 'lenis/react'
import { useEffect, useState, type ReactNode } from 'react'

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const [smoothEnabled, setSmoothEnabled] = useState(true) // matches SSR output

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setSmoothEnabled(!mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  if (!smoothEnabled) return <>{children}</>

  return (
    <ReactLenis root options={{ lerp: 0.1, syncTouch: false }}>
      {children}
    </ReactLenis>
  )
}
```
There is no dedicated `respectReducedMotion` constructor flag — you gate it yourself, either by not mounting `ReactLenis` at all (shown above, cleanest) or by passing `duration: 0` / near-`1` `lerp` values. Not mounting is preferable: it fully restores native scroll behavior (including native `scroll-behavior: smooth` CSS if you use it) rather than leaving a disabled-but-present instance around.

## Integration gotchas (SSR / hydration / React 19 / cleanup)

- **Client-only import boundary.** `lenis/react` must only be imported from files marked `'use client'`. Importing it into `app/layout.tsx` directly (a Server Component) will fail the build — always wrap in a dedicated client provider component as shown above.
- **The Lenis instance is created inside `useEffect`, not during render** — there's no SSR mismatch for the instance itself. But don't read `lenis.scroll`/`lenis.progress` during render (e.g., to compute a class name) — only inside effects, event callbacks, or `useLenis`'s scroll callback.
- **`options` is diffed with `JSON.stringify`, not by reference.** `ReactLenis`'s setup effect depends on `JSON.stringify({ ...options, wrapper: null, content: null })`. Passing a fresh inline `options={{...}}` object every render is safe — it won't cause pointless instance recreation. But it also means **functions inside `options`** (`easing`, `prevent`, `virtualScroll`) are silently dropped by `JSON.stringify` and won't trigger a remount if their *identity* changes — only their presence/absence does something. If a `prevent` or `easing` function needs to read fresh reactive state, capture that state in a `ref` inside the function body rather than expecting the effect to re-run.
- **StrictMode is safe by design.** The setup effect's cleanup calls `lenis.destroy()`, so React 18/19 StrictMode's dev-mode double-invoke (mount → cleanup → mount) produces one throwaway instance and one live one — expected, not a bug. Don't "fix" it by adding manual guards.
- **React 19 compatibility.** The package still uses `forwardRef` internally (not the React 19 ref-as-prop pattern) — this remains fully supported/back-compatible in React 19, no deprecation warnings triggered by that alone.
- **`root: true` uses a module-level store, not just React context.** `useLenis()` works from any client component anywhere in the bundle once a `root` instance exists — including components that aren't descendants of the provider in the JSX tree. Convenient, but means there's implicit global state; don't mount two `root` providers in the same tree (last one wins, silently).
- **`autoRaf` defaults differ between the vanilla class and the React wrapper.** Vanilla `new Lenis()` → `autoRaf: false`. `<ReactLenis>` → `autoRaf: true`. Always set it explicitly in `options` when you have any external ticker (GSAP) in play — don't rely on memory of "the default."

## Pitfalls

The mistakes that make a build look AI-generated or actively break on mobile:

1. **Enabling `syncTouch: true` "for consistency" with desktop.** Touch already has real OS-level momentum scrolling; `syncTouch` intercepts and re-simulates it, which fights the native gesture and reads as laggy, rubber-bandy, and occasionally janky/unstable on iOS < 16. Leave it `false` unless you specifically need `infinite` scroll on touch devices.
2. **Cranking `lerp` down to 0.04–0.06 for a "cinematic" feel.** This is the over-smoothed, sluggish-follow scroll that immediately reads as generic AI-website output. `0.08–0.12` is the realistic range for anything with actual reading content; go lower only for short, deliberately atmospheric landing pages.
3. **Leaving `autoRaf: true` while also driving `lenis.raf()` from `gsap.ticker`.** Two independent rAF loops both mutate scroll state — visible micro-jitter, worse under `ScrollTrigger` pinning. Always set `autoRaf: false` in `options` the moment GSAP enters the picture.
4. **Missing `data-lenis-prevent` on nested scrollables** (modals, dropdown menus, code blocks, `overflow-auto` sidebars). Background page scroll bleeds through the overlay — a very visible bug on mobile.
5. **No `scrollTo(0, { immediate: true })` on App Router navigation.** Without it, route changes leave a stale/animated scroll catch-up that looks broken, especially on SPA-style client transitions.
6. **Ignoring `prefers-reduced-motion` entirely.** Beyond the accessibility harm, it's an easy, visible audit flag — and a meaningful share of macOS/iOS users have it set.
7. **Recreating the provider (and thus the Lenis instance) on every route via a changing `key` prop.** Expensive, causes a visible scroll-position snap on every navigation. One root instance for the app's lifetime; reset via `scrollTo`, don't remount.
8. **Expecting smooth scroll to work over iframes/embeds.** It doesn't — documented limitation, native iframe scroll is untouched by the parent's Lenis instance.
9. **Leaving CSS `scroll-behavior: smooth` on `html`/`body` while Lenis is active.** The two smoothing systems fight each other on every anchor jump or `.scrollIntoView()` call. Remove it; let Lenis's own `anchors`/`scrollTo` own that behavior.
10. **Never testing keyboard scroll (Space, Page Down, arrow keys) after tuning `wheelMultiplier`/`lerp`.** Smoothing applies to all input sources, including keyboard-triggered scroll — a heavy `lerp` that feels fine on a trackpad can feel broken to keyboard-only users.

## Accessibility: the honest tradeoffs

Lenis's own positioning ("no CSS transforms, no hijacked scrollbars, no accessibility trade-offs") is true relative to older transform-based smooth-scroll libraries — because it keeps the *actual* document scroll position real, `Tab`, `Ctrl+F`, screen-reader virtual cursor navigation, and `position: sticky` all keep functioning normally, which was not true of `locomotive-scroll`-style virtual scroll.

That said, it is not accessibility-neutral:

- **Vestibular disorders / motion sensitivity.** Any added inertia/lag between input and visual scroll response can trigger discomfort for users sensitive to motion, independent of whether the underlying scroll position is "real." This is exactly what `prefers-reduced-motion: reduce` exists to signal — treat honoring it as a requirement, not a nice-to-have (Pattern 7 above).
- **Perceived responsiveness for keyboard/switch-device users.** Lerp-smoothed scroll adds a fixed delay between a keypress and the visual result. For users relying on keyboard or switch-access navigation, this reads as sluggishness, not polish.
- **WCAG 2.3.3 (Animation from Interactions, AAA).** Scroll-triggered motion counts here; pair Lenis with a reduced-motion escape hatch to stay defensible against this criterion, even if you're not formally targeting AAA.

Net: Lenis is materially safer than its predecessors, but "keeps native scroll intact" is not the same as "has no accessibility considerations." Ship the `prefers-reduced-motion` gate every time.
