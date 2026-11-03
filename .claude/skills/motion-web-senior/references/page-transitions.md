# Page Transitions in Next.js

How to sequence route changes in the App Router without fighting React's mount/unmount lifecycle — native View Transitions, Motion-based fakes, and the router-decoupled curtain pattern, with the trade-offs of each spelled out.

## Current as of July 2026

| Piece | Package | Version | Install | License |
|---|---|---|---|---|
| Framework | `next` | 16.2.x | — | MIT |
| Native transitions | React `ViewTransition` (built into React canary, which App Router pins internally) | ships with Next 16.2 | `experimental.viewTransition: true` in `next.config.ts` | MIT |
| Bridge library | `next-view-transitions` | 0.3.5 (Dec 2025) | `npm i next-view-transitions` | MIT, 2.4k★, actively maintained |
| Animation | `motion` (renamed from `framer-motion`) | 12.42.2 | `npm i motion` | MIT |
| Smooth scroll | `lenis` (renamed from `@studio-freight/lenis` — that scope is dead, don't install it) | 1.3.25 | `npm i lenis` | MIT |
| Timeline/scroll animation | `gsap` (incl. ScrollTrigger, SplitText, MorphSVG, DrawSVG, Flip) | 3.15.0 | `npm i gsap` | 100% free for all use since Webflow acquired GreenSock (Apr 2025) — "Standard no-charge license," no more Club/paid tier |

Do not use `barba.js` with Next.js. Covered below — it's not a style preference, it's architecturally incompatible.

`experimental.viewTransition` is still flagged experimental in the official Next.js docs (last updated 2026-05-13): *"not recommended for production"* is Vercel's own caveat, even though the API is used in production by Vercel's own dashboard and demos. Treat that flag as "stable enough to ship if you test it, not yet an unconditional default."

## Mental model

A senior treats page transitions as three separable problems, and picks tools per-problem instead of one library for everything:

1. **Does the browser/React already do this natively?** The View Transitions API + React's `<ViewTransition>` component now handle shared-element morphs, directional slides, and Suspense-reveal crossfades declaratively, with the browser doing the pixel work off the JS thread. If the target audience is evergreen browsers, this is the 2026 default — less code, better performance, no library to maintain.
2. **Does the transition need to know about page *content*, or just mask the swap?** Shared-element morphs (thumbnail → hero) need content awareness — that's native `ViewTransition` territory. A generic "wipe to black, swap, wipe back" doesn't care what's underneath — that's the curtain pattern, and it's immune to every App Router lifecycle quirk because it never asks React to keep old DOM alive.
3. **Is the team already deep in Motion for everything else?** If so, `AnimatePresence` route transitions are viable, but budget real time for the FrozenRouter workaround and its back-button edge cases. Don't reach for it by default in a fresh project — reach for native transitions first, curtain second, Motion route transitions third.

The failure mode to avoid: copying a Framer Motion route-transition tutorial from 2023 verbatim. The App Router's navigation model has moved twice since then (template.tsx era → FrozenRouter era → native ViewTransition era), and most blog posts are stuck on one of the earlier ones.

## API essentials

### Native View Transitions (Next.js + React)

```ts
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: { viewTransition: true },
}
export default nextConfig
```

No React version pin needed — App Router already runs on React canary, which includes `ViewTransition`.

```tsx
import { ViewTransition } from 'react'
```

| Prop | Purpose |
|---|---|
| `name` | Identity for shared-element matching across old/new trees. Must be globally unique — only one mounted instance at a time. |
| `enter` / `exit` | Animation for insert/remove, triggered by a Transition. `"auto"`, `"none"`, a CSS class name, or an object keyed by transition type (see `transitionTypes` below). |
| `update` | Animation for in-place DOM mutations or position/size changes. |
| `share` | Animation when a named `ViewTransition` matches between the deleted and inserted subtree — takes precedence over enter/exit. |
| `default` | Fallback for any trigger not explicitly set. Set `default="none"` on boundaries that shouldn't react to unrelated transitions elsewhere on the page. |
| `onEnter` / `onExit` / `onUpdate` / `onShare` | Imperative hooks, each should return a cleanup function. |

Hard rule: `<ViewTransition>` must be the outermost element in its component — nest it inside a `<div>` and enter/exit silently stop working.

Triggers: only `startTransition`, `<Suspense>` reveals, and `useDeferredValue` activate a `ViewTransition`. A plain `setState` does nothing. In Next.js, route navigations are already Transitions, so this fires automatically on `<Link>` clicks and `router.push`.

```tsx
// Link / useRouter — tag navigation direction
<Link href={`/photo/${id}`} transitionTypes={['nav-forward']}>…</Link>
router.push(href, { transitionTypes: ['nav-back'] })
```
`transitionTypes` feeds `React.addTransitionType` under the hood; read it in `enter`/`exit` as `{ 'nav-forward': 'slide-left', 'nav-back': 'slide-right', default: 'none' }`.

### next-view-transitions (bridge library)

Wraps `document.startViewTransition` at the router level instead of using React's `ViewTransition` component — no Suspense-integrated shared elements, but a simpler mental model (`Link`/`useTransitionRouter`) if the team isn't ready to hand-roll `enter`/`exit`/`share` props yet.

```tsx
// app/layout.tsx
import { ViewTransitions } from 'next-view-transitions'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransitions>
      <html lang="en"><body>{children}</body></html>
    </ViewTransitions>
  )
}
```
```tsx
import { Link, useTransitionRouter } from 'next-view-transitions'
```
Pick this over the raw flag when: the app targets Next 14/15 (no native flag), or the team wants a stable abstraction while the native API is still marked experimental.

### Motion (`motion/react`)

```tsx
import { motion, AnimatePresence } from 'motion/react'
```
Old `import from 'framer-motion'` still resolves (unmaintained alias) — migrate the import path only, the component/hook API is unchanged.

## Pattern 1 — Native shared-element morph (recommended default)

```tsx
// components/photo-grid.tsx
import { ViewTransition } from 'react'
import Link from 'next/link'
import Image from 'next/image'

export function PhotoGrid({ photos }: { photos: Photo[] }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {photos.map((p) => (
        <Link key={p.id} href={`/photo/${p.id}`}>
          <ViewTransition name={`photo-${p.id}`}>
            <Image src={p.src} alt={p.title} />
          </ViewTransition>
        </Link>
      ))}
    </div>
  )
}
```
```tsx
// app/photo/[id]/photo-content.tsx
import { ViewTransition } from 'react'
import Image from 'next/image'

export async function PhotoContent({ id }: { id: string }) {
  const photo = await getPhoto(id)
  return (
    <ViewTransition name={`photo-${photo.id}`}>
      <Image src={photo.src} alt={photo.title} fill />
    </ViewTransition>
  )
}
```
React matches the two `name="photo-{id}"` boundaries across the navigation and morphs size/position automatically — zero custom CSS required for the base case. To restyle the morph, add `share="morph"` and target `::view-transition-group(.morph)` / `::view-transition-image-pair(.morph)` in global CSS.

### Directional navigation + anchoring a fixed header

```tsx
<ViewTransition
  enter={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' }}
  exit={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' }}
  default="none"
>
  {children}
</ViewTransition>
```
```css
::view-transition-old(.nav-forward) { animation: 150ms ease-in both fade reverse, 400ms ease-in-out both slide reverse; }
::view-transition-new(.nav-forward) { animation: 210ms ease-out 150ms both fade, 400ms ease-in-out both slide; }
```
Give persistent chrome (header/nav) its own `viewTransitionName` and neutralize it so it doesn't slide with the content:
```tsx
<header style={{ viewTransitionName: 'site-header' }}>…</header>
```
```css
::view-transition-group(site-header) { animation: none; z-index: 100; }
::view-transition-old(site-header) { display: none; }
```
Browser back/forward (as opposed to `<Link>` clicks) carries no `transitionTypes` — directional slides won't fire on those, only shared-element morphs will (if `name` still matches).

### Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(*), ::view-transition-new(*), ::view-transition-group(*) {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
  }
}
```
Without browser support, the whole thing degrades to an instant swap — no polyfill, no fallback code needed. This is real progressive enhancement, not a library promise.

## Pattern 2 — Motion `AnimatePresence` route transitions: why exit animations are hard

The App Router doesn't wait for anything to unmount gracefully. On navigation it updates the layout tree eagerly, which yanks the old page's DOM out from under `AnimatePresence` before its exit animation can play. `template.tsx` alone doesn't fix this — it gives every route its own fresh component instance (useful for *entrance* re-triggering), but Next still unmounts the outgoing template before an exit animation completes.

The documented workaround is **FrozenRouter**: snapshot the layout router context and hold it stable inside `AnimatePresence` for the duration of the exit animation, so the outgoing tree keeps rendering its old content instead of jump-cutting to the new route's data.

```tsx
// app/template.tsx
'use client'
import { AnimatePresence, motion } from 'motion/react'
import { useSelectedLayoutSegment } from 'next/navigation'
import { useContext, useRef } from 'react'
import { LayoutRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime'

function FrozenRouter({ children }: { children: React.ReactNode }) {
  const context = useContext(LayoutRouterContext)
  const frozen = useRef(context).current
  return (
    <LayoutRouterContext.Provider value={frozen}>
      {children}
    </LayoutRouterContext.Provider>
  )
}

export default function Template({ children }: { children: React.ReactNode }) {
  const segment = useSelectedLayoutSegment()
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={segment}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25 }}
      >
        <FrozenRouter>{children}</FrozenRouter>
      </motion.div>
    </AnimatePresence>
  )
}
```
Known costs of this trick, confirmed as still-open issues, not solved problems:
- Reaches into `next/dist/shared/lib/...` — an internal, undocumented path that can break on any Next.js minor bump.
- Browser back/forward and scroll restoration interact badly with a frozen context — test both directions explicitly, not just forward navigation.
- It's real engineering effort to keep working across Next upgrades. Don't adopt it for a "nice to have" fade — reserve it for a small number of *deliberately choreographed* transitions.

Given native `ViewTransition` now ships in Next 16.2 and doesn't require touching router internals, prefer Pattern 1 for anything this trick would otherwise be used for. Reach for FrozenRouter only when the team already has a large Motion-based transition system and isn't ready to migrate.

## Pattern 3 — Curtain/wipe overlay (the pragmatic senior choice)

Decouple the animation from React's mount/unmount lifecycle entirely: animate an opaque (or branded) overlay to cover the viewport, navigate underneath it, then animate the overlay away. The overlay never needs to know what either page looks like, so it is immune to every App Router lifecycle quirk above.

```tsx
// components/route-transition-overlay.tsx
'use client'
import { createContext, useContext, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'

const TransitionCtx = createContext<(href: string) => void>(() => {})
export const useTransitionNavigate = () => useContext(TransitionCtx)

export function RouteTransitionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [covering, setCovering] = useState(false)
  const pendingHref = useRef<string | null>(null)

  const navigate = useCallback((href: string) => {
    pendingHref.current = href
    setCovering(true) // triggers the "cover in" animation
  }, [])

  return (
    <TransitionCtx.Provider value={navigate}>
      {children}
      <AnimatePresence
        onExitComplete={() => {
          // overlay finished animating OUT — nothing left to do
        }}
      >
        {covering && (
          <motion.div
            className="fixed inset-0 z-[999] bg-black pointer-events-auto"
            initial={{ scaleY: 0, transformOrigin: 'bottom' }}
            animate={{ scaleY: 1 }}
            exit={{ scaleY: 0, transformOrigin: 'top' }}
            transition={{ duration: 0.45, ease: [0.76, 0, 0.24, 1] }}
            onAnimationComplete={(latest) => {
              // onAnimationComplete fires for BOTH the "cover in" (animate) and
              // "cover out" (exit) steps here, since this uses target-value objects
              // rather than named variants — Motion passes the resolved values
              // (e.g. { scaleY: 1 }), never the string 'animate'/'exit'. Check the
              // resolved value, not identity, to tell the two completions apart.
              if (latest.scaleY === 1 && pendingHref.current) {
                router.push(pendingHref.current)
                pendingHref.current = null
                // small delay lets the new route paint before the wipe reveals it
                requestAnimationFrame(() => setCovering(false))
              }
            }}
          />
        )}
      </AnimatePresence>
    </TransitionCtx.Provider>
  )
}
```
Usage — replace `<Link>` clicks with the context navigate function for animated routes, or intercept clicks on a custom `<TransitionLink>`:
```tsx
'use client'
import { useTransitionNavigate } from '@/components/route-transition-overlay'

