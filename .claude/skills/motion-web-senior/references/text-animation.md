# Text Animation

Senior-level reference for splitting and animating text (headlines, paragraphs, kinetic typography) in Next.js 16 / React 19 / TypeScript / Tailwind 4 sites, centered on GSAP SplitText.

## Current as of July 2026

| Package | Version | Install | License |
|---|---|---|---|
| `gsap` (core + all bonus plugins, incl. `SplitText`, `ScrollTrigger`) | 3.15.0 | `npm install gsap` | Standard "no-charge" license — 100% free, commercial use included, since Webflow took over sponsorship (GSAP 3.13, April 2025). No more Club GreenSock, no `gsap-trial` package. |
| `@gsap/react` (`useGSAP` hook) | 2.1.2 | `npm install @gsap/react` | Same free license |
| `split-type` (SplitType, community alternative) | 0.3.4 | `npm install split-type` | ISC, last published October 2023 — effectively unmaintained. [UNVERIFIED whether the repo is fully abandoned or just stable/feature-complete.] |

Import paths (all from the single `gsap` package now, no separate purchase or CDN "club" build):

```ts
import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
```

**Do not reach for SplitType on a new build.** It existed because SplitText was paywalled. That's no longer true — SplitText is free, more capable (masking, `autoSplit`, aria handling, better line-breaking with `deepSlice`), and actively maintained by GreenSock/Webflow. Only consider SplitType if the project already hard-avoids GSAP entirely (rare for anything with ScrollTrigger-driven motion) or is deliberately dependency-minimal.

## Mental model

SplitText doesn't animate anything — it's a DOM surgeon. It walks your text node, wraps runs of it (chars/words/lines) in `<div>`s, and hands you arrays of those elements to feed into `gsap.to/from/timeline`. Every downstream animation choice depends on **what unit you split into**, and that choice should be driven by content length, not habit:

- **Chars** — only for short strings (headlines, hero lines, nav labels). A wall of individually-tweened glyphs on a 40-word paragraph is the single most reliable tell of AI-generated motion design: it's expensive, it reads as noise, and it delays legibility.
- **Words** — the default for anything mid-length: subheads, CTAs, short intros.
- **Lines** — the only sane unit for paragraphs and body copy. Combined with `mask: "lines"` it gives the "each line slides up from behind a clipped edge" reveal seen on nearly every recent Awwwards site, at a fraction of the DOM cost of char-splitting.

Splitting is layout-dependent: line breaks (and therefore `lines` output) depend on the rendered font, container width, and font-loading state. That's the source of almost every SplitText bug — split before the real font is active or before the container has its final width, and the split is wrong. GSAP 3.13+ solves this natively with `autoSplit`, which should be your default for anything whose line count can change (responsive headings, paragraphs near a breakpoint).

Treat every SplitText instance as a resource with a lifecycle: create → animate → **revert**. Reverting restores the original, unsplit DOM (critical for accessibility and for not leaking wrapper elements across re-renders/route changes).

## API essentials

### Creating a split

```ts
const split = SplitText.create(target, vars);
```

`SplitText.create()` (static factory, GSAP 3.13+) is the current idiomatic entry point — prefer it over `new SplitText(target, vars)`. Both work; `.create()` reads clearer next to `gsap.timeline()` / `ScrollTrigger.create()` and is what current docs and examples use.

### Config (`vars`) — the properties implementers actually touch

| Option | Type | Default | Notes |
|---|---|---|---|
| `type` | `string` | `"chars,words,lines"` | Any comma-separated combo, e.g. `"words, lines"`. Don't request `chars` you're not animating — it's not free (still creates the DOM nodes). |
| `mask` | `"chars" \| "words" \| "lines"` | none | Wraps that unit in an extra element with `overflow: clip` for masked reveals. Single value only — can't mask multiple types at once. |
| `autoSplit` | `boolean` | `false` | Re-splits automatically on resize and on web-font load. Pair with `onSplit`. Turn on for anything with responsive line breaks; leave off for content you split once and never re-measure (e.g., a fixed-width badge). |
| `onSplit` | `(self: SplitText) => gsap.core.Timeline \| gsap.core.Tween \| void` | — | Fires on every (re-)split. **Build your animation here, not after `.create()`**, when `autoSplit` is on — otherwise a re-split orphans your original tween on stale elements. SplitText auto-kills the previously returned animation when it re-splits. |
| `aria` | `"auto" \| "hidden" \| "none"` | `"auto"` | `"auto"` puts `aria-label` (the original full text) on the container and `aria-hidden="true"` on the generated fragments, so screen readers read the sentence once instead of every char/word. Leave on `"auto"` unless the target contains interactive children (links, buttons) — then test tab order manually. |
| `tag` | `string` | `"div"` | Wrapper element type. |
| `wordsClass` / `charsClass` / `linesClass` | `string` | — | e.g. `"line"` or `"line++"` (the `++` suffix auto-increments per element: `line1`, `line2`...). Increment is now per-element, not global across targets. |
| `reduceWhiteSpace` | `boolean` | `true` | Collapses runs of whitespace. Leave on; turning it off is a `pre`-formatted-text edge case. |
| `deepSlice` | `boolean` | `true` (rewrite default) | Correctly slices nested inline elements (`<strong>`, `<a>`) that span a line break — this is what makes line-splitting rich text reliable. |

