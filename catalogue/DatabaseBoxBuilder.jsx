import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, Minus, Plus, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../src/auth/AuthContext';
import { listPublishedBoxConfigurations, quoteBox } from '../src/services/catalogue';

const TYPES = ['snack', 'drink', 'dessert'];
const money = (kobo = 0) => `₦${Math.round(Number(kobo || 0) / 100).toLocaleString('en-NG')}`;
const componentKey = (item) => `${item.product_id}:${item.component_type}`;
const productFor = (item) => (Array.isArray(item?.products) ? item.products[0] : item?.products);
const typeLabel = (type) => `${type[0].toUpperCase()}${type.slice(1)}s`;

const formatExpiry = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'shortly'
    : date.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' });
};

function BuilderHeading({ boxCount }) {
  return (
    <div className="builder-heading">
      <div className="builder-heading-top">
        <span className="eyebrow">Build your box</span>
        <span className="builder-live-status"><i aria-hidden="true" /> Live server menu{boxCount ? ` · ${boxCount} sizes` : ''}</span>
      </div>
      <h1>Build a box that fits <em>your moment.</em></h1>
      <p>Choose a size, fill each allowance, and get a price calculated from today&apos;s available menu.</p>
      <div className="builder-steps" aria-label="Box builder steps">
        <span className="active"><b>01</b> Choose a size</span>
        <span><b>02</b> Fill your allowances</span>
        <span><b>03</b> Confirm your quote</span>
      </div>
    </div>
  );
}

function EmptyBuilder({ error, onRetry }) {
  return (
    <main className="page builder-page">
      <BuilderHeading />
      <div className="builder-empty-layout">
        <section className="builder-empty-panel" role={error ? 'alert' : undefined}>
          <div className="builder-empty-art" aria-hidden="true">
            <span>+</span><span>+</span><span>+</span>
            <strong>BOX<br />YOUR<br />WAY</strong>
          </div>
          <div className="builder-empty-copy">
            <span className="eyebrow">{error ? 'A quick refresh' : 'Almost ready'}</span>
            <h2>{error ? 'The box menu needs a moment.' : 'Our boxes are being refreshed.'}</h2>
            <p>{error || 'There are no published box options available right now. Once the team publishes a size, it will appear here with live availability and pricing.'}</p>
            <div className="builder-empty-actions">
              <button className="button button-primary" type="button" onClick={onRetry}>
                <RefreshCw size={16} /> Try again
              </button>
              <Link className="button button-outline" to="/contact">Talk to the concierge <ArrowRight size={16} /></Link>
            </div>
            <span className="builder-empty-note"><Check size={14} /> Prices are always confirmed by the server before checkout.</span>
          </div>
        </section>
        <aside className="builder-summary builder-summary-empty">
          <div className="summary-topline"><span className="eyebrow">Your box journey</span><span className="summary-state">Waiting</span></div>
          <h2>Good things,<br /><em>made personal.</em></h2>
          <p>Pick a base, make it yours, then add the fresh quote to your cart.</p>
          <div className="summary-steps">
            <span><b>01</b><strong>Pick a size</strong><small>Choose the moment you are making.</small></span>
            <span><b>02</b><strong>Choose your favourites</strong><small>Fill the published snack, drink and dessert allowances.</small></span>
            <span><b>03</b><strong>Get a live total</strong><small>Prices and availability are checked at the source.</small></span>
          </div>
        </aside>
      </div>
    </main>
  );
}

