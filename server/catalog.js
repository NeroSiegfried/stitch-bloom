function jsonValue(value, fallback = []) {
  if (value == null) return fallback;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return fallback; }
  }
  return value;
}

export function mapProduct(row) {
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    currency: '₦',
    currencyCode: row.currency,
    measurement: row.measurement,
    weight: row.weight,
    colors: jsonValue(row.colors),
    customizable: row.customizable,
    description: row.description,
    images: jsonValue(row.images),
    imageFocalPoints: jsonValue(row.image_focal_points),
    colorVariants: jsonValue(row.variants),
    badge: row.badge,
    bestseller: row.bestseller,
    stockQuantity: row.stock_quantity,
    active: row.active,
    collectionId: row.collection_id,
    collectionName: row.collection_name,
  };
}

export function mapCollection(row, products = []) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    sortOrder: row.sort_order,
    active: row.active,
    products: products.filter((product) => product.collectionId === row.id),
  };
}
