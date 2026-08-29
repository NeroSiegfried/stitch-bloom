import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename } from 'node:path';
import { put } from '@vercel/blob';
import postgres from 'postgres';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error('BLOB_READ_WRITE_TOKEN is required.');

const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  prepare: false,
  ssl: process.env.DATABASE_SSL === 'disable' ? false : 'require',
});

/**
 * Pixel dimensions straight from the file header. Reading them here keeps the
 * dependency list empty and works the same on any platform.
 */
function dimensions(buffer) {
  if (buffer.length > 24 && buffer.readUInt32BE(0) === 0x89504e47) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (buffer.length > 4 && buffer.readUInt16BE(0) === 0xffd8) {
    let offset = 2;
    while (offset < buffer.length - 9) {
      if (buffer[offset] !== 0xff) { offset += 1; continue; }
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      // SOF0-SOF15, excluding the non-frame markers in that range.
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
      }
      offset += 2 + length;
    }
  }
  return { width: null, height: null };
}

const uploaded = new Map();

async function migratePath(path) {
  if (!path || /^https?:/i.test(path)) return path;
  if (uploaded.has(path)) return uploaded.get(path);
  const file = `public${path}`;
  if (!existsSync(file)) {
    console.warn(`  skip (no file on disk): ${path}`);
    return path;
  }
  const buffer = await readFile(file);
  const { width, height } = dimensions(buffer);
  const blob = await put(`catalogue/${basename(path)}`, buffer, {
    access: 'public',
    addRandomSuffix: true,
  });
  await sql`
    INSERT INTO image_assets (url, pathname, width, height)
    VALUES (${blob.url}, ${blob.pathname}, ${width}, ${height})
    ON CONFLICT (url) DO NOTHING
  `;
  uploaded.set(path, blob.url);
  console.log(`  ${path} -> ${blob.url} (${width}x${height})`);
  return blob.url;
}

try {
  const products = await sql`SELECT id, name, images, variants FROM products ORDER BY name`;
  for (const product of products) {
    const images = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
    const variants = typeof product.variants === 'string' ? JSON.parse(product.variants) : product.variants;
    const localCount = [...images, ...variants.flatMap((v) => v.images || [])]
      .filter((image) => image && !/^https?:/i.test(image)).length;
    if (!localCount) continue;

    console.log(`${product.name} (${localCount} local)`);
    const nextImages = [];
    for (const image of images) nextImages.push(await migratePath(image));
    const nextVariants = [];
    for (const variant of variants) {
      const variantImages = [];
      for (const image of variant.images || []) variantImages.push(await migratePath(image));
      nextVariants.push({ ...variant, images: variantImages });
    }
    await sql`
      UPDATE products SET images = ${sql.json(nextImages)}, variants = ${sql.json(nextVariants)},
        updated_at = NOW()
      WHERE id = ${product.id}
    `;
  }

  // Order line items keep a snapshot of the image they were bought with.
  const items = await sql`SELECT DISTINCT image_url FROM order_items WHERE image_url IS NOT NULL`;
  for (const item of items) {
    const next = uploaded.get(item.image_url);
    if (next) {
      await sql`UPDATE order_items SET image_url = ${next} WHERE image_url = ${item.image_url}`;
      console.log(`order items: ${item.image_url} -> ${next}`);
    }
  }

  console.log(`\nDone. ${uploaded.size} distinct files uploaded to Vercel Blob.`);
} finally {
  await sql.end();
}
