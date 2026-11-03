# Next.js 16 + React 19 Integration

How to wire GSAP, Motion, and Lenis into a Next.js 16 App Router + React 19 + TypeScript + Tailwind 4 codebase without hydration bugs, StrictMode double-fires, or memory leaks across client-side navigations.

## Current as of July 2026

| Package | npm name | Version | Install | License |
|---|---|---|---|---|
| Next.js | `next` | 16.2.10 | `npm install next@latest react@latest react-dom@latest` | MIT |
| React | `react`, `react-dom` | 19.2.7 | bundled with above | MIT |
| GSAP core | `gsap` | 3.15.0 | `npm install gsap` | Free ("Standard no-charge license," gsap.com/standard-license) — Webflow acquired GreenSock in 2024 and made **all** plugins free, including SplitText, MorphSVGPlugin, DrawSVGPlugin, etc. No more Club GSAP paywall. |
| GSAP + React glue | `@gsap/react` | 2.1.2 | `npm install @gsap/react` | Free; peers `gsap ^3.12.5`, `react >=17` |
| Motion (ex Framer Motion) | `motion` | 12.42.2 | `npm install motion` | MIT; peers `react ^18 \|\| ^19` (optional) |
| Smooth scroll | `lenis` | 1.3.25 | `npm install lenis` | MIT |
| Utility CSS | `tailwindcss` | 4.3.2 | `npm install tailwindcss @tailwindcss/postcss` | MIT |

**Renames that matter — do not use the old names in new code:**
- `framer-motion` → package is now **`motion`**, import from **`motion/react`**. The old package still resolves but is unmaintained.
- `@studio-freight/lenis` / `@studio-freight/react-lenis` → package is now **`lenis`**, with the React bindings at the subpath **`lenis/react`** (exports `ReactLenis`, `useLenis`). The `@studio-freight/*` scope is dead.

**Next.js 16 platform baseline:** Node.js 20.9+ required (18 dropped), TypeScript 5.1+, Turbopack is the default bundler for dev and build, and the App Router runs on a React 19.2 canary that includes View Transitions, `useEffectEvent`, and `<Activity>`. `params`, `searchParams`, `cookies()`, `headers()`, `draftMode()` are all `async` now — every Server Component reading them needs `await`.

## Mental model

Treat the DOM as belonging to two owners that must never fight over the same element: React owns structure and content (mount/unmount, text, conditional rendering); GSAP/Motion/Lenis own *transform, opacity, and scroll position* on already-mounted nodes. Server Components fetch data and render the static shell; a thin `"use client"` leaf receives that data as props and owns nothing but refs and animation calls. Never let a component be responsible for both fetching data and running `gsap.to()` — you'll end up making the whole subtree client-side for no reason, which is the single most common way an AI-assisted build ends up shipping way more JS than it needed to.

React 19 removes ceremony (no `forwardRef`, refs can have cleanup functions) but it does not remove the two hazards that break naive animation code: StrictMode double-invoking effects in dev, and "use client" components still rendering once on the server for SSR. Every pattern below exists to survive both.

Lenis and native CSS smooth scrolling are mutually exclusive — Next.js 16 removed the framework's automatic `scroll-behavior: smooth` (you now opt in via `data-scroll-behavior="smooth"` on `<html>`). If you're running Lenis, never add that attribute; the two smoothing systems will visibly fight.

## API essentials

### `@gsap/react` — `useGSAP`

| Signature | Notes |
|---|---|
| `useGSAP(callback, deps?)` | Drop-in replacement for `useLayoutEffect`; uses `useIsomorphicLayoutEffect` internally (falls back to `useEffect` when `window` is undefined), so it's SSR-safe by default. |
| `useGSAP(callback, { scope, dependencies, revertOnUpdate })` | `scope`: a ref or selector root — GSAP selector text (`".hero-word"`) inside the callback resolves only within this DOM subtree. |
| Auto cleanup | Everything created by GSAP inside the callback (tweens, timelines, ScrollTriggers, SplitText instances, Draggables) is captured by an internal `gsap.context()` and `.revert()`-ed on unmount **and** on every StrictMode dev double-invoke. You do not call `.kill()` yourself for scoped animations. |
| Manual context | `const { contextSafe } = useGSAP(() => {}, { scope })` → wrap event handlers created outside the effect (e.g. `onClick`) with `contextSafe()` so animations they trigger are still cleaned up by the same context. |
| Registration | Call `gsap.registerPlugin(useGSAP)` once (module scope of a client file) so other GSAP APIs recognize animations created via the hook. |

### `motion/react`

