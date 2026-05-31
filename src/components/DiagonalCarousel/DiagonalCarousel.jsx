import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Link } from 'react-router-dom';
import { assetUrl } from '../../utils/assetUrl';
import './DiagonalCarousel.css';

/* M&S-style straight arrow: path M5 12h14M12 5l7 7-7 7, rotated 180deg for prev */
function NavSvg({ rotate }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1" strokeLinecap="square" strokeLinejoin="miter"
      style={{ display: 'block', transform: rotate ? 'rotate(180deg)' : 'none' }}
      aria-hidden="true">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}



/**
 * DiagonalCarousel — faithful recreation of the Moss & Stone stacked diagonal carousel.
 *
 * From DOM analysis at 1440px:
 *   card size  : 350 × 574 px (ratio 1:1.64)
 *   step offset: +390px X, -100px Y per position to the right
 *   side cards : scale(0.85), opacity 0.5
 *   nav buttons: 50×50px, transparent bg, 1px solid brown, two overlapping absolute SVGs
 *
 * Props:
 *   items   — array of product objects
 *   compact — hide dots
 *   spread  — use measured container width for responsive sizing
 */
export default function DiagonalCarousel({ items, compact = false, spread = false, onActiveChange }) {
  const [active, setActive] = useState(0);
  const timerRef = useRef(null);
  const containerRef = useRef(null);
  const [cw, setCw] = useState(0);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setCw(el.offsetWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* Auto-advance */
  useEffect(() => {
    onActiveChange?.(0);
    timerRef.current = setInterval(() => {
      setActive((prev) => {
        const next = (prev + 1) % items.length;
        onActiveChange?.(next);
        return next;
      });
    }, 4000);
    return () => clearInterval(timerRef.current);
  }, [items.length]);

  const goTo = (idx) => {
    if (idx === active) return;
    clearInterval(timerRef.current);
    setActive(idx);
    onActiveChange?.(idx);
    timerRef.current = setInterval(() => {
      setActive((prev) => {
        const next = (prev + 1) % items.length;
        onActiveChange?.(next);
        return next;
      });
    }, 4000);
  };

  const prev = () => goTo((active - 1 + items.length) % items.length);
  const next = () => goTo((active + 1) % items.length);

  /*
   * Responsive card width: scales from 50% of container at mobile to max 350px at desktop.
   * Minimum 180px so cards stay legible on narrow viewports.
   * M&S geometry: xStep ≈ 1.114× cardW, yStep ≈ 0.286× cardW
   */
  const cardW = cw > 0
    ? Math.round(Math.max(180, Math.min(cw * 0.50, 350)))
    : 350;
  const cardH = Math.round(cardW * 1.64);
  const xStep = Math.round(cardW * 1.114);
  const yStep = Math.round(cardW * 0.286);
  const visibleSide = 2;
  const stageH = cardH + yStep * visibleSide * 2 + 72; /* 72px reserved for controls */
  const cardLeft = cw > 0 ? Math.round((cw - cardW) / 2) : 0;
  const cardTop  = Math.round(yStep * visibleSide); /* centre card vertically in stage */

  return (
    <div className="dc" ref={containerRef} aria-label="Product carousel" role="region">
      <div
        className="dc__stage"
        aria-live="polite"
        style={cw > 0 ? { height: stageH } : undefined}
      >
        {items.map((item, i) => {
          const total = items.length;
          let w = i - active;
          if (w >  total / 2) w -= total;
          if (w < -total / 2) w += total;

          const isActive = w === 0;
          const absW = Math.abs(w);

          /* Only render cards within visible range */
          if (absW > visibleSide) return null;

          /*
           * Positive w  → card is to the RIGHT  → X increases, Y decreases
           * Negative w  → card is to the LEFT   → X decreases, Y increases
           * Matches M&S: left cards go up-right, right cards go down-left
           */
          const tx = w * xStep;
          const ty = -w * yStep;
          const scale  = isActive ? 1 : 0.85;
          const opacity = isActive ? 1 : 0.5;
          const zIndex  = isActive ? items.length + 1 : items.length - absW;

          return (
            <div
              key={item.id}
              className={`dc__card${isActive ? ' dc__card--active' : ''}`}
              style={{
                width: cardW,
                height: cardH,
                top: cardTop,
                left: cardLeft,
                transform: `translateX(${tx}px) translateY(${ty}px) scale(${scale})`,
                opacity,
                zIndex,
                transition: 'transform 0.6s cubic-bezier(0.25, 0, 0, 1), opacity 0.45s ease',
              }}
              onClick={() => !isActive && goTo(i)}
              role={isActive ? undefined : 'button'}
              aria-label={isActive ? item.name : `Go to ${item.name}`}
              tabIndex={isActive ? -1 : 0}
              onKeyDown={(e) => e.key === 'Enter' && !isActive && goTo(i)}
            >
              {isActive ? (
                <Link
                  to={`/shop/${item.id}`}
                  className="dc__card-link"
                  aria-label={`View ${item.name}`}
                  tabIndex={0}
                >
                  <img
                    src={item.images?.[0]}
                    alt={item.name}
                    className="dc__card-image"
                    style={{ objectPosition: item.imageFocalPoints?.[0] ?? 'center' }}
                    onError={(e) => { e.target.src = assetUrl('/images/products/placeholder.svg'); }}
                  />
                </Link>
              ) : (
                <img
                  src={item.images?.[0]}
                  alt={item.name}
                  className="dc__card-image"
                  style={{ objectPosition: item.imageFocalPoints?.[0] ?? 'center' }}
                  onError={(e) => { e.target.src = assetUrl('/images/products/placeholder.svg'); }}
                />
              )}
              {item.badge && <span className="dc__card-badge">{item.badge}</span>}
            </div>
          );
        })}
      </div>

      {/* Controls: prev / dots / next — absolutely placed at bottom-left like M&S */}
      <div className="dc__controls">
        <button className="dc__nav-btn dc__nav-btn--left" onClick={prev} aria-label="Previous product">
          <span className="dc__nav-arrow dc__nav-arrow--1"><NavSvg rotate /></span>
          <span className="dc__nav-arrow dc__nav-arrow--2"><NavSvg rotate /></span>
        </button>

        {!compact && (
          <div className="dc__dots" role="tablist" aria-label="Carousel navigation">
            {items.map((item, i) => (
              <button
                key={item.id}
                role="tab"
                aria-selected={i === active}
                aria-label={`Go to ${item.name}`}
                className={`dc__dot${i === active ? ' dc__dot--active' : ''}`}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
        )}

        <button className="dc__nav-btn dc__nav-btn--right" onClick={next} aria-label="Next product">
          <span className="dc__nav-arrow dc__nav-arrow--1"><NavSvg /></span>
          <span className="dc__nav-arrow dc__nav-arrow--2"><NavSvg /></span>
        </button>
      </div>

    </div>
  );
}
