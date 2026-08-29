/**
 * Every distinct shape an image is rendered at on this site.
 *
 * This is the single source of truth shared by the crop editor, the API
 * validation, and the render helpers — so a context can never be offered in the
 * dashboard without a page actually using it, or used by a page the editor
 * never showed. The ratios are read off the real CSS; keep them in step.
 */
export const IMAGE_CONTEXTS = [
  {
    id: 'card',
    label: 'Product card',
    ratio: 4 / 5,
    where: 'Shop grid, gallery, bag, order summaries, about',
  },
  {
    id: 'carousel',
    label: 'Home carousel',
    ratio: 100 / 164,
    where: 'The diagonal carousel on the landing page',
  },
  {
    id: 'square',
    label: 'Thumbnail',
    ratio: 1,
    where: 'Product detail thumbnail strip',
  },
  {
    id: 'wide',
    label: 'Wide banner',
    ratio: 16 / 9,
    where: 'Brand strip and full-bleed sections',
  },
];

export const CONTEXT_IDS = IMAGE_CONTEXTS.map((context) => context.id);

/** A crop that keeps the whole frame centred — what an unedited image gets. */
export const DEFAULT_CROP = { x: 50, y: 50, zoom: 1 };

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/** Coerce anything stored in the database into a crop that is safe to render. */
export function normalizeCrop(crop) {
  if (!crop || typeof crop !== 'object') return { ...DEFAULT_CROP };
  const numeric = (value, fallback) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
  return {
    x: clamp(numeric(crop.x, 50), 0, 100),
    y: clamp(numeric(crop.y, 50), 0, 100),
    zoom: clamp(numeric(crop.zoom, 1), 1, 3),
  };
}

/**
 * Inline style placing an image inside a fixed-ratio box. `object-position`
 * does the repositioning and `scale` does the zoom, so the container only ever
 * needs `overflow: hidden` — no wrapper maths, and it degrades to a plain
 * centred cover when an image has no saved crop.
 */
export function cropStyle(crops, contextId) {
  const crop = normalizeCrop(crops?.[contextId]);
  const style = { objectFit: 'cover', objectPosition: `${crop.x}% ${crop.y}%` };
  if (crop.zoom !== 1) {
    style.transform = `scale(${crop.zoom})`;
    style.transformOrigin = `${crop.x}% ${crop.y}%`;
  }
  return style;
}