| Import | Use |
|---|---|
| `import { motion } from "motion/react"` | Full component API — every HTML/SVG tag as `motion.div`, `motion.svg`, etc. Heaviest bundle. |
| `import { LazyMotion, domAnimation, m } from "motion/react"` | Tree-shaken path: wrap a subtree in `<LazyMotion features={domAnimation}>` and use `m.div` instead of `motion.div`. `domAnimation` covers animate/hover/tap/exit; `domMax` adds drag + layout animations at extra weight — only pull it in where you actually drag or do shared-layout transitions. |
| `useReducedMotion()` | SSR-safe reduced-motion hook — prefer this over reading `matchMedia` yourself at render time (see hydration section). |
| `animate()` (standalone) | Imperative escape hatch (`import { animate } from "motion"`) — returns `AnimationPlaybackControls` with `.stop()`; call `.stop()` in your effect's cleanup, same discipline as GSAP tweens without `useGSAP`. |

### `lenis/react`

| Export | Signature | Notes |
|---|---|---|
| `<ReactLenis>` | `<ReactLenis root options={...} ref={lenisRef}>{children}</ReactLenis>` | `root` makes the instance globally reachable via `useLenis` anywhere below `<html>`, not just inside this subtree. Mount once, near the root layout. |
| `useLenis` | `useLenis((lenis) => { ... })` | Callback fires on every scroll frame, receiving the Lenis instance (read `lenis.scroll`, `lenis.velocity`, etc.). |
| `options.autoRaf` | `boolean` | Set `false` when driving Lenis from GSAP's ticker instead of its own `requestAnimationFrame` loop (needed for ScrollTrigger sync — see pattern below). |

## Patterns

### 1. Server shell, client leaf — the default boundary

Data fetching and markup stay in a Server Component. Only the element that needs refs/animation APIs is `"use client"`.

```tsx
// app/page.tsx — Server Component, no directive, zero client JS for this file
import { HeroReveal } from "@/components/hero-reveal";
import { getHeroContent } from "@/lib/cms";

export default async function Page() {
  const hero = await getHeroContent(); // fetch happens on the server, never ships to the client
  return (
    <main>
      <HeroReveal title={hero.title} subtitle={hero.subtitle} />
    </main>
  );
}
```

```tsx
// components/hero-reveal.tsx
"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

gsap.registerPlugin(useGSAP);

interface HeroRevealProps {
  title: string;
  subtitle: string;
}

export function HeroReveal({ title, subtitle }: HeroRevealProps) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from(".hero-word", {
        yPercent: 110,
        stagger: 0.06,
        duration: 0.9,
        ease: "power4.out",
      });
    },
    { scope } // selector text above only ever matches inside this subtree
  );

  return (
    <div ref={scope}>
      <h1 className="overflow-hidden">
        <span className="hero-word inline-block">{title}</span>
      </h1>
      <p>{subtitle}</p>
    </div>
  );
}
```

The Client Component only receives primitives as props — no functions, no server-only objects. If a component needs both a large data fetch *and* heavy animation, split it: Server Component fetches → passes plain data down → Client Component renders and animates.

### 2. React 19 ref-as-prop (no `forwardRef`)

```tsx
// React 19: ref is just a prop on function components now.
// forwardRef still works for back-compat but write new components like this.
interface RevealTextProps {
  children: string;
  ref?: React.Ref<HTMLSpanElement>;
}

export function RevealText({ children, ref }: RevealTextProps) {
  return (
    <span ref={ref} className="inline-block">
      {children}
    </span>
  );
}
```

Also new in React 19: ref *callback* functions can return a cleanup function (`ref={(node) => { ...; return () => ... }}`), which is useful for wiring/unwiring one-off `ResizeObserver`/`IntersectionObserver` instances on a single node without a separate `useEffect`.

### 3. StrictMode-safe imperative init — why raw `useEffect` breaks and `useGSAP` doesn't

Next.js runs `reactStrictMode: true` by default in dev, which mounts every component twice (mount → effect → cleanup → mount → effect) purely to surface non-idempotent effects. A naive imperative init has no cleanup, so it silently runs its side effect twice:

```tsx
// BROKEN in dev: SplitText splits already-split spans on the second
// StrictMode pass, ScrollTrigger registers itself twice, ".hero-word"
// spans end up nested and animate incorrectly.
useEffect(() => {
  gsap.from(".hero-word", { yPercent: 110, stagger: 0.06 }); // no cleanup
}, []);
```

`useGSAP` fixes this by scoping every animation it creates to an internal `gsap.context()` and reverting that context on every cleanup — including the synthetic StrictMode one — so the second mount starts from a clean slate:

```tsx
// SAFE: cleanup is automatic. StrictMode's mount→unmount→mount cycle in dev
// reverts and recreates the context; production only mounts once anyway.
useGSAP(() => {
  gsap.from(".hero-word", { yPercent: 110, stagger: 0.06 });
}, { scope });
```

If you must use raw `gsap.context()` yourself (rare — prefer `useGSAP`), the shape is:

```tsx
useEffect(() => {
  const ctx = gsap.context(() => {
    gsap.from(".hero-word", { yPercent: 110, stagger: 0.06 });
  }, scope);
  return () => ctx.revert();
}, []);
```

Motion's declarative components (`<motion.div animate={...}>`) don't have this problem — they're idempotent by construction. The imperative `animate()` escape hatch does, and needs the same `.stop()`-in-cleanup discipline.

### 4. Hydration-safe initial state

The render body of a `"use client"` component still executes once on the server (that's what produces the SSR HTML) and once again on the client during hydration — **those two outputs must match exactly**, or React throws a hydration mismatch and re-renders the whole subtree client-side, which is slower than not SSR-ing it at all.

Safe — deterministic, identical on both passes:

```tsx
// Fine: a static, non-random inline style is the same on server and client.
<div ref={scope} style={{ opacity: 0 }} className="hero">
```

Unsafe — evaluated differently server vs. client:

```tsx
// BROKEN: window is undefined on the server, so this is `false` server-side
// and `true` on the client's first (hydrating) render → mismatch.
const prefersReduced =
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// BROKEN: a fresh random value differs between the server pass and the
// client pass every single time.
const startRotation = Math.random() * 10 - 5;
```

Fix both by deferring to *after* mount, when there is no longer a server render to disagree with:

```tsx
"use client";
import { useState, useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

export function TiltCard() {
  const [ready, setReady] = useState(false); // matches server (false) on first client render
  const scope = useRef<HTMLDivElement>(null);

  useEffect(() => setReady(true), []); // flips post-hydration, triggers one extra render

  useGSAP(
    () => {
      gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
        gsap.to(scope.current, { rotate: gsap.utils.random(-4, 4), duration: 0.6 });
      });
    },
    { scope, dependencies: [ready] }
  );

  return <div ref={scope} className="card" />;
}
```

`gsap.matchMedia()` is itself the right place for any viewport- or preference-conditional setup — call it inside `useGSAP`, never at module or render scope, so it only ever runs client-side. Motion's equivalent is the SSR-safe `useReducedMotion()` hook — prefer it over hand-rolled `matchMedia` reads.

### 5. Dynamic imports for heavy motion code

Content should virtually always be server-rendered; only the *behavior* layer should lazy-load. Split below-the-fold, animation-heavy sections out of the initial bundle:

```tsx
import dynamic from "next/dynamic";

const ScrollytellingSection = dynamic(
  () => import("@/components/scrollytelling-section").then((m) => m.ScrollytellingSection),
  {
    ssr: false, // GSAP/ScrollTrigger need a real viewport to measure — SSR buys nothing here
    loading: () => <div className="h-[300vh] bg-neutral-950" />, // reserve space, avoid CLS
  }
);
```

Don't do this for the hero — it's above the fold and typically LCP-critical, so its markup (and usually its entrance-animation JS) belongs in the initial render. Reserve `ssr: false` dynamic imports for pinned scroll sequences, WebGL canvases, or anything genuinely below the fold.

For Motion, prefer the `LazyMotion` + `m` pattern (see API essentials) over dynamically importing `motion/react` itself — it's a finer-grained way to shed weight without an extra network waterfall.

### 6. Root-level Lenis + ScrollTrigger, with route-change cleanup

Mount Lenis once near the root layout, drive it from GSAP's ticker (not its own RAF loop) so scroll position and ScrollTrigger stay in lockstep, and kill stale ScrollTriggers on every App Router navigation — client-side navigations don't reload the page, so anything you don't explicitly tear down accumulates for the life of the tab.

```tsx
// app/providers/smooth-scroll-provider.tsx
"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { ReactLenis } from "lenis/react";
import type Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<{ lenis?: Lenis }>(null);
  const pathname = usePathname();

  useEffect(() => {
    function update(time: number) {
      lenisRef.current?.lenis?.raf(time * 1000); // GSAP ticker gives seconds, Lenis wants ms
    }
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);
    return () => gsap.ticker.remove(update);
  }, []);

  useEffect(() => {
    const lenis = lenisRef.current?.lenis;
    lenis?.on("scroll", ScrollTrigger.update);
    return () => {
      lenis?.off("scroll", ScrollTrigger.update);
    };
  }, []);

  // Every route change: recompute trigger positions against the new DOM,
  // then kill triggers the outgoing page owned so they don't stack.
  useEffect(() => {
    const raf = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => {
      cancelAnimationFrame(raf);
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, [pathname]);

  return (
    <ReactLenis root ref={lenisRef} options={{ autoRaf: false }}>
      {children}
    </ReactLenis>
  );
}
```

Mount `<SmoothScrollProvider>` once in `app/layout.tsx` wrapping `{children}`. Do not remount it per-route — Lenis itself should be a singleton for the session; only ScrollTrigger instances are page-scoped and need killing.

If a page-level component (not the provider) creates its own `ScrollTrigger`s or `Observer`s outside `useGSAP`'s auto-managed scope, kill them explicitly in that component's own cleanup — don't rely solely on the pathname-keyed global sweep above, which is a safety net, not a substitute for local cleanup.

### 7. Font and image load coordination

Text-measuring effects (line-based reveals, `SplitText`) must wait for the real webfont metrics, or they measure the fallback font's line breaks and animate the wrong groups of characters once the real font swaps in:

```tsx
"use client";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

export function HeroEntrance({ children }: { children: React.ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      let cancelled = false;

      (async () => {
        await document.fonts.ready; // real glyph metrics, not the fallback font's
        if (cancelled) return;

        gsap.set(scope.current, { autoAlpha: 1 }); // release the FOUC guard below
        gsap.from(".hero-line", {
          yPercent: 100,
          stagger: 0.08,
          duration: 1,
          ease: "power4.out",
        });
      })();

      return () => {
        cancelled = true;
      };
    },
    { scope }
  );

  return (
    <div ref={scope} style={{ visibility: "hidden" }}>
      {children}
    </div>
  );
}
```

Pair this with `next/font` (`next/font/google` or `next/font/local`) rather than a manual `<link>` — it self-hosts, preloads, and sets `font-display: swap` by default, which shortens the `document.fonts.ready` wait to near-zero on repeat visits and prevents layout shift mid-animation.

For the hero's LCP image, mark it `priority` so it's requested immediately instead of after hydration, and gate any image-dependent entrance on its own load event rather than folding it into the font wait — they resolve on different timelines:

```tsx
<Image src={hero} alt="" priority sizes="100vw" onLoad={() => setImageLoaded(true)} />
```

Any late-resolving layout change — a font swapping in, a below-the-fold image loading and pushing content down — invalidates cached `ScrollTrigger` start/end positions. Call `ScrollTrigger.refresh()` after `document.fonts.ready` resolves and after any above-the-fold image's `onLoad` fires; don't assume ScrollTrigger's own resize listener catches content-driven (non-viewport) layout shifts.

### 8. Measuring after layout, not during render

Anything that reads `getBoundingClientRect()`, `offsetHeight`, or similar must run after the browser has painted layout, never inline in the component body (there's no DOM yet during SSR, and during hydration you'd read stale/incorrect values). `useGSAP` already uses a layout-effect internally, so measurements taken inside it are correctly timed:

```tsx
useGSAP(() => {
  const height = scope.current?.getBoundingClientRect().height ?? 0; // safe: post-layout, pre-paint
  gsap.set(scope.current, { "--panel-height": `${height}px` });
}, { scope });
```

Never call a raw `useLayoutEffect` directly inside a component that's part of SSR output — React logs "useLayoutEffect does nothing on the server" because there's no synchronous paint phase server-side to hook into. This warning is exactly why `useGSAP` (and Motion internally) use an *isomorphic* layout effect: `useLayoutEffect` on the client, no-op on the server, with zero warning either way.

### 9. Tailwind 4 `@theme` tokens as animation targets

Tailwind 4 is CSS-first: design tokens declared in `@theme` become real CSS custom properties, so GSAP/Motion can read and — critically — **write** them directly, and any utility class built on that token updates live.

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  --color-ink: oklch(0.18 0.02 260);
  --color-accent: oklch(0.72 0.19 25);
  --ease-signature: cubic-bezier(0.16, 1, 0.3, 1);
  --duration-hero: 1.1s;
}
```

```tsx
"use client";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