### Instance surface

```ts
split.chars   // HTMLElement[]
split.words   // HTMLElement[]
split.lines   // HTMLElement[]
split.isSplit // boolean
split.revert() // restore original DOM — always call on cleanup
split.split()  // manual re-split (rarely needed if autoSplit is on)
```

### Font-loading trap

If you split before the real web font is applied, character widths are computed against the fallback font, so line breaks (and therefore `type: "lines"` output, and char x-positions) are wrong — text reflows or misaligns the instant the real font swaps in. Two valid fixes, pick one per use case:

1. **`autoSplit: true`** — GSAP re-splits itself when `document.fonts` finishes loading and rebuilds via `onSplit`. Best default; zero manual wiring.
2. **Manual gate**: `document.fonts.ready.then(() => { /* split + animate */ })` — better when you want exactly one split, ever (no re-split cost on resize), e.g. a fixed-layout hero on desktop-only marketing pages.

Never split synchronously in the render path or immediately in a bare `useEffect` without one of the two guards above.

## Patterns

### 1. Short headline — char stagger, masked, font-safe

```tsx
// components/headline-reveal.tsx
"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(SplitText, useGSAP);

interface HeadlineRevealProps {
  children: string; // keep as plain text prop so SSR renders real content for SEO/no-JS
  className?: string;
}

export function HeadlineReveal({ children, className }: HeadlineRevealProps) {
  const containerRef = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      const el = containerRef.current;
      if (!el) return;

      let split: SplitText | undefined;
      let cancelled = false;

      document.fonts.ready.then(() => {
        if (cancelled || !el) return;
        split = SplitText.create(el, {
          type: "chars",
          mask: "chars",
          charsClass: "char",
          aria: "auto",
        });

        gsap.from(split.chars, {
          yPercent: 110,
          stagger: 0.025,
          duration: 0.7,
          ease: "power4.out",
        });
      });

      // manual revert: split is created async (inside .then), so it is NOT
      // auto-tracked by useGSAP's context — revert it yourself.
      return () => {
        cancelled = true;
        split?.revert();
      };
    },
    { scope: containerRef, dependencies: [children] },
  );

  return (
    <h1 ref={containerRef} className={className}>
      {children}
    </h1>
  );
}
```

Budget: this pattern is for headlines up to roughly 6-10 words / ~60 characters. Past that, char count and stagger duration both balloon and the reveal stops feeling like typography and starts feeling like a loading spinner.

### 2. Paragraph — masked line reveal, scroll-triggered, responsive

```tsx
// components/paragraph-reveal.tsx
"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(SplitText, ScrollTrigger, useGSAP);

export function ParagraphReveal({ children }: { children: string }) {
  const ref = useRef<HTMLParagraphElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      const split = SplitText.create(el, {
        type: "lines",
        mask: "lines",
        linesClass: "line",
        autoSplit: true, // re-splits on resize / font swap, rebuilds via onSplit
        onSplit(self) {
          return gsap.from(self.lines, {
            yPercent: 100,
            opacity: 0,
            stagger: 0.07,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: {
              trigger: el,
              start: "top 85%",
              once: true,
            },
          });
        },
      });

      // synchronous creation here IS tracked by useGSAP's context, but
      // reverting explicitly is still correct and cheap insurance.
      return () => split.revert();
    },
    { scope: ref },
  );

  return <p ref={ref}>{children}</p>;
}
```

`type: "lines"` only (no split of chars/words) keeps DOM node count proportional to line count, not word or char count — the right budget for body copy of any length.

