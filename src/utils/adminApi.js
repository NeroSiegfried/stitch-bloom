/** Shared fetch wrapper for owner-dashboard endpoints. */
export async function adminApi(path, options = {}) {
  const response = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'The owner dashboard could not complete that action.');
  return payload;
}
