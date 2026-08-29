import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiCheck, FiMaximize2, FiRotateCcw, FiX } from 'react-icons/fi';
import { IMAGE_CONTEXTS, DEFAULT_CROP, normalizeCrop } from '../../utils/imageContexts';
import './ImageCropDialog.css';

/**
 * The region of the image that survives `object-fit: cover` in a box of the
 * given ratio, expressed as fractions of the whole image. This mirrors the
 * browser's own resolution of cover + object-position, which is what makes the
 * outlines on the source image agree with the live previews beside them.
 */
export function visibleRegion(imageRatio, frameRatio, crop) {
  const { x, y, zoom } = normalizeCrop(crop);
  const wide = imageRatio >= frameRatio;
  const width = Math.min(1, (wide ? frameRatio / imageRatio : 1) / zoom);
  const height = Math.min(1, (wide ? 1 : imageRatio / frameRatio) / zoom);
  return {
    width,
    height,
    left: (1 - width) * (x / 100),
    top: (1 - height) * (y / 100),
  };
}

function CropPreview({ context, url, crop }) {
  const { x, y, zoom } = normalizeCrop(crop);
  return (
    <figure className="crop-preview">
      <div className="crop-preview__frame" style={{ aspectRatio: String(context.ratio) }}>
        <img
          src={url}
          alt=""
          style={{
            objectFit: 'cover',
            objectPosition: `${x}% ${y}%`,
            transform: zoom !== 1 ? `scale(${zoom})` : undefined,
            transformOrigin: `${x}% ${y}%`,
          }}
        />
      </div>
      <figcaption>
        <strong>{context.label}</strong>
        <span>{context.where}</span>
      </figcaption>
    </figure>
  );
}

