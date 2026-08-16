# Image Requirements — The Stitch Bloom

All images go in `/public/images/` (or a sub-folder as noted).
Product images are `.jpeg`. All other images are `.jpg` unless noted.

---

## 1. Product Images — `/public/images/products/`

These are generated automatically from `products.json`.
The naming pattern is `<imagePrefix>-<n>.jpeg`, where `n` starts at 1.
To add another shot of a product: drop the file in, bump `imageCount` in `products.json`.

| Product | Prefix | Count needed | Files | Status |
|---|---|---|---|---|
| Najma Tote Bag | `najma-tote` | 1 | `najma-tote-1.jpeg` | ✅ |
| Najma Shoulder Bag – Burgundy & Blue | `najma-shoulder-burgundy-blue` | 3 | `najma-shoulder-burgundy-blue-1.jpeg` … `-3.jpeg` | ✅ 🆕 |
| Najma Shoulder Bag – Pink & Rose | `najma-shoulder-pink` | 1 | `najma-shoulder-pink-1.jpeg` | ✅ |
| Najma Shoulder Bag – Charcoal | `najma-shoulder-charcoal` | 1 | `najma-shoulder-charcoal-1.jpeg` | ✅ |
| Najma Mini Bag | `najma-mini` | 1 | `najma-mini-1.jpeg` | ✅ |
| Najma Handbag – Pink & Brown | `najma-handbag-pink` | 1 | `najma-handbag-pink-1.jpeg` | ✅ |
| Najma Handbag – Black | `najma-handbag-black` | 1 | `najma-handbag-black-1.jpeg` | ✅ |
| Najma Clutch | `najma-clutch` | 4 | `najma-clutch-1.jpeg` … `najma-clutch-4.jpeg` | ✅ |
| Nwukabu Shoulder Bag – Red & Leopard Print | `nwukabu-shoulder-red` | 2 | `nwukabu-shoulder-red-1.jpeg`, `-2.jpeg` | ✅ 🆕 |
| Nwukabu Shoulder Bag – Navy & Sky Blue | `nwukabu-shoulder-navy` | 3 | `nwukabu-shoulder-navy-1.jpeg` … `-3.jpeg` | ✅ 🆕 |
| Key Holder | `key-holder` | 1 | `key-holder-1.jpeg` | ✅ |
| iPad Sleeve | `sleeve-ipad` | 1 | `sleeve-ipad-1.jpeg` | ✅ |
| Laptop Sleeve | `sleeve-laptop` | 2 | `sleeve-laptop-1.jpeg`, `sleeve-laptop-2.jpeg` | ✅ |

**To add more product shots later:** rename your file `<prefix>-<n>.jpeg` and increment `imageCount` in `products.json`. No code changes needed.

---

## 2. Hero Video — `/public/images/`

| File | What it should show | Notes |
|---|---|---|
| `hero-video.mp4` | A slow, cinematic pan across crochet bags or hands crafting. Ideally landscape, 16:9. | Used full-bleed on the Home page hero. Keep under 8 MB for fast load. No audio needed (muted autoplay). |

> **Currently missing.** Without it the hero section shows its dark overlay background.

---

## 3. About Page Images — `/public/images/`

| File | What it should show | Dimensions / notes |
|---|---|---|
| `about-hero.jpg` | Artisan hands crocheting a bag from recycled T-shirt yarn. A close-up or action shot. | Full-bleed section background. At least 1600 × 900 px. Portrait or landscape both work. |
| `about-craft.jpg` | Close-up of crochet work in progress — stitches, colour, texture. | Used in the studio intro section, roughly square or portrait. At least 800 × 900 px. |
| `founder.jpg` | Founder portrait or a natural-light candid. | Used in the founder/story section. Portrait orientation preferred (3:4 ratio). At least 600 × 800 px. |

> All three are currently missing — the images fade out gracefully via `onError`.

---

## 4. Brand Story Image — `/public/images/`

| File | What it should show | Notes |
|---|---|---|
| `brand-story.jpg` | A lifestyle shot — someone wearing or carrying a Stitch Bloom bag in a real setting. | Used in the Home page "Our Story" teaser section. Landscape, at least 1200 × 700 px. |

---

## 5. Logo — `/public/images/`

| File | What it should show | Notes |
|---|---|---|
| `logo.svg` | The Stitch Bloom wordmark or logomark. | Displayed in the navbar. SVG preferred for sharpness at all sizes. Should work on the cream background (`--color-cream`). |

---

## 6. Favicon — `/public/`

| File | Notes |
|---|---|
| `favicon.svg` | Small version of the logo or a standalone mark. Should read clearly at 32 × 32 px. |

---

## 7. Open Graph / Social Preview — `/public/images/`

Not currently wired up in `index.html`, but recommended when launching:

| File | Notes |
|---|---|
| `og-image.jpg` | 1200 × 630 px. A product flat-lay or lifestyle shot with the logo. Shown when the site is shared on social media or in messaging apps. |

---

## Summary of missing files

| Priority | File | Where used |
|---|---|---|
| 🔴 High | `/public/images/hero-video.mp4` | Home hero |
| 🔴 High | `/public/images/logo.svg` | Navbar (every page) |
| 🔴 High | `/public/favicon.svg` | Browser tab |
| 🟡 Medium | `/public/images/about-hero.jpg` | About page hero |
| 🟡 Medium | `/public/images/about-craft.jpg` | About studio section |
| 🟡 Medium | `/public/images/founder.jpg` | About founder section |
| 🟡 Medium | `/public/images/brand-story.jpg` | Home story section |
| 🟢 Low | `/public/images/og-image.jpg` | Social sharing |
