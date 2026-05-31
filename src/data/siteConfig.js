/**
 * siteConfig.js
 * Single source of truth for all brand contact details and social links.
 * Import from here instead of hardcoding anywhere in the codebase.
 */

export const SITE_CONFIG = {
  brandName: 'The Stitch Bloom',
  tagline: 'Turning waste into worth',

  email: 'thestitchbloom@yahoo.com',
  phone: '+2348037988580',
  phoneFormatted: '+234 803 798 8580',

  address: {
    line1: '26 Hassan Musa Katsina Street,',
    line2: 'Asokoro, Abuja, Nigeria.',
  },

  founder: 'Whebuma Maigari',

  instagram: {
    handle: 'thestitchbloomltd',
    url: 'https://instagram.com/thestitchbloomltd',
  },

  deliveryWindows: {
    premade: '1 week',
    custom: '2 weeks',
  },

  newsletter: {
    // Get a free access key at https://web3forms.com — paste it here to
    // receive newsletter signups by email. Leave empty to save locally only.
    web3formsKey: '',
  },
};
