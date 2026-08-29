import { useState, useCallback, useRef, useLayoutEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiRefreshCw, FiUsers, FiFeather } from 'react-icons/fi';
import { useCatalog } from '../../context/CatalogContext';
import { assetUrl } from '../../utils/assetUrl';
import ProductCard from '../../components/ProductCard/ProductCard';
import DiagonalCarousel from '../../components/DiagonalCarousel/DiagonalCarousel';
import SmartImage from '../../components/SmartImage/SmartImage';
import useReveal from '../../hooks/useReveal';
import usePageMeta from '../../hooks/usePageMeta';
import '../../styles/buttons.css';
import './Home.css';
import { primaryFocalPointOf, primaryImageOf } from '../../utils/productImage';
import { siteAsset } from '../../utils/siteAssets';

/* Hero carousel: the bags — the Najma line plus any standalone pieces */
const BAG_COLLECTIONS = ['najma', 'signature'];

const CATEGORIES = [
  {
    id: 'najma',
    label: 'Najma Collection',
    sub: 'Crochet bags',
    href: '/shop#najma',
    slot: 'home-category-najma',
  },
  {
    id: 'gadget-sleeves',
    label: 'Gadget Sleeves',
    sub: 'Tech protection',
    href: '/shop#gadget-sleeves',
    slot: 'home-category-sleeves',
  },
  {
    id: 'accessories',
    label: 'Accessories',
    sub: 'The details',
    href: '/shop#accessories',
    slot: 'home-category-accessories',
  },
];

const PILLARS = [
  {
    Icon: FiRefreshCw,
    stat: '100%',
    label: 'Recycled Materials',
    description:
      'Every bag is made from repurposed T-shirt yarns — giving discarded textiles a second life.',
  },
  {
    Icon: FiUsers,
    stat: '2 wks',
    label: 'Custom Order Window',
    description:
      'Each custom piece is thoughtfully handcrafted to your specifications within two weeks.',
  },
  {
    Icon: FiFeather,
    stat: '0',
    label: 'Landfill Waste',
    description:
      'What was once destined for landfill becomes something beautiful, purposeful, and lasting.',
  },
];

/* ↗ Arrow icon for split buttons */
function ArrowDiag() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <line x1="2" y1="11" x2="11" y2="2" />
      <polyline points="4,2 11,2 11,9" />
    </svg>
  );
}

