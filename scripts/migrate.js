import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');

const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  prepare: false,
  ssl: process.env.DATABASE_SSL === 'disable' ? false : 'require',
});

const schema = await readFile(new URL('../database/schema.sql', import.meta.url), 'utf8');
const catalog = JSON.parse(await readFile(new URL('../src/data/products.json', import.meta.url), 'utf8'));

function images(prefix, count) {
  if (!prefix || !count) return [];
  return Array.from({ length: count }, (_, index) => `/images/products/${prefix}-${index + 1}.jpeg`);
}

try {
  await sql.unsafe(schema);
  await sql.begin(async (tx) => {
    for (const [collectionIndex, collection] of catalog.collections.entries()) {
      await tx`
        INSERT INTO collections (id, name, description, sort_order)
        VALUES (${collection.id}, ${collection.name}, ${collection.description || null}, ${collectionIndex})
        ON CONFLICT (id) DO NOTHING
      `;
      for (const [productIndex, product] of collection.products.entries()) {
        const productImages = images(product.imagePrefix, product.imageCount);
        const variants = (product.variants || []).map((variant) => ({
          label: variant.label,
          images: images(variant.imagePrefix, variant.imageCount),
          badge: variant.badge || null,
          imageFocalPoints: variant.imageFocalPoints || [],
        }));
        await tx`
          INSERT INTO products (
            id, collection_id, name, description, price, measurement, weight,
            colors, customizable, images, image_focal_points, variants, badge,
            bestseller, sort_order
          ) VALUES (
            ${product.id}, ${collection.id}, ${product.name}, ${product.description || null},
            ${product.price}, ${product.measurement || null}, ${product.weight || null},
            ${tx.json(product.colors || [])}, ${Boolean(product.customizable)},
            ${tx.json(productImages)}, ${tx.json(product.imageFocalPoints || [])},
            ${tx.json(variants)}, ${product.badge || null}, ${Boolean(product.bestseller)},
            ${productIndex}
          )
          ON CONFLICT (id) DO NOTHING
        `;
      }
    }
  });
  console.log(`Database ready. Seeded ${catalog.collections.length} collections. Migration ${randomUUID().slice(0, 8)} complete.`);
} finally {
  await sql.end();
}
