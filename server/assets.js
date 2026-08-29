import { db } from './db.js';
import { HttpError, text } from './http.js';
import { CONTEXT_IDS, normalizeCrop } from '../src/utils/imageContexts.js';
import { SITE_ASSET_KEYS } from '../src/utils/siteAssets.js';

export { SITE_ASSET_KEYS };

export const ALLOWED_CONTENT_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml', 'video/mp4',
];

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/**
 * Keep only crops the site can actually render. An unknown context id is
 * dropped rather than stored, so removing a context from the site can never
 * leave unreachable data behind.
 */
export function sanitizeCrops(value) {
  if (!value || typeof value !== 'object') return {};
  const crops = {};
  for (const id of CONTEXT_IDS) {
    if (value[id]) crops[id] = normalizeCrop(value[id]);
  }
  return crops;
}

function integerOrNull(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/** Blob uploads are absolute; the theme's built-in images are site-relative. */
export function isUploadedUrl(url) {
  return /^https:\/\//i.test(String(url || ''));
}

export async function registerImageAsset(sql, { url, pathname, width, height, alt }) {
  const cleanUrl = text(url, 700);
  // Site-relative theme images are admitted too, so a built-in default can be
  // framed in the crop editor without first being re-uploaded.
  if (!isUploadedUrl(cleanUrl) && !cleanUrl.startsWith('/')) {
    throw new HttpError(400, 'An image needs an HTTPS URL or a site-relative path.');
  }
  const [row] = await sql`
    INSERT INTO image_assets (url, pathname, width, height, alt)
    VALUES (${cleanUrl}, ${text(pathname, 500)}, ${integerOrNull(width)},
            ${integerOrNull(height)}, ${text(alt, 300) || null})
    ON CONFLICT (url) DO UPDATE SET
      width = COALESCE(EXCLUDED.width, image_assets.width),
      height = COALESCE(EXCLUDED.height, image_assets.height),
      updated_at = NOW()
    RETURNING url, pathname, width, height, alt, crops
  `;
  return row;
}

/**
 * Everything the storefront needs to frame images, in one payload. Bundled into
 * the catalogue response so a page never needs a second round trip before it
 * can render an image correctly.
 */
export const SITE_SETTING_DEFAULTS = {
  // Empty means "fall back to the built-in rule" rather than "show nothing",
  // so the landing page still works before the owner ever curates it.
  homeCarousel: [],
};

export async function loadSettings(sql) {
  const rows = await sql`SELECT key, value FROM site_settings`;
  const settings = { ...SITE_SETTING_DEFAULTS };
  for (const row of rows) {
    if (row.key in SITE_SETTING_DEFAULTS) {
      settings[row.key] = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
    }
  }
  return settings;
}

export async function loadAssets(sql) {
  const [images, site, settings] = await Promise.all([
    sql`SELECT url, width, height, alt, crops FROM image_assets`,
    sql`SELECT key, url FROM site_assets`,
    loadSettings(sql),
  ]);
  const imageAssets = {};
  for (const row of images) {
    imageAssets[row.url] = {
      width: row.width,
      height: row.height,
      alt: row.alt,
      crops: typeof row.crops === 'string' ? JSON.parse(row.crops) : row.crops || {},
    };
  }
  const siteAssets = {};
  for (const key of SITE_ASSET_KEYS) siteAssets[key] = null;
  for (const row of site) {
    if (SITE_ASSET_KEYS.includes(row.key)) siteAssets[row.key] = row.url;
  }
  return { imageAssets, siteAssets, siteSettings: settings };
}

export function assetsQuery() {
  return loadAssets(db());
}
