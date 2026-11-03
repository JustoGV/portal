# GSAP ScrollTrigger

Deep reference for implementing scroll-driven animation (pinning, scrubbing, parallax, horizontal sections, grid reveals) with GSAP ScrollTrigger on Next.js App Router + React 19 + TypeScript.

## Current as of July 2026

- **gsap**: `3.15.0` (npm, verified via registry.npmjs.org). License: GreenSock **Standard "no charge" license** — https://gsap.com/standard-license. Webflow acquired GreenSock in Oct 2024 and made the entire library, including every former "Club GreenSock" paid plugin (ScrollTrigger, SplitText, MorphSVG, DrawSVG, ScrollSmoother, Inertia, etc.), **100% free for commercial use**. There is no more Club GSAP, no shockingly-positioned paywall, no bonus-plugin private registry — everything installs from public npm.
- **ScrollTrigger** ships inside the `gsap` package itself. No separate install. Import from `gsap/ScrollTrigger`.
- **@gsap/react**: `2.1.2`. Peer deps: `gsap ^3.12.5`, `react >=17`. Provides `useGSAP()`, the React-safe replacement for `useEffect`/`useLayoutEffect` when writing GSAP code.
- **lenis**: `1.3.25`, MIT license, package name is `lenis` (the old `@studio-freight/lenis` and `@studio-freight/react-lenis` are deprecated — migrate off them). React bindings ship in the same package at `lenis/react` (`ReactLenis` component, `useLenis` hook).

Install:
```bash
npm install gsap @gsap/react lenis
```

No API keys, no license file, no `.npmrc` registry override needed — plain public npm.

## Mental model

ScrollTrigger does not "watch scroll and fire events" the naive way — it's a scheduler that converts scroll position into an animation's `progress` (0–1) and syncs on `requestAnimationFrame`, not `IntersectionObserver` or scroll listeners. Every trigger has a `start` and `end` expressed in pixels internally, computed once and cached until `refresh()` runs. That cache is the single biggest source of bugs: anything that changes layout after that calculation (web fonts swapping, images loading without dimensions, a CMS injecting content, orientation change) leaves ScrollTrigger measuring a page that no longer exists.

There are exactly two ways to drive an animation from scroll, and conflating them is the #1 AI-generated-code smell:
1. **Scrub** — the animation's playhead *is* the scrollbar. No independent duration means anything; `scrub: 1` just adds 1s of lag smoothing. Use for parallax, progress-linked reveals, pinned storytelling.
2. **Toggle** (`toggleActions`) — scroll crossing a line plays/reverses/pauses a normal tween with its own duration and easing. Use for "fade this card in once."

Never mix them on the same trigger. Never nest a `scrollTrigger` on a *child* tween inside a timeline — attach it to the timeline (or a single top-level tween) only, because ScrollTrigger needs to own the whole playhead.

A senior default-distrusts three things on every ScrollTrigger build: hardcoded pixel `end` values (break on resize — use functions), markers left in prod, and `ScrollTrigger.refresh()` never being called after async content changes layout.

## API essentials

### Core config (per-trigger)

