/**
 * Every image on the site that is part of the design rather than the
 * catalogue, and can therefore be replaced from the owner dashboard.
 *
 * `fallback` is what renders until a slot is filled. A slot with a fallback is
 * already showing something today and can simply be swapped; a slot without one
 * renders nothing at all rather than a broken element.
 */
export const SITE_ASSET_SLOTS = [
  {
    key: 'home-hero-video',
    label: 'Landing hero video',
    hint: 'Full-bleed video behind the headline. MP4, muted and looping.',
    kind: 'video',
    group: 'Landing page',
    fallback: null,
  },
  {
    key: 'home-brand-story',
    label: 'Brand strip',
    hint: 'The image beside the brand paragraph.',
    context: 'wide',
    group: 'Landing page',
    fallback: null,
  },
  {
    key: 'home-category-najma',
    label: 'Najma Collection tile',
    hint: 'Category tile in the landing grid.',
    context: 'card',
    group: 'Landing page',
    fallback: '/images/products/najma-tote-1.jpeg',
  },
  {
    key: 'home-category-sleeves',
    label: 'Gadget Sleeves tile',
    hint: 'Category tile in the landing grid.',
    context: 'card',
    group: 'Landing page',
    fallback: '/images/products/sleeve-laptop-1.jpeg',
  },
  {
    key: 'home-category-accessories',
    label: 'Accessories tile',
    hint: 'Category tile in the landing grid.',
    context: 'card',
    group: 'Landing page',
    fallback: '/images/products/key-holder-1.jpeg',
  },
  {
    key: 'about-hero',
    label: 'About hero',
    hint: 'Full-bleed image at the top of the About page.',
    context: 'wide',
    group: 'About page',
    fallback: null,
  },
  {
    key: 'about-craft',
    label: 'About craft',
    hint: 'The portrait image within the About story.',
    context: 'card',
    group: 'About page',
    fallback: null,
  },
  {
    key: 'account-hero',
    label: 'Sign-in image',
    hint: 'Shown beside the sign-in and create-account form.',
    context: 'card',
    group: 'Account',
    fallback: '/images/products/najma-clutch-4.jpeg',
  },
  {
    key: 'brand-logo',
    label: 'Navbar logo',
    hint: 'The wordmark in the navigation bar. SVG or PNG with transparency.',
    kind: 'logo',
    group: 'Brand',
    fallback: '/images/Logo.svg',
  },
  {
    key: 'og-default',
    label: 'Social share image',
    hint: 'Used when a page is shared and has no product image of its own.',
    context: 'wide',
    group: 'Brand',
    fallback: '/images/og-default.jpg',
  },
];

export const SITE_ASSET_KEYS = SITE_ASSET_SLOTS.map((slot) => slot.key);

const FALLBACKS = Object.fromEntries(SITE_ASSET_SLOTS.map((slot) => [slot.key, slot.fallback]));

/** The URL to render for a slot: the owner's upload, else the built-in default. */
export function siteAsset(siteAssets, key) {
  return siteAssets?.[key] || FALLBACKS[key] || null;
}
