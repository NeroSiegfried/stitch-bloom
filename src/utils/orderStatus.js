export function statusLabel(value) {
  return String(value || 'unknown').replaceAll('_', ' ');
}