| Property | Type | Notes |
|---|---|---|
| `trigger` | Element/selector | What "start"/"end" are measured against. Defaults to the animation's target if omitted. |
| `start` | string/number/fn | `"top bottom"` default. Format: `"<trigger position> <scroller position>"`. Use a function for anything resize-dependent: `start: () => "top " + headerHeight`. |
| `end` | string/number/fn | `"bottom top"` default. Relative form `"+=500"` is common. Function-based when it depends on measured content. |
| `endTrigger` | Element/selector | Compute `end` relative to a different element than `trigger`. |
| `scrub` | `true \| number` | `true` = locked 1:1 to scrollbar. Number = seconds of smoothing lag before animation catches up. |
| `pin` | `true \| Element \| selector` | Pins `trigger` (or the given element) for the trigger's active range. |
| `pinSpacing` | `boolean \| "margin"` | Default `true` — inserts padding so pinning doesn't collapse layout. `"margin"` uses margin instead of padding (needed inside flex/grid parents that ignore padding-based sizing). |
| `anticipatePin` | number (0–1ish) | Reduces the 1-frame jump-then-pin artifact by starting the pin fractionally early, scaled by scroll velocity. Use `1` if you see a jitter on fast scroll into a pin. |
| `toggleActions` | string | 4 keywords for onEnter/onLeave/onEnterBack/onLeaveBack: `play`, `pause`, `resume`, `reverse`, `restart`, `reset`, `complete`, `none`. Default `"play none none none"`. |
| `snap` | number/array/fn/object | Snap scroll progress to points after scroll stops. Object form: `{ snapTo: 1 / (n-1), duration: 0.4, ease: "power1.inOut" }`. |
| `once` | boolean | Kill the trigger after it fires forward once — cheap for one-shot reveals, avoids upkeep cost. |
| `markers` | boolean/object | Visual start/end lines. **Dev only.** |
| `id` | string | Lookup key for `ScrollTrigger.getById()`. |
| `horizontal` | boolean | Trigger measures the x-axis instead of y. |
| `containerAnimation` | Tween | See horizontal scroll pattern below — makes this trigger measure progress along another animation's timeline instead of real page scroll. |
| `invalidateOnRefresh` | boolean | Forces the associated tween's start values to be recalculated (not just cached) on every `refresh()`. Needed whenever animated values depend on measured layout (e.g. `x: () => -document.querySelector('.track').scrollWidth + innerWidth`). |
| `refreshPriority` | number | Higher runs first during `refresh()`. Pins must be calculated in visual top-to-bottom order for correct spacing math — bump a trigger's priority if you can't control creation order. |
| `scroller` | Element/selector | Custom scroll container instead of the viewport (e.g. an internal `overflow:auto` panel). |
| `pinReparent` | boolean | Temporarily reparents the pinned element to `<body>` during the pin — escape hatch for `overflow:hidden`/`transform`/`z-index` stacking-context clipping bugs. |
| `pinnedContainer` | Element/selector | Tell ScrollTrigger about an ancestor that itself gets resized by another pin, so spacing math stays correct. |

Callbacks: `onEnter`, `onLeave`, `onEnterBack`, `onLeaveBack`, `onUpdate`, `onToggle`, `onRefresh`, `onScrubComplete`, `onSnapComplete` — all receive the `ScrollTrigger` instance as the argument.

### Static methods actually used in production

| Method | Use |
|---|---|
| `ScrollTrigger.create(vars)` | Standalone trigger not attached to a tween (e.g. just to toggle a class or run a callback). |
| `ScrollTrigger.batch(targets, vars)` | Grid/list reveals — batches many elements' onEnter/onLeave into grouped callbacks instead of one trigger per card. |
| `ScrollTrigger.refresh(safe?)` | Recalculate all trigger positions. Call after async layout shifts. |
| `ScrollTrigger.getAll()` / `.getById(id)` | Introspection/cleanup. |
| `ScrollTrigger.killAll()` | Nuke everything — rarely needed if cleanup is scoped correctly (see React section). |
| `gsap.matchMedia()` | **Use this, not `ScrollTrigger.matchMedia()`** (deprecated since 3.11). Responsive branching — see pattern below. |
| `ScrollTrigger.normalizeScroll(true)` | Forces scroll onto the JS thread for consistent behavior on touch devices — mainly relevant if not using Lenis (Lenis already normalizes). |
| `ScrollTrigger.config(vars)` | Global tuning — see mobile pitfall below for `ignoreMobileResize`. |
| `ScrollTrigger.saveStyles(targets)` | Records inline styles so `revert()` can restore them cleanly — matters when combined with `pinReparent` or matchMedia teardown. |
| `ScrollTrigger.sort(fn?)` | Manually fix refresh ordering without touching `refreshPriority` on every trigger. |

`ScrollTrigger.config({ ignoreMobileResize: true })` — vertical resizes under ~25% of viewport height on touch-only devices (i.e. the address bar showing/hiding) will **not** trigger `refresh()`. This is the fix for the classic "pinned section jumps every time you scroll on iOS Safari" bug. Trade-off: trigger positions can be marginally stale on those devices — acceptable almost always.

