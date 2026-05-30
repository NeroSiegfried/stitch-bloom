import { Link } from 'react-router-dom';
import { getBestsellers } from '../../data/products';
import ProductCard from '../../components/ProductCard/ProductCard';
import useReveal from '../../hooks/useReveal';
import '../../styles/buttons.css';
import './Home.css';

const bestsellers = getBestsellers();

const MARQUEE_ITEMS = [
  'Handcrafted in Nigeria',
  'Recycled T-shirt Yarns',
  'Slow Fashion',
  'Made to Order',
  'Empowering Women',
  'Circular Fashion',
];

const PILLARS = [
  {
    icon: '♻️',
    stat: '100%',
    label: 'Recycled Materials',
    description:
      'Every bag is made from repurposed T-shirt yarns — giving discarded textiles a second life.',
  },
  {
    icon: '🤝',
    stat: '2 wks',
    label: 'Custom Order Window',
    description:
      'Each custom piece is thoughtfully handcrafted to your specifications within two weeks.',
  },
  {
    icon: '🌿',
    stat: '0',
    label: 'Landfill Waste',
    description:
      'What was once destined for landfill becomes something beautiful, purposeful, and lasting.',
  },
];

export default function Home() {
  const revealRef = useReveal();
  return (
    <main className="page-enter" ref={revealRef}>
      {/* ── Hero ── */}
      <section className="home-hero" aria-label="Hero">
        <div className="home-hero__background">
          <img
            className="home-hero__bg-image"
            src="/images/hero-bg.jpg"
            alt="Handcrafted crochet bags from The Stitch Bloom"
          />
          <div className="home-hero__overlay" aria-hidden="true" />
        </div>

        <div className="home-hero__content container">
          <p className="home-hero__eyebrow">New arrivals — Najma Collection</p>
          <h1 className="home-hero__headline">
            Turning <em>waste</em> into worth.
          </h1>
          <p className="home-hero__tagline">
            Handcrafted crochet bags from recycled textiles — made for the
            modern woman who values both aesthetics and impact.
          </p>
          <div className="home-hero__actions">
            <Link to="/shop" className="btn btn--light">
              Shop Now
            </Link>
            <Link to="/shop" className="btn btn--light-outline">
              Explore the Collection
            </Link>
          </div>
        </div>

        <div className="home-hero__scroll-hint" aria-hidden="true">
          <span>Scroll</span>
          <span>↓</span>
        </div>
      </section>

      {/* ── Marquee ── */}
      <div className="home-marquee" aria-hidden="true">
        <div className="home-marquee__track">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <span key={i} className="home-marquee__item">
              {item}
              <span className="home-marquee__separator">✦</span>
            </span>
          ))}
        </div>
      </div>

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
            <Link to="/shop" className="btn btn--secondary">
              View All Products
            </Link>
          </div>
        </div>
      </section>

      {/* ── Brand story strip ── */}
      <section className="home-brand-strip" aria-label="About The Stitch Bloom">
        <div className="home-brand-strip__image-side">
          <img
            className="home-brand-strip__image"
            src="/images/brand-story.jpg"
            alt="Artisan crocheting a bag from recycled yarn"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.style.removeProperty('display');
            }}
          />
          <div className="home-brand-strip__placeholder" style={{ display: 'none' }} aria-hidden="true">
            <span className="home-brand-strip__placeholder-icon">🧶</span>
          </div>
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
          <Link to="/about" className="btn btn--light">
            Read Our Story
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
            {PILLARS.map(({ icon, stat, label, description }) => (
              <div key={label} className="home-pillar reveal">
                <span className="home-pillar__icon" aria-hidden="true">{icon}</span>
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
        <div className="home-cta-banner__bg-text" aria-hidden="true">
          Bloom
        </div>
        <div className="home-cta-banner__content container">
          <h2 className="home-cta-banner__title">
            Carry something worth carrying.
          </h2>
          <p className="home-cta-banner__subtitle">
            Every purchase supports sustainable craft and empowers the women who
            make each piece by hand.
          </p>
          <Link to="/shop" className="btn btn--light">
            Explore the Collection
          </Link>
        </div>
      </section>
    </main>
  );
}
