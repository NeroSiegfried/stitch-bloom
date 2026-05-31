/**
 * products.js
 * Utility layer for Stitch Bloom product data.
 *
 * The source of truth lives in products.json.
 * Each product entry stores:
 *   imagePrefix  — filename stem, e.g. "najma-tote"
 *   imageCount   — how many sequential images exist (e.g. 2)
 *                  → generates /images/products/najma-tote-1.jpeg … -2.jpeg
 *   variants     — array of { label, imagePrefix, imageCount } for colourways
 *
 * To add a new image: drop the file into /public/images/products/ as
 * <prefix>-<n>.jpeg and bump imageCount in products.json.
 * To add a new product or collection: edit products.json only — no JS changes needed.
 */

import catalogData from './products.json';

// Works both locally (base='/') and on GitHub Pages (base='/stitch-bloom/')
const IMG_BASE = `${import.meta.env.BASE_URL}images/products/`;
const IMG_EXT  = '.jpeg';

/** Build a sequential image array from a prefix and count. */
function buildImages(prefix, count) {
  if (!prefix || count <= 0) return [];
  return Array.from({ length: count }, (_, i) => `${IMG_BASE}${prefix}-${i + 1}${IMG_EXT}`);
}

/** Build colorVariants array from the JSON variants list. */
function buildVariants(variants) {
  return (variants ?? []).map((v) => ({
    label: v.label,
    images: buildImages(v.imagePrefix, v.imageCount),
  }));
}

export const collections = catalogData.collections.map((col) => ({
  ...col,
  products: col.products.map((p) => {
    const images        = buildImages(p.imagePrefix, p.imageCount);
    const colorVariants = buildVariants(p.variants);
    // Products with only variants and no base imagePrefix use the first variant's images
    // so all downstream components have a reliable images[0] to render.
    const effectiveImages = images.length > 0 ? images : (colorVariants[0]?.images ?? []);
    return {
      ...p,
      images: effectiveImages,
      colorVariants,
      collectionId:   col.id,
      collectionName: col.name,
    };
  }),
}));

/**
 * Returns a flat list of all products across all collections.
 */
export function getAllProducts() {
  return collections.flatMap((col) => col.products);
}

/**
 * Returns bestseller products (badge === "Bestseller"), falling back
 * to the first 3 Najma products.
 */
export function getBestsellers() {
  const all     = getAllProducts();
  const flagged = all.filter((p) => p.badge === 'Bestseller');
  if (flagged.length >= 3) return flagged;
  return all.filter((p) => p.collectionId === 'najma').slice(0, 3);
}

/**
 * Format a Naira price with thousand separators.
 * Returns "Price on request" when price is null.
 */
export function formatPrice(currency, price) {
  if (price === null) return 'Price on request';
  return `${currency}${price.toLocaleString('en-NG')}`;
}
