/**
 * products.js
 * Central data store for all Stitch Bloom products.
 *
 * images: Array of image paths (relative to /public/images/products/).
 *         Add as many images as you have — the gallery handles them all.
 * colorVariants: Optional array of { label, images } for alternate colourways.
 */

export const collections = [
  {
    id: "najma",
    name: "Najma Collection",
    description:
      "Hand-crocheted from recycled T-shirt yarns, each Najma piece is a statement in conscious luxury.",
    products: [
      {
        id: "najma-tote",
        name: "Najma Tote Bag",
        price: 70000,
        currency: "₦",
        measurement: "12 × 15 inches",
        weight: "1.8 kg",
        colors: ["Pink & Brown"],
        customizable: true,
        description:
          "A roomy, structured tote handcrafted in our signature colourway. Large enough for daily use, beautiful enough to turn heads.",
        images: [
          "/images/products/najma-tote-1.jpg",
          "/images/products/najma-tote-2.jpg",
        ],
        colorVariants: [],
        badge: "Bestseller",
        collectionName: "Najma Collection",
      },
      {
        id: "najma-shoulder",
        name: "Najma Shoulder Bag",
        price: 55000,
        currency: "₦",
        measurement: null,
        weight: null,
        colors: [],
        customizable: false,
        description:
          "Clean lines, comfortable straps, and that unmistakeable Stitch Bloom texture. The perfect everyday companion.",
        images: ["/images/products/najma-shoulder-1.jpg"],
        colorVariants: [],
        badge: null,
        collectionName: "Najma Collection",
      },
      {
        id: "najma-mini",
        name: "Najma Mini Bag",
        price: 55000,
        currency: "₦",
        measurement: null,
        weight: null,
        colors: [],
        customizable: false,
        description:
          "All the Najma charm in a compact silhouette. Wear it crossbody or tuck it under your arm for effortless style.",
        images: ["/images/products/najma-mini-1.jpg"],
        colorVariants: [],
        badge: null,
        collectionName: "Najma Collection",
      },
      {
        id: "najma-handbag",
        name: "Najma Handbag",
        price: 65000,
        currency: "₦",
        measurement: null,
        weight: null,
        colors: ["Pink & Brown", "Black"],
        customizable: false,
        description:
          "A structured handbag that moves from brunch to evening without missing a beat. Available in two signature colourways.",
        images: ["/images/products/najma-handbag-pink-1.jpg"],
        colorVariants: [
          {
            label: "Pink & Brown",
            images: [
              "/images/products/najma-handbag-pink-1.jpg",
              "/images/products/najma-handbag-pink-2.jpg",
            ],
          },
          {
            label: "Black",
            images: [
              "/images/products/najma-handbag-black-1.jpg",
              "/images/products/najma-handbag-black-2.jpg",
            ],
          },
        ],
        badge: null,
        collectionName: "Najma Collection",
      },
      {
        id: "najma-clutch",
        name: "Najma Clutch",
        price: 110000,
        currency: "₦",
        measurement: null,
        weight: null,
        colors: [],
        customizable: false,
        description:
          "Our most refined piece. The Najma Clutch is an heirloom-quality evening accessory, handcrafted in limited numbers.",
        images: [
          "/images/products/najma-clutch-1.jpg",
          "/images/products/najma-clutch-2.jpg",
          "/images/products/najma-clutch-3.jpg",
          "/images/products/najma-clutch-4.jpg",
        ],
        colorVariants: [],
        badge: "Limited",
        collectionName: "Najma Collection",
      },
    ],
  },
  {
    id: "accessories",
    name: "Accessories",
    description:
      "Small but mighty — our accessory pieces bring the same handcrafted care to everyday essentials.",
    products: [
      {
        id: "key-holder",
        name: "Key Holder",
        price: 15000,
        currency: "₦",
        measurement: null,
        weight: null,
        colors: [],
        customizable: false,
        description:
          "Keep your keys together in style. A small, crocheted key holder that clips to your bag or belt loop.",
        images: ["/images/products/key-holder-1.jpg"],
        colorVariants: [],
        badge: null,
        collectionName: "Accessories",
      },
    ],
  },
  {
    id: "gadget-sleeves",
    name: "Gadget Sleeves",
    description:
      "Protective crochet sleeves for your everyday devices — cushioned, stylish, and sustainably made.",
    products: [
      {
        id: "sleeve-ipad",
        name: "iPad Sleeve",
        price: 35000,
        currency: "₦",
        measurement: null,
        weight: null,
        colors: [],
        customizable: true,
        description:
          "A fitted crochet sleeve for your iPad — protective, padded, and beautifully handmade.",
        images: ["/images/products/sleeve-ipad-1.jpg"],
        colorVariants: [],
        badge: null,
        collectionName: "Gadget Sleeves",
      },
      {
        id: "sleeve-laptop",
        name: "Laptop Sleeve",
        price: 45000,
        currency: "₦",
        measurement: null,
        weight: null,
        colors: [],
        customizable: true,
        description:
          "Keep your laptop snug in a handcrafted crochet sleeve. Available in custom sizes — just let us know your laptop dimensions.",
        images: [
          "/images/products/sleeve-laptop-1.jpg",
          "/images/products/sleeve-laptop-2.jpg",
        ],
        colorVariants: [],
        badge: "Custom sizing",
        collectionName: "Gadget Sleeves",
      },
    ],
  },
];

/**
 * Returns a flat list of all products across all collections,
 * tagged with their parent collection id and name.
 */
export function getAllProducts() {
  return collections.flatMap((collection) =>
    collection.products.map((product) => ({
      ...product,
      collectionId: collection.id,
      collectionName: collection.name,
    }))
  );
}

/**
 * Returns the bestseller products (those with a badge of "Bestseller"
 * or simply the first 3 products of the Najma collection as a fallback).
 */
export function getBestsellers() {
  const all = getAllProducts();
  const flagged = all.filter((p) => p.badge === "Bestseller");
  if (flagged.length >= 3) return flagged;
  return all.filter((p) => p.collectionId === "najma").slice(0, 3);
}

/**
 * Format a Nigerian Naira price with thousand separators.
 * Returns "Price on request" when price is null.
 */
export function formatPrice(currency, price) {
  if (price === null) return "Price on request";
  return `${currency}${price.toLocaleString("en-NG")}`;
}
