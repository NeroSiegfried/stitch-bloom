import { useEffect } from 'react';
import { SITE_CONFIG } from '../data/siteConfig';

/**
 * usePageMeta
 * Sets document.title and all OG / Twitter meta tags for the current page.
 *
 * @param {object} opts
 * @param {string}  opts.title       — Page-specific title (without brand suffix)
 * @param {string} [opts.description]— Page description for search + social
 * @param {string} [opts.image]      — Absolute URL to the OG share image
 * @param {string} [opts.path]       — URL path, e.g. '/shop' (defaults to window.location.pathname)
 * @param {string} [opts.type]       — OG type, defaults to 'website'
 */
export default function usePageMeta({
  title,
  description = SITE_CONFIG.defaultDescription,
  image = `${SITE_CONFIG.siteUrl}/images/og-default.jpg`,
  path,
  type = 'website',
}) {
  useEffect(() => {
    const fullTitle = `${title} — ${SITE_CONFIG.brandName}`;
    const url = `${SITE_CONFIG.siteUrl}${path ?? window.location.pathname}`;

    // ── document title ──
    document.title = fullTitle;

    // ── helper: get-or-create a <meta> tag ──
    const setMeta = (selector, attr, value) => {
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement('meta');
        const [attrName, attrValue] = attr.split('=');
        el.setAttribute(attrName, attrValue.replace(/"/g, ''));
        document.head.appendChild(el);
      }
      el.setAttribute('content', value);
    };

    // ── canonical ──
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = url;

    // ── standard meta ──
    setMeta('meta[name="description"]', 'name=description', description);

    // ── Open Graph ──
    setMeta('meta[property="og:title"]',       'property=og:title',       fullTitle);
    setMeta('meta[property="og:description"]', 'property=og:description', description);
    setMeta('meta[property="og:url"]',         'property=og:url',         url);
    setMeta('meta[property="og:image"]',       'property=og:image',       image);
    setMeta('meta[property="og:type"]',        'property=og:type',        type);
    setMeta('meta[property="og:site_name"]',   'property=og:site_name',   SITE_CONFIG.brandName);

    // ── Twitter Card ──
    setMeta('meta[name="twitter:card"]',        'name=twitter:card',        'summary_large_image');
    setMeta('meta[name="twitter:title"]',       'name=twitter:title',       fullTitle);
    setMeta('meta[name="twitter:description"]', 'name=twitter:description', description);
    setMeta('meta[name="twitter:image"]',       'name=twitter:image',       image);
  }, [title, description, image, path, type]);
}
