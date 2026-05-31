const fs = require('fs');
let css = fs.readFileSync('src/pages/Home/Home.css', 'utf-8');

// Replace everything from the top down to /* ── Shop by category ── */
const shopIndex = css.indexOf('/* ── Shop by category ── */');

const newHeroCss = `/* ============================================================
   Home Page
   ============================================================ */

/* ── Hero section — Full viewport video ── */
.home-hero {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background-color: var(--color-brown-deep);
}

.home-hero__video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.home-hero__overlay {
  position: absolute;
  inset: 0;
  background-color: rgba(93, 64, 55, 0.5); /* As requested */
}

/* Centered text block */
.home-hero__content {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 0 20px;
  gap: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.home-hero__eyebrow {
  font-size: var(--size-xs);
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--color-rose-dust);
}

.home-hero__headline {
  font-family: var(--font-heading);
  font-size: clamp(var(--size-2xl), 5vw, var(--size-5xl));
  font-weight: 300;
  line-height: 1.08;
  color: var(--color-white);
  max-width: 18ch;
}

.home-hero__headline em {
  font-style: italic;
  color: var(--color-rose-dust);
}

.home-hero__tagline {
  font-size: var(--size-sm);
  font-weight: 300;
  color: var(--color-cream-dark);
  max-width: 32ch;
  line-height: 1.7;
}

.home-hero__actions {
  display: flex;
  justify-content: center;
  margin-top: 10px;
}

/* ── Carousel Section ── */
.home-carousel-section {
  background-color: var(--color-cream);
  padding: 40px 0;
  overflow: hidden;
  width: 100%;
}

.home-carousel-wrapper {
  max-width: 1400px;
  margin: 0 auto;
  /* NO padding here, let DiagonalCarousel span or manage itself cleanly */
}

`;

css = newHeroCss + css.substring(shopIndex);

// Now fix the categories spacing and max-width.
// We'll replace `.home-categories {` with max-width containment
css = css.replace('.home-categories {', '.home-categories {\n  padding: 80px 0;\n');
css = css.replace('.home-categories__container {', '.home-categories__container {\n  max-width: 1400px;\n  margin: 0 auto;\n  padding: 0 20px;\n');

// Set grid gaps to 10px multiples
css = css.replace('gap: var(--space-sm);', 'gap: 10px;');

// Also remove old .home-feature responsive media queries
css = css.replace(/\@media \(max-width: 900px\) \{[\s\S]*?\.home-feature \{[\s\S]*?min-height: auto;\n  \}/, '@media (max-width: 900px) {\n');
css = css.replace(/\.home-feature__text \{[\s\S]*?align-items: flex-start;\n  \}/, '');
css = css.replace(/\.home-feature__carousel \{[\s\S]*?min-height: 400px;\n  \}/, '');

css = css.replace(/\.home-feature__headline \{[\s\S]*?\}\n/, '');

fs.writeFileSync('src/pages/Home/Home.css', css);
console.log("Updated Home.css structure");
