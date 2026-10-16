/* ════════════════════════════════════════════════════
   BORED — GSAP motion helpers
   Short, springy, a little overshoot. Every helper is a no-op when the user
   prefers reduced motion, and clears its inline styles when finished so the
   CSS hover/focus states keep working afterwards.
   ════════════════════════════════════════════════════ */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger);

export const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Fast bounce-in for dialogs (detail modal, search). */
export function bounceIn(panel: Element, backdrop?: Element | null, content?: ArrayLike<Element>) {
  if (reducedMotion()) return;
  const tl = gsap.timeline();
  if (backdrop) tl.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.22, ease: 'power2.out' }, 0);
  tl.fromTo(
    panel,
    { opacity: 0, scale: 0.55, y: 80, rotateX: 12, transformPerspective: 900, transformOrigin: '50% 60%' },
    { opacity: 1, scale: 1, y: 0, rotateX: 0, duration: 0.55, ease: 'back.out(1.9)', clearProps: 'transform,opacity' },
    0
  );
  if (content && content.length) {
    tl.from(
      content,
      { opacity: 0, y: 22, scale: 0.96, duration: 0.42, ease: 'back.out(2)', stagger: 0.045, clearProps: 'transform,opacity' },
      0.14
    );
  }
  return tl;
}

const BLUR = '--bd-bd-blur';

function makeLayer(rect: DOMRect, src: string, radius: number) {
  const layer = document.createElement('div');
  Object.assign(layer.style, {
    position: 'fixed',
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    zIndex: '650',
    overflow: 'hidden',
    borderRadius: `${radius}px`,
    pointerEvents: 'none',
    boxShadow: '0 30px 80px rgba(0,0,0,0.55)',
    background: '#111',
  } as CSSStyleDeclaration);
  const img = new Image();
  img.src = src;
  img.alt = '';
  img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block';
  layer.appendChild(img);
  document.body.appendChild(layer);
  return layer;
}

/**
 * Shared-element morph: the clicked poster grows into the detail panel.
 * A stand-in layer starts exactly on the poster and animates to the panel's rect while
 * the real panel fades in underneath; the page behind softly blurs.
 */
export function morphOpen(
  panel: HTMLElement,
  backdrop: HTMLElement | null,
  content: ArrayLike<Element>,
  origin: { el: HTMLElement; src: string }
) {
  const from = origin.el.getBoundingClientRect();
  const to = panel.getBoundingClientRect();
  if (reducedMotion() || !from.width || !to.width) return null;

  const layer = makeLayer(from, origin.src, 14);
  origin.el.style.visibility = 'hidden';
  gsap.set(panel, { opacity: 0 });

  const tl = gsap.timeline({
    onComplete: () => layer.remove(),
  });
  if (backdrop) {
    tl.fromTo(backdrop, { opacity: 0, [BLUR]: '0px' }, { opacity: 1, [BLUR]: '14px', duration: 0.45, ease: 'power2.out' }, 0);
  }
  tl.to(
    layer,
    { left: to.left, top: to.top, width: to.width, height: to.height, borderRadius: 24, duration: 0.62, ease: 'back.out(1.25)' },
    0
  );
  tl.to(panel, { opacity: 1, duration: 0.26, ease: 'power1.out', clearProps: 'opacity' }, 0.3);
  tl.to(layer, { opacity: 0, duration: 0.24, ease: 'power1.out' }, 0.42);
  if (content.length) {
    tl.from(content, { opacity: 0, y: 20, duration: 0.4, ease: 'back.out(2)', stagger: 0.045, clearProps: 'transform,opacity' }, 0.34);
  }
  return tl;
}

