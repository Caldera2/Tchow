const legalSections = [
  ['Overview', 'overview'],
  ['Information we collect', 'information'],
  ['How we use information', 'use'],
  ['Your choices', 'choices'],
  ['Contact', 'contact'],
];

function LegalNav({ active }) {
  return <nav className="legal-nav" aria-label="Legal page sections">{legalSections.map(([label, id]) => <a key={id} className={active === id ? 'active' : ''} href={`#${id}`}>{label}</a>)}</nav>;
}

export function LegalPage({ kind }) {
  const isPrivacy = kind === 'privacy';
  const title = isPrivacy ? 'Privacy' : 'Terms';
  return <main className="page legal-page"><div className="legal-hero"><span className="eyebrow">Tchow / Legal</span><h1>{title}</h1><p>Clear, practical information for using the Tchow frontend experience.</p><span className="legal-updated">Last updated: placeholder</span></div><div className="legal-layout"><LegalNav active="overview"/><article className="legal-copy"><section id="overview"><span className="eyebrow">{isPrivacy ? 'A thoughtful approach' : 'Before you order'}</span><h2>{isPrivacy ? 'Privacy at Tchow' : 'Using Tchow'}</h2><p>{isPrivacy ? 'We aim to handle personal information with care and only use it to support the customer experience described on this site. This page is a frontend preview and does not currently transmit form submissions to a live service.' : 'These terms describe the intended use of the Tchow website, menu catalogue, ordering preview, catering enquiry flows, and partnership interest forms. Backend policies will be added before launch.'}</p></section><section id="information"><h2>{isPrivacy ? 'Information we collect' : 'Product and service information'}</h2><p>{isPrivacy ? 'The prototype may store details such as contact information, delivery details, profile preferences, cart items, and submitted enquiries in your browser using localStorage. It does not represent a live account or server record.' : 'Menu availability, preparation times, delivery estimates, prices, and service descriptions are mock values for this frontend preview and may change when live operations are connected.'}</p></section><section id="use"><h2>{isPrivacy ? 'How we use information' : 'Orders and enquiries'}</h2><p>{isPrivacy ? 'Local information is used to keep the preview functional, such as remembering your cart, profile preferences, saved settings, or a draft builder. No payment is processed and no submission is represented as delivered to the Tchow team.' : 'Submitting an order, catering enquiry, contact form, or partnership interest application records a local preview only. Nothing on this site confirms payment, fulfilment, partnership acceptance, or a binding agreement.'}</p></section><section id="choices"><h2>{isPrivacy ? 'Your choices' : 'Responsible use'}</h2><p>{isPrivacy ? 'You can clear browser storage to remove locally saved preview data. When the backend is implemented, this page will be updated with the applicable data access, retention, and deletion processes.' : 'Please use the catalogue, forms, and admin previews as demonstrations only. Do not rely on mock data as a quote, availability commitment, financial advice, or investment offer.'}</p></section><section id="contact"><h2>Contact</h2><p>Questions about these pages can be directed through the <a href="/contact">Tchow contact page</a>. The contact flow is also currently a frontend preview.</p></section></article></div></main>;
}

export function Error404() {
  return <main className="page error-page"><span className="wordmark">TCHOW<span>.</span></span><span className="eyebrow">404 / Page not found</span><h1>This page wandered off.</h1><p>Let’s get you back to the good stuff.</p><div className="error-actions"><a className="button" href="/">Return home</a><a className="button button-outline" href="/menu">Explore menu</a></div></main>;
}