## Patterns

### 1. Registering the plugin (do this once, module scope)

```ts
// lib/gsap.ts
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export { gsap, ScrollTrigger };
```

Guard with `typeof window !== "undefined"` (or only ever import this file from Client Components) — registering during SSR/RSC render is a no-op at best and a build warning at worst since ScrollTrigger touches `window`/`document`.

### 2. Scrubbed reveal inside a Client Component (`useGSAP`, StrictMode-safe)

```tsx
"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

export function FeatureSection() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const cards = gsap.utils.toArray<HTMLElement>(".feature-card");

      gsap.set(cards, { autoAlpha: 0, y: 40 });

      gsap.to(cards, {
        autoAlpha: 1,
        y: 0,
        stagger: 0.15,
        ease: "power2.out",
        scrollTrigger: {
          trigger: root.current,
          start: "top 75%",
          end: "bottom 60%",
          toggleActions: "play none none reverse",
        },
      });
    },
    { scope: root } // scopes gsap.utils.toArray/selectors AND auto-reverts on unmount
  );

  return (
    <div ref={root} className="grid grid-cols-3 gap-6">
      <div className="feature-card">...</div>
      <div className="feature-card">...</div>
      <div className="feature-card">...</div>
    </div>
  );
}
```

`useGSAP` wraps everything in `gsap.context()` internally: on unmount, every tween, timeline, and ScrollTrigger created during that callback is automatically reverted/killed — no manual `ScrollTrigger.getAll().forEach(t => t.kill())` needed, and it correctly no-ops React 18/19 StrictMode's double-invoke in dev. `{ scope: root }` also means you can use unprefixed class selectors (`.feature-card`) safely even with multiple instances of this component on one page, since GSAP's selector resolution is scoped to `root.current`.

For animations triggered outside the effect (click handlers, etc.) that need to stay inside the same context for cleanup, wrap them with `contextSafe`:

```tsx
const { contextSafe } = useGSAP({ scope: root });
const onClick = contextSafe(() => {
  gsap.to(".card", { scale: 1.05 });
});
```

### 3. Pinned storytelling section (scrub timeline)

```tsx
"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

export function StorySection() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "+=3000", // 3000px of scroll drives the whole story
          scrub: 1,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      tl.to(".headline", { autoAlpha: 0, y: -60 })
        .to(".product-image", { scale: 1.4, ease: "none" }, "<")
        .to(".detail-copy", { autoAlpha: 1, y: 0 }, "+=0.2");
    },
    { scope: root }
  );

  return (
    <section ref={root} className="relative h-screen overflow-hidden">
      <h2 className="headline">...</h2>
      <img className="product-image" src="/product.png" alt="" />
      <p className="detail-copy opacity-0 translate-y-8">...</p>
    </section>
  );
}
```

Notes: `pin: true` pins `root` itself; **never** put the `scrollTrigger` config or the pin target on an element that is also being transformed by the same tween — animate descendants, not the pinned element. `end: "+=3000"` is a fixed distance in px; if the story's length should scale with viewport (e.g. `"+=" + window.innerHeight * 3`), make `end` a function so it's recalculated on refresh instead of frozen at first render.

### 4. Horizontal scroll section (`containerAnimation`)

```tsx
"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

export function HorizontalGallery() {
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const panels = gsap.utils.toArray<HTMLElement>(".panel");

      const scrollTween = gsap.to(track.current, {
        x: () => -(track.current!.scrollWidth - window.innerWidth),
        ease: "none", // MUST be linear — non-linear ease desyncs from scroll position
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: () => "+=" + (track.current!.scrollWidth - window.innerWidth),
          scrub: true,
          pin: true,
          invalidateOnRefresh: true,
        },
      });

      // nested triggers measuring position ALONG the horizontal tween
      panels.forEach((panel) => {
        gsap.from(panel.querySelector(".panel-copy"), {
          autoAlpha: 0,
          y: 30,
          scrollTrigger: {
            trigger: panel,
            containerAnimation: scrollTween,
            start: "left 70%",
            toggleActions: "play none none reverse",
          },
        });
      });
    },
    { scope: root }
  );

  return (
    <section ref={root} className="h-screen overflow-hidden">
      <div ref={track} className="flex h-full">
        <div className="panel w-screen shrink-0">...</div>
        <div className="panel w-screen shrink-0">...</div>
        <div className="panel w-screen shrink-0">...</div>
      </div>
    </section>
  );
}
```