export function TransitionLink({ href, children }: { href: string; children: React.ReactNode }) {
  const navigate = useTransitionNavigate()
  return (
    <a href={href} onClick={(e) => { e.preventDefault(); navigate(href) }}>
      {children}
    </a>
  )
}
```
Why this is the pragmatic default for anything beyond a shared-element morph: it never fights `AnimatePresence` against the router, works identically whether the target route is prefetched or not, needs no internal Next.js imports, and survives Next major version bumps because it doesn't touch router internals. The trade-off is real: the curtain can't show content-aware continuity (no thumbnail-morphs-into-hero) because the new page is hidden, not composited with the old one — that's exactly the job native `ViewTransition` (Pattern 1) is built for. Many production builds combine both: native `ViewTransition` for the handful of shared-element moments that earn it, curtain for everything else.

Timing note: don't gate the "cover out" step on a hardcoded `setTimeout`. Tie it to something that reflects actual readiness — `router.push` resolving inside a transition, a `startTransition` pending flag, or `useLinkStatus` (below) — so the wipe never reveals a half-loaded page on a slow connection or feels artificially sluggish on a fast one.

## Pattern 4 — Shared elements: `layoutId` vs native `name`

Motion's `layoutId` produces shared-element continuity for components that stay within the same React tree (tab indicators, reordering a list, a modal expanding from a card) — it relies on both instances being reconciled in the same render pass. Across an App Router navigation, the old route's tree is gone before the new one mounts, so `layoutId` alone does not morph across routes the way it does within a page; at best it crossfades. For cross-route shared elements, native `ViewTransition`'s `name` prop (Pattern 1) is architecturally correct because the browser snapshots old and new painted pixels independently of whether React kept anything mounted. Don't reach for `layoutId` to solve a cross-route morph in 2026 — that problem has a better native answer now.

## Barba.js — do not use with Next.js

State it plainly: Barba owns the DOM and implements its own client-side router (`@barba/router`), which directly conflicts with the App Router's own navigation system — two routers fighting over the same clicks and history entries. It also breaks on the server: `@barba/core` calls `DOMParser`, which doesn't exist during Next.js SSR/RSC rendering, so any attempt to initialize it outside a fully client-only escape hatch throws. If a tutorial suggests Barba for a Next.js project, it predates the App Router or is porting a static-site pattern that doesn't transfer. Use Pattern 1 or Pattern 3 instead.

## Loading choreography and prefetching

`<Link>` prefetches automatically once in the viewport (full route payload in production). Two tools for signaling that a click hasn't resolved yet:

```tsx
// useLinkStatus — must be a descendant of the Link it reports on
'use client'
import { useLinkStatus } from 'next/link'

