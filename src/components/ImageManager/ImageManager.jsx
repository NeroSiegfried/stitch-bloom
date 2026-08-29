import { useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';
import { FiArrowDown, FiArrowUp, FiCrop, FiImage, FiTrash2, FiUploadCloud } from 'react-icons/fi';
import { adminApi } from '../../utils/adminApi';
import { assetUrl } from '../../utils/assetUrl';
import { cropStyle } from '../../utils/imageContexts';
import ImageCropDialog from '../ImageCropDialog/ImageCropDialog';
import './ImageManager.css';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif,image/svg+xml';

/** Read a file's pixel size in the browser so the server never has to decode it. */
function measure(file) {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(objectUrl);
    };
    image.onerror = () => { resolve({}); URL.revokeObjectURL(objectUrl); };
    image.src = objectUrl;
  });
}

/** Same, for an image already on a URL. */
function measureUrl(url) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve({});
    image.src = url;
  });
}

export default function ImageManager({ value = [], onChange, assets = {}, onAssetsChanged, accept = ACCEPT, single = false, fallbackUrl = null }) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [editing, setEditing] = useState(null);
  const inputRef = useRef(null);

  const uploadFiles = async (files) => {
    const list = Array.from(files || []).filter(Boolean);
    if (!list.length) return;
    setError('');
    const uploaded = [];
    try {
      for (const [index, file] of list.entries()) {
        setBusy(`Uploading ${index + 1} of ${list.length}…`);
        const blob = await upload(file.name, file, {
          access: 'public',
          handleUploadUrl: '/api/admin/upload',
        });
        const { width, height } = await measure(file);
        await adminApi('/api/admin/assets', {
          method: 'POST',
          body: JSON.stringify({ url: blob.url, pathname: blob.pathname, width, height }),
        });
        uploaded.push(blob.url);
      }
      onChange(single ? uploaded.slice(-1) : [...value, ...uploaded]);
      await onAssetsChanged?.();
    } catch (uploadError) {
      setError(uploadError.message || 'That upload did not complete.');
    } finally {
      setBusy('');
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const move = (index, delta) => {
    const next = [...value];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const saveCrops = async (crops, alt) => {
    await adminApi('/api/admin/assets', {
      method: 'PATCH',
      body: JSON.stringify({ url: editing.url, crops, alt }),
    });
    await onAssetsChanged?.();
    setEditing(null);
  };

  /**
   * Open the framing dialog for a URL. A built-in theme image has no library
   * row until now, so it is registered on first edit — that is what makes the
   * images already on the site croppable rather than read-only.
   */
  const frame = async (url) => {
    const known = assets[url];
    if (known) { setEditing({ url, ...known }); return; }
    setError('');
    try {
      const measured = await measureUrl(assetUrl(url));
      await adminApi('/api/admin/assets', {
        method: 'POST',
        body: JSON.stringify({ url, pathname: url, ...measured }),
      });
      await onAssetsChanged?.();
      setEditing({ url, crops: {}, alt: '', ...measured });
    } catch (frameError) {
      setError(frameError.message || 'That image could not be prepared for framing.');
    }
  };

  return (
    <div className="image-manager">
      <div
        className={`image-drop${dragOver ? ' is-dragover' : ''}${busy ? ' is-busy' : ''}`}
        onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => { event.preventDefault(); setDragOver(false); uploadFiles(event.dataTransfer.files); }}
      >
        <FiUploadCloud />
        <p>{busy || 'Drop images here, or'}</p>
        <button type="button" className="btn btn--secondary" disabled={Boolean(busy)} onClick={() => inputRef.current?.click()}>
          Choose {single ? 'a file' : 'files'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={!single}
          hidden
          onChange={(event) => uploadFiles(event.target.files)}
        />
      </div>
      {error && <p className="commerce-alert commerce-alert--error">{error}</p>}

      {value.length === 0 && fallbackUrl && (
        <ul className="image-list">
          <li className="image-list__item image-list__item--default">
            <div className="image-list__thumb">
              {/\.mp4($|\?)/i.test(fallbackUrl)
                ? <video src={assetUrl(fallbackUrl)} muted playsInline preload="metadata" />
                : <img src={assetUrl(fallbackUrl)} alt="" style={cropStyle(assets[fallbackUrl]?.crops, 'card')} />}
            </div>
            <div className="image-list__meta">
              <span className="image-list__name">{fallbackUrl.split('/').pop()}</span>
              <span className="image-list__sub">
                Built-in default
                {assets[fallbackUrl]?.width ? ` · ${assets[fallbackUrl].width}×${assets[fallbackUrl].height}` : ''}
                {Object.keys(assets[fallbackUrl]?.crops || {}).length > 0 ? ' · framed' : ''}
              </span>
            </div>
            <div className="image-list__actions">
              <button type="button" onClick={() => frame(fallbackUrl)} aria-label="Frame image"><FiCrop /></button>
            </div>
          </li>
        </ul>
      )}

      {value.length > 0 && (
        <ul className="image-list">
          {value.map((url, index) => {
            const asset = assets[url];
            const isVideo = /\.mp4($|\?)/i.test(url);
            return (
              <li key={`${url}-${index}`} className="image-list__item">
                <div className="image-list__thumb">
                  {isVideo
                    ? <video src={assetUrl(url)} muted playsInline preload="metadata" />
                    : <img src={assetUrl(url)} alt="" style={cropStyle(asset?.crops, 'card')} />}
                </div>
                <div className="image-list__meta">
                  <span className="image-list__name">{url.split('/').pop()}</span>
                  <span className="image-list__sub">
                    {index === 0 && !single ? 'Primary · ' : ''}
                    {asset?.width ? `${asset.width}×${asset.height}` : 'Not in library'}
                    {asset && Object.keys(asset.crops || {}).length > 0 ? ' · framed' : ''}
                  </span>
                </div>
                <div className="image-list__actions">
                  {!single && (
                    <>
                      <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move up"><FiArrowUp /></button>
                      <button type="button" onClick={() => move(index, 1)} disabled={index === value.length - 1} aria-label="Move down"><FiArrowDown /></button>
                    </>
                  )}
                  {!isVideo && (
                    <button type="button" onClick={() => frame(url)} aria-label="Frame image"><FiCrop /></button>
                  )}
                  <button type="button" className="image-list__remove" onClick={() => onChange(value.filter((_, i) => i !== index))} aria-label="Remove"><FiTrash2 /></button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {value.length === 0 && !fallbackUrl && !busy && (
        <p className="image-manager__empty"><FiImage /> Nothing here yet.</p>
      )}

      {editing && <ImageCropDialog asset={editing} onSave={saveCrops} onClose={() => setEditing(null)} />}
    </div>
  );
}