### 3. Scroll-scrubbed opacity/blur (kinetic reading effect)

Common on long-form/story-driven sites: text sharpens and fades in as it crosses a focus band, driven directly by scroll position (`scrub`, not `once`). GSAP animates `filter` natively — no plugin needed.

```tsx
"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(SplitText, ScrollTrigger, useGSAP);

export function ScrubBlurParagraph({ children }: { children: string }) {
  const ref = useRef<HTMLParagraphElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      const split = SplitText.create(el, {
        type: "words",
        autoSplit: true,
        onSplit(self) {
          gsap.set(self.words, { opacity: 0.15, filter: "blur(6px)" });

          return gsap.to(self.words, {
            opacity: 1,
            filter: "blur(0px)",
            stagger: 0.05,
            ease: "none",
            scrollTrigger: {
              trigger: el,
              start: "top 75%",
              end: "bottom 45%",
              scrub: 0.6, // fractional scrub = smoothing lag, not a fixed lag in seconds
            },
          });
        },
      });

      return () => split.revert();
    },
    { scope: ref },
  );

  return <p ref={ref}>{children}</p>;
}
```

Filter animation is GPU-composited but still non-trivial per-element — cap this to `words`, never `chars`, and never on more than one paragraph in view at a time.

### 4. Kinetic word-fill (Apple/Stripe-style scroll color reveal)

Words desaturate from a muted color to full ink color as the scrollbar passes each one — a timeline-scrubbed stagger, no masking needed:

```tsx
"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(SplitText, ScrollTrigger, useGSAP);

export function KineticFillStatement({ children }: { children: string }) {
  const ref = useRef<HTMLParagraphElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      const split = SplitText.create(el, {
        type: "words",
        autoSplit: true,
        onSplit(self) {
          gsap.set(self.words, { color: "var(--muted-fg)" });

          return gsap.to(self.words, {
            color: "var(--fg)",
            stagger: 0.5,
            ease: "none",
            scrollTrigger: {
              trigger: el,
              pin: true,
              start: "top top",
              end: "+=100%",
              scrub: true,
            },
          });
        },
      });

      return () => split.revert();
    },
    { scope: ref },
  );

  return <p ref={ref} className="text-4xl font-medium leading-tight">{children}</p>;
}
```

`pin: true` + `end: "+=100%"` is the classic "one full viewport of scroll to fill one statement" pacing — tune `+=100%` up for longer statements, but each added viewport-height of scroll needs to feel earned by the copy.

### 5. Reusable split-reveal hook

Centralize the create/animate/revert lifecycle so feature components don't each re-implement it:

```tsx
// hooks/use-split-reveal.ts
"use client";

import { RefObject } from "react";
import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(SplitText, useGSAP);

type SplitUnit = "chars" | "words" | "lines";

interface UseSplitRevealOptions {
  ref: RefObject<HTMLElement | null>;
  type: SplitUnit;
  mask?: SplitUnit;
  build: (split: SplitText) => gsap.core.Tween | gsap.core.Timeline;
  deps?: unknown[];
}

export function useSplitReveal({ ref, type, mask, build, deps = [] }: UseSplitRevealOptions) {
  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      const split = SplitText.create(el, {
        type,
        mask,
        autoSplit: true,
        onSplit: (self) => build(self),
      });

      return () => split.revert();
    },
    { scope: ref, dependencies: deps },
  );
}
```

## Integration gotchas (SSR / hydration / React 19 / cleanup)

