# Image Assets — The Stitch Bloom

Place your product images here. The site will automatically use them once the filenames match.

## Root images (`/public/images/`)

| File                | Used on              | Description                          |
|---------------------|----------------------|--------------------------------------|
| `hero-bg.jpg`       | Home — hero section  | Full-bleed hero background           |
| `brand-story.jpg`   | Home — brand strip   | Artisan / crafting lifestyle image   |
| `about-craft.jpg`   | About page           | Portrait or process shot             |

## Product images (`/public/images/products/`)

Name your files exactly as listed below. For each product you can add more images by continuing the numbering (e.g. `najma-tote-3.jpg`). Then add the extra paths to `src/data/products.js` in the relevant `images` or `colorVariants[].images` array.

### Najma Collection

| File                      | Product          | Notes                        |
|---------------------------|------------------|------------------------------|
| `najma-tote-1.jpg`        | Najma Tote       | Primary image                |
| `najma-tote-2.jpg`        | Najma Tote       | Second angle / detail        |
| `najma-dome-1.jpg`        | Najma Dome Bag   | Primary image                |
| `najma-hobo-1.jpg`        | Najma Hobo Bag   | Primary image                |
| `najma-ll-brown-1.jpg`    | Najma LL         | Brown Leopard — primary      |
| `najma-ll-brown-2.jpg`    | Najma LL         | Brown Leopard — second angle |
| `najma-ll-cream-1.jpg`    | Najma LL         | Cream Leopard — primary      |
| `najma-shoulder-1.jpg`    | Najma Shoulder   | Primary image                |

### Gadget Sleeves

| File                  | Product        |
|-----------------------|----------------|
| `sleeve-laptop-1.jpg` | Laptop Sleeve  |
| `sleeve-ipad-1.jpg`   | iPad Sleeve    |
| `sleeve-kindle-1.jpg` | Kindle Sleeve  |

## Tips

- Recommended ratio: **4:5** (portrait) for bags; **16:9** for hero/lifestyle images.
- Aim for **1200 × 1500 px** for product images — high resolution, compressed for web.
- Use `.jpg` for photos, `.png` for anything needing transparency.
- To add more photos to a product, just add entries to the `images` array in `src/data/products.js`.