/** Reverse morph: panel shrinks back into the poster it came from. Returns false if it can't. */
export function morphClose(
  panel: HTMLElement,
  backdrop: HTMLElement | null,
  origin: { el: HTMLElement; src: string },
  done: () => void
) {
  const from = panel.getBoundingClientRect();
  const to = origin.el.getBoundingClientRect();
  const visible = origin.el.isConnected && to.width > 0 && to.bottom > 0 && to.top < window.innerHeight;
  if (reducedMotion() || !visible) return false;

  const layer = makeLayer(from, origin.src, 24);
  gsap.set(layer, { opacity: 0 });
  gsap.set(panel, { opacity: 0 });

  const tl = gsap.timeline({
    onComplete: () => {
      origin.el.style.visibility = '';
      layer.remove();
      done();
    },
  });
  tl.to(layer, { opacity: 1, duration: 0.12 }, 0);
  tl.to(layer, { left: to.left, top: to.top, width: to.width, height: to.height, borderRadius: 14, duration: 0.42, ease: 'power3.inOut' }, 0);
  if (backdrop) tl.to(backdrop, { opacity: 0, [BLUR]: '0px', duration: 0.34, ease: 'power1.in' }, 0.08);
  return true;
}

/** Quick scale-away; calls done() when finished. */
export function bounceOut(panel: Element | null, backdrop: Element | null, done: () => void) {
  if (reducedMotion() || !panel) {
    done();
    return;
  }
  const tl = gsap.timeline({ onComplete: done });
  tl.to(panel, { opacity: 0, scale: 0.9, y: 26, duration: 0.2, ease: 'power2.in' }, 0);
  if (backdrop) tl.to(backdrop, { opacity: 0, duration: 0.22, ease: 'power1.in' }, 0);
}

/** Hero text block: children spring up in sequence. */
export function animateHeroContent(root: Element) {
  if (reducedMotion()) return;
  gsap.fromTo(
    root.children,
    { opacity: 0, y: 34, scale: 0.97 },
    { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'back.out(1.7)', stagger: 0.06, clearProps: 'transform,opacity' }
  );
}

/** A row's heading slides in and its cards pop up as the row scrolls into view. */
export function revealRow(row: HTMLElement, title: Element | null, cards: ArrayLike<Element>) {
  if (reducedMotion() || !cards.length) return () => {};
  const tl = gsap.timeline({
    scrollTrigger: { trigger: row, start: 'top 94%', once: true },
  });
  if (title) tl.from(title, { opacity: 0, x: -24, duration: 0.45, ease: 'back.out(1.8)', clearProps: 'transform,opacity' }, 0);
  tl.from(
    cards,
    { opacity: 0, y: 46, scale: 0.9, duration: 0.5, ease: 'back.out(1.6)', stagger: { each: 0.04, from: 'start' }, clearProps: 'transform,opacity' },
    0.05
  );
  return () => {
    tl.scrollTrigger?.kill();
    tl.kill();
  };
}

/** Press feedback: squish on pointer down, spring back on release. */
export function installPressFeedback(selector: string) {
  if (typeof document === 'undefined') return () => {};
  const pressed = new Set<HTMLElement>();

  const down = (e: PointerEvent) => {
    if (reducedMotion()) return;
    const el = (e.target as HTMLElement | null)?.closest<HTMLElement>(selector);
    if (!el) return;
    pressed.add(el);
    gsap.to(el, { scale: 0.93, duration: 0.12, ease: 'power2.out', overwrite: 'auto' });
  };
  const up = () => {
    pressed.forEach((el) => {
      gsap.to(el, { scale: 1, duration: 0.5, ease: 'back.out(3.2)', overwrite: 'auto', clearProps: 'transform' });
    });
    pressed.clear();
  };

  document.addEventListener('pointerdown', down, { passive: true });
  document.addEventListener('pointerup', up, { passive: true });
  document.addEventListener('pointercancel', up, { passive: true });
  return () => {
    document.removeEventListener('pointerdown', down);
    document.removeEventListener('pointerup', up);
    document.removeEventListener('pointercancel', up);
  };
}

export { gsap, ScrollTrigger };
