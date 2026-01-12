import { describe, expect, it } from 'bun:test';
import { createNewGame, transition } from '@/core';
import { SHOP_CARDS } from '@/core/content';
import type { GameState } from '@/core/types';

describe('relic system', () => {
  it('has multiple relics available', () => {
    const relics = SHOP_CARDS.filter((c) => c.kind === 'relic');
    expect(relics.length).toBeGreaterThanOrEqual(4);
  });

  it('axiom key reveals next ring', () => {
    const s0 = createNewGame(1, { startingInfluence: 100 });
    const withRelic: GameState = { ...s0, relics: { 'relic-axiom-key': 1 } };

    const r = transition(withRelic, {
      type: 'ACTION',
      action: { type: 'USE_RELIC', relicId: 'relic-axiom-key' },
    });

    expect(r.effects.some((e) => e.type === 'INVALID')).toBe(false);
    expect(r.state.galaxy.revealedRing).toBe(s0.galaxy.revealedRing + 1);
    expect(r.state.entropy).toBeGreaterThan(s0.entropy);
    expect(r.state.relics['relic-axiom-key']).toBe(0);
  });

  it('stasis field freezes an event', () => {
    const s0 = createNewGame(1, { startingInfluence: 100 });
    const withRelic: GameState = {
      ...s0,
      relics: { 'relic-stasis-field': 1 },
      events: {
        ...s0.events,
        brewing: [
          {
            id: 'test-event',
            kind: 'internal',
            type: 'unrest',
            planetId: 'p-0-0',
            turnsLeft: 2,
            revealed: true,
          },
        ],
      },
    };

    const r = transition(withRelic, {
      type: 'ACTION',
      action: {
        type: 'USE_RELIC',
        relicId: 'relic-stasis-field',
        targetPlanetId: 'p-0-0',
      },
    });

    expect(r.effects.some((e) => e.type === 'INVALID')).toBe(false);
    const event = r.state.events.brewing.find((e) => e.id === 'test-event');
    expect(event?.turnsLeft).toBeGreaterThan(2);
  });

  it('precursor archive reveals all events', () => {
    const s0 = createNewGame(1);
    const withRelic: GameState = {
      ...s0,
      relics: { 'relic-precursor-archive': 1 },
      events: {
        ...s0.events,
        brewing: [
          {
            id: 'e1',
            kind: 'internal',
            type: 'unrest',
            planetId: 'p-0-0',
            turnsLeft: 3,
            revealed: false,
          },
          {
            id: 'e2',
            kind: 'external',
            type: 'raiders',
            planetId: 'p-0-1',
            turnsLeft: 2,
            revealed: false,
          },
        ],
      },
    };

    const r = transition(withRelic, {
      type: 'ACTION',
      action: { type: 'USE_RELIC', relicId: 'relic-precursor-archive' },
    });

    expect(r.effects.some((e) => e.type === 'INVALID')).toBe(false);
    expect(r.state.events.brewing.every((e) => e.revealed)).toBe(true);
  });

  it('genesis seed transforms planet type', () => {
    const s0 = createNewGame(1, { startingInfluence: 100 });
    const withRelic: GameState = { ...s0, relics: { 'relic-genesis-seed': 1 } };

    const r = transition(withRelic, {
      type: 'ACTION',
      action: {
        type: 'USE_RELIC',
        relicId: 'relic-genesis-seed',
        targetPlanetId: 'p-0-0',
      },
    });

    expect(r.effects.some((e) => e.type === 'INVALID')).toBe(false);
    expect(r.state.planets['p-0-0']?.intrinsic.type).toBe('Industrial');
  });

  it('echo of myrakath gives bonus influence', () => {
    const s0 = createNewGame(1, { startingInfluence: 100 });
    const withRelic: GameState = {
      ...s0,
      relics: { 'relic-echo-of-myrakath': 1 },
    };

    const r = transition(withRelic, {
      type: 'ACTION',
      action: { type: 'USE_RELIC', relicId: 'relic-echo-of-myrakath' },
    });

    expect(r.effects.some((e) => e.type === 'INVALID')).toBe(false);
    expect(r.state.influence).toBeGreaterThan(s0.influence);
  });

  it('veil of silence clears concordat events', () => {
    const s0 = createNewGame(1);
    const withRelic: GameState = {
      ...s0,
      relics: { 'relic-veil-of-silence': 1 },
      events: {
        ...s0.events,
        brewing: [
          {
            id: 'c1',
            kind: 'concordat',
            type: 'observers',
            planetId: 'p-0-0',
            turnsLeft: 3,
            revealed: true,
          },
          {
            id: 'u1',
            kind: 'internal',
            type: 'unrest',
            planetId: 'p-0-0',
            turnsLeft: 2,
            revealed: false,
          },
        ],
      },
    };

    const r = transition(withRelic, {
      type: 'ACTION',
      action: { type: 'USE_RELIC', relicId: 'relic-veil-of-silence' },
    });

    expect(r.effects.some((e) => e.type === 'INVALID')).toBe(false);
    expect(r.state.events.brewing.some((e) => e.kind === 'concordat')).toBe(
      false
    );
    // Non-concordat events should remain
    expect(r.state.events.brewing.some((e) => e.kind === 'internal')).toBe(
      true
    );
  });
});
