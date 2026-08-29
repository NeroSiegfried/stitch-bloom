import { FiPlus, FiTrash2 } from 'react-icons/fi';
import ImageManager from '../ImageManager/ImageManager';
import './ColourwayEditor.css';

/**
 * Structured editing for a product's colourways.
 *
 * Several products keep every photograph inside a colourway and none on the
 * product itself, so before this existed those images could only be reordered
 * or recropped by hand-editing raw JSON.
 */
export default function ColourwayEditor({ value = [], onChange, imageAssets, onAssetsChanged }) {
  const update = (index, patch) => {
    onChange(value.map((variant, i) => (i === index ? { ...variant, ...patch } : variant)));
  };
  const remove = (index) => onChange(value.filter((_, i) => i !== index));
  const move = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  const add = () => onChange([...value, { label: '', images: [], badge: null, imageFocalPoints: [] }]);

  return (
    <div className="colourways">
      {value.length === 0 && <p className="colourways__empty">No colourways. The product uses its own images.</p>}

      {value.map((variant, index) => (
        <article className="colourway" key={index}>
          <header className="colourway__head">
            <label className="colourway__label">
              <span>Colourway name</span>
              <input
                value={variant.label || ''}
                onChange={(event) => update(index, { label: event.target.value })}
                placeholder="Burgundy & Blue"
              />
            </label>
            <label className="colourway__label colourway__label--narrow">
              <span>Badge</span>
              <input
                value={variant.badge || ''}
                onChange={(event) => update(index, { badge: event.target.value || null })}
                placeholder="New"
              />
            </label>
            <div className="colourway__actions">
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move colourway up">↑</button>
              <button type="button" onClick={() => move(index, 1)} disabled={index === value.length - 1} aria-label="Move colourway down">↓</button>
              <button type="button" className="colourway__remove" onClick={() => remove(index)} aria-label="Remove colourway"><FiTrash2 /></button>
            </div>
          </header>
          <ImageManager
            value={variant.images || []}
            onChange={(images) => update(index, { images })}
            assets={imageAssets}
            onAssetsChanged={onAssetsChanged}
          />
        </article>
      ))}

      <button type="button" className="colourways__add" onClick={add}><FiPlus /> Add colourway</button>
    </div>
  );
}
