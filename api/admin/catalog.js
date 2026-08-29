import { requireAdmin } from '../../server/auth.js';
import { db } from '../../server/db.js';
import { loadAssets } from '../../server/assets.js';
import { mapCollection, mapProduct } from '../../server/catalog.js';
import { allowMethods, assertSameOrigin, handleError, HttpError, json, readJson, slug, text } from '../../server/http.js';

function list(value) {
  return Array.isArray(value) ? value.map((item) => text(item, 500)).filter(Boolean) : [];
}

function imageList(value) {
  return list(value).filter((item) => item.startsWith('/') || /^https:\/\//i.test(item));
}

function variants(value) {
  if (!Array.isArray(value)) return [];
  return value.map((variant) => ({
    label: text(variant.label, 120),
    images: imageList(variant.images),
    badge: text(variant.badge, 80) || null,
    imageFocalPoints: list(variant.imageFocalPoints),
  })).filter((variant) => variant.label);
}

async function sendCatalog(res, sql) {
  const [collectionRows, productRows, assets] = await Promise.all([
    sql`SELECT id, name, description, sort_order, active FROM collections ORDER BY sort_order, name`,
    sql`
      SELECT p.*, c.name AS collection_name
      FROM products p JOIN collections c ON c.id = p.collection_id
      ORDER BY c.sort_order, p.sort_order, p.name
    `,
    loadAssets(sql),
  ]);
  const products = productRows.map(mapProduct);
  return json(res, 200, {
    collections: collectionRows.map((row) => mapCollection(row, products)),
    ...assets,
  });
}

export default async function handler(req, res) {
  try {
    allowMethods(req, ['GET', 'POST', 'PATCH', 'DELETE']);
    await requireAdmin(req);
    const sql = db();
    if (req.method === 'GET') return sendCatalog(res, sql);

    assertSameOrigin(req);
    const body = await readJson(req);
    const entity = body.entity;
    const data = body.data || {};

    if (req.method === 'POST' && entity === 'collection') {
      const name = text(data.name, 160);
      if (!name) throw new HttpError(400, 'Collection name is required.');
      await sql`
        INSERT INTO collections (id, name, description, sort_order, active)
        VALUES (
          ${slug(data.id || name)}, ${name}, ${text(data.description, 1000) || null},
          ${Number.parseInt(data.sortOrder, 10) || 0}, ${data.active !== false}
        )
      `;
      return sendCatalog(res, sql);
    }

    if (req.method === 'PATCH' && entity === 'collection') {
      const id = text(body.id, 80);
      const name = text(data.name, 160);
      if (!id || !name) throw new HttpError(400, 'Collection ID and name are required.');
      const result = await sql`
        UPDATE collections SET name = ${name}, description = ${text(data.description, 1000) || null},
          sort_order = ${Number.parseInt(data.sortOrder, 10) || 0},
          active = ${data.active !== false}, updated_at = NOW()
        WHERE id = ${id}
      `;
      if (!result.count) throw new HttpError(404, 'Collection not found.');
      return sendCatalog(res, sql);
    }

    if (req.method === 'DELETE' && entity === 'collection') {
      const id = text(body.id, 80);
      const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM products WHERE collection_id = ${id}`;
      if (count > 0) throw new HttpError(409, 'Remove or move the products in this collection first.');
      await sql`DELETE FROM collections WHERE id = ${id}`;
      return sendCatalog(res, sql);
    }

    if ((req.method === 'POST' || req.method === 'PATCH') && entity === 'product') {
      const id = req.method === 'POST' ? slug(data.id || data.name) : text(body.id, 100);
      const name = text(data.name, 180);
      const collectionId = text(data.collectionId, 80);
      const price = Number.parseInt(data.price, 10);
      if (!id || !name || !collectionId || !Number.isFinite(price) || price < 0) {
        throw new HttpError(400, 'Product name, collection, and a valid price are required.');
      }
      const fields = {
        description: text(data.description, 3000) || null,
        measurement: text(data.measurement, 160) || null,
        weight: text(data.weight, 100) || null,
        colors: list(data.colors),
        images: imageList(data.images),
        focalPoints: list(data.imageFocalPoints),
        variants: variants(data.colorVariants),
        badge: text(data.badge, 80) || null,
        customizable: Boolean(data.customizable),
        bestseller: Boolean(data.bestseller),
        active: data.active !== false,
        sortOrder: Number.parseInt(data.sortOrder, 10) || 0,
        stockQuantity: data.stockQuantity === '' || data.stockQuantity == null
          ? null
          : Math.max(0, Number.parseInt(data.stockQuantity, 10) || 0),
      };

      if (req.method === 'POST') {
        await sql`
          INSERT INTO products (
            id, collection_id, name, description, price, currency, measurement,
            weight, colors, customizable, images, image_focal_points, variants,
            badge, bestseller, stock_quantity, active, sort_order
          ) VALUES (
            ${id}, ${collectionId}, ${name}, ${fields.description}, ${price}, 'NGN',
            ${fields.measurement}, ${fields.weight}, ${sql.json(fields.colors)},
            ${fields.customizable}, ${sql.json(fields.images)}, ${sql.json(fields.focalPoints)},
            ${sql.json(fields.variants)}, ${fields.badge}, ${fields.bestseller},
            ${fields.stockQuantity}, ${fields.active}, ${fields.sortOrder}
          )
        `;
      } else {
        const result = await sql`
          UPDATE products SET collection_id = ${collectionId}, name = ${name},
            description = ${fields.description}, price = ${price}, measurement = ${fields.measurement},
            weight = ${fields.weight}, colors = ${sql.json(fields.colors)},
            customizable = ${fields.customizable}, images = ${sql.json(fields.images)},
            image_focal_points = ${sql.json(fields.focalPoints)}, variants = ${sql.json(fields.variants)},
            badge = ${fields.badge}, bestseller = ${fields.bestseller},
            stock_quantity = ${fields.stockQuantity}, active = ${fields.active},
            sort_order = ${fields.sortOrder}, updated_at = NOW()
          WHERE id = ${id}
        `;
        if (!result.count) throw new HttpError(404, 'Product not found.');
      }
      return sendCatalog(res, sql);
    }

    if (req.method === 'DELETE' && entity === 'product') {
      await sql`DELETE FROM products WHERE id = ${text(body.id, 100)}`;
      return sendCatalog(res, sql);
    }

    throw new HttpError(400, 'Unsupported catalogue operation.');
  } catch (error) {
    if (error.code === '23505') return handleError(res, new HttpError(409, 'That ID is already in use.'));
    if (error.code === '23503') return handleError(res, new HttpError(409, 'That collection could not be removed while it still contains products.'));
    return handleError(res, error);
  }
}
