/**
 * The image that represents a product anywhere it is shown as a single tile.
 *
 * Some products carry no base images at all and keep every photo inside a
 * colourway, so reading `images[0]` directly yields `undefined` and renders a
 * broken image. The offline catalogue in src/data/products.js already folds the
 * first colourway's photo into `images`; the database-backed catalogue does
 * not, which is why this resolver exists rather than a fix in one of them.
 */
export function primaryImageOf(product) {
  if (!product) return null;
  if (product.images?.length) return product.images[0];
  const variant = product.colorVariants?.find((candidate) => candidate.images?.length);
  return variant?.images?.[0] ?? null;
}

/** The focal point saved alongside whichever image primaryImageOf picked. */
export function primaryFocalPointOf(product) {
  if (!product) return undefined;
  if (product.images?.length) return product.imageFocalPoints?.[0];
  const variant = product.colorVariants?.find((candidate) => candidate.images?.length);
  return variant?.imageFocalPoints?.[0];
}
