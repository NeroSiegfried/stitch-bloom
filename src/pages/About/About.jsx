import { Link } from 'react-router-dom';
import { assetUrl } from '../../utils/assetUrl';
import { FiPackage, FiScissors, FiHeart } from 'react-icons/fi';
import useReveal from '../../hooks/useReveal';
import { SITE_CONFIG } from '../../data/siteConfig';
import '../../styles/buttons.css';
import './About.css';

/* ── Diagonal arrow (used in btn-split) ── */
function ArrowDiag() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <line x1="2" y1="12" x2="12" y2="2" />
      <polyline points="4,2 12,2 12,10" />
    </svg>
  );
}

const STATS = [
  { stat: '100%',   label: 'Recycled materials', body: 'Every bag is made entirely from repurposed T-shirt yarns, diverting textile waste from landfills.' },
  { stat: '0',      label: 'Synthetic additives', body: 'We add nothing artificial — no dyes, no plastics, no shortcuts. Just yarn and craft.' },
  { stat: 'Bespoke', label: 'Made to order',      body: 'Most pieces are handcrafted to your specifications — no mass production, no overstock.' },
];

export default function About() {
  const revealRef = useReveal();

  return (
    <main className="page-enter" ref={revealRef}>

      {/* ── Hero ── */}
      <section className="about-hero" aria-label="About hero">
        <div className="about-hero__image-wrap">
          <img
            className="about-hero__image"
            src={assetUrl('/images/about-hero.jpg')}
            alt="Artisan hands crocheting a bag from recycled T-shirt yarn"
            onError={(e) => { e.currentTarget.style.opacity = 0; }}
          />
          <div className="about-hero__overlay" aria-hidden="true" />
        </div>
        <div className="about-hero__content">
          <p className="about-hero__eyebrow">Our Story</p>
          <h1 className="about-hero__title">
            Fashion can be beautiful<br /><em>and</em> responsible.
          </h1>
        </div>
      </section>

      {/* ── Studio intro ── */}
      <section className="section about-studio" aria-labelledby="studio-heading">
        <div className="container">
          <div className="about-studio__layout">
            <div className="about-studio__text">
              <p className="about-studio__eyebrow">The Studio</p>
              <h2 className="about-studio__title" id="studio-heading">
                A sustainable fashion brand born from purpose.
              </h2>
              <p className="about-studio__body">
                The Stitch Bloom is a sustainable fashion brand creating
                handcrafted crochet bags from repurposed T-shirt yarns. At the
                heart of our work is a simple idea: fashion can be beautiful and
                responsible.
              </p>
              <p className="about-studio__body">
                Each piece is carefully handcrafted using recycled and repurposed
                textiles, transforming what would have been waste into functional,
                stylish accessories. Designed for the modern woman who values both
                aesthetics and impact.
              </p>
              <Link to="/shop" className="btn-split btn-split--primary">
                <span className="btn-split__label">Shop the Collection</span>
                <span className="btn-split__icon" aria-hidden="true">
                  <span className="btn-split__arrow btn-split__arrow--1"><ArrowDiag /></span>
                  <span className="btn-split__arrow btn-split__arrow--2"><ArrowDiag /></span>
                </span>
              </Link>
            </div>
            <div className="about-studio__image-wrap">
              <img
                className="about-studio__image"
                src={assetUrl('/images/about-craft.jpg')}
                alt="Close-up of crochet work in progress"
                onError={(e) => { e.currentTarget.style.opacity = 0; }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Impact / textile waste ── */}
      <section className="section about-impact" aria-labelledby="impact-heading">
        <div className="container about-impact__inner">
          <div className="about-impact__text-col">
            <p className="about-impact__eyebrow">The Problem We're Solving</p>
            <h2 className="about-impact__title" id="impact-heading">
              Textile waste is a growing crisis.
            </h2>
            <p className="about-impact__body">
              Textile waste — particularly from fast fashion — is one of the
              fastest-growing environmental challenges of our time. When left in
              landfills, fabrics take years to decompose, releasing harmful
              substances such as toxic chemicals, microplastics, and synthetic
              fibers into the soil.
            </p>
            <p className="about-impact__body">
              When dumped into water bodies, discarded textiles contribute to
              pollution that harms marine life and the wider ecosystem.
            </p>
            <p className="about-impact__body">
              At The Stitch Bloom, we see waste not as an end but as a beginning —
              an opportunity to create something meaningful, purposeful, and
              lasting. By transforming recycled T-shirt yarns into handcrafted
              bags, we close the loop on textile waste one stitch at a time.
            </p>
          </div>
          <div className="about-impact__quote-col">
            <blockquote className="about-impact__pullquote">
              "We see waste not as an end but as a beginning."
            </blockquote>
          </div>
        </div>
      </section>

      {/* ── Stats grid ── */}
      <section className="section about-stats" aria-label="Our commitments">
        <div className="container">
          <div className="about-stats__grid">
            {STATS.map(({ stat, label, body }) => (
              <div key={label} className="about-stat-card">
                <p className="about-stat-card__stat">{stat}</p>
                <p className="about-stat-card__label">{label}</p>
                <p className="about-stat-card__body">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Vision ── */}
      <section className="section about-vision" aria-labelledby="vision-heading">
        <div className="container about-vision__inner">
          <p className="about-vision__eyebrow">Our Vision</p>
          <h2 className="about-vision__title" id="vision-heading">
            A circular future for fashion and community.
          </h2>
          <div className="about-vision__divider" aria-hidden="true" />
          <p className="about-vision__body">
            We are building towards a future where textile waste is transformed
            into yarn, creating a circular system that supports both fashion and
            community. Where craft empowers, and where every purchase is a vote
            for a better world.
          </p>
        </div>
      </section>

      {/* ── Delivery windows ── */}
      <section className="section about-delivery" aria-labelledby="delivery-heading">
        <div className="container">
          <header className="about-delivery__header">
            <p className="about-delivery__eyebrow">Order &amp; Delivery</p>
            <h2 className="about-delivery__title" id="delivery-heading">
              Crafted with care, delivered with precision.
            </h2>
          </header>

          <div className="about-delivery__cards">
            <div className="about-delivery__card">
              <FiPackage size={28} className="about-delivery__card-icon" aria-hidden="true" />
              <p className="about-delivery__card-window">{SITE_CONFIG.deliveryWindows.premade}</p>
              <p className="about-delivery__card-label">Pre-made orders</p>
              <p className="about-delivery__card-note">
                In-stock pieces shipped within one week of payment confirmation.
              </p>
            </div>

            <div className="about-delivery__card">
              <FiScissors size={28} className="about-delivery__card-icon" aria-hidden="true" />
              <p className="about-delivery__card-window">{SITE_CONFIG.deliveryWindows.custom}</p>
              <p className="about-delivery__card-label">Custom-made orders</p>
              <p className="about-delivery__card-note">
                Bespoke pieces handcrafted to your specifications and delivered
                within two weeks.
              </p>
            </div>

            <div className="about-delivery__card">
              <FiHeart size={28} className="about-delivery__card-icon" aria-hidden="true" />
              <p className="about-delivery__card-window">Bespoke</p>
              <p className="about-delivery__card-label">Colour customisation</p>
              <p className="about-delivery__card-note">
                Choose your colourway and we will handcraft your piece to match your vision.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Founder ── */}
      <section className="section about-founder" aria-labelledby="founder-heading">
        <div className="container">
          <div className="about-founder__layout">
            <div className="about-founder__image-wrap">
              <img
                className="about-founder__image"
                src={assetUrl('/images/founder.jpg')}
                alt="Whebuma Maigari, founder of The Stitch Bloom"
                onError={(e) => { e.currentTarget.style.opacity = 0; }}
              />
            </div>
            <div className="about-founder__text">
              <p className="about-founder__eyebrow">The Maker</p>
              <h2 className="about-founder__name" id="founder-heading">
                {SITE_CONFIG.founder}
              </h2>
              <p className="about-founder__role">
                Founder &amp; Lead Artisan, The Stitch Bloom
              </p>
              <p className="about-founder__bio">
                Whebuma started The Stitch Bloom with a needle, some recycled
                yarn, and a conviction that beautiful things should not cost the
                earth. Every bag she designs carries that intention.
              </p>
              <Link to="/contact" className="btn-split btn-split--primary">
                <span className="btn-split__label">Get in Touch</span>
                <span className="btn-split__icon" aria-hidden="true">
                  <span className="btn-split__arrow btn-split__arrow--1"><ArrowDiag /></span>
                  <span className="btn-split__arrow btn-split__arrow--2"><ArrowDiag /></span>
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}
