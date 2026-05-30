import { Link } from 'react-router-dom';
import useReveal from '../../hooks/useReveal';
import '../../styles/buttons.css';
import './About.css';

export default function About() {
  const revealRef = useReveal();
  return (
    <main className="page-enter" ref={revealRef}>
      {/* ── Page header ── */}
      <header className="about-header">
        <p className="about-header__eyebrow">Our Story</p>
        <h1 className="about-header__title">
          Fashion can be beautiful <em>and</em> responsible.
        </h1>
      </header>

      {/* ── Brand intro ── */}
      <section className="section about-intro" aria-labelledby="about-intro-heading">
        <div className="container">
          <div className="about-intro__layout">
            <div className="about-intro__image-wrap">
              <img
                className="about-intro__image"
                src="/images/about-craft.jpg"
                alt="Artisan crocheting a bag from recycled T-shirt yarn"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.style.removeProperty('display');
                }}
              />
              <div className="about-intro__placeholder" style={{ display: 'none' }} aria-hidden="true">
                🧶
              </div>
            </div>

            <div className="about-intro__text">
              <p className="about-intro__eyebrow">The Stitch Bloom</p>
              <h2 className="about-intro__headline" id="about-intro-heading">
                A sustainable fashion brand born from purpose.
              </h2>
              <p className="about-intro__body">
                The Stitch Bloom is a sustainable fashion brand creating
                handcrafted crochet bags from repurposed T-shirt yarns. At the
                heart of our work is a simple idea: fashion can be beautiful and
                responsible.
              </p>
              <p className="about-intro__body">
                Each piece is carefully handcrafted using recycled and repurposed
                textiles, transforming what would have been waste into functional,
                stylish accessories. Our bags are designed for the modern woman
                who values both aesthetics and impact.
              </p>
              <Link to="/shop" className="btn btn--primary">
                Shop the Collection
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Textile waste impact ── */}
      <section className="section about-impact" aria-labelledby="impact-heading">
        <div className="container">
          <header className="about-impact__header">
            <p className="about-impact__eyebrow">The problem we're solving</p>
            <h2 className="about-impact__title" id="impact-heading">
              Textile waste is a growing crisis.
            </h2>
          </header>

          <p className="about-impact__body">
            Textile waste — particularly from fast fashion — is one of the
            fastest-growing environmental challenges of our time. When left in
            landfills, fabrics take years to decompose, releasing harmful
            substances such as toxic chemicals, microplastics, and synthetic
            fibers into the soil.
          </p>

          <blockquote className="about-impact__pullquote">
            <p>
              When dumped into water bodies, discarded textiles contribute to
              pollution that harms marine life and the wider ecosystem.
            </p>
          </blockquote>

          <p className="about-impact__body">
            At The Stitch Bloom, we see waste not as an end but as a beginning —
            an opportunity to create something meaningful, purposeful, and
            lasting. By transforming recycled T-shirt yarns into handcrafted
            bags, we close the loop on textile waste one stitch at a time.
          </p>
        </div>
      </section>

      {/* ── Vision ── */}
      <section className="section about-vision" aria-labelledby="vision-heading">
        <div className="container">
          <p className="about-vision__eyebrow">Our Vision</p>
          <h2 className="about-vision__title" id="vision-heading">
            A circular future for fashion and community.
          </h2>
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
            <p className="about-delivery__eyebrow">Order & Delivery</p>
            <h2 className="about-delivery__title" id="delivery-heading">
              Crafted with care, delivered with precision.
            </h2>
          </header>

          <div className="about-delivery__cards">
            <div className="about-delivery__card">
              <div className="about-delivery__card-icon" aria-hidden="true">🛍️</div>
              <p className="about-delivery__card-window">1 week</p>
              <p className="about-delivery__card-label">Pre-made orders</p>
              <p className="about-delivery__card-note">
                In-stock pieces shipped within one week of payment confirmation.
              </p>
            </div>

            <div className="about-delivery__card">
              <div className="about-delivery__card-icon" aria-hidden="true">✨</div>
              <p className="about-delivery__card-window">2 weeks</p>
              <p className="about-delivery__card-label">Custom-made orders</p>
              <p className="about-delivery__card-note">
                Bespoke pieces handcrafted to your specifications and delivered
                within two weeks.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Founder ── */}
      <section className="section about-founder" aria-labelledby="founder-heading">
        <div className="container">
          <p className="about-founder__eyebrow">The Maker</p>
          <h2 className="about-founder__name" id="founder-heading">
            Whebuma Maigari
          </h2>
          <p className="about-founder__role">Founder &amp; Lead Artisan, The Stitch Bloom</p>
        </div>
      </section>
    </main>
  );
}
