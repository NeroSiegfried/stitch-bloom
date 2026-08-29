export const NIGERIAN_STATES = Object.freeze([
  'FCT',
  'Abia',
  'Adamawa',
  'Akwa Ibom',
  'Anambra',
  'Bauchi',
  'Bayelsa',
  'Benue',
  'Borno',
  'Cross River',
  'Delta',
  'Ebonyi',
  'Edo',
  'Ekiti',
  'Enugu',
  'Gombe',
  'Imo',
  'Jigawa',
  'Kaduna',
  'Kano',
  'Katsina',
  'Kebbi',
  'Kogi',
  'Kwara',
  'Lagos',
  'Nasarawa',
  'Niger',
  'Ogun',
  'Ondo',
  'Osun',
  'Oyo',
  'Plateau',
  'Rivers',
  'Sokoto',
  'Taraba',
  'Yobe',
  'Zamfara',
]);

export const PAYSTACK_NGN_MINIMUM = 50;
export const DELIVERY_FEES = Object.freeze({
  fct: 5500,
  outside_fct: 14000,
  test: PAYSTACK_NGN_MINIMUM,
});

const STATE_BY_KEY = new Map(NIGERIAN_STATES.map((state) => [state.toLowerCase(), state]));

export function canonicalNigeriaState(value) {
  const key = String(value || '').trim().toLowerCase();
  if (!key) return '';
  if (key === 'abuja' || key === 'fct' || key.includes('federal capital')) return 'FCT';
  return STATE_BY_KEY.get(key) || '';
}

export function deliveryZoneForState(value) {
  const state = canonicalNigeriaState(value);
  if (!state) return '';
  return state === 'FCT' ? 'fct' : 'outside_fct';
}

export function deliveryFeeForState(value) {
  return DELIVERY_FEES[deliveryZoneForState(value)] || 0;
}

export function deliveryLabelForZone(zone) {
  if (['fct', 'abuja'].includes(zone)) return 'FCT delivery';
  if (['outside_fct', 'lagos'].includes(zone)) return 'Outside FCT delivery';
  if (zone === 'test') return 'Test delivery';
  return 'Delivery';
}
