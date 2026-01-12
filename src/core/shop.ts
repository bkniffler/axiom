import { SHOP_CARDS } from './content';
import { createRng } from './rng';
import type { GameState, ShopOffer } from './types';

const availableCards = (state: GameState) =>
  SHOP_CARDS.filter((c) => {
    if (c.kind === 'tech') return !state.tech[c.id];
    return true;
  });

export const rollShop = (state: GameState, salt: number): ShopOffer[] => {
  const rng = createRng((state.seed + salt + state.turn * 997) >>> 0);
  const pool = availableCards(state);
  if (pool.length === 0) return [];

  const pickUnique = (count: number): ShopOffer[] => {
    const picked: ShopOffer[] = [];
    const used = new Set<string>();
    for (let i = 0; i < count; i++) {
      let tries = 0;
      while (tries < 50) {
        const c = rng.pick(pool);
        tries += 1;
        if (used.has(c.id)) continue;
        used.add(c.id);
        picked.push({
          slot: (i + 1) as 1 | 2 | 3,
          cardId: c.id,
          name: c.name,
          description: c.description,
          costInfluence: c.costInfluence,
          kind: c.kind,
          tier: c.tier,
        });
        break;
      }
    }
    return picked;
  };

  return pickUnique(3);
};
