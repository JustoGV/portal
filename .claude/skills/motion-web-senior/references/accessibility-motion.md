# Accessible Motion

How to make scroll effects, page transitions, split-text reveals, custom scrollbars, and carousels safe for vestibular disorders, usable with keyboard only, and legible to screen readers — without flattening the site into something lifeless.

## Current as of July 2026

| Library | Package | Version | Notes |
|---|---|---|---|
| Framer Motion (renamed) | `motion` | 12.42.2 | Import from `motion/react`, not `framer-motion`. The `framer-motion` package still exists under the old name and keeps working, but `motion` is the current name — use `motion` for new code. |
| GSAP | `gsap` | 3.15.0 | 100% free since Apr 2025 (Webflow acquisition), **including every plugin** — SplitText, MorphSVG, DrawSVG, ScrollTrigger, etc. No more Club GSAP paywall. |
| Lenis | `lenis` | 1.3.25 | Renamed from `@studio-freight/lenis` (deprecated). React wrapper ships at `lenis/react`, no separate package. |
| Embla Carousel | `embla-carousel-react` | 8.6.0 | First-party a11y plugin (`embla-carousel-accessibility`) exists only as a **v9 release candidate** (9.0.0-rc02) — not stable. On the current stable v8 line you either hand-roll ARIA/keyboard or use a third-party plugin (`@bluecadet/embla-carousel-a11y`, still pre-1.0). Budget for manual work. |

Install: `npm install motion gsap lenis embla-carousel-react`. `motion`, `lenis`, and `embla-carousel-react` are MIT-licensed. `gsap` is zero-cost but ships under its own GSAP Standard ("no charge") License, not MIT/OSI-approved — see gsap.com/standard-license for the terms.

## Mental model

Reduced motion is a **variant of the design, not a degraded fallback you bolt on after ship**. A senior treats `prefers-reduced-motion` the same way they treat a breakpoint: every animated component has a defined reduced state before it's called done. The rule of thumb is "reduce, don't remove" — cross-fades, color/opacity transitions, and short scale taps are fine to keep; anything that moves large screen areas, spins, auto-scrolls, or simulates depth (parallax) has to go. Motion accessibility is not one CSS media query — it's four overlapping concerns that each fail independently: (1) vestibular safety (reduced-motion), (2) keyboard operability (custom scroll/carousels trap focus or eat native scroll), (3) screen reader fidelity (split-text and staggered reveals shred the DOM text nodes ARIA reads), and (4) time-based control (WCAG 2.2.2 requires a pause/stop control for anything auto-playing >5s). Ship all four or the "accessible" claim is false. Test with the OS toggle on, not just by reading code — most regressions here are invisible in a code review and only show up with reduce-motion actually enabled or a screen reader actually running.

## What "reduced" means in practice

