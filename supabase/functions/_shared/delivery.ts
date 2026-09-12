export type DeliveryRequest = {
  serviceAreaId: string;
  slotId: string;
  deliveryDate: string;
  productIds: string[];
};

export type DeliveryQuote = {
  serviceAreaId: string;
  zoneId: string;
  slotId: string;
  deliveryDate: string;
  feeKobo: number;
  estimatedMinutes: number;
  expiresAt: string;
};

export const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export function isDeliveryRequest(value: unknown): value is DeliveryRequest {
  const request = value as Partial<DeliveryRequest>;
  return Boolean(
    request &&
    typeof request.serviceAreaId === 'string' &&
    typeof request.slotId === 'string' &&
    typeof request.deliveryDate === 'string' &&
    datePattern.test(request.deliveryDate) &&
    Array.isArray(request.productIds) &&
    request.productIds.every((id) => typeof id === 'string')
  );
}

export function lagosParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)])) as Record<string, number>;
}

export function dateIsPast(date: string, now = new Date()) {
  const current = lagosParts(now);
  const today = `${current.year}-${String(current.month).padStart(2, '0')}-${String(current.day).padStart(2, '0')}`;
  return date < today;
}

export function slotStartDate(date: string, time: string) {
  return new Date(`${date}T${time.slice(0, 8)}+01:00`);
}