export default function Home() {
  const revealRef = useReveal();
  const { products, bestsellers, siteAssets, siteSettings } = useCatalog();
  // An owner-curated selection wins, in the order it was arranged. With none
  // set, fall back to the original rule so the landing page is never empty.
  const curated = (siteSettings?.homeCarousel || [])
    .map((id) => products.find((product) => product.id === id))
    .filter(Boolean);
  const carouselItems = (curated.length
    ? curated
    : products.filter((product) => BAG_COLLECTIONS.includes(product.collectionId)).slice(0, 6)
  )
    // Resolve the tile image up front so a product whose photos live only in a
    // colourway still shows one in the carousel.
    .map((product) => ({
      ...product,
      images: primaryImageOf(product) ? [primaryImageOf(product)] : [],
      imageFocalPoints: [primaryFocalPointOf(product)].filter(Boolean),
    }));
  usePageMeta({
    title: 'Turning Waste Into Worth',
    description: 'Handcrafted crochet bags made from 100% recycled T-shirt yarn. Crafted slowly, designed intentionally.',
    path: '/',
  });
  const [activeCarouselIdx, setActiveCarouselIdx] = useState(0);
  const activeProduct = carouselItems[activeCarouselIdx] ?? carouselItems[0];
  const [carouselLayout, setCarouselLayout] = useState({ controlsBottom: 0, lowerCardBottom: 0, stageH: 0 });
  const handleCarouselLayout = useCallback((layout) => setCarouselLayout(layout), []);
  const stageRef = useRef(null);
  const carouselSetRef = useRef(null);
  const contentRef = useRef(null);
  const supportRef = useRef(null);
  const carouselRef = useRef(null);
  const [stageMinH, setStageMinH] = useState(null);

  useLayoutEffect(() => {
    const stageEl = stageRef.current;
    const setEl = carouselSetRef.current;
    const carouselEl = carouselRef.current;
    const supportEl = supportRef.current;
    if (!stageEl || !setEl) return;

    /* Helper to measure static layout offsets, ignoring CSS transform translations
       (like the .reveal fade-up animation) which skew getBoundingClientRect() during SPA navigation */
    const getStaticOffset = (el, parent) => {
      let top = 0;
      let p = el;
      while (p && p !== parent && p !== document.body) {
        top += p.offsetTop;
        p = p.offsetParent;
      }
      return { top, bottom: top + el.offsetHeight };
    };

    /* Run measurements only after all fonts are loaded so Cormorant Garamond
       metrics are used from the start — eliminates FOUT layout shift */
    const run = () => {
      /* ── Mobile: position carousel absolutely via JS measurement ── */
      const isMobile = window.innerWidth <= 780;
      if (isMobile && carouselEl && supportEl && carouselLayout.stageH > 0) {
        const { yStep, cardTop, cardH } = carouselLayout;
        const supportBottom = getStaticOffset(supportEl, stageEl).bottom;
        
        /* Visual top of adjacent-up card (w=+1) within carousel coordinate space:
           CSS top = cardTop, translateY = -yStep, scale = 0.85 from card center.
           Visual top = cardTop - yStep + cardH*(1-0.85)/2
           We want this visual top to align with supportBottom + 16px gap (from stage top).
           So: carouselTop = supportBottom + 16 - adjacentCardVisualTop */
        const adjacentCardVisualTop = cardTop - yStep + cardH * (1 - 0.85) / 2;
        const carouselTop = Math.round(supportBottom + 16 - adjacentCardVisualTop);
        carouselEl.style.top = `${carouselTop}px`;
      } else if (carouselEl) {
        carouselEl.style.top = '';
      }

      /* ── Stage minHeight: grow hero to fit carousel-set bottom + 16px ── */
      /* Use getStaticOffset so the measurement ignores in-progress CSS transforms */
      const needed = Math.ceil(getStaticOffset(setEl, stageEl).bottom + 16);
      setStageMinH((prev) => (prev === needed ? prev : needed));
    };

    /* Wait for fonts before measuring so heading metrics are stable,
       then defer one rAF so carousel cards are fully painted —
       this covers both hard refresh (fonts loading) and SPA navigation (fonts cached) */
    const measure = () => requestAnimationFrame(run);
    if (document.fonts && document.fonts.status !== 'loaded') {
      document.fonts.ready.then(measure);
    } else {
      measure();
    }
  }, [carouselLayout]);
  return (
    <main className="page-enter" ref={revealRef}>

      {/* ── Hero + feature carousel (M&S-inspired integrated block) ── */}
      <section className="home-feature" aria-label="Landing feature">
        <div className="home-feature__shell">
          <div className="home-feature__hero">
            {/* An unset slot renders nothing at all — the overlay and its
                backdrop already carry the section, so an empty hero degrades
                to a clean colour field rather than a broken media element. */}
            {siteAsset(siteAssets, 'home-hero-video') && (
              <video
                className="home-feature__video"
                autoPlay
                loop
                muted
                playsInline
                src={assetUrl(siteAsset(siteAssets, 'home-hero-video'))}
              />
            )}
            <div className="home-feature__overlay" aria-hidden="true" />

            <div className="home-feature__stage" ref={stageRef} style={stageMinH ? { minHeight: stageMinH } : undefined}>
              <div className="home-feature__content" ref={contentRef}>
                <p className="home-feature__eyebrow reveal">New Arrivals</p>
                <h1 className="home-feature__headline reveal">
                  Built for the journey.
                </h1>
                <p className="home-feature__body reveal">
                  Handcrafted crochet bags designed for daily carry, made from reclaimed textiles and finished in small batches.
                </p>
              </div>

              <p className="home-feature__support home-feature__support--right reveal" ref={supportRef}>
                Crafted slowly. Designed intentionally. Finished for everyday use.
              </p>

              <div
                ref={carouselRef}
                className="home-feature__carousel reveal"
                style={carouselLayout.largeAnchor > 0 ? {
                  '--dc-large-anchor': `${carouselLayout.largeAnchor}px`,
                  '--dc-controls-bottom': `${carouselLayout.controlsBottom}px`,
                  '--dc-stage-h': `${carouselLayout.stageH}px`,
                } : undefined}
              >
                <DiagonalCarousel
                  items={carouselItems}
                  spread
                  onActiveChange={setActiveCarouselIdx}
                  onLayoutChange={handleCarouselLayout}
                />

                {/* ── Overlay set: info (left) + shop-all (right), bottoms aligned ── */}
                <div className="home-carousel-set" ref={carouselSetRef}>
                  {/* Portrait order 1: carousel item description */}
                  <div className="home-carousel-info reveal">
                    <p className="home-carousel-info__name">{activeProduct.name}</p>
                    <p className="home-carousel-info__desc">{activeProduct.description}</p>
                    <Link
                      to={`/shop/${activeProduct.id}`}
                      className="home-carousel-info__arrow"
                      aria-label={`View ${activeProduct.name}`}
                    >
                      <span className="btn-split__arrow btn-split__arrow--1"><ArrowDiag /></span>
                      <span className="btn-split__arrow btn-split__arrow--2"><ArrowDiag /></span>
                    </Link>
                  </div>

                  {/* Portrait order 2: shop all button */}
                  <div className="home-feature__actions reveal">
                    <Link to="/shop" className="btn-split btn-split--light">
                      <span className="btn-split__label">SHOP ALL</span>
                      <span className="btn-split__icon">
                        <span className="btn-split__arrow btn-split__arrow--1"><ArrowDiag /></span>
                        <span className="btn-split__arrow btn-split__arrow--2"><ArrowDiag /></span>
                      </span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Shop by category ── */}
      <section className="home-categories" aria-labelledby="categories-heading">
        <div className="home-categories__container container">
          <header className="home-categories__header reveal">
            <p className="home-categories__eyebrow">Collection</p>
            <h2 className="home-categories__title" id="categories-heading">
              Shop by categories
            </h2>
          </header>

          <div className="home-categories__grid">
            {CATEGORIES.map((cat) => (
              <Link key={cat.id} to={cat.href} className="home-cat-card reveal">
                <div className="home-cat-card__clip">
                  <SmartImage
                    src={siteAsset(siteAssets, cat.slot)}
                    alt={cat.label}
                    className="home-cat-card__image"
                    context="card"
                  />
                </div>
                <div className="home-cat-card__text">
                  <p className="home-cat-card__sub">{cat.sub}</p>
                  <div className="home-cat-card__bottom">
                    <p className="home-cat-card__label">{cat.label}</p>
                    <span className="home-cat-card__arrow" aria-hidden="true">
                      <span className="home-cat-card__arrow-icon home-cat-card__arrow-icon--1"><ArrowDiag /></span>
                      <span className="home-cat-card__arrow-icon home-cat-card__arrow-icon--2"><ArrowDiag /></span>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bestsellers ── */}
      <section className="section home-bestsellers" aria-labelledby="bestsellers-heading">
        <div className="container">
          <header className="home-bestsellers__header reveal">
            <p className="home-bestsellers__eyebrow">Community favourites</p>
            <h2 className="home-bestsellers__title" id="bestsellers-heading">
              Bestsellers
            </h2>
            <p className="home-bestsellers__subtitle">
              Our most-loved pieces — each one handcrafted with care and
              recycled with purpose.
            </p>
          </header>

          <div className="home-bestsellers__grid reveal-stagger">
            {bestsellers.map((product) => (
              <div key={product.id} className="reveal">
                <ProductCard product={product} showCollection />
              </div>
            ))}
          </div>

          <div className="home-bestsellers__cta">
            <Link to="/shop" className="btn-split">
              <span className="btn-split__label">View All Products</span>
              <span className="btn-split__icon">
                <span className="btn-split__arrow btn-split__arrow--1"><ArrowDiag /></span>
                <span className="btn-split__arrow btn-split__arrow--2"><ArrowDiag /></span>
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Brand story strip ── */}
      <section className="home-brand-strip" aria-label="About The Stitch Bloom">
        <div className="home-brand-strip__image-side">
          {siteAsset(siteAssets, 'home-brand-story') && (
            <SmartImage
              className="home-brand-strip__image"
              src={siteAsset(siteAssets, 'home-brand-story')}
              context="wide"
              alt="Artisan crocheting a bag from recycled yarn"
            />
          )}
        </div>

        <div className="home-brand-strip__text-side reveal">
          <p className="home-brand-strip__eyebrow">Our story</p>
          <h2 className="home-brand-strip__title">
            Fashion that gives <em>back</em> to the earth.
          </h2>
          <p className="home-brand-strip__body">
            The Stitch Bloom creates handcrafted crochet bags from recycled
            textiles, combining style with sustainability while empowering women.
            Each piece transforms what would have been waste into something
            meaningful, purposeful, and lasting.
          </p>
          <Link to="/about" className="btn-split btn-split--light">
            <span className="btn-split__label">Read Our Story</span>
            <span className="btn-split__icon">
              <span className="btn-split__arrow btn-split__arrow--1"><ArrowDiag /></span>
              <span className="btn-split__arrow btn-split__arrow--2"><ArrowDiag /></span>
            </span>
          </Link>
        </div>
      </section>

      {/* ── Vision quote ── */}
      <section className="section home-vision" aria-label="Our vision">
        <div className="container">
          <p className="home-vision__eyebrow">Vision</p>
          <blockquote className="home-vision__quote reveal">
            "A future where textile waste is transformed into yarn, creating a
            circular system that supports both fashion and community."
          </blockquote>
          <div className="home-vision__divider" aria-hidden="true" />
          <p className="home-vision__body">
            We are building towards a world where what is discarded becomes the
            foundation of what is created — and where every bag tells a story of
            renewal.
          </p>
        </div>
      </section>

      {/* ── Sustainability pillars ── */}
      <section className="section home-pillars" aria-labelledby="pillars-heading">
        <div className="container">
          <header className="home-pillars__header">
            <p className="home-pillars__eyebrow">Why it matters</p>
            <h2 className="home-pillars__title" id="pillars-heading">
              Conscious by design
            </h2>
          </header>

          <div className="home-pillars__grid reveal-stagger">
            {PILLARS.map(({ Icon, stat, label, description }) => (
              <div key={label} className="home-pillar reveal">
                <span className="home-pillar__icon" aria-hidden="true">
                  <Icon size={22} strokeWidth={1.4} />
                </span>
                <p className="home-pillar__stat">{stat}</p>
                <p className="home-pillar__label">{label}</p>
                <p className="home-pillar__description">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="home-cta-banner" aria-label="Shop call to action">
        <div className="home-cta-banner__bg-text" aria-hidden="true">Bloom</div>
        <div className="home-cta-banner__content container">
          <h2 className="home-cta-banner__title">
            Carry something worth carrying.
          </h2>
          <p className="home-cta-banner__subtitle">
            Every purchase supports sustainable craft and empowers the women who
            make each piece by hand.
          </p>
          <Link to="/shop" className="btn-split btn-split--light">
            <span className="btn-split__label">Explore the Collection</span>
            <span className="btn-split__icon">
              <span className="btn-split__arrow btn-split__arrow--1"><ArrowDiag /></span>
              <span className="btn-split__arrow btn-split__arrow--2"><ArrowDiag /></span>
            </span>
          </Link>
        </div>
      </section>

    </main>
  );
}