export function ProgressRing() {
  const ring = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // GSAP tweens a custom property directly — no CSSPlugin config needed,
      // it auto-detects the unitless numeric value.
      gsap.to(ring.current, { "--progress": 1, duration: 1.4, ease: "power2.out" });
    },
    { scope: ring }
  );

  return (
    <div
      ref={ring}
      style={{ "--progress": 0 } as React.CSSProperties}
      className="size-24 rounded-full [background:conic-gradient(var(--color-accent)_calc(var(--progress)*360deg),var(--color-ink)_0)]"
    />
  );
}
```

This keeps the value of truth in one place: the token is defined once in `@theme`, consumed by Tailwind utilities, and mutated by GSAP — never hardcode the same color/easing/duration as a magic literal inside a `.to()` call when a token already exists for it.

## Integration gotchas

- **"use client" still means "renders on the server once."** It opts a subtree into client-side interactivity and hydration; it does not exempt the component from producing SSR HTML. Any code path that behaves differently based on `typeof window` inside the render body (not inside an effect) is a hydration-mismatch risk.
- **`useLayoutEffect` warning is a symptom, not the bug.** If you see it, you're calling the hook directly instead of through `useGSAP`/Motion's isomorphic wrapper, or you're calling it in a component that unexpectedly ended up server-rendered.
- **StrictMode is dev-only,** but write cleanup as if every effect will run twice, because it also mirrors real-world remount scenarios (Fast Refresh, React reconciling a component back into the tree, `<Activity>` toggling visibility in React 19.2).
- **`revalidateTag`, async `params`, and other Next 16 data APIs are unrelated to animation** but commonly live in the same Server Component that feeds your client leaf — don't let a `await params` refactor tempt you into making the whole page a client component just to "keep things together."
- **One scroll owner only.** Lenis intercepts the wheel/touch event and drives `scrollTop` itself; leaving native `scroll-behavior: smooth` on (via Next 16's opt-in `data-scroll-behavior="smooth"`) or mixing in `element.scrollIntoView({ behavior: "smooth" })` calls will visibly stutter against it. Route all programmatic scrolling through `lenis.scrollTo()`.
- **`gsap.registerPlugin()` calls are idempotent but must happen client-side.** Put them at the top of the client file that uses the plugin (module scope, not inside a function) — Next.js will still include the file in the server bundle for type-checking purposes, but the plugin registration itself only executes when that module runs in the browser.

## Pitfalls

- **Uniform fade-up on everything.** `opacity: 0 → 1` plus `translateY(24px) → 0` at the same 0.5–0.6s `easeOut` on every card, section, and paragraph is the single most recognizable "AI built this" signature. Reserve entrance motion for hero moments and real section breaks; let body copy just be there. Vary duration/easing per section instead of reusing one preset everywhere.
- **Animating body text at all.** Word-by-word or line-by-line reveals on long paragraphs read as gimmicky and hurt reading speed; save `SplitText`-driven reveals for headlines and short statements.
- **`ssr: false` on content, not just behavior.** If the dynamically-imported component also contains the actual copy/markup, slow connections see an empty gap instead of static content — split the wrapper (animation) from the content (should still SSR) if a section is both heavy and above the fold.
- **Duplicate ScrollTriggers/observers stacking across client-side navigations.** Without pathname-scoped cleanup (pattern 6), every internal link click that revisits a route adds another set of triggers on top of the last; scroll performance visibly degrades the longer a session runs, and it won't reproduce on a fresh hard reload — which is exactly why it slips past manual testing.
- **Full-fidelity parallax/pin on mobile.** Mobile browser chrome resizing (URL bar show/hide) constantly re-triggers layout, and `ScrollTrigger` will refresh — and can visibly jitter — on every one of those resizes unless you set `ScrollTrigger.config({ ignoreMobileResize: true })`. Prefer `gsap.matchMedia()` to define genuinely different (usually: much simpler, or absent) animation on small viewports rather than scaling down the same desktop parallax values.
- **Ignoring `prefers-reduced-motion`.** Gate parallax, autoplay entrance sequences, and anything large-amplitude behind `gsap.matchMedia("(prefers-reduced-motion: no-preference)", …)` or Motion's `useReducedMotion()` — this is an accessibility requirement, not a nice-to-have, and skipping it is a common tell that motion was bolted on rather than designed in.
- **`will-change` left on indefinitely.** Applying it to every animated element for the lifetime of the page burns GPU memory; GSAP already manages `force3D` for transforms, so only reach for manual `will-change` on genuinely janky elements, and clear it (`clearProps: "willChange"`) once the animation settles.
- **Importing `framer-motion` in new code.** It still resolves in 2026 but is the unmaintained predecessor — import from `motion`/`motion/react` instead, the API is otherwise identical.

## Open / lower-confidence notes

- React 19.2's `<ViewTransition>` component (View Transitions API integration, referenced in the Next.js 16 release notes) is relevant to route-change animation but its exact export path/stability flag was not independently re-verified here beyond the Next.js blog post pointer to `react.dev/reference/react/ViewTransition` — check that page directly before depending on the exact import name in production code.
