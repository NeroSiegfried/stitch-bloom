import { useState, useCallback } from 'react';
import './ImageGallery.css';

/**
 * ImageGallery
 *
 * Props:
 *   images        — string[]                 flat list of image paths (used when no variants)
 *   colorVariants — { label, images }[]      optional alternate colourways
 *   badge         — string | null            badge text (e.g. "Bestseller")
 *   altBase       — string                   base alt text for images
 */
export default function ImageGallery({ images = [], colorVariants = [], badge, altBase = '' }) {
  const hasVariants = colorVariants.length > 0;

  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  /* Resolve the current image list based on selected variant or plain images */
  const currentImages = hasVariants
    ? (colorVariants[activeVariantIndex]?.images ?? [])
    : images;

  const total = currentImages.length;
  const src   = currentImages[activeImageIndex];

  const goTo = useCallback((index) => {
    setActiveImageIndex(Math.max(0, Math.min(index, total - 1)));
  }, [total]);

  const handleVariantChange = (index) => {
    setActiveVariantIndex(index);
    setActiveImageIndex(0);
  };

  return (
    <div className="gallery">
      {/* Main stage */}
      <div className="gallery__stage">
        {src ? (
          <img
            className="gallery__stage-image"
            src={src}
            alt={`${altBase}${hasVariants ? ` – ${colorVariants[activeVariantIndex]?.label}` : ''}, view ${activeImageIndex + 1}`}
            loading="lazy"
          />
        ) : (
          /* Placeholder when no image is provided yet */
          <div className="gallery__placeholder" aria-hidden="true">
            <span>Image coming soon</span>
          </div>
        )}

        {badge && <span className="gallery__badge">{badge}</span>}

        {total > 1 && (
          <>
            <button
              className="gallery__arrow gallery__arrow--prev"
              aria-label="Previous image"
              onClick={() => goTo(activeImageIndex - 1)}
              disabled={activeImageIndex === 0}
            >
              ‹
            </button>
            <button
              className="gallery__arrow gallery__arrow--next"
              aria-label="Next image"
              onClick={() => goTo(activeImageIndex + 1)}
              disabled={activeImageIndex === total - 1}
            >
              ›
            </button>
          </>
        )}
      </div>

      {/* Dot indicators for quick navigation */}
      {total > 1 && (
        <div className="gallery__dots" role="tablist" aria-label="Image navigation">
          {currentImages.map((_, i) => (
            <button
              key={i}
              className={`gallery__dot${i === activeImageIndex ? ' gallery__dot--active' : ''}`}
              role="tab"
              aria-selected={i === activeImageIndex}
              aria-label={`View image ${i + 1}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      )}

      {/* Thumbnails strip (shown when 2+ images) */}
      {total > 1 && (
        <div className="gallery__thumbnails" role="list" aria-label="Image thumbnails">
          {currentImages.map((thumbSrc, i) => (
            <button
              key={i}
              className={`gallery__thumbnail${i === activeImageIndex ? ' gallery__thumbnail--active' : ''}`}
              role="listitem"
              aria-label={`Thumbnail ${i + 1}`}
              onClick={() => goTo(i)}
            >
              <img src={thumbSrc} alt="" aria-hidden="true" />
            </button>
          ))}
        </div>
      )}

      {/* Colour variant pills */}
      {hasVariants && (
        <div className="gallery__variants" role="group" aria-label="Colour variants">
          {colorVariants.map((variant, i) => (
            <button
              key={variant.label}
              className={`gallery__variant-pill${i === activeVariantIndex ? ' gallery__variant-pill--active' : ''}`}
              onClick={() => handleVariantChange(i)}
              aria-pressed={i === activeVariantIndex}
            >
              {variant.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
