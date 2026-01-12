import { describe, expect, it } from 'bun:test';
import { materializeEvent, maybeSpawnBrewingEvents } from '@/core/events';
import { createNewGame, transition } from '@/core';
import type { BrewingEvent } from '@/core/types';

describe('concordat system', () => {
  it('spawns concordat observers at high entropy', () => {
    const s0 = createNewGame(1, { startingInfluence: 100 });

    // High entropy should spawn concordat events
    let foundConcordat = false;
    for (let seed = 1; seed <= 100; seed++) {
      const spawned = maybeSpawnBrewingEvents({
        ...s0,
        seed,
        entropy: 60,
      });
      if (spawned.some((e) => e.kind === 'concordat')) {
        foundConcordat = true;
        break;
      }
    }

    expect(foundConcordat).toBe(true);
  });

  it('materializes concordat observer events', () => {
    const brewing: BrewingEvent = {
      id: 'test-1',
      kind: 'concordat',
      type: 'observers',
      planetId: 'p-0-0',
      turnsLeft: 0,
      revealed: false,
    };
    const active = materializeEvent(brewing);
    expect(active.title).toBe('Concordat Observers');
    expect(active.kind).toBe('concordat');
  });

  it('materializes concordat emissary events', () => {
    const brewing: BrewingEvent = {
      id: 'test-2',
      kind: 'concordat',
      type: 'emissary',
      planetId: 'p-0-0',
      turnsLeft: 0,
      revealed: false,
    };
    const active = materializeEvent(brewing);
    expect(active.title).toBe('Concordat Emissary');
  });

  it('concordat ultimatum leads to endgame choices', () => {
    const brewing: BrewingEvent = {
      id: 'test-3',
      kind: 'concordat',
      type: 'ultimatum',
      planetId: 'p-0-0',
      turnsLeft: 0,
      revealed: false,
    };
    const active = materializeEvent(brewing);
    expect(active.title).toBe('Concordat Ultimatum');
    // Should have submit/resist options
    const optionIds = active.options.map((o) => o.id);
    expect(optionIds).toContain('submit');
    expect(optionIds).toContain('resist');
  });

  it('concordat intervention is the final event', () => {
    const brewing: BrewingEvent = {
      id: 'test-4',
      kind: 'concordat',
      type: 'intervention',
      planetId: 'p-0-0',
      turnsLeft: 0,
      revealed: false,
    };
    const active = materializeEvent(brewing);
    expect(active.title).toBe('Concordat Intervention');
    // Should have surrender/fight options
    const optionIds = active.options.map((o) => o.id);
    expect(optionIds).toContain('surrender');
    expect(optionIds).toContain('fight');
  });

  it('100% entropy spawns intervention instead of instant loss', () => {
    // Start at exactly 100 entropy
    const s0 = createNewGame(1, { startingInfluence: 100, startingEntropy: 100 });

    // End turn should spawn intervention, not instant loss
    const r1 = transition(s0, { type: 'ACTION', action: { type: 'END_TURN' } });

    // Game should still be playing, not lost
    expect(r1.state.phase).toBe('playing');

    // Intervention event should be active
    const intervention = r1.state.events.active.find(
      (e) => e.type === 'intervention'
    );
    expect(intervention).toBeTruthy();
    expect(intervention?.title).toBe('Concordat Intervention');

    // Should have message about Concordat arriving
    const concordatMessage = r1.effects.find(
      (e) => e.type === 'MESSAGE' && e.message.includes('Concordat has arrived')
    );
    expect(concordatMessage).toBeTruthy();
  });

  it('surrendering to Concordat reduces entropy and allows survival', () => {
    const s0 = createNewGame(1, { startingInfluence: 100, startingEntropy: 100 });

    // End turn to trigger intervention
    const r1 = transition(s0, { type: 'ACTION', action: { type: 'END_TURN' } });
    const intervention = r1.state.events.active.find(
      (e) => e.type === 'intervention'
    );
    expect(intervention).toBeTruthy();

    // Surrender to Concordat
    const r2 = transition(r1.state, {
      type: 'ACTION',
      action: { type: 'RESPOND_EVENT', eventId: intervention!.id, optionId: 'surrender' },
    });

    // Entropy should be reduced significantly (surrender gives -100)
    expect(r2.state.entropy).toBe(0);
    // Game should still be playing
    expect(r2.state.phase).toBe('playing');
  });

  it('fighting Concordat and losing leads to defeat', () => {
    const s0 = createNewGame(1, { startingInfluence: 100, startingEntropy: 100 });

    // End turn to trigger intervention
    const r1 = transition(s0, { type: 'ACTION', action: { type: 'END_TURN' } });
    const intervention = r1.state.events.active.find(
      (e) => e.type === 'intervention'
    );
    expect(intervention).toBeTruthy();

    // Fight the Concordat (adds +25 entropy, pushing to 125)
    const r2 = transition(r1.state, {
      type: 'ACTION',
      action: { type: 'RESPOND_EVENT', eventId: intervention!.id, optionId: 'fight' },
    });

    // Entropy should be very high now (capped at max, but effect is +25)
    expect(r2.state.entropy).toBeGreaterThanOrEqual(100);

    // End turn to trigger loss check (entropy > 120 = loss)
    const r3 = transition(r2.state, { type: 'ACTION', action: { type: 'END_TURN' } });
    expect(r3.state.phase).toBe('lost');
  });
});