`containerAnimation`-based triggers **cannot pin or snap themselves** — only the outer scrollTween that drives the container can pin. `start`/`end` on the nested triggers use `"left"/"right"` semantics against the horizontal tween's virtual timeline, not real page scroll.

### 5. `ScrollTrigger.batch()` for grids

Avoid one `ScrollTrigger.create` per card in a 50-item grid — batch groups entries/exits and lets you stagger only the elements that actually crossed the line in that scroll tick:

```tsx
useGSAP(() => {
  ScrollTrigger.batch(".grid-item", {
    interval: 0.1,
    batchMax: 4,
    start: "top 85%",
    onEnter: (elements) =>
      gsap.to(elements, {
        autoAlpha: 1,
        y: 0,
        stagger: 0.12,
        overwrite: true,
      }),
    onLeaveBack: (elements) =>
      gsap.to(elements, { autoAlpha: 0, y: 40, overwrite: true }),
  });
}, { scope: root });
```

### 6. `gsap.matchMedia()` for responsive triggers

```tsx
useGSAP(() => {
  const mm = gsap.matchMedia();

  mm.add(
    {
      isDesktop: "(min-width: 1024px)",
      isMobile: "(max-width: 1023px)",
      reduceMotion: "(prefers-reduced-motion: reduce)",
    },
    (context) => {
      const { isDesktop, reduceMotion } = context.conditions as {
        isDesktop: boolean;
        reduceMotion: boolean;
      };

      gsap.to(".hero-image", {
        scale: isDesktop ? 1.3 : 1.05,
        scrollTrigger: {
          trigger: ".hero",
          start: "top top",
          end: "+=800",
          scrub: reduceMotion ? false : 1,
          pin: isDesktop, // only pin on desktop — mobile viewport is too short to pin comfortably
        },
      });

      // every ScrollTrigger/tween created in this callback auto-reverts
      // when none of the matched queries apply anymore (breakpoint crossed)
    }
  );
}, { scope: root });
```

Do **not** use `ScrollTrigger.matchMedia()` — it's deprecated since GSAP 3.11 in favor of `gsap.matchMedia()`, which works identically but isn't tied to the ScrollTrigger plugin specifically and composes with any GSAP animation.

### 7. `refresh()` after dynamic content / image loading

```tsx
useGSAP(() => {
  const images = Array.from(root.current!.querySelectorAll("img"));
  let pending = images.filter((img) => !img.complete).length;

  if (pending === 0) return;

  const onLoad = () => {
    pending -= 1;
    if (pending === 0) ScrollTrigger.refresh();
  };

  images.forEach((img) => img.addEventListener("load", onLoad));
  return () => images.forEach((img) => img.removeEventListener("load", onLoad));
}, { scope: root });
```

Always set explicit `width`/`height` (or `aspect-ratio` in CSS) on images and use Next.js `<Image>` wherever possible — this whole workaround exists only because unsized images shift layout after ScrollTrigger has already cached positions. Fixing image sizing eliminates the bug at the source; the load-listener above is the fallback for content you don't control (CMS-injected HTML, third-party embeds).

### 8. Canonical Lenis integration

```ts
// lib/smooth-scroll.ts
"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";

export function useSmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      autoRaf: false, // we drive the raf loop via gsap.ticker below
    });

    lenis.on("scroll", ScrollTrigger.update);

    const tickerCallback = (time: number) => {
      lenis.raf(time * 1000); // gsap.ticker time is in seconds, lenis.raf expects ms
    };
    gsap.ticker.add(tickerCallback);
    gsap.ticker.lagSmoothing(0); // let Lenis own perceived lag, not GSAP's internal smoothing

    return () => {
      gsap.ticker.remove(tickerCallback);
      lenis.destroy();
    };
  }, []);
}
```

