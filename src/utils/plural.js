/**
 * English count/noun agreement. Irregular plurals are passed explicitly rather
 * than guessed, so "1 colourway / 2 colourways" and "1 piece / 2 pieces" both
 * read correctly without a rules engine.
 */
export function plural(count, singular, pluralForm) {
  return Number(count) === 1 ? singular : (pluralForm || `${singular}s`);
}

/** "1 product" / "3 products" — the count and its noun, already agreed. */
export function countOf(count, singular, pluralForm) {
  const value = Number(count) || 0;
  return `${value} ${plural(value, singular, pluralForm)}`;
}
