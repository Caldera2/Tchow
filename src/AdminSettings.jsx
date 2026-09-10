import { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { WHATSAPP_NUMBER } from './config';

const DEFAULT_SETTINGS = {
  brandName: 'Tchow',
  tagline: 'Food experiences made memorable.',
  email: 'hello@tchow.ng',
  phone: '+234 800 000 0000',
  hours: 'Monday - Saturday, 8:00am - 7:00pm',
  deliveryMessage: 'Delivery estimates are confirmed after order review.',
  whatsapp: WHATSAPP_NUMBER,
  currency: 'NGN',
  announcement: 'Weekend breakfast orders are open. Pre-order early for priority dispatch.',
  emailNotifications: true,
  whatsappNotifications: false,
  orderAlerts: true,
};

function AdminLink({ href, children, active }) {
  return <a href={href} className={active ? 'active' : undefined}>{children}</a>;
}

export function AdminSettings() {
  const [settings, setSettings] = useState(() => {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem('tchow-admin-settings') || '{}') };
    } catch {
      return DEFAULT_SETTINGS;
    }
  });
  const [saved, setSaved] = useState(false);
  const update = (key, value) => { setSaved(false); setSettings((current) => ({ ...current, [key]: value })); };
  const save = (event) => {
    event.preventDefault();
    try {
      localStorage.setItem('tchow-admin-settings', JSON.stringify(settings));
      setSaved(true);
    } catch {
      setSaved(false);
    }
  };

  return <main className="admin-page"><aside className="admin-sidebar"><div className="wordmark">TCHOW<span>.</span></div><span className="admin-label">Operations preview</span><AdminLink href="/admin">Overview</AdminLink><AdminLink href="/admin/orders">Orders</AdminLink><AdminLink href="/admin/menu">Menu</AdminLink><AdminLink href="/admin/catering">Catering</AdminLink><AdminLink href="/admin/investors">Partnerships</AdminLink><AdminLink href="/admin/settings" active>Settings</AdminLink><AdminLink href="/">Exit preview <ArrowRight size={14}/></AdminLink></aside><div className="admin-workspace"><header className="admin-topbar"><div><span className="eyebrow">Internal operations</span><strong>Settings</strong></div><span className="mock-pill">Mock data</span></header><div className="admin-content"><div className="admin-banner"><span className="eyebrow">Frontend-only internal preview</span><strong>Saved to this browser only</strong></div><div className="intro"><span className="eyebrow">Admin settings</span><h1>Shape the Tchow experience.</h1><p>Update the brand and service defaults used by this frontend preview. These values are not connected to a live backend.</p></div><form className="settings-form" onSubmit={save}><section className="settings-card"><div className="section-heading"><div><span className="eyebrow">Brand information</span><h2>How Tchow shows up</h2></div></div><div className="form-grid"><label>Brand name<input value={settings.brandName} onChange={(e) => update('brandName', e.target.value)} required /></label><label>Tagline<input value={settings.tagline} onChange={(e) => update('tagline', e.target.value)} required /></label></div></section><section className="settings-card"><div className="section-heading"><div><span className="eyebrow">Contact details</span><h2>Where customers can reach you</h2></div></div><div className="form-grid"><label>Email address<input type="email" value={settings.email} onChange={(e) => update('email', e.target.value)} required /></label><label>Phone number<input value={settings.phone} onChange={(e) => update('phone', e.target.value)} required /></label><label>WhatsApp number<input value={settings.whatsapp} onChange={(e) => update('whatsapp', e.target.value)} required /><small>Use international format without spaces.</small></label><label>Currency<select value={settings.currency} onChange={(e) => update('currency', e.target.value)}><option value="NGN">NGN - Nigerian naira</option><option value="USD">USD - US dollar</option></select></label></div></section><section className="settings-card"><div className="section-heading"><div><span className="eyebrow">Operations</span><h2>Set clear expectations</h2></div></div><div className="form-grid"><label>Operating hours<input value={settings.hours} onChange={(e) => update('hours', e.target.value)} required /></label><label className="field-wide">Delivery message<textarea rows="3" value={settings.deliveryMessage} onChange={(e) => update('deliveryMessage', e.target.value)} required /></label></div></section><section className="settings-card"><div className="section-heading"><div><span className="eyebrow">Homepage announcement</span><h2>Keep the front door current</h2></div></div><label>Announcement text<textarea rows="3" value={settings.announcement} onChange={(e) => update('announcement', e.target.value)} required /></label></section><section className="settings-card"><div className="section-heading"><div><span className="eyebrow">Notification preferences</span><h2>Choose preview alerts</h2></div></div><div className="settings-checks"><label><input type="checkbox" checked={settings.emailNotifications} onChange={(e) => update('emailNotifications', e.target.checked)} /> Email notifications</label><label><input type="checkbox" checked={settings.whatsappNotifications} onChange={(e) => update('whatsappNotifications', e.target.checked)} /> WhatsApp notifications</label><label><input type="checkbox" checked={settings.orderAlerts} onChange={(e) => update('orderAlerts', e.target.checked)} /> New order alerts</label></div></section><div className="settings-actions"><button className="button" type="submit">Save settings <Check size={16}/></button>{saved && <span className="save-feedback" role="status">Settings saved locally in this browser.</span>}</div></form></div></div></main>;
}