- **Render real text on the server, split only on the client.** SplitText mutates the DOM, so it must run after mount (inside `useGSAP`/`useEffect`), never during render. Keep the raw string as the actual children/text content in the server-rendered HTML — that's what search engines, screen readers with JS disabled, and the pre-hydration paint see. The split-and-wrap step is a progressive enhancement layer on top.
- **Avoid a flash of fully-visible, unanimated text before the split runs.** If the reveal is meant to be the first thing the user sees, set the container to `opacity-0` (Tailwind class, not inline `style`, to avoid hydration mismatches) and let the GSAP `.from()` bring it to `opacity: 1` — don't rely on the split itself to hide content, since there's a gap between paint and `document.fonts.ready` resolving.
- **`useGSAP`'s auto-cleanup only tracks synchronous work.** Anything created inside a `.then()`, `setTimeout`, or event handler — including a `SplitText.create()` gated behind `document.fonts.ready.then(...)` — is *not* automatically added to the internal `gsap.context()` and won't be reverted for you. Always return an explicit cleanup function that calls `split.revert()` in these cases (Pattern 1 above). For synchronous creation (Pattern 2-4), `useGSAP` does track it, but calling `.revert()` explicitly anyway costs nothing and protects you if you later refactor the split behind an async gate.
- **StrictMode double-invokes effects in dev.** `useGSAP` is the reason to use it over a bare `useEffect` for anything GSAP-related — it's built for this and reverts the first pass's animations before the second pass runs. Don't hand-roll `useEffect` + manual `gsap.context()` unless you have a reason `useGSAP` doesn't cover.
- **React 19 ref-as-prop.** No `forwardRef` needed for a reusable `<HeadlineReveal>`-style wrapper that accepts an external ref — pass `ref` as a normal prop and merge it if you need both an internal ref for SplitText and a caller-supplied one.
- **Route changes / client navigation (App Router).** Navigating away and back to a page with a split component should fully revert and re-split, not double-split. Prefer letting the component unmount/remount naturally (default App Router behavior on route change) over keeping it alive across routes with manual key management — unmounting triggers `useGSAP`'s cleanup, which is the reliable path.
- **`next/font` doesn't remove the need for `document.fonts.ready`.** `next/font` optimizes preloading and sets `font-display`, but with a fallback font substitution active (common on slow connections) the browser can still repaint with metric-adjusted fallback glyphs before the real font paints. Gate splits on `autoSplit: true` or `document.fonts.ready` regardless of using `next/font`.
- **Tailwind 4 and the mask wrapper.** `mask: "lines" | "words" | "chars"` injects an extra DOM layer with `overflow: clip`. If you're also applying `overflow-hidden` utility classes to a parent for unrelated layout reasons, check you're not double-clipping in a way that crops a stray descender or the top of a tall glyph — give masked lines a few pixels of vertical padding on the split container.

## Pitfalls

- **Char-splitting a full paragraph.** This is the single most common "obviously AI-generated" tell in current output. It's also a real performance problem: hundreds of absolutely-positioned/transformed elements triggering layout on every scroll tick, especially brutal on mid-range Android. Use `lines` (or `words` at most) for anything beyond a short headline.
- **Stagger duration that scales with word count with no cap.** A 0.05s-per-char stagger on a 200-character headline is a 10-second reveal nobody asked for. Cap total stagger spread (e.g., clamp `stagger` so total ≤ ~1.2s) or switch to `words`/`lines` once length crosses a threshold.
- **Forgetting `split.revert()`.** Leaked split wrappers accumulate across re-renders/route transitions, break subsequent re-splits (nested split-in-a-split), and strip the accessible text structure permanently since the original text node is gone until reverted.
- **Ignoring `prefers-reduced-motion`.** Kinetic type is exactly the category of motion that should collapse to a simple opacity fade (or nothing) for users who've opted out — check `window.matchMedia("(prefers-reduced-motion: reduce)")` before building the stagger timeline, not after.
- **`aria: "auto"` on text containing interactive children without testing.** If a paragraph contains an inline `<a>`, verify the link is still reachable and announced correctly after splitting — `deepSlice` handles the visual slice correctly, but always tab through the actual rendered page, don't assume.
- **Leaving `will-change` or GPU-forcing transforms on every char/word after the animation completes.** Hundreds of permanently GPU-composited layers is a memory and battery cost with zero ongoing benefit. Clear it in `onComplete` (`gsap.set(split.chars, { willChange: "auto" })`) or simply don't set `will-change` manually — let GSAP's own transform batching handle it during the active tween.
- **Assuming char-splitting works uniformly across scripts.** Complex scripts (Arabic ligatures, Devanagari, CJK, combining diacritics) don't decompose cleanly into independently-animatable "characters" the way Latin text does — a char split can visually break grapheme clusters. For any i18n'd content, default to `type: "words, lines"` and reserve `chars` for Latin-script marketing copy you've eyeballed.
- **Re-splitting on every keystroke/state change in dependency arrays.** Passing volatile dependencies (e.g., a value that changes on every render) to `useGSAP`'s `dependencies` re-triggers create → animate → revert on each change — fine for a headline whose text prop is genuinely static, disastrous wired to something like scroll position or a frequently-updating counter.
- **Testing only on desktop with a fast connection.** Font-loading races, blur-filter GPU cost, and scrub jank all show up disproportionately on mid-tier mobile hardware and throttled networks. Verify with CPU/network throttling before calling a text animation done.
