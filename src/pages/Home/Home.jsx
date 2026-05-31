import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiRefreshCw, FiUsers, FiFeather } from 'react-icons/fi';
import { getBestsellers, getAllProducts } from '../../data/products';
import { assetUrl } from '../../utils/assetUrl';
import ProductCard from '../../components/ProductCard/ProductCard';
import DiagonalCarousel from '../../components/DiagonalCarousel/DiagonalCarousel';
import useReveal from '../../hooks/useReveal';
import '../../styles/buttons.css';
import './Home.css';

const bestsellers = getBestsellers();
/* Use all Najma products (up to 5) for the hero carousel */
const carouselItems = getAllProducts().filter((p) => p.collectionId === 'najma').slice(0, 5);

const CATEGORIES = [
  {
    id: 'najma',
    label: 'Najma Collection',
    sub: 'Crochet bags',
    href: '/shop#najma',
    image: assetUrl('/images/products/najma-tote-1.jpeg'),
  },
  {
    id: 'gadget-sleeves',
    label: 'Gadget Sleeves',
    sub: 'Tech protection',
    href: '/shop#gadget-sleeves',
    image: assetUrl('/images/products/sleeve-laptop-1.jpeg'),
  },
  {
    id: 'accessories',
    label: 'Accessories',
    sub: 'The details',
    href: '/shop#accessories',
    image: assetUrl('/images/products/key-holder-1.jpeg'),
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
  const [activeCarouselIdx, setActiveCarouselIdx] = useState(0);
  const activeProduct = carouselItems[activeCarouselIdx] ?? carouselItems[0];
  return (
    <main className="page-enter" ref={revealRef}>

      {/* ── Hero + feature carousel (M&S-inspired integrated block) ── */}
      <section className="home-feature" aria-label="Landing feature">
        <div className="home-feature__shell">
          <div className="home-feature__hero">
            <video
              className="home-feature__video"
              autoPlay
              loop
              muted
              playsInline
              src={assetUrl('/images/hero-video.mp4')}
            />
            <div className="home-feature__overlay" aria-hidden="true" />

            <div className="home-feature__stage">
              <div className="home-feature__content">
                <p className="home-feature__eyebrow reveal">New Arrivals</p>
                <h1 className="home-feature__headline reveal">
                  Built for the journey.
                </h1>
                <p className="home-feature__body reveal">
                  Handcrafted crochet bags designed for daily carry, made from reclaimed textiles and finished in small batches.
                </p>
              </div>

              <p className="home-feature__support home-feature__support--right reveal">
                Crafted slowly. Designed intentionally. Finished for everyday use.
              </p>

              <div className="home-feature__carousel reveal">
                <DiagonalCarousel items={carouselItems} spread onActiveChange={setActiveCarouselIdx} />
              </div>

              <div className="home-feature__actions reveal">
                <Link to="/shop" className="btn-split btn-split--light">
                  <span className="btn-split__label">SHOP ALL</span>
                  <span className="btn-split__icon">
                    <span className="btn-split__arrow btn-split__arrow--1"><ArrowDiag /></span>
                    <span className="btn-split__arrow btn-split__arrow--2"><ArrowDiag /></span>
                  </span>
                </Link>
              </div>

              {/* ── Carousel product info — inside hero, bottom-left ── */}
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
                  <img
                    src={cat.image}
                    alt={cat.label}
                    className="home-cat-card__image"
                    onError={(e) => { e.target.style.display = 'none'; }}
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
          <img
            className="home-brand-strip__image"
            src={assetUrl('/images/brand-story.jpg')}
            alt="Artisan crocheting a bag from recycled yarn"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
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
