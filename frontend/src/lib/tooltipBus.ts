// Tiny global event bus for tooltips
const EVENT = 'app-tooltip-open';

type Detail = { id: string };

export function emitTooltipOpen(id: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<Detail>(EVENT, { detail: { id } }));
}

export function subscribeTooltipOpen(cb: (id: string) => void) {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: Event) => {
    const ce = e as CustomEvent<Detail>;
    if (ce?.detail?.id) cb(ce.detail.id);
  };
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
