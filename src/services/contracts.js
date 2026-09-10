/** @typedef {{ ok: boolean, data?: unknown, error?: { code: string, message: string, details?: unknown } }} ApiResponse */

export class ValidationError extends Error {
  constructor(message, fields = {}) { super(message); this.name = 'ValidationError'; this.fields = fields; }
}

const required = (value) => typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
const email = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
const validate = (fields) => { const errors = Object.fromEntries(Object.entries(fields).filter(([, valid]) => !valid).map(([key]) => [key, 'This field is required.'])); if (Object.keys(errors).length) throw new ValidationError('Please complete the required fields.', errors); return true; };

export const validateOrderDraft = (draft) => { const customer = draft?.customer || {}; const delivery = draft?.delivery || customer; const items = draft?.items || []; validate({ idempotencyKey: required(draft?.idempotencyKey), name: required(customer.name), email: email(customer.email), phone: required(customer.phone), address: required(delivery.address), area: required(delivery.area), city: required(delivery.city), state: required(delivery.state), items: items.length > 0 && items.every((item) => Boolean(item?.productId) !== Boolean(item?.boxQuoteId) && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 50) }); return draft; };
export const validateCateringEnquiry = (data) => { validate({ fullName: required(data?.fullName), email: email(data?.email), phone: required(data?.phone), eventType: required(data?.eventType), eventDate: required(data?.eventDate), guestCount: Number.isInteger(Number(data?.guestCount)) && Number(data.guestCount) > 0, location: required(data?.location) }); return data; };
export const validatePartnershipApplication = (data) => { validate({ fullName: required(data?.fullName), email: email(data?.email), phone: required(data?.phone), country: required(data?.country), pathway: required(data?.pathway), consent: Boolean(data?.consent) }); return data; };
export const validateContactEnquiry = (data) => { validate({ name: required(data?.name), email: email(data?.email), subject: required(data?.subject), message: required(data?.message), consent: Boolean(data?.consent) }); return data; };
export const normalizeApiError = (error, fallback = 'The request could not be completed.') => ({ code: error?.code || 'request_failed', message: error?.message || fallback, details: error?.details });