export default function ImageCropDialog({ asset, onSave, onClose }) {
  const [crops, setCrops] = useState(() => {
    const initial = {};
    for (const context of IMAGE_CONTEXTS) initial[context.id] = normalizeCrop(asset.crops?.[context.id]);
    return initial;
  });
  const [alt, setAlt] = useState(asset.alt || '');
  const [activeId, setActiveId] = useState(IMAGE_CONTEXTS[0].id);
  const [natural, setNatural] = useState(
    asset.width && asset.height ? { width: asset.width, height: asset.height } : null,
  );
  const [busy, setBusy] = useState(false);
  const stageRef = useRef(null);
  const dragRef = useRef(null);
  const closeRef = useRef(null);

  const active = IMAGE_CONTEXTS.find((context) => context.id === activeId);
  const imageRatio = natural ? natural.width / natural.height : 0.8;

  useEffect(() => { closeRef.current?.focus(); }, []);

  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const setCrop = useCallback((id, patch) => {
    setCrops((current) => ({ ...current, [id]: normalizeCrop({ ...current[id], ...patch }) }));
  }, []);

  // Dragging moves the crop window itself, so the outline tracks the pointer
  // one-to-one. The available travel is whatever the frame does not already
  // cover, which is why a frame with no spare room simply will not move.
  const onPointerDown = (event) => {
    const region = visibleRegion(imageRatio, active.ratio, crops[activeId]);
    const rect = stageRef.current.getBoundingClientRect();
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: crops[activeId].x,
      originY: crops[activeId].y,
      travelX: (1 - region.width) * rect.width,
      travelY: (1 - region.height) * rect.height,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag) return;
    const patch = {};
    if (drag.travelX > 0.5) patch.x = drag.originX + ((event.clientX - drag.startX) / drag.travelX) * 100;
    if (drag.travelY > 0.5) patch.y = drag.originY + ((event.clientY - drag.startY) / drag.travelY) * 100;
    setCrop(activeId, patch);
  };

  const endDrag = (event) => {
    dragRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  const applyToAll = () => {
    const source = crops[activeId];
    setCrops(Object.fromEntries(IMAGE_CONTEXTS.map((context) => [context.id, { ...source }])));
  };

  const reset = () => {
    setCrops(Object.fromEntries(IMAGE_CONTEXTS.map((context) => [context.id, { ...DEFAULT_CROP }])));
  };

  const save = async () => {
    setBusy(true);
    try { await onSave(crops, alt); } finally { setBusy(false); }
  };

  const outlines = useMemo(() => IMAGE_CONTEXTS.map((context) => ({
    context,
    region: visibleRegion(imageRatio, context.ratio, crops[context.id]),
  })), [imageRatio, crops]);

  return (
    <div className="crop-dialog__scrim" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="crop-dialog" role="dialog" aria-modal="true" aria-label="Frame this image">
        <header className="crop-dialog__head">
          <div>
            <p className="commerce-eyebrow">Framing</p>
            <h2>Fit this image to every shape it appears in</h2>
          </div>
          <button ref={closeRef} type="button" className="crop-dialog__close" onClick={onClose} aria-label="Close">
            <FiX />
          </button>
        </header>

        <div className="crop-dialog__body">
          <div className="crop-dialog__stage-col">
            {/* Every frame drawn over one image, sharing a centre — so the
                relative crop of each shape is readable at a glance. */}
            <div
              className="crop-stage"
              ref={stageRef}
              style={{ aspectRatio: String(imageRatio) }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              <img
                className="crop-stage__image"
                src={asset.url}
                alt=""
                draggable="false"
                onLoad={(event) => {
                  if (!natural) {
                    setNatural({
                      width: event.currentTarget.naturalWidth,
                      height: event.currentTarget.naturalHeight,
                    });
                  }
                }}
              />
              <div className="crop-stage__centre" aria-hidden="true" />
              {outlines.map(({ context, region }) => (
                <div
                  key={context.id}
                  className={`crop-frame${context.id === activeId ? ' is-active' : ''}`}
                  style={{
                    left: `${region.left * 100}%`,
                    top: `${region.top * 100}%`,
                    width: `${region.width * 100}%`,
                    height: `${region.height * 100}%`,
                  }}
                  aria-hidden="true"
                >
                  <span className="crop-frame__tag">{context.label}</span>
                </div>
              ))}
            </div>
            <p className="crop-stage__hint">
              Drag inside the image to reposition the <strong>{active.label}</strong> frame.
            </p>
          </div>

          <div className="crop-dialog__controls">
            <div className="crop-tabs" role="tablist" aria-label="Image shapes">
              {IMAGE_CONTEXTS.map((context) => (
                <button
                  key={context.id}
                  type="button"
                  role="tab"
                  aria-selected={context.id === activeId}
                  className={`crop-tab${context.id === activeId ? ' is-active' : ''}`}
                  onClick={() => setActiveId(context.id)}
                >
                  <span className="crop-tab__ratio" style={{ aspectRatio: String(context.ratio) }} aria-hidden="true" />
                  {context.label}
                </button>
              ))}
            </div>

            <label className="crop-slider">
              <span>Zoom <em>{crops[activeId].zoom.toFixed(2)}×</em></span>
              <input
                type="range" min="1" max="3" step="0.01"
                value={crops[activeId].zoom}
                onChange={(event) => setCrop(activeId, { zoom: Number(event.target.value) })}
              />
            </label>

            <div className="crop-slider-row">
              <label className="crop-slider">
                <span>Horizontal <em>{Math.round(crops[activeId].x)}%</em></span>
                <input type="range" min="0" max="100" value={crops[activeId].x}
                  onChange={(event) => setCrop(activeId, { x: Number(event.target.value) })} />
              </label>
              <label className="crop-slider">
                <span>Vertical <em>{Math.round(crops[activeId].y)}%</em></span>
                <input type="range" min="0" max="100" value={crops[activeId].y}
                  onChange={(event) => setCrop(activeId, { y: Number(event.target.value) })} />
              </label>
            </div>

            <div className="crop-dialog__quick">
              <button type="button" onClick={applyToAll}><FiMaximize2 /> Use this framing everywhere</button>
              <button type="button" onClick={reset}><FiRotateCcw /> Reset all</button>
            </div>

            <label className="admin-field">
              <span className="admin-field__label">Alt text</span>
              <span className="admin-field__hint">Describes the image for screen readers</span>
              <input value={alt} onChange={(event) => setAlt(event.target.value)} placeholder="Navy crochet shoulder bag" />
            </label>
          </div>
        </div>

        <div className="crop-previews">
          {IMAGE_CONTEXTS.map((context) => (
            <CropPreview key={context.id} context={context} url={asset.url} crop={crops[context.id]} />
          ))}
        </div>

        <footer className="crop-dialog__actions">
          <button type="button" className="btn btn--primary" onClick={save} disabled={busy}>
            <FiCheck /> {busy ? 'Saving…' : 'Save framing'}
          </button>
          <button type="button" className="commerce-text-button" onClick={onClose}>Cancel</button>
        </footer>
      </div>
    </div>
  );
}
