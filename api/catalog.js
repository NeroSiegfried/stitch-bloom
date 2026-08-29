import { db } from '../server/db.js';
import { loadAssets } from '../server/assets.js';
import { mapCollection, mapProduct } from '../server/catalog.js';
import { allowMethods, handleError, json } from '../server/http.js';

export default async function handler(req, res) {
  try {
    allowMethods(req, ['GET']);
    const sql = db();
    const [collectionRows, productRows, assets] = await Promise.all([
      sql`SELECT id, name, description, sort_order, active FROM collections WHERE active = TRUE ORDER BY sort_order, name`,
      sql`
        SELECT p.*, c.name AS collection_name
        FROM products p JOIN collections c ON c.id = p.collection_id
        WHERE p.active = TRUE AND c.active = TRUE
        ORDER BY c.sort_order, p.sort_order, p.name
      `,
      loadAssets(sql),
    ]);
    const products = productRows.map(mapProduct);
    return json(res, 200, {
      collections: collectionRows.map((row) => mapCollection(row, products)),
      ...assets,
    });
  } catch (error) {
    return handleError(res, error);
  }
}
