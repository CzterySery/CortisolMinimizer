// Preserve a random hand, replacing one card only when the whole hand is unavailable.
export function ensurePlayable<T extends { id: string }>(hand: T[], pool: T[], available: ReadonlySet<string>): T[] {
  if (!hand.length || hand.some((card) => available.has(card.id))) return hand;
  const replacement = pool.find((card) => available.has(card.id));
  return replacement ? [...hand.slice(0, -1), replacement] : hand;
}
