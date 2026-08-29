import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { FiAlertTriangle, FiArrowDown, FiArrowUp, FiBox, FiCreditCard, FiEdit2, FiLayers, FiLogOut, FiPackage, FiPlus, FiRefreshCw, FiTrash2, FiX } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useCatalog } from '../../context/CatalogContext';
import ColourwayEditor from '../../components/ColourwayEditor/ColourwayEditor';
import ImageManager from '../../components/ImageManager/ImageManager';
import { formatPrice } from '../../data/products';
import { adminApi } from '../../utils/adminApi';
import { countOf, plural } from '../../utils/plural';
import { assetUrl } from '../../utils/assetUrl';
import usePageMeta from '../../hooks/usePageMeta';
import '../Commerce.css';
import './Admin.css';
import { primaryImageOf } from '../../utils/productImage';
import { SITE_ASSET_SLOTS } from '../../utils/siteAssets';
import { statusLabel } from '../../utils/orderStatus';
import { deliveryLabelForZone } from '../../data/delivery';

const FULFILMENT_STATUSES = ['paid', 'processing', 'dispatched', 'delivered'];
const INITIAL_FILTERS = {
  q: '', status: '', paymentStatus: '', dateFrom: '', dateTo: '',
  minTotal: '', maxTotal: '', sort: 'newest', page: 1, limit: 30,
};

/**
 * One form field. The hint is reserved as its own row whether or not a field
 * has one, so two fields sitting side by side always align on the same
 * baseline — the staggering came from hints living inside the label line.
 */
function Field({ label, hint, children, wide = false }) {
  return (
    <label className={`admin-field${wide ? ' admin-field--wide' : ''}`}>
      <span className="admin-field__label">{label}</span>
      <span className="admin-field__hint">{hint || '\u00a0'}</span>
      {children}
    </label>
  );
}

/**
 * Disclosure affordance for a row that opens an editing form: the pencil
 * becomes a cross, so an open row offers "cancel" rather than a rotated arrow
 * that says nothing about what clicking again does.
 */
function EditToggle() {
  return (
    <span className="admin-toggle admin-toggle--edit" aria-hidden="true">
      <FiEdit2 className="admin-toggle__closed" />
      <FiX className="admin-toggle__open" />
    </span>
  );
}

/** Disclosure affordance for a row that only reveals content: one triangle. */
function Chevron() {
  return <span className="admin-toggle admin-toggle--chevron" aria-hidden="true" />;
}

function metric(label, value, Icon) {
  return <article className="admin-metric"><Icon /><p>{label}</p><strong>{value}</strong></article>;
}