`new Lenis()`'s own default for `autoRaf` is already `false` (it expects you to drive it) — but if you're using the `<ReactLenis>` component from `lenis/react` instead, note that component's `autoRaf` prop **defaults to `true`**, so you must explicitly pass `autoRaf={false}` (or `options={{ autoRaf: false }}`) there to hand the raf loop to GSAP's ticker instead of letting two independent rAF loops fight each other:

```tsx
// app/providers.tsx
"use client";

import { ReactLenis } from "lenis/react";
import { useSmoothScroll } from "@/lib/smooth-scroll";

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  useSmoothScroll(); // registers lenis.on('scroll', ScrollTrigger.update) + gsap.ticker
  return (
    <ReactLenis root autoRaf={false} options={{ autoRaf: false }}>
      {children}
    </ReactLenis>
  );
}
```

In practice pick **one** integration style, not both: either instantiate `Lenis` yourself in a hook (pattern above, full control) or use `<ReactLenis root>` and drive it from a sibling effect — don't create two `Lenis` instances.

### 9. Killing triggers on route change (Next.js App Router)

`useGSAP({ scope })` already handles this per-component — on unmount (which happens on every App Router navigation away from a route segment that unmounts the component) its internal `gsap.context().revert()` kills every tween/ScrollTrigger it created. That's sufficient for 95% of cases and is the reason to prefer `useGSAP` over raw `useEffect` + manual `gsap.to(...)` everywhere.

The failure mode is animations created **outside** a `useGSAP`/`gsap.context()` scope — e.g. a one-off `ScrollTrigger.create()` in a top-level layout effect, or code that ran before hydration. For those, kill explicitly:

```tsx
useEffect(() => {
  return () => {
    ScrollTrigger.getAll().forEach((t) => t.kill());
  };
}, []);
```

Only call `ScrollTrigger.killAll()`/`getAll().forEach(kill)` at a layout boundary that truly owns all triggers on the page (e.g. a top-level `PageTransitionProvider`) — calling it inside a component that shares the page with other independently-scoped `useGSAP` components will kill their triggers too.

## Integration gotchas (SSR / hydration / React 19)

- **Never call `ScrollTrigger.create`/`gsap.to(...)` during render.** It must run in an effect (`useGSAP`, `useEffect`) — ScrollTrigger measures the DOM, which doesn't exist yet during SSR and isn't guaranteed final during the render phase even client-side.
- **Server Components can't use any of this.** Any component that imports `gsap`/`ScrollTrigger` needs `"use client"` at the top. Keep the animated wrapper as small and low as possible in the tree — don't put `"use client"` on a page-level layout just because one hero section animates.
- **React 19 + StrictMode double-invoke**: `useGSAP` is explicitly built to no-op the phantom second mount in dev via `gsap.context()`. Raw `useEffect` + manual GSAP calls will create duplicate ScrollTriggers in dev (usually invisible as a bug until you notice double-firing callbacks or a pinned section computing double the expected spacing) — this is the single most common reason to prefer `useGSAP` over hand-rolled effects.
- **Tree-shaking**: because `ScrollTrigger` is a side-effect-only import until `registerPlugin` runs, some bundlers can drop it if you only reference `ScrollTrigger` types and never call `registerPlugin`. Always call `gsap.registerPlugin(ScrollTrigger)` at module scope in a file that's actually imported by every animated component (e.g. the shared `lib/gsap.ts`), not conditionally.
- **Next.js `<Image>` + ScrollTrigger**: images that swap from blur placeholder to final image after paint change intrinsic layout in some configurations — treat it the same as any dynamic content and refresh, or better, reserve space with explicit `width`/`height`/`aspect-ratio` so no shift occurs regardless.

## Pitfalls