function PendingHint() {
  const { pending } = useLinkStatus()
  return <span aria-hidden className={pending ? 'link-hint is-pending' : 'link-hint'} />
}
```
`pending` is only meaningful when the target wasn't already prefetched (`prefetch={false}`, or the user clicked before prefetch finished) — on an already-prefetched route it usually resolves too fast to show. Debounce the indicator (opacity 0, ~100ms animation-delay) so it never flashes on fast navigations — an indicator that flickers on every click reads as unfinished, not premium.

`loading.tsx` and a custom transition can race each other — a `Suspense` fallback from `loading.tsx` and a `ViewTransition` exit/enter pair are both legitimate ways to represent "waiting," and running both without coordination doubles up motion. Pick one per route: either let `loading.tsx` own the in-between state, or drive it through `ViewTransition`'s Suspense-reveal pattern (`exit="slide-down"` on the fallback, `enter="slide-up"` on the resolved content) — not both simultaneously.

## Scroll restoration with Lenis in the mix

Lenis intercepts native scroll and smooths it, which conflicts with Next's own scroll-to-top-on-navigate behavior — left uncoordinated, you get a visible fight between Next snapping to `(0,0)` and Lenis smoothing toward wherever it last was.

```tsx
'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useLenis } from 'lenis/react'

export function ScrollToTopOnNavigate() {
  const lenis = useLenis()
  const pathname = usePathname()

  useEffect(() => {
    lenis?.scrollTo(0, { immediate: true })
  }, [pathname, lenis])

  return null
}
```
Pair this with `router.push(href, { scroll: false })` (or the equivalent on `<Link>`) so Next doesn't also fire its own native scroll jump — let Lenis be the single source of truth for scroll position during a transition. If a page transition is running (curtain or `ViewTransition`), call `lenis.stop()` when the cover animation starts and `lenis.start()` after the new route has settled, so a background scroll-jump doesn't leak through underneath the animation.

## Integration gotchas

- **Uniqueness violations under parallel routes.** If a layout momentarily mounts two subtrees with the same `ViewTransition name` (common with parallel routes/intercepting routes), React warns and the morph breaks. Namespace names with the actual entity id, not a generic string like `"hero"`.
- **StrictMode double-invoke.** Lenis and GSAP both need explicit teardown — `lenis.destroy()` and `gsap.context().revert()` — inside the `useEffect` cleanup function, or React 19's StrictMode double-mount in dev will leave two competing scroll listeners/timelines running.
- **Server Components can't hold the hooks these patterns need.** `usePathname`, `useLenis`, `useTransitionNavigate`, and `ViewTransition`'s own dynamic props usually end up inside a `'use client'` wrapper placed as high as possible in `layout.tsx`/`template.tsx` — that's expected, not a smell, since the router-level primitives here are inherently client-side.
- **`ViewTransition` requires a Transition to fire.** A raw `useState` toggle inside a client component will not trigger `enter`/`exit`/`update` — wrap the state change in `startTransition`, or rely on the fact that Next.js navigations are already Transitions.

## Pitfalls

1. **Nesting `<ViewTransition>` inside a wrapper `<div>`.** It has to be the outermost element in the component or enter/exit silently no-op — no error, just nothing happens.
2. **Every transition sliding the same direction regardless of navigation history.** Reads as generic/AI-templated immediately. Tag `transitionTypes` deliberately (`nav-forward` vs `nav-back`) instead of one blanket slide.
3. **Forgetting `default="none"`** on `ViewTransition` boundaries that shouldn't react to unrelated transitions elsewhere on the page — without it, every navigation animates every boundary at once, producing visual noise instead of one clear focal motion.
4. **Shipping FrozenRouter without testing the browser back button.** It's the first thing that breaks; verify forward and back navigation before calling the pattern done.
5. **Gating a curtain's reveal on a hardcoded `setTimeout`.** Tie it to actual navigation readiness (pending state, `useLinkStatus`, or the `router.push` transition), not a guessed duration — a fixed timer is either janky on slow connections or needlessly slow on fast ones.
6. **Ignoring `prefers-reduced-motion`.** Non-negotiable for directional slides in particular — they're the pattern most likely to trigger motion sensitivity.
7. **Double scroll-jump from Next's default restoration fighting Lenis.** Pick one owner (usually Lenis) and disable the other (`scroll: false`) rather than letting both act.
8. **Reaching for Barba.js from a tutorial.** Burns a day discovering the SSR `DOMParser` crash before finding out it was never viable for App Router in the first place.
9. **Assuming Motion's `layoutId` morphs across routes.** It only reconciles within a single render tree; across a real App Router navigation it crossfades at best. Use native `ViewTransition` `name` for cross-route morphs.
10. **A curtain overlay without `pointer-events` control during the transition window.** Users can click through to the still-animating page underneath and fire a second navigation mid-transition if the overlay isn't intercepting input for its full duration.
11. **Comparing `onAnimationComplete`'s argument against a string like `'animate'` or `'exit'`.** That only works with named variants. With plain target-value objects (as in Pattern 3), Motion passes the resolved values object on every completion — enter and exit alike — so the comparison silently never matches and the callback body never runs. Check a resolved property value instead (e.g. `latest.scaleY === 1`), or switch to variants if you want the label string.