function OrdersPanel({ orders, filters, pagination, onApplyFilters, onRefresh }) {
  const [draft, setDraft] = useState(filters);
  const [error, setError] = useState('');
  const [busyOrder, setBusyOrder] = useState('');
  useEffect(() => { setDraft(filters); }, [filters]);

  const updateStatus = async (id, status) => {
    setError('');
    setBusyOrder(id);
    try {
      await adminApi('/api/admin/orders', { method: 'PATCH', body: JSON.stringify({ id, status }) });
      await onRefresh();
    } catch (updateError) { setError(updateError.message); }
    finally { setBusyOrder(''); }
  };

  const refund = async (order) => {
    const confirmed = window.confirm(`Start a full ${formatPrice('₦', order.total)} refund for ${order.order_number}? The order will be cancelled after Paystack processes the refund.`);
    if (!confirmed) return;
    setError('');
    setBusyOrder(order.id);
    try {
      await adminApi('/api/admin/orders', { method: 'POST', body: JSON.stringify({ id: order.id, action: 'refund' }) });
      await onRefresh();
    } catch (refundError) { setError(refundError.message); }
    finally { setBusyOrder(''); }
  };

  const updateDraft = (event) => setDraft((current) => ({ ...current, [event.target.name]: event.target.value }));
  const apply = (event) => { event.preventDefault(); onApplyFilters({ ...draft, page: 1 }); };
  const clear = () => { setDraft(INITIAL_FILTERS); onApplyFilters(INITIAL_FILTERS); };

  return (
    <section className="admin-orders-panel">
      <form className="admin-filters" onSubmit={apply}>
        <label className="admin-field admin-filter-search">Search orders<input name="q" value={draft.q} onChange={updateDraft} placeholder="Order, customer, email, phone or reference" /></label>
        <label className="admin-field">Order status<select name="status" value={draft.status} onChange={updateDraft}><option value="">All statuses</option><option value="payment_pending">Payment pending</option><option value="payment_expired">Payment expired</option><option value="paid">Paid</option><option value="paid_after_cancel_review">Paid after cancellation — review</option><option value="processing">Processing</option><option value="dispatched">Dispatched</option><option value="delivered">Delivered</option><option value="refund_pending">Refund pending</option><option value="cancelled">Cancelled</option></select></label>
        <label className="admin-field">Payment<select name="paymentStatus" value={draft.paymentStatus} onChange={updateDraft}><option value="">All payments</option><option value="pending">Pending</option><option value="paid">Paid</option><option value="failed">Failed</option><option value="review">Needs review</option><option value="refund_pending">Refund pending</option><option value="refunded">Refunded</option></select></label>
        <label className="admin-field">From<input type="date" name="dateFrom" value={draft.dateFrom} onChange={updateDraft} /></label>
        <label className="admin-field">To<input type="date" name="dateTo" value={draft.dateTo} onChange={updateDraft} /></label>
        <label className="admin-field">Minimum (₦)<input type="number" min="0" name="minTotal" value={draft.minTotal} onChange={updateDraft} /></label>
        <label className="admin-field">Maximum (₦)<input type="number" min="0" name="maxTotal" value={draft.maxTotal} onChange={updateDraft} /></label>
        <label className="admin-field">Sort<select name="sort" value={draft.sort} onChange={updateDraft}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="total_desc">Highest total</option><option value="total_asc">Lowest total</option></select></label>
        <div className="admin-filter-actions"><button className="btn btn--primary" type="submit">Apply filters</button><button type="button" onClick={clear}>Clear</button></div>
      </form>
      {error && <p className="commerce-alert commerce-alert--error">{error}</p>}
      <div className="admin-results-head"><p><strong>{pagination.total}</strong> {plural(pagination.total, 'order')}</p><span>Page {pagination.page} of {pagination.totalPages}</span></div>
      {!orders.length ? <p className="commerce-empty">No orders match these filters.</p> : <div className="admin-order-list">
        {orders.map((order) => {
          const needsCancellationReview = order.status === 'paid_after_cancel_review';
          return (
          <details className="admin-order" name="admin-order" key={order.id}>
            <summary>
              <div><strong>{order.order_number}{order.payment_mode === 'test' && <em className="admin-test-flag">test</em>}</strong><span>{order.customer_name} · {order.state} · {new Date(order.created_at).toLocaleDateString('en-NG', { dateStyle: 'medium' })}</span></div>
              <div><strong>{formatPrice('₦', order.total)}</strong><span className={`admin-order-state admin-order-state--${order.status}`}>Order: {statusLabel(order.status)}</span><span className={`admin-payment admin-payment--${order.payment_status}`}>Payment: {statusLabel(order.payment_status)}</span></div>
              <Chevron />
            </summary>
            <div className="admin-order__body">
              <div className="admin-order__section">
                <p className="commerce-eyebrow">Items</p>
                <ul className="admin-order-items">{order.items.map((item) => <li key={`${item.product_name}-${item.variant_label || ''}`}><div className="admin-order-item-thumb">{item.image_url && <img src={assetUrl(item.image_url)} alt="" />}</div><span>{item.product_name}{item.variant_label ? ` · ${item.variant_label}` : ''} × {item.quantity}</span><strong>{formatPrice('₦', item.line_total)}</strong></li>)}</ul>
                <dl><div><dt>Subtotal</dt><dd>{formatPrice('₦', order.subtotal)}</dd></div><div><dt>{deliveryLabelForZone(order.delivery_zone)}</dt><dd>{formatPrice('₦', order.delivery_fee)}</dd></div><div><dt>Total</dt><dd>{formatPrice('₦', order.total)}</dd></div></dl>
              </div>
              <div className="admin-order__section">
                <p className="commerce-eyebrow">Delivery details</p>
                <address>{order.customer_name}<br />{order.phone}<br />{order.email}<br /><br />{order.address_line1}{order.address_line2 ? <><br />{order.address_line2}</> : null}<br />{order.city}, {order.state}{order.landmark ? <><br />Landmark: {order.landmark}</> : null}</address>
                <dl className="admin-order-lifecycle">
                  <div><dt>Order</dt><dd>{statusLabel(order.status)}</dd></div>
                  <div><dt>Payment</dt><dd>{statusLabel(order.payment_status)}</dd></div>
                  {order.cancelled_at && <div><dt>Cancellation requested</dt><dd>{new Date(order.cancelled_at).toLocaleString('en-NG')}</dd></div>}
                  {order.paid_after_cancel_at && <div><dt>Late payment received</dt><dd>{new Date(order.paid_after_cancel_at).toLocaleString('en-NG')}</dd></div>}
                </dl>
                {needsCancellationReview && <div className="admin-review-alert commerce-alert commerce-alert--warning"><FiAlertTriangle /><div><strong>Paid after this order was closed</strong><p>Do not fulfil it until you accept the order or start a full refund.</p></div><div className="admin-review-actions"><button className="btn btn--primary" disabled={busyOrder === order.id} onClick={() => updateStatus(order.id, 'paid')}>Accept for fulfilment</button><button className="admin-danger" disabled={busyOrder === order.id} onClick={() => refund(order)}>Refund payment</button></div></div>}
                {order.payment_status === 'paid' && !needsCancellationReview && <label className="admin-field">Fulfilment status<select disabled={busyOrder === order.id} value={order.status === 'shipped' ? 'dispatched' : order.status} onChange={(event) => updateStatus(order.id, event.target.value)}>{!FULFILMENT_STATUSES.includes(order.status) && order.status !== 'shipped' && <option value={order.status} disabled>{statusLabel(order.status)}</option>}{FULFILMENT_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>}
                {!['paid', 'refund_pending', 'refunded'].includes(order.payment_status) && order.status !== 'cancelled' && <button className="admin-danger" disabled={busyOrder === order.id} onClick={() => updateStatus(order.id, 'cancelled')}>Cancel unpaid order</button>}
              </div>
              <div className="admin-order__section admin-payment-details">
                <p className="commerce-eyebrow">Paystack payment</p>
                <dl>
                  <div><dt>Aggregate status</dt><dd>{statusLabel(order.payment_status)}</dd></div>
                  <div><dt>Reference</dt><dd>{order.paystack_reference || '—'}</dd></div>
                  <div><dt>Transaction ID</dt><dd>{order.paystack_transaction_id || '—'}</dd></div>
                  <div><dt>Channel</dt><dd>{order.payment_channel || '—'}</dd></div>
                  <div><dt>Gateway response</dt><dd>{order.payment_gateway_response || '—'}</dd></div>
                  <div><dt>Paid at</dt><dd>{order.paid_at ? new Date(order.paid_at).toLocaleString('en-NG') : '—'}</dd></div>
                  {order.refund_status && <div><dt>Refund</dt><dd>{order.refund_status}</dd></div>}
                </dl>
                {order.paymentAttempts?.length > 0 && <div className="admin-attempts"><p>Payment attempts</p>{order.paymentAttempts.map((attempt) => <div key={attempt.reference}><span>{attempt.reference}</span><span className="admin-attempt-state"><strong>Gateway: {statusLabel(attempt.status)}</strong><em>Local: {statusLabel(attempt.local_status)}</em></span><time>{new Date(attempt.created_at).toLocaleString('en-NG')}</time></div>)}</div>}
                {order.payment_status === 'paid' && !needsCancellationReview && <button className="admin-refund" disabled={busyOrder === order.id} onClick={() => refund(order)}>{busyOrder === order.id ? 'Starting refund…' : 'Refund full payment'}</button>}
              </div>
            </div>
          </details>
          );
        })}
      </div>}
      {pagination.totalPages > 1 && <nav className="admin-pagination" aria-label="Orders pages"><button disabled={pagination.page <= 1} onClick={() => onApplyFilters({ ...filters, page: pagination.page - 1 })}>Previous</button><span>{pagination.page} / {pagination.totalPages}</span><button disabled={pagination.page >= pagination.totalPages} onClick={() => onApplyFilters({ ...filters, page: pagination.page + 1 })}>Next</button></nav>}
    </section>
  );
}

function CollectionForm({ collection, onSaved, onDelete }) {
  const [fields, setFields] = useState(collection || { id: '', name: '', description: '', sortOrder: 0, active: true });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const update = (event) => setFields((current) => ({ ...current, [event.target.name]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await adminApi('/api/admin/catalog', { method: collection ? 'PATCH' : 'POST', body: JSON.stringify({ entity: 'collection', id: collection?.id, data: fields }) });
      await onSaved();
    } catch (submitError) { setError(submitError.message); } finally { setBusy(false); }
  };
  return <form className="admin-editor" onSubmit={submit}>
    <div className="admin-field-row">
      <Field label="Collection name"><input name="name" value={fields.name} onChange={update} required /></Field>
      {!collection && <Field label="URL ID" hint="Optional — generated from the name if blank"><input name="id" value={fields.id} onChange={update} placeholder="evening-pieces" /></Field>}
    </div>
    <Field label="Description" wide><textarea name="description" value={fields.description || ''} onChange={update} rows="3" /></Field>
    <div className="admin-field-row admin-field-row--mixed">
      <Field label="Display order" hint="Lower numbers come first"><input type="number" name="sortOrder" value={fields.sortOrder ?? 0} onChange={update} /></Field>
      <label className="admin-check"><input type="checkbox" name="active" checked={fields.active !== false} onChange={update} /> Visible in shop</label>
    </div>
    {error && <p className="commerce-alert commerce-alert--error">{error}</p>}
    <div className="admin-editor__actions"><button className="btn btn--primary" disabled={busy}>{busy ? 'Saving…' : collection ? 'Save collection' : 'Add collection'}</button>{collection && <button type="button" className="admin-danger" onClick={onDelete}><FiTrash2 /> Remove</button>}</div>
  </form>;
}

function productFields(product, defaultCollection) {
  return product ? {
    ...product,
    images: product.images || [],
    colors: (product.colors || []).join(', '),
    imageFocalPoints: (product.imageFocalPoints || []).join('\n'),
    colorVariants: product.colorVariants || [],
    stockQuantity: product.stockQuantity ?? '',
  } : {
    id: '', name: '', collectionId: defaultCollection || '', description: '', price: '', images: [],
    colors: '', imageFocalPoints: '', colorVariants: [], measurement: '', weight: '', badge: '',
    stockQuantity: '', customizable: false, bestseller: false, active: true, sortOrder: 0,
  };
}

function ProductForm({ product, collections, onSaved, onDelete, imageAssets, onAssetsChanged }) {
  const [fields, setFields] = useState(() => productFields(product, collections[0]?.id));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const update = (event) => setFields((current) => ({ ...current, [event.target.name]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const colorVariants = (fields.colorVariants || [])
        .map((variant) => ({ ...variant, label: (variant.label || '').trim() }))
        .filter((variant) => variant.label);
      if ((fields.colorVariants || []).length !== colorVariants.length) {
        throw new Error('Every colourway needs a name.');
      }
      const data = {
        ...fields,
        colors: fields.colors.split(',').map((value) => value.trim()).filter(Boolean),
        images: fields.images,
        imageFocalPoints: fields.imageFocalPoints.split('\n').map((value) => value.trim()).filter(Boolean),
        colorVariants,
      };
      await adminApi('/api/admin/catalog', { method: product ? 'PATCH' : 'POST', body: JSON.stringify({ entity: 'product', id: product?.id, data }) });
      await onSaved();
    } catch (submitError) { setError(submitError.message); } finally { setBusy(false); }
  };
  return <form className="admin-editor admin-product-editor" onSubmit={submit}>
    <fieldset className="admin-fieldset">
      <legend>Basics</legend>
      <div className="admin-field-row">
        <Field label="Product name"><input name="name" value={fields.name} onChange={update} required /></Field>
        {!product && <Field label="URL ID" hint="Optional — generated from the name if blank"><input name="id" value={fields.id} onChange={update} placeholder="najma-evening" /></Field>}
      </div>
      <div className="admin-field-row">
        <Field label="Collection">
          <select name="collectionId" value={fields.collectionId} onChange={update} required>
            {collections.map((collection) => <option value={collection.id} key={collection.id}>{collection.name}</option>)}
          </select>
        </Field>
        <Field label="Price" hint="Naira, whole numbers"><input type="number" min="0" name="price" value={fields.price} onChange={update} required /></Field>
      </div>
      <Field label="Description" wide><textarea name="description" value={fields.description || ''} onChange={update} required rows="3" /></Field>
    </fieldset>

    <fieldset className="admin-fieldset">
      <legend>Images</legend>
      <p className="admin-fieldset__note">The first image is the one shown in the shop grid. Use the crop tool to set how each image is framed in every shape the site renders it at.</p>
      <ImageManager
        value={fields.images}
        onChange={(images) => setFields((current) => ({ ...current, images }))}
        assets={imageAssets}
        onAssetsChanged={onAssetsChanged}
      />
    </fieldset>

    <fieldset className="admin-fieldset">
      <legend>Details</legend>
      <div className="admin-field-row">
        <Field label="Colours" hint="Comma separated"><input name="colors" value={fields.colors} onChange={update} /></Field>
        <Field label="Badge" hint="Shown as a corner tag"><input name="badge" value={fields.badge || ''} onChange={update} placeholder="New, Limited…" /></Field>
      </div>
      <div className="admin-field-row">
        <Field label="Dimensions" hint="As printed on the product page"><input name="measurement" value={fields.measurement || ''} onChange={update} /></Field>
        <Field label="Weight" hint="As printed on the product page"><input name="weight" value={fields.weight || ''} onChange={update} /></Field>
      </div>
      <div className="admin-field-row">
        <Field label="Stock" hint="Blank means not tracked"><input type="number" min="0" name="stockQuantity" value={fields.stockQuantity} onChange={update} /></Field>
        <Field label="Display order" hint="Lower numbers come first"><input type="number" name="sortOrder" value={fields.sortOrder ?? 0} onChange={update} /></Field>
      </div>
    </fieldset>

    <fieldset className="admin-fieldset">
      <legend>Colourways</legend>
      <p className="admin-fieldset__note">A colourway swaps the product&rsquo;s photographs on the shop and detail pages. Products with no images of their own use their first colourway everywhere they appear as a single tile.</p>
      <ColourwayEditor
        value={fields.colorVariants}
        onChange={(colorVariants) => setFields((current) => ({ ...current, colorVariants }))}
        imageAssets={imageAssets}
        onAssetsChanged={onAssetsChanged}
      />
    </fieldset>

    <details className="admin-advanced">
      <summary>Legacy focal points<Chevron /></summary>
      <div className="admin-advanced__body">
        <Field label="Image focal points" hint="One CSS object-position per line. Superseded by the crop tool — leave blank unless an old value is still needed." wide>
          <textarea name="imageFocalPoints" value={fields.imageFocalPoints} onChange={update} rows="3" />
        </Field>
      </div>
    </details>

    <div className="admin-check-row">
      <label className="admin-check"><input type="checkbox" name="active" checked={fields.active !== false} onChange={update} /> Visible in shop</label>
      <label className="admin-check"><input type="checkbox" name="bestseller" checked={Boolean(fields.bestseller)} onChange={update} /> Bestseller</label>
      <label className="admin-check"><input type="checkbox" name="customizable" checked={Boolean(fields.customizable)} onChange={update} /> Customisable</label>
    </div>
    {error && <p className="commerce-alert commerce-alert--error">{error}</p>}
    <div className="admin-editor__actions">
      <button className="btn btn--primary" disabled={busy}>{busy ? 'Saving…' : product ? 'Save product' : 'Add product'}</button>
      {product && <button type="button" className="admin-danger" onClick={onDelete}><FiTrash2 /> Remove product</button>}
    </div>
  </form>;
}

function CataloguePanel({ collections, onRefresh, imageAssets, onAssetsChanged }) {
  const [creating, setCreating] = useState(null);
  const remove = async (entity, id, label) => {
    if (!window.confirm(`Remove ${label}? This cannot be undone.`)) return;
    try { await adminApi('/api/admin/catalog', { method: 'DELETE', body: JSON.stringify({ entity, id }) }); await onRefresh(); }
    catch (error) { window.alert(error.message); }
  };
  const saved = async () => { setCreating(null); await onRefresh(); };
  return <section className="admin-catalog">
    <div className="admin-catalog__actions"><button className="btn btn--primary" onClick={() => setCreating('product')}><FiPlus /> New product</button><button className="btn btn--secondary" onClick={() => setCreating('collection')}><FiPlus /> New collection</button></div>
    {creating === 'collection' && <div className="admin-create"><div className="admin-create__head"><h2>New collection</h2><button onClick={() => setCreating(null)}>Close</button></div><CollectionForm onSaved={saved} /></div>}
    {creating === 'product' && <div className="admin-create"><div className="admin-create__head"><h2>New product</h2><button onClick={() => setCreating(null)}>Close</button></div><ProductForm collections={collections} onSaved={saved} imageAssets={imageAssets} onAssetsChanged={onAssetsChanged} /></div>}
    {collections.map((collection) => <section className="admin-collection" key={collection.id}>
      <details className="admin-collection__settings" name="admin-catalogue"><summary><span><FiLayers /> {collection.name}</span><span>{countOf(collection.products.length, 'product')}<Chevron /></span></summary><CollectionForm collection={collection} onSaved={onRefresh} onDelete={() => remove('collection', collection.id, collection.name)} /></details>
      <div className="admin-product-list">{collection.products.map((product) => <details className="admin-product" name="admin-catalogue" key={product.id}><summary><div className="admin-product__thumb">{primaryImageOf(product) ? <img src={assetUrl(primaryImageOf(product))} alt="" /> : <FiBox />}</div><div><strong>{product.name}</strong><span>{formatPrice('₦', product.price)} · {product.active ? 'Visible' : 'Hidden'}</span></div><EditToggle /></summary><ProductForm product={product} collections={collections} onSaved={onRefresh} onDelete={() => remove('product', product.id, product.name)} imageAssets={imageAssets} onAssetsChanged={onAssetsChanged} /></details>)}</div>
    </section>)}
  </section>;
}

const CAROUSEL_LIMIT = 8;

function HomeCarouselPanel({ collections, siteSettings, onRefresh }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const products = collections.flatMap((collection) => collection.products);
  const selectedIds = siteSettings?.homeCarousel || [];
  const selected = selectedIds.map((id) => products.find((p) => p.id === id)).filter(Boolean);
  const available = products.filter((p) => !selectedIds.includes(p.id));

  const save = async (ids) => {
    setBusy(true); setError('');
    try {
      await adminApi('/api/admin/assets', {
        method: 'PATCH',
        body: JSON.stringify({ setting: 'homeCarousel', value: ids }),
      });
      await onRefresh();
    } catch (saveError) { setError(saveError.message); }
    finally { setBusy(false); }
  };

  const move = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= selectedIds.length) return;
    const next = [...selectedIds];
    [next[index], next[target]] = [next[target], next[index]];
    save(next);
  };

  return <section className="admin-carousel">
    <p className="admin-media__intro">
      Choose which pieces appear in the landing page carousel, and the order they appear in.
      With nothing selected the carousel falls back to the first six bags in the Najma and Signature collections.
    </p>
    {error && <p className="commerce-alert commerce-alert--error">{error}</p>}
    <div className="admin-carousel__cols">
      <div>
        <h3 className="admin-carousel__title">In the carousel <span>{selected.length} of {CAROUSEL_LIMIT}</span></h3>
        {selected.length === 0
          ? <p className="admin-carousel__empty">Nothing selected — the automatic selection is showing.</p>
          : <ol className="admin-carousel__list">
              {selected.map((product, index) => (
                <li key={product.id}>
                  <span className="admin-carousel__rank">{index + 1}</span>
                  <div className="admin-product__thumb admin-carousel__thumb">
                    {primaryImageOf(product) ? <img src={assetUrl(primaryImageOf(product))} alt="" /> : <FiBox />}
                  </div>
                  <div className="admin-carousel__meta">
                    <strong>{product.name}</strong>
                    <span>{product.collectionName}{primaryImageOf(product) ? '' : ' · no image'}</span>
                  </div>
                  <div className="admin-carousel__actions">
                    <button type="button" disabled={busy || index === 0} onClick={() => move(index, -1)} aria-label="Move up"><FiArrowUp /></button>
                    <button type="button" disabled={busy || index === selected.length - 1} onClick={() => move(index, 1)} aria-label="Move down"><FiArrowDown /></button>
                    <button type="button" disabled={busy} className="admin-carousel__remove" onClick={() => save(selectedIds.filter((id) => id !== product.id))} aria-label="Remove"><FiX /></button>
                  </div>
                </li>
              ))}
            </ol>}
        {selected.length > 0 && (
          <button type="button" className="admin-danger admin-carousel__reset" disabled={busy} onClick={() => save([])}>
            Clear and use the automatic selection
          </button>
        )}
      </div>
      <div>
        <h3 className="admin-carousel__title">Available</h3>
        <ul className="admin-carousel__list admin-carousel__list--available">
          {available.map((product) => (
            <li key={product.id}>
              <div className="admin-product__thumb admin-carousel__thumb">
                {primaryImageOf(product) ? <img src={assetUrl(primaryImageOf(product))} alt="" /> : <FiBox />}
              </div>
              <div className="admin-carousel__meta">
                <strong>{product.name}</strong>
                <span>{product.collectionName}{product.active ? '' : ' · hidden'}</span>
              </div>
              <div className="admin-carousel__actions">
                <button type="button" disabled={busy || selectedIds.length >= CAROUSEL_LIMIT}
                  onClick={() => save([...selectedIds, product.id])} aria-label={`Add ${product.name}`}><FiPlus /></button>
              </div>
            </li>
          ))}
          {available.length === 0 && <li className="admin-carousel__empty">Every product is in the carousel.</li>}
        </ul>
      </div>
    </div>
  </section>;
}

function SiteImagesPanel({ siteAssets, imageAssets, onRefresh }) {
  const [error, setError] = useState('');
  const setSlot = async (key, urls) => {
    setError('');
    try {
      await adminApi('/api/admin/assets', { method: 'PATCH', body: JSON.stringify({ key, url: urls[0] || '' }) });
      await onRefresh();
    } catch (saveError) { setError(saveError.message); }
  };
  const groups = SITE_ASSET_SLOTS.reduce((acc, slot) => {
    (acc[slot.group] ||= []).push(slot);
    return acc;
  }, {});
  return <section className="admin-media">
    <p className="admin-media__intro">Every image on the site that is not a product photograph. A slot showing <em>Default</em> is using the image built into the theme — upload one to replace it. A slot with no default renders nothing until you fill it, rather than a broken image.</p>
    {error && <p className="commerce-alert commerce-alert--error">{error}</p>}
    {Object.entries(groups).map(([group, slots]) => (
      <div className="admin-media__group" key={group}>
        <h2 className="admin-media__group-title">{group}</h2>
        <div className="admin-media__grid">
          {slots.map((slot) => {
            const current = siteAssets[slot.key];
            return (
              <article className="admin-media__slot" key={slot.key}>
                <header>
                  <h3>{slot.label}</h3>
                  <p>{slot.hint}</p>
                  <span className={`admin-media__state${current ? ' is-custom' : ''}`}>
                    {current ? 'Replaced' : slot.fallback ? 'Default' : 'Empty'}
                  </span>
                </header>
                <ImageManager
                  single
                  accept={slot.kind === 'video' ? 'video/mp4' : 'image/jpeg,image/png,image/webp,image/avif,image/svg+xml'}
                  value={current ? [current] : []}
                  fallbackUrl={slot.fallback}
                  onChange={(urls) => setSlot(slot.key, urls)}
                  assets={imageAssets}
                  onAssetsChanged={onRefresh}
                />
              </article>
            );
          })}
        </div>
      </div>
    ))}
  </section>;
}

export default function Admin() {
  const { user, isLoading, signOut } = useAuth();
  const { refreshCatalog } = useCatalog();
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [orderMetrics, setOrderMetrics] = useState({ revenue: 0, paid: 0, open: 0, review: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 30, total: 0, totalPages: 1 });
  const [imageAssets, setImageAssets] = useState({});
  const [siteAssets, setSiteAssets] = useState({});
  const [siteSettings, setSiteSettings] = useState({ homeCarousel: [] });
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [collections, setCollections] = useState([]);
  const [error, setError] = useState('');
  const [loadingData, setLoadingData] = useState(true);
  usePageMeta({ title: 'Owner Dashboard', description: 'Manage Stitch Bloom orders and catalogue.', path: '/admin' });

  const orderSearch = useMemo(() => {
    const parameters = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value !== '') parameters.set(key, String(value)); });
    return parameters.toString();
  }, [filters]);

  const refreshOrders = useCallback(async () => {
    if (user?.role !== 'admin') return;
    setError('');
    try {
      const orderPayload = await adminApi(`/api/admin/orders?${orderSearch}`);
      setOrders(orderPayload.orders || []);
      setOrderMetrics(orderPayload.metrics || { revenue: 0, paid: 0, open: 0, review: 0 });
      setPagination(orderPayload.pagination || { page: 1, limit: 30, total: 0, totalPages: 1 });
    } catch (fetchError) { setError(fetchError.message); }
  }, [user?.role, orderSearch]);

  const reconcileOrders = useCallback(async () => {
    if (user?.role !== 'admin') return;
    try {
      const result = await adminApi('/api/admin/orders', {
        method: 'POST',
        body: JSON.stringify({ action: 'reconcile_pending' }),
      });
      if (result.checked > 0) await refreshOrders();
    } catch (reconcileError) {
      console.error(`Owner payment reconciliation failed: ${reconcileError.message}`);
    }
  }, [user?.role, refreshOrders]);

  const refreshCatalogue = useCallback(async () => {
    if (user?.role !== 'admin') return;
    setError('');
    try {
      const catalogPayload = await adminApi('/api/admin/catalog');
      setCollections(catalogPayload.collections || []);
      setImageAssets(catalogPayload.imageAssets || {});
      setSiteAssets(catalogPayload.siteAssets || {});
      setSiteSettings(catalogPayload.siteSettings || { homeCarousel: [] });
      await refreshCatalog();
    } catch (fetchError) { setError(fetchError.message); }
  }, [user?.role, refreshCatalog]);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    setLoadingData(true);
    Promise.all([refreshOrders(), refreshCatalogue()]).finally(() => {
      setLoadingData(false);
      reconcileOrders();
    });
  }, [user?.role, refreshOrders, refreshCatalogue, reconcileOrders]);

  useEffect(() => {
    if (user?.role !== 'admin') return undefined;
    const refreshVisibleOrders = () => {
      if (document.visibilityState === 'visible') {
        refreshOrders().finally(reconcileOrders);
      }
    };
    window.addEventListener('focus', refreshVisibleOrders);
    document.addEventListener('visibilitychange', refreshVisibleOrders);
    const interval = window.setInterval(refreshVisibleOrders, 60_000);
    return () => {
      window.removeEventListener('focus', refreshVisibleOrders);
      document.removeEventListener('visibilitychange', refreshVisibleOrders);
      window.clearInterval(interval);
    };
  }, [user?.role, refreshOrders, reconcileOrders]);

  const metrics = useMemo(() => ({
    revenue: Number(orderMetrics.revenue || 0),
    paid: Number(orderMetrics.paid || 0),
    open: Number(orderMetrics.open || 0),
    review: Number(orderMetrics.review || 0),
    products: collections.reduce((sum, collection) => sum + collection.products.length, 0),
  }), [orderMetrics, collections]);

  const refreshAll = async () => {
    setLoadingData(true);
    await Promise.all([refreshOrders(), refreshCatalogue()]);
    await reconcileOrders();
    setLoadingData(false);
  };

  if (isLoading) return <main className="commerce-page"><p className="commerce-loading">Opening the owner dashboard…</p></main>;
  if (!user) return <Navigate to="/account" state={{ from: '/admin' }} replace />;
  if (user.role !== 'admin') return <main className="commerce-page admin-denied"><h1>Owner access only.</h1><p>This account does not have permission to manage the shop.</p><Link className="btn btn--secondary" to="/account">Back to account</Link></main>;

  return <main className="admin-page page-enter">
    <header className="admin-head"><div className="container admin-head__inner"><div><p className="commerce-eyebrow">The Stitch Bloom · Owner</p><h1>Orders &amp; catalogue.</h1><p>Payments, fulfilment and the pieces currently shown in the shop.</p></div><div className="admin-head__actions"><button className="commerce-text-button" onClick={refreshAll}><FiRefreshCw /> Refresh records</button><Link className="commerce-text-button" to="/account">Your account</Link><button className="commerce-text-button" onClick={signOut}><FiLogOut /> Sign out</button></div></div></header>
    <div className="container admin-content">
      <section className="admin-metrics">{metric('Paid revenue', formatPrice('₦', metrics.revenue), FiCreditCard)}{metric('Paid orders', metrics.paid, FiPackage)}{metric('Open fulfilment', metrics.open, FiPackage)}{metric('Needs payment review', metrics.review, FiAlertTriangle)}{metric('Products', metrics.products, FiBox)}</section>
      <nav className="admin-tabs" aria-label="Dashboard sections"><button className={tab === 'orders' ? 'is-active' : ''} onClick={() => setTab('orders')}>Orders & payments</button><button className={tab === 'catalogue' ? 'is-active' : ''} onClick={() => setTab('catalogue')}>Products & collections</button><button className={tab === 'media' ? 'is-active' : ''} onClick={() => setTab('media')}>Home page & images</button></nav>
      {error && <p className="commerce-alert commerce-alert--error">{error}</p>}
      {loadingData ? <p className="commerce-loading">Loading shop records…</p> : tab === 'orders' ? <OrdersPanel orders={orders} filters={filters} pagination={pagination} onApplyFilters={setFilters} onRefresh={refreshOrders} />
        : tab === 'media' ? <>
            <HomeCarouselPanel collections={collections} siteSettings={siteSettings} onRefresh={refreshCatalogue} />
            <SiteImagesPanel siteAssets={siteAssets} imageAssets={imageAssets} onRefresh={refreshCatalogue} />
          </>
          : <CataloguePanel collections={collections} onRefresh={refreshCatalogue} imageAssets={imageAssets} onAssetsChanged={refreshCatalogue} />}
    </div>
  </main>;
}
