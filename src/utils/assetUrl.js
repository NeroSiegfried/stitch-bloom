/**
 * Prepend the Vite base URL to a public-folder path.
 * Works locally (base='/') and on GitHub Pages (base='/stitch-bloom/').
 *
 * Usage:  assetUrl('/images/logo.svg')
 *         assetUrl('/images/products/placeholder.svg')
 */
export function assetUrl(path) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}${path}`;
}
