import { describe, expect, it } from 'bun:test';
import { createNewGame, transition } from '@/core';
import { newGameRun } from './__test_utils__/coreRunner';

describe('core machine (new system)', () => {
  it('starts with a controlled, scouted homeworld and ring 1 revealed', () => {
    const s = createNewGame(1);
    expect(s.phase).toBe('playing');
    expect(s.turn).toBe(1);
    expect(s.galaxy.revealedRing).toBe(0);
    expect(s.galaxy.homeworldId).toBe('p-0-0');
    expect(s.planets['p-0-0']?.status).toBe('controlled');
    expect(s.planets['p-0-0']?.known.scouted).toBe(true);
    expect(s.shop.offers.length).toBeGreaterThan(0);
  });

  it('requires scouting before colonizing', () => {
    const s0 = createNewGame(2);
    const target = s0.galaxy.rings[0]?.[1];
    expect(target).toBeTruthy();

    const r1 = transition(s0, {
      type: 'ACTION',
      action: { type: 'COLONIZE', planetId: target! },
    });
    expect(r1.effects.some((e) => e.type === 'INVALID')).toBe(true);

    const r2 = transition(s0, {
      type: 'ACTION',
      action: { type: 'SCOUT', planetId: target! },
    });
    expect(r2.effects.some((e) => e.type === 'INVALID')).toBe(false);

    const r3 = transition(r2.state, {
      type: 'ACTION',
      action: { type: 'COLONIZE', planetId: target! },
    });

    const invalid = r3.effects.find((e) => e.type === 'INVALID');
    if (invalid && invalid.type === 'INVALID') {
      expect(invalid.reason).toContain('Inhabitants');
    } else {
      expect(r3.state.planets[target!]?.status).toBe('controlled');
    }
  });

  it('buying a shop tech consumes influence and unlocks cost modifiers', () => {
    // Find a seed that has a tech offer
    let s0 = createNewGame(1, { startingInfluence: 50 });
    let offer = s0.shop.offers.find((o) => o.kind === 'tech');
    for (let seed = 2; seed <= 20 && !offer; seed++) {
      s0 = createNewGame(seed, { startingInfluence: 50 });
      offer = s0.shop.offers.find((o) => o.kind === 'tech');
    }
    expect(offer).toBeTruthy();

    const before = s0.influence;
    const r1 = transition(s0, {
      type: 'ACTION',
      action: { type: 'BUY_SHOP', slot: offer!.slot },
    });
    expect(r1.effects.some((e) => e.type === 'INVALID')).toBe(false);
    expect(r1.state.influence).toBe(before - offer!.costInfluence);
    expect(r1.state.tech[offer!.cardId]).toBe(true);
  });

  it('end turn collects income and advances turn deterministically', () => {
    const run = newGameRun(
      [
        { type: 'ACTION', action: { type: 'END_TURN' } },
        { type: 'ACTION', action: { type: 'END_TURN' } },
        { type: 'ACTION', action: { type: 'END_TURN' } },
      ],
      1
    );

    expect(run.state.turn).toBe(4);
    expect(run.state.influence).toBeGreaterThan(0);
  });

  it('investigate with intel network can find events on other planets', () => {
    const s0 = createNewGame(1, { startingInfluence: 50 });

    // Add intel network tech and a brewing event on a different planet
    const withTech = {
      ...s0,
      tech: { 'tech-intel-network': true },
      events: {
        ...s0.events,
        brewing: [
          {
            id: 'remote-event',
            kind: 'internal' as const,
            type: 'unrest',
            planetId: 'p-0-1', // Different planet
            turnsLeft: 3,
            revealed: false,
          },
        ],
      },
    };

    // Investigate from homeworld (p-0-0) should find the event on p-0-1
    const r = transition(withTech, {
      type: 'ACTION',
      action: { type: 'INVESTIGATE', planetId: 'p-0-0' },
    });

    expect(r.effects.some((e) => e.type === 'INVALID')).toBe(false);
    expect(r.state.events.brewing[0]?.revealed).toBe(true);
  });
});