| Keep (safe, still feels alive) | Cut (vestibular risk) |
|---|---|
| Opacity cross-fades | Parallax / depth-scroll effects |
| Color / background-color transitions | Zoom or scale animations on scroll |
| Short (<=200ms) scale taps on buttons | Spin / rotation animations |
| Static layout, no movement | Autoplaying marquees / ticker scroll |
| Instant or near-instant state changes | Large-distance slide/translate transitions |
| Progress indicators (simplify, don't remove — functional) | Screen-shake, bounce, elastic overshoot |

Vestibular trigger checklist — flag any animation that does 2+ of these for reduced-motion treatment:
- Moves more than ~10% of the viewport in any axis
- Repeats/loops without user-initiated stop
- Combines scale + rotation + translation simultaneously
- Simulates camera movement or depth (parallax layers moving at different speeds)
- Flashes or changes more than 3 times per second (also a seizure trigger, WCAG 2.3.1)
- Runs automatically on page load with no pause control

## API essentials

### CSS — always the first line of defense

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```
Use `0.01ms` not `0s` — some browsers skip `animationend`/`transitionend` events entirely on `0s`, breaking JS that waits for them.

Tailwind v4 ships `motion-safe:` and `motion-reduce:` variants out of the box (based on the same media feature):

```html
<button class="transition hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:transform-none">
```

### `motion/react` — `MotionConfig` and `useReducedMotion`

| API | Behavior |
|---|---|
| `<MotionConfig reducedMotion="user">` | Default is `"never"` — you must opt in. `"user"` reads the OS setting live. `"always"` forces reduced (useful for a QA route). When active, transform and layout animations are disabled; `opacity` and `backgroundColor` animations still play. |
| `useReducedMotion()` | Returns `boolean \| null` (`null` during SSR before hydration — see gotchas). Use to branch animation values manually when `MotionConfig`'s automatic stripping isn't granular enough. |

### GSAP — `gsap.matchMedia()`

The only sanctioned way to make GSAP timelines reduced-motion-aware. Never write `gsap.to()` unconditionally at module scope in a component meant to respect the preference.

```js
const mm = gsap.matchMedia();
mm.add(
  {
    reduceMotion: "(prefers-reduced-motion: reduce)",
    isDesktop: "(min-width: 800px)",
  },
  (context) => {
    const { reduceMotion, isDesktop } = context.conditions;
    gsap.to(".hero-blob", {
      rotation: isDesktop ? 360 : 180,
      duration: reduceMotion ? 0 : 2,
      ease: reduceMotion ? "none" : "power2.out",
    });
    return () => {}; // custom cleanup only — matchMedia auto-reverts tweens/ScrollTriggers
  }
);
// mm.revert() on unmount
```

### Lenis — reduced motion + keyboard

Lenis wraps native scroll (no transform hijacking), so keyboard scrolling, `position: sticky`, and anchor links keep working by default — this is a real advantage over old scroll-jacking libraries. Two things you still own: (1) disabling/damping it under reduced motion, (2) not letting it swallow spacebar/PageDown while a scroll-driven tween is mid-flight (known upstream issue — mitigate by keeping durations short and never blocking on Lenis to advance focus).

```ts
const lenis = new Lenis({
  autoRaf: true,
  duration: prefersReducedMotion ? 0 : 1.2,
});
```

## Patterns

### 1. App-wide reduced-motion gate (`motion/react`), Next.js App Router

```tsx
// app/providers.tsx
"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
```

```tsx
// app/layout.tsx (Server Component — no "use client")
import { Providers } from "./providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```
This alone strips transform/layout animation site-wide when the OS preference is set. It does NOT stop `setTimeout`-driven autoplay, GSAP timelines, or CSS `@keyframes` — those need their own guards (see below).

### 2. Manual branching with `useReducedMotion`, SSR-safe

```tsx
"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

export function RevealCard({ children }: { children: React.ReactNode }) {
  const shouldReduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // shouldReduceMotion is null on the server and on first client render
  // (matchMedia doesn't exist server-side). Treat "unknown" as "reduce"
  // to avoid a flash of full motion before hydration settles.
  const reduce = !mounted || shouldReduceMotion;

  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.96 }}
      whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: reduce ? 0.2 : 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
```

### 3. GSAP marquee/parallax with mandatory pause control (WCAG 2.2.2 + 2.3.1)

```tsx
"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export function LogoMarquee({ logos }: { logos: string[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: reduce)", () => {
      // Static: no loop. Satisfies 2.3.1 seizure and 2.2.2 pause-stop-hide
      // by never starting an infinite auto-animation in the first place.
      return () => {};
    });
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      tweenRef.current = gsap.to(trackRef.current, {
        xPercent: -50,
        duration: 30,
        ease: "none",
        repeat: -1,
      });
      return () => tweenRef.current?.kill();
    });
    return () => mm.revert();
  }, { scope: trackRef });

  const togglePause = () => {
    const tween = tweenRef.current;
    if (!tween) return;
    tween.paused(!tween.paused());
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={togglePause}
        aria-label="Pause logo animation"
        className="absolute right-2 top-2 z-10"
      >
        {/* pause/play icon, toggle aria-pressed in real impl */}
      </button>
      <div ref={trackRef} className="flex gap-12 will-change-transform">
        {[...logos, ...logos].map((src, i) => (
          <img key={i} src={src} alt="" aria-hidden={i >= logos.length} />
        ))}
      </div>
    </div>
  );
}
```
Any content that moves automatically for more than 5 seconds and runs alongside other content **must** ship a pause control — that's a hard WCAG 2.2.2 (Level A) requirement, not a nice-to-have. Duplicate the logo set for the seamless loop illusion, but mark the duplicate `aria-hidden` so screen readers don't announce it twice.

### 4. Accessible split-text reveal

GSAP's `SplitText` (bundled free since 3.13.0) auto-adds `aria-label` to the parent and `aria-hidden` to the split children — but independent testing (Adrian Roselli, 2026) found inconsistent behavior across screen reader/browser pairs. Treat the built-in handling as a floor, not a guarantee; for anything beyond a plain heading, set the label explicitly yourself.

```tsx
"use client";

import { useRef } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(SplitText, useGSAP);

export function AnimatedHeadline({ text }: { text: string }) {
  const ref = useRef<HTMLHeadingElement>(null);

  useGSAP(() => {
    if (!ref.current) return;
    // Set the accessible name explicitly — don't rely solely on SplitText's default.
    ref.current.setAttribute("aria-label", text);

    const mm = gsap.matchMedia();
    let split: SplitText | undefined;

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      split = new SplitText(ref.current, { type: "chars", aria: "none" });
      // aria: "none" — SplitText's default ("auto") already adds its own aria-label/aria-hidden;
      // we opt out because we set aria-label above and mark children hidden ourselves
      split.chars.forEach((el) => el.setAttribute("aria-hidden", "true"));
      gsap.from(split.chars, { opacity: 0, y: 20, stagger: 0.02, duration: 0.5 });
      return () => split?.revert();
    });
    mm.add("(prefers-reduced-motion: reduce)", () => {
      // No split at all — the original text node stays intact for AT.
      return () => {};
    });

    return () => mm.revert();
  }, [text]);

  return <h2 ref={ref}>{text}</h2>;
}
```
Non-negotiable rule: whatever splitting technique you use, **the un-split, original string must be reachable to a screen reader** — either because the DOM was never actually split (reduced-motion branch) or because an `aria-label` on an ancestor overrides the shredded children (`aria-hidden` on every split node).

### 5. Focus management in an animated overlay/menu

```tsx
"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";

export function MobileMenu({
  open,
  onClose,
  triggerRef,
}: {
  open: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const firstFocusable = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (open) {
      // Move focus INTO the panel once it mounts — don't wait for the animation to finish.
      firstFocusable.current?.focus();
    } else {
      // Return focus to the trigger on close. Required — otherwise keyboard
      // users lose their place after every open/close cycle.
      triggerRef.current?.focus();
    }
  }, [open, triggerRef]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        // Basic focus trap: keep Tab cycling inside panelRef.
        const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <a ref={firstFocusable} href="/work">Work</a>
          {/* ...rest of menu */}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```
Focus moves the moment the panel mounts — never gate it behind `onAnimationComplete`. A keyboard user who tabs before the animation finishes should already be inside the trap, not stuck on the page behind it. `AnimatePresence`'s `exit` keeps the DOM node (and its focus trap) alive during the closing transition, so removing the trap listener happens on unmount, not on click.

### 6. Keyboard-accessible Embla carousel (manual, targets stable v8)

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";

export function Carousel({ slides }: { slides: React.ReactNode[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (emblaApi) setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured work"
    >
      <div
        ref={emblaRef}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") emblaApi?.scrollNext();
          if (e.key === "ArrowLeft") emblaApi?.scrollPrev();
        }}
        className="overflow-hidden"
      >
        <div className="flex">
          {slides.map((slide, i) => (
            <div
              key={i}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${slides.length}`}
              aria-hidden={i !== selectedIndex}
              className="min-w-full"
            >
              {slide}
            </div>
          ))}
        </div>
      </div>
      <div aria-live="polite" className="sr-only">
        Slide {selectedIndex + 1} of {slides.length}
      </div>
      <button type="button" onClick={() => emblaApi?.scrollPrev()} aria-label="Previous slide">
        Prev
      </button>
      <button type="button" onClick={() => emblaApi?.scrollNext()} aria-label="Next slide">
        Next
      </button>
    </div>
  );
}
```
Embla does not give you `role="region"`, arrow-key handling, or slide announcements for free on the stable v8 line — the pattern above is the minimum you own yourself: a labeled region, a live region announcing the current slide, arrow-key navigation on the viewport, and `aria-hidden` on off-screen slides so a screen reader's virtual cursor doesn't wander into them. If the project can tolerate a pre-1.0 dependency, `@bluecadet/embla-carousel-a11y` wraps most of this.

## Integration gotchas

- **`useReducedMotion()` is `null` on the server.** `window.matchMedia` doesn't exist during SSR/RSC render, so Motion returns `null` until the client mounts. If you branch animation intensity on it directly, you get a full-motion flash on first paint even for reduce-motion users. Fix: default to the reduced branch until a `mounted` state flips true (Pattern 2), or gate the whole component behind `dynamic(() => import(...), { ssr: false })` if a flash is unacceptable and the component is non-critical for SEO.
- **`gsap.matchMedia()` + React StrictMode double-invoke.** Always pair it with `@gsap/react`'s `useGSAP()` hook, which handles the double-mount cleanup for you (`gsap.context` under the hood). Writing raw `useEffect(() => { gsap.matchMedia()... }, [])` without `useGSAP` frequently leaks tweens on StrictMode's mount→unmount→remount cycle in dev.
- **Server Components can't touch any of this.** `motion/react`, `gsap`, `lenis`, and `embla-carousel-react` all require `"use client"`. Keep the boundary as low in the tree as possible — animate the leaf component, not the whole page, so the rest of the route stays a Server Component.
- **Lenis + Next.js scroll restoration.** Next's default scroll-restoration-on-navigation fights Lenis's virtual scroll position. Call `lenis.scrollTo(0, { immediate: true })` on route change (via `usePathname()` in a client effect), and destroy/reinit Lenis across App Router navigations that unmount the scroll container — don't let a stale instance keep animating a detached element.
- **`prefers-reduced-motion: reduce` does not mean "no JS ran."** Autoplaying `<video>` still needs an explicit `autoPlay={!prefersReducedMotion}` check server can't do — read it client-side and gate the attribute, since the media element itself doesn't consult the media query.
- **CSS `0s` vs `0.01ms` under the global reduced-motion override.** Some browsers skip firing `transitionend`/`animationend` for zero-duration transitions, which silently breaks any JS relying on that event (e.g., a "remove from DOM after fade-out" cleanup). Always use `0.01ms`, never `0s`, in the blanket override.

## Pitfalls (what makes this look AI-generic or breaks on mobile)

1. **Treating `MotionConfig reducedMotion="user"` as sufficient by itself.** It only touches Motion-authored transform/layout animations. GSAP timelines, raw CSS `@keyframes`, `<video autoplay>`, and `setInterval`-driven marquees all need their own guard — ship it and call the page "accessible" is the single most common gap.
2. **Auto-playing hero video/marquee with zero pause control.** Fails WCAG 2.2.2 outright the moment it runs past 5 seconds next to other content. Every autoplaying loop needs a visible pause/stop affordance, not just a reduced-motion fallback.
3. **`aria-hidden` on split characters without an `aria-label` on the parent.** Screen readers then read nothing for that heading. Verify with an actual screen reader, not by eyeballing the DOM — GSAP's own default behavior has documented gaps across browser/AT combinations.
4. **Parallax "hero depth" effects shipped with no reduced-motion branch.** This is the #1 vestibular complaint in the wild and the #1 tell of a template that was never tested with the OS toggle on.
5. **Focus lost after closing an animated modal/drawer.** Keyboard users end up back at the top of the document instead of at the trigger button. Always restore focus to the element that opened the overlay.
6. **Custom scrollbars/Lenis blocking spacebar or PageDown mid-tween.** Test by holding spacebar during an active scroll-triggered animation — if the page stalls, the interpolation duration is too long or isn't interruptible.
7. **Carousel with no keyboard path at all.** Swipe-only interaction with mouse-drag handlers and no arrow-key/focus support is common with raw Embla — it's a WCAG 2.1.1 (keyboard) failure, not just a nice-to-have.
8. **Reduced-motion tested only via DevTools emulation, never the real OS toggle.** DevTools emulation doesn't catch every code path (native `<video>` autoplay heuristics, some third-party embeds) — always confirm with the actual system setting once before shipping.

## WCAG 2.2 success criteria that apply

| SC | Level | What it requires | How you satisfy it here |
|---|---|---|---|
| 2.2.2 Pause, Stop, Hide | A | Any moving/auto-updating content that starts automatically, runs >5s, and sits alongside other content needs a pause/stop/hide control. | Marquee, autoplay hero video, and looping GSAP timelines all need a visible pause button (Pattern 3) or must not autoplay past 5s. |
| 2.3.1 Three Flashes | A | Nothing flashes more than 3×/second. | Avoid strobing color/opacity loops; keep marquee/reveal timing well under the threshold. |
| 2.3.3 Animation from Interactions | AAA (worth doing anyway) | Motion triggered by user interaction (not essential to the function) can be disabled. | `prefers-reduced-motion` handling on hover/click-triggered transitions (button taps, page transitions) — covered by `MotionConfig`/`matchMedia` branches above. |
| 2.1.1 Keyboard | A | All functionality operable via keyboard. | Carousel arrow keys (Pattern 6), focus trap Tab cycling (Pattern 5), Lenis not blocking native scroll keys. |
| 2.4.3 Focus Order | A | Focus order preserves meaning/operability. | Focus moves into overlay content on open, returns to trigger on close — never left stranded. |
| 2.4.7 Focus Visible | AA | Keyboard focus indicator is visible. | Don't strip `:focus-visible` outlines for aesthetic reasons on animated custom controls (carousel buttons, marquee pause toggle). |

## Testing recipe

1. **OS-level reduced-motion toggle** — flip it on and re-load every animated route, don't rely on DevTools alone:
   - macOS: System Settings → Accessibility → Display → Reduce Motion
   - Windows 11: Settings → Accessibility → Visual effects → Animation effects (off)
   - iOS: Settings → Accessibility → Motion → Reduce Motion
   - Android: Settings → Accessibility → Remove animations
   - Chrome DevTools shortcut (for quick iteration, not a substitute for the above): Rendering tab → Emulate CSS media feature `prefers-reduced-motion` → `reduce`
2. **Keyboard-only pass** — unplug the mouse mentally. Tab through the full page: every interactive element gets a visible focus ring, overlays trap focus and return it on close (Esc and outside-click both close), carousels advance with arrow keys, custom scroll (Lenis) doesn't eat spacebar/PageDown/Home/End.
3. **Screen reader smoke test** — minimum bar, not a full audit:
   - macOS/Safari: VoiceOver (Cmd+F5), navigate headings with `VO+Cmd+H`, confirm split-text headlines read as full words/sentences, confirm carousel announces slide position.
   - Windows/Chrome: NVDA (free), Tab through the page, confirm the same.
   - Confirm autoplay marquees/videos don't produce a wall of unlabeled repeated announcements (`aria-hidden` on duplicated marquee content, Pattern 3).
4. **Regression guard** — add reduced-motion and keyboard-nav checks to whatever manual QA checklist ships with the project; these are the two categories that silently regress when someone "just tweaks the hero animation" six weeks later.
