import { describe, expect, it } from 'bun:test';
import { createNewGame, transition } from '@/core';

describe('entropy system', () => {
  it('colonizing adds entropy based on ring', () => {
    const s0 = createNewGame(1, { startingInfluence: 100 });

    // Scout a ring 0 planet first
    const target = s0.galaxy.rings[0]?.[1];
    expect(target).toBeTruthy();

    const r1 = transition(s0, {
      type: 'ACTION',
      action: { type: 'SCOUT', planetId: target! },
    });

    // Check if planet is colonizable (Empty or Primitives)
    const planet = r1.state.planets[target!];
    if (
      planet?.intrinsic.inhabitants === 'Empty' ||
      planet?.intrinsic.inhabitants === 'Primitives'
    ) {
      const r2 = transition(r1.state, {
        type: 'ACTION',
        action: { type: 'COLONIZE', planetId: target! },
      });
      // Ring 0 colonize = 1 entropy (1 + ring)
      expect(r2.state.entropy).toBeGreaterThan(s0.entropy);
    }
  });

  it('large empires generate passive entropy', () => {
    // Create game with many controlled planets
    const s0 = createNewGame(1, { startingInfluence: 500 });

    // Manually set up a large empire
    const planets = { ...s0.planets };
    const ring0 = s0.galaxy.rings[0] ?? [];
    const ring1 = s0.galaxy.rings[1] ?? [];
    const ring2 = s0.galaxy.rings[2] ?? [];

    // Control ring 0, 1, and part of ring 2 to get 12+ planets
    for (const id of [...ring0, ...ring1, ...ring2.slice(0, 4)]) {
      if (planets[id]) {
        planets[id] = {
          ...planets[id]!,
          status: 'controlled',
          known: { scouted: true },
        };
      }
    }

    const largeEmpire = {
      ...s0,
      planets,
      galaxy: { ...s0.galaxy, revealedRing: 2 },
    };

    // End turn should add passive entropy for large empire (10+ planets)
    const r = transition(largeEmpire, {
      type: 'ACTION',
      action: { type: 'END_TURN' },
    });

    // Should have passive entropy message (13 planets = (13-8)/4 = 1 entropy)
    const hasEntropyMsg = r.effects.some(
      (e) => e.type === 'MESSAGE' && e.message.includes('Entropy')
    );
    expect(hasEntropyMsg).toBe(true);
  });

  it('starts with zero entropy by default', () => {
    const s0 = createNewGame(1);
    expect(s0.entropy).toBe(0);
  });
});
