import { useCatalog } from '../../context/CatalogContext';
import { assetUrl } from '../../utils/assetUrl';
import { cropStyle } from '../../utils/imageContexts';

/**
 * An image framed the way the owner set it for this particular shape.
 *
 * Precedence is deliberate: a crop saved in the dashboard wins, then the legacy
 * per-product focal point, then a plain centred cover. That ordering lets the
 * new crop tool take over an image without anyone having to first clear the
 * focal points the catalogue was seeded with.
 */
export default function SmartImage({ src, context, focalPoint, alt = '', style, ...rest }) {
  const { imageAssets } = useCatalog();
  const asset = imageAssets?.[src];
  const hasCrop = Boolean(asset?.crops?.[context]);
  const framing = hasCrop
    ? cropStyle(asset.crops, context)
    : { objectFit: 'cover', objectPosition: focalPoint || 'center' };
  return <img src={assetUrl(src)} alt={alt || asset?.alt || ''} style={{ ...framing, ...style }} {...rest} />;
}
