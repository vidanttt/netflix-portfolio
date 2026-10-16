/* Remembers which poster was clicked so the detail modal can grow out of it. */
export interface MorphOrigin {
  el: HTMLElement; // the poster wrapper that was clicked
  src: string; // its image
}

let current: MorphOrigin | null = null;

export function setMorphOrigin(card: HTMLElement | null) {
  const wrap = card?.querySelector<HTMLElement>('.bd-card-poster-wrap') ?? null;
  const img = wrap?.querySelector<HTMLImageElement>('img');
  current = wrap && img ? { el: wrap, src: img.currentSrc || img.src } : null;
}

/** Returns the pending origin once (null if the modal wasn't opened from a poster). */
export function takeMorphOrigin(): MorphOrigin | null {
  const o = current;
  current = null;
  return o;
}