1. **Pinning inside a `position: sticky` or `transform`-having ancestor.** Any ancestor with `transform`, `filter`, `perspective`, or `will-change: transform` creates a new containing block, which breaks `position: fixed` pinning (ScrollTrigger's default pin mechanism). Symptom: pinned element scrolls away instead of sticking, or sticks at the wrong offset. Fix: remove the transform from ancestors, or set `pinType: "transform"` (ScrollTrigger auto-detects this in most cases, but explicit ancestors with `overflow: hidden` combined with `transform` may still need `pinReparent: true`).

2. **`refreshPriority` / creation-order bugs.** Every pinned trigger before another trigger (in document order) pushes that later trigger's real scroll position down by however much space the pin adds. If triggers are created in a different order than their visual document order (common with dynamically-mounted client components, Suspense boundaries resolving out of order, or `.map()` over async data), later-created-but-earlier-on-page triggers get miscalculated spacing. Fix: create triggers top-to-bottom, or set explicit `refreshPriority` (higher = calculated first) on the ones that must anchor correctly.

3. **Fixed header offset.** A `position: fixed` header covering the top ~80px of viewport means `start: "top top"` triggers the animation 80px too late/early relative to what's visually happening. Account for it explicitly: `start: "top 80px"` or `start: () => "top " + headerRef.current.offsetHeight`. Don't hardcode the header height as a magic number reused across files — read it from the DOM or a shared constant.

4. **Mobile address-bar resize causing pin jumps.** iOS/Android browser chrome showing/hiding changes `window.innerHeight` without the user meaningfully resizing anything, which by default triggers `ScrollTrigger.refresh()` (part of the `autoRefreshEvents` default) and can visibly jump a pinned section mid-scroll. Fix: `ScrollTrigger.config({ ignoreMobileResize: true })` once at app init.

5. **`markers: true` shipped to production.** Trivial but common — grep for `markers` before merging; it renders visible debug lines that only make sense with `NODE_ENV === "development"` gating, e.g. `markers: process.env.NODE_ENV === "development"`.

6. **Scrub animation with cached start values fighting itself.** Multiple `gsap.to()` calls scrubbing the *same* property from different triggers stacked on the same element will fight — ScrollTrigger caches the "from" value at creation time, so a second scrub tween sees a stale starting point and jumps. Consolidate into one timeline with one ScrollTrigger.

7. **`ease` on anything driven by `scrub`.** A non-`"none"` ease on a scrubbed tween (or the horizontal `containerAnimation` driver tween) desyncs animation progress from actual scroll position — the animation "gets ahead of" or "lags behind" the scrollbar in a way that reads as broken, not stylistically eased. Scrubbed motion should always be `ease: "none"`; put easing on `scrub: <number>` (the lag-smoothing value) instead if you want a softened feel.

8. **Forgetting `invalidateOnRefresh: true` on measurement-dependent animations.** If a tween's `x`/`y`/`width` value is a function that reads live DOM measurements (`scrollWidth`, `offsetHeight`), ScrollTrigger caches the *result* of that function at creation unless told to invalidate on every refresh. Without it, resizing the window keeps the original (now-wrong) computed value even though the trigger's start/end recalculate correctly.

9. **AI-generic tell: every section using the identical `fade-up + toggleActions "play none none reverse"` pattern.** It's the ScrollTrigger equivalent of `whileInView` fade-ups everywhere — technically correct, reads as templated. A senior varies the toggle behavior intentionally: `once: true` for content that shouldn't re-animate on scroll-back (most real content), reserving replay-on-scroll-back for genuinely stateful UI (progress indicators, counters), and reserving scrub for content where continuous scroll-linkage is the actual design intent (parallax, storytelling), not as a default choice for ordinary reveals.

10. **Killing triggers globally from a component that doesn't own them.** `ScrollTrigger.getAll().forEach(t => t.kill())` inside a component-level cleanup nukes every ScrollTrigger on the page, including ones owned by sibling components with their own `useGSAP` scope — causing animations elsewhere on the page to silently stop working after one unrelated component unmounts. Scope cleanup with `useGSAP({ scope })` (or `gsap.context()`), never global kill-alls, except at a true page/app-level boundary.
