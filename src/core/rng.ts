type Rng = {
  next(): number;
  int(minInclusive: number, maxInclusive: number): number;
  pick<T>(items: readonly T[]): T;
};

export const createRng = (seed: number): Rng => {
  let t = seed >>> 0;
  const next = () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };

  const int = (minInclusive: number, maxInclusive: number): number => {
    if (!Number.isFinite(minInclusive) || !Number.isFinite(maxInclusive)) {
      throw new Error('rng.int: bounds must be finite');
    }
    if (maxInclusive < minInclusive) {
      throw new Error('rng.int: max < min');
    }
    const r = next();
    const span = maxInclusive - minInclusive + 1;
    return minInclusive + Math.floor(r * span);
  };

  const pick = <T>(items: readonly T[]): T => {
    if (items.length === 0) throw new Error('rng.pick: empty array');
    return items[int(0, items.length - 1)];
  };

  return { next, int, pick };
};