export function DatabaseBoxBuilder({ add }) {
  const { user } = useAuth();
  const [boxes, setBoxes] = useState([]);
  const [sizeId, setSizeId] = useState('');
  const [quantities, setQuantities] = useState({});
  const [quote, setQuote] = useState(null);
  const [priceChange, setPriceChange] = useState(null);
  const [state, setState] = useState({ loading: true, busy: false, error: '', saved: false });
  const [saveName, setSaveName] = useState('');
  const quoteRequest = useRef(0);

  const loadBoxes = useCallback(async () => {
    setState({ loading: true, busy: false, error: '', saved: false });
    try {
      const data = await listPublishedBoxConfigurations();
      const available = Array.isArray(data) ? data.filter((item) => item?.id) : [];
      setBoxes(available);
      setSizeId((current) => (available.some((item) => item.id === current) ? current : available[0]?.id || ''));
      setQuantities({});
      setQuote(null);
      setPriceChange(null);
      setState({ loading: false, busy: false, error: '', saved: false });
    } catch {
      setBoxes([]);
      setSizeId('');
      setQuantities({});
      setQuote(null);
      setPriceChange(null);
      setState({ loading: false, busy: false, error: 'We could not load the box catalogue right now. Please try again.', saved: false });
    }
  }, []);

  useEffect(() => { loadBoxes(); }, [loadBoxes]);

  const box = boxes.find((item) => item.id === sizeId);
  const components = useMemo(() => (box?.box_components || []).filter((item) => productFor(item)), [box]);
  const selected = components
    .filter((item) => quantities[componentKey(item)] > 0)
    // quantity: quantities[item.product_id] (legacy single-key lookup) is intentionally replaced by the scoped key above.
    .map((item) => ({ productId: item.product_id, componentType: item.component_type, quantity: quantities[componentKey(item)] }));
  const totals = selected.reduce((result, item) => ({ ...result, [item.componentType]: (result[item.componentType] || 0) + item.quantity }), {});
  const requiredMissing = components.some((item) => item.required && (quantities[componentKey(item)] || 0) < Math.max(1, Number(item.min_quantity || 0)));
  const allowancesComplete = Boolean(box) && !requiredMissing && TYPES.every((type) => (totals[type] || 0) === Number(box[`${type}_allowance`] || 0));
  const remainingItems = TYPES.reduce((sum, type) => sum + Math.max(0, Number(box?.[`${type}_allowance`] || 0) - (totals[type] || 0)), 0);

  const setSize = (id) => {
    quoteRequest.current += 1;
    setSizeId(id);
    setQuantities({});
    setPriceChange(quote ? { from: quote.total_kobo, acknowledged: false } : null);
    setQuote(null);
    setState((current) => ({ ...current, busy: false, error: '', saved: false }));
  };

  const changeQuantity = (item, delta) => {
    const key = componentKey(item);
    const current = Number(quantities[key] || 0);
    const min = Math.max(0, Number(item.min_quantity || 0));
    const max = Math.max(min, Number(item.max_quantity || 0));
    let next = current + delta;
    if (delta < 0 && current > 0 && current <= min) next = 0;
    else next = Math.max(min, Math.min(max, next));
    quoteRequest.current += 1;
    setPriceChange(quote ? { from: quote.total_kobo, acknowledged: false } : null);
    setQuote(null);
    setState((currentState) => ({ ...currentState, busy: false, error: '' }));
    setQuantities((currentState) => ({ ...currentState, [key]: next }));
  };

  const getQuote = async () => {
    if (!box || !allowancesComplete) {
      setState((current) => ({ ...current, error: 'Match each allowance before requesting a server quote.' }));
      return;
    }
    const requestId = ++quoteRequest.current;
    const configurationKey = `${box.id}:${JSON.stringify(selected)}`;
    setState({ loading: false, busy: true, error: '', saved: false });
    try {
      const result = await quoteBox({ boxSizeId: box.id, components: selected, saveName: user && saveName.trim() ? saveName.trim() : undefined });
      if (requestId !== quoteRequest.current || configurationKey !== `${sizeId}:${JSON.stringify(selected)}`) return;
      if (!result?.quote) throw new Error('missing_quote');
      const changed = priceChange?.from != null && priceChange.from !== result.quote.total_kobo;
      setPriceChange(changed ? { from: priceChange.from, to: result.quote.total_kobo, acknowledged: false } : null);
      setQuote(result.quote);
      setState({ loading: false, busy: false, error: '', saved: Boolean(result.savedConfiguration) });
    } catch {
      if (requestId !== quoteRequest.current) return;
      setQuote(null);
      setState({ loading: false, busy: false, error: 'This configuration could not be quoted. Check the selections and try again.', saved: false });
    }
  };

  const addQuotedBox = () => {
    const currentKey = `${sizeId}:${JSON.stringify(selected)}`;
    const quotedKey = `${quote?.box_size_id}:${JSON.stringify((quote?.components_snapshot || []).map((item) => ({ productId: item.product_id, componentType: item.component_type, quantity: item.quantity })))}`;
    if (!quote || currentKey !== quotedKey || new Date(quote.expires_at) <= new Date() || (priceChange && !priceChange.acknowledged)) {
      setQuote(null);
      setState((current) => ({ ...current, error: 'This quote is expired, changed, or not confirmed. Request a fresh quote.' }));
      return;
    }
    add({
      id: `box-quote-${quote.id}`,
      name: box.name,
      priceKobo: quote.total_kobo,
      image: '/assets/small_chops.jpg',
      tag: 'Server-quoted custom box',
      description: 'Custom box configuration',
      boxQuoteId: quote.id,
      components: quote.components_snapshot,
    });
  };

  if (state.loading) {
    return (
      <main className="page builder-page builder-loading" aria-busy="true">
        <BuilderHeading />
        <div className="builder-loading-grid"><div className="builder-skeleton builder-skeleton-main" /><div className="builder-skeleton builder-skeleton-side" /></div>
      </main>
    );
  }

  if (!boxes.length) return <EmptyBuilder error={state.error} onRetry={loadBoxes} />;

  return (
    <main className="page builder-page">
      <BuilderHeading boxCount={boxes.length} />
      <div className="builder-layout">
        <section className="builder-main">
          <div className="builder-main-header">
            <div><span className="eyebrow">01 / Pick a base</span><h2>Start with your box.</h2></div>
            <span className="builder-count">{boxes.length} {boxes.length === 1 ? 'size' : 'sizes'}</span>
          </div>
          <div className="choice-grid" role="list" aria-label="Box sizes">
            {boxes.map((item, index) => (
              <button className={`choice-card ${sizeId === item.id ? 'selected' : ''}`} type="button" key={item.id} onClick={() => setSize(item.id)} aria-pressed={sizeId === item.id}>
                <span className="choice-card-index">0{index + 1}</span>
                <span className="choice-card-copy">
                  <strong>{item.name}</strong>
                  <small>{item.description || item.serving_note || 'A considered selection for sharing.'}</small>
                  <span className="choice-card-meta">{item.snack_allowance || 0} snacks <i /> {item.drink_allowance || 0} drinks <i /> {item.dessert_allowance || 0} desserts</span>
                  <b>{money(item.base_price_kobo)} <small>base</small></b>
                </span>
                {sizeId === item.id && <Check className="choice-check" size={18} aria-hidden="true" />}
              </button>
            ))}
          </div>

          {box && <>
            <div className="builder-selection-header"><div><span className="eyebrow">02 / Fill your allowance</span><h2>Make it yours.</h2></div><span className={`selection-state ${allowancesComplete ? 'complete' : ''}`}>{allowancesComplete ? 'Ready for a quote' : 'Still choosing'}</span></div>
            <div className="box-allowance-summary">
              {TYPES.map((type) => {
                const allowance = Number(box[`${type}_allowance`] || 0);
                const used = totals[type] || 0;
                const percent = allowance ? Math.min(100, Math.round((used / allowance) * 100)) : 0;
                return <div className="allowance-card" key={type}><div><span>{typeLabel(type)}</span><strong>{used}<small> / {allowance}</small></strong></div><span className="allowance-bar"><i style={{ width: `${percent}%` }} /></span><small>{allowance === 0 ? 'Not included' : used === allowance ? 'Complete' : `${Math.max(0, allowance - used)} to go`}</small></div>;
              })}
            </div>
            <div className="box-component-groups">
              {TYPES.map((type) => {
                const allowance = Number(box[`${type}_allowance`] || 0);
                const group = components.filter((item) => item.component_type === type);
                return <section className={`component-group ${allowance === 0 ? 'is-disabled' : ''}`} key={type}>
                  <div className="component-group-heading"><div><span className="eyebrow">{typeLabel(type)}</span><h2>Choose your {type}s</h2></div><span>{allowance === 0 ? 'Not included' : `${allowance} available`}</span></div>
                  {group.length ? <div className="component-list">{group.map((item) => {
                    const product = productFor(item);
                    const key = componentKey(item);
                    const quantity = quantities[key] || 0;
                    const max = Math.max(Number(item.min_quantity || 0), Number(item.max_quantity || 0));
                    const range = item.min_quantity > 0 ? `${item.min_quantity}–${item.max_quantity}` : `Up to ${item.max_quantity}`;
                    return <div className="component-row" key={item.id}><span className="component-copy"><strong>{product.name}</strong><small>{product.description || 'Prepared fresh for your table.'}</small><em>{item.required ? 'Required · ' : ''}{range}</em></span><div className="quantity-selector" aria-label={`${product.name} quantity`}><button type="button" disabled={allowance === 0 || quantity === 0} onClick={() => changeQuantity(item, -1)} aria-label={`Remove one ${product.name}`}><Minus size={14} /></button><b aria-live="polite">{quantity}</b><button type="button" disabled={allowance === 0 || quantity >= max} onClick={() => changeQuantity(item, 1)} aria-label={`Add one ${product.name}`}><Plus size={14} /></button></div></div>;
                  })}</div> : <p className="component-empty">{allowance === 0 ? 'This box does not include this category.' : 'No available items have been published for this category yet.'}</p>}
                </section>;
              })}
            </div>
          </>}

          {state.error && <p className="form-error builder-error" role="alert">{state.error}</p>}
          <div className="builder-actions">
            <div className="builder-actions-primary"><button className="button button-primary" type="button" disabled={state.busy || !allowancesComplete} onClick={getQuote}>{state.busy ? 'Calculating…' : allowancesComplete ? 'Get server quote' : 'Complete your selections'} <ArrowRight size={16} /></button><span className="builder-quote-hint">{allowancesComplete ? 'Your price will be checked against the live menu.' : `${remainingItems} ${remainingItems === 1 ? 'item' : 'items'} left to complete the allowances.`}</span></div>
            {priceChange && <label className="checkbox builder-price-change"><input type="checkbox" checked={priceChange.acknowledged} onChange={(event) => setPriceChange((current) => ({ ...current, acknowledged: event.target.checked }))} /> The refreshed quote changed from {money(priceChange.from)} to {money(priceChange.to)}. I confirm the new amount.</label>}
            {quote && <button className="button button-outline" type="button" onClick={addQuotedBox}>Add quoted box to cart</button>}
          </div>
        </section>

        <aside className={`builder-summary ${quote ? 'has-quote' : ''}`}>
          <div className="summary-topline"><span className="eyebrow">03 / Server quote</span><span className={`summary-state ${quote ? 'ready' : ''}`}>{quote ? 'Ready' : 'Waiting'}</span></div>
          {quote ? <>
            <div className="quote-total"><span>Your total</span><strong>{money(quote.total_kobo)}</strong><small>Valid until {formatExpiry(quote.expires_at)}</small></div>
            <div className="summary-list">{(quote.components_snapshot || []).map((item) => <span key={`${item.product_id}-${item.component_type}`}><b>{item.quantity} ×</b> {item.product_name}</span>)}</div>
            {user ? <label className="save-configuration">Save configuration name<input value={saveName} onChange={(event) => setSaveName(event.target.value)} placeholder="Optional" maxLength={80} /></label> : <p className="summary-note">Sign in before requesting a saved configuration.</p>}
            {state.saved && <p className="form-success"><Check size={14} /> Configuration saved.</p>}
            <button className="button button-primary summary-cart-button" type="button" onClick={addQuotedBox}>Add quoted box to cart <ArrowRight size={16} /></button>
          </> : <>
            <div className="summary-empty-mark" aria-hidden="true"><span>₦</span></div>
            <h2>{box.name}</h2>
            <p>Match each allowance to unlock a live quote for this box.</p>
            <div className="summary-list"><span>Base box <b>{money(box.base_price_kobo)}</b></span><span>Snacks <b>{totals.snack || 0} / {box.snack_allowance || 0}</b></span><span>Drinks <b>{totals.drink || 0} / {box.drink_allowance || 0}</b></span><span>Desserts <b>{totals.dessert || 0} / {box.dessert_allowance || 0}</b></span></div>
            <p className="summary-note"><Check size={13} /> Final pricing and availability are confirmed server-side.</p>
          </>}
        </aside>
      </div>
    </main>
  );
}
