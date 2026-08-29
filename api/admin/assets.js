import { del } from '@vercel/blob';
import { requireAdmin } from '../../server/auth.js';
import { db } from '../../server/db.js';
import { isUploadedUrl, loadAssets, registerImageAsset, sanitizeCrops, SITE_ASSET_KEYS, SITE_SETTING_DEFAULTS } from '../../server/assets.js';
import { allowMethods, assertSameOrigin, handleError, HttpError, json, readJson, text } from '../../server/http.js';

async function sendAssets(res, sql) {
  const assets = await loadAssets(sql);
  const rows = await sql`
    SELECT url, pathname, width, height, alt, crops, created_at
    FROM image_assets ORDER BY created_at DESC
  `;
  return json(res, 200, { ...assets, library: rows });
}

export default async function handler(req, res) {
  try {
    allowMethods(req, ['GET', 'POST', 'PATCH', 'DELETE']);
    await requireAdmin(req);
    const sql = db();
    if (req.method === 'GET') return sendAssets(res, sql);

    assertSameOrigin(req);
    const body = await readJson(req);

    if (req.method === 'POST') {
      await registerImageAsset(sql, body);
      return sendAssets(res, sql);
    }

    if (req.method === 'PATCH') {
      // Three shapes share this route: a curated page setting, pointing a named
      // design slot at an image, and saving how an image is framed.
      if (body.setting !== undefined) {
        const setting = text(body.setting, 60);
        if (!(setting in SITE_SETTING_DEFAULTS)) throw new HttpError(400, 'Unknown site setting.');
        // Only ids that exist and are unique survive, so a stale selection can
        // never leave the landing page pointing at a deleted product.
        const requested = Array.isArray(body.value) ? body.value.map((id) => text(id, 100)) : [];
        const known = await sql`SELECT id FROM products WHERE id IN ${sql(requested.length ? requested : [''])}`;
        const valid = new Set(known.map((row) => row.id));
        const value = [...new Set(requested)].filter((id) => valid.has(id)).slice(0, 12);
        await sql`
          INSERT INTO site_settings (key, value) VALUES (${setting}, ${sql.json(value)})
          ON CONFLICT (key) DO UPDATE SET value = ${sql.json(value)}, updated_at = NOW()
        `;
        return sendAssets(res, sql);
      }
      if (body.key !== undefined) {
        const key = text(body.key, 80);
        if (!SITE_ASSET_KEYS.includes(key)) throw new HttpError(400, 'Unknown site asset slot.');
        const url = text(body.url, 700);
        if (url && !/^https:\/\//i.test(url)) throw new HttpError(400, 'A site asset needs an HTTPS URL.');
        await sql`
          INSERT INTO site_assets (key, url) VALUES (${key}, ${url || null})
          ON CONFLICT (key) DO UPDATE SET url = ${url || null}, updated_at = NOW()
        `;
        return sendAssets(res, sql);
      }
      const url = text(body.url, 700);
      const [existing] = await sql`SELECT url FROM image_assets WHERE url = ${url}`;
      if (!existing) throw new HttpError(404, 'That image is not in the library.');
      await sql`
        UPDATE image_assets
        SET crops = ${sql.json(sanitizeCrops(body.crops))},
            alt = ${text(body.alt, 300) || null}, updated_at = NOW()
        WHERE url = ${url}
      `;
      return sendAssets(res, sql);
    }

    const url = text(body.url, 700);
    const [asset] = await sql`SELECT url, pathname FROM image_assets WHERE url = ${url}`;
    if (!asset) throw new HttpError(404, 'That image is not in the library.');
    const [inUse] = await sql`
      SELECT 1 AS used FROM products
      WHERE images::jsonb ? ${url} OR variants::text LIKE ${'%' + url + '%'}
      LIMIT 1
    `;
    if (inUse) throw new HttpError(409, 'This image is still used by a product. Remove it there first.');
    // Only uploads live in Blob storage; a built-in theme image is tracked here
    // purely to carry its framing and must never be deleted from the repo.
    if (isUploadedUrl(asset.url)) {
      // Clear the blob before the row, so a failed delete leaves a recoverable
      // record rather than an orphaned file nothing points at.
      await del(asset.url).catch(() => {});
    }
    await sql`UPDATE site_assets SET url = NULL, updated_at = NOW() WHERE url = ${url}`;
    await sql`DELETE FROM image_assets WHERE url = ${url}`;
    return sendAssets(res, sql);
  } catch (error) {
    return handleError(res, error);
  }
}
