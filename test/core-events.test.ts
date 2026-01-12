import { describe, expect, it } from 'bun:test';
import { materializeEvent } from '@/core/events';
import type { BrewingEvent } from '@/core/types';

describe('event materialization', () => {
  it('materializes unrest events', () => {
    const brewing: BrewingEvent = {
      id: 'test-1',
      kind: 'internal',
      type: 'unrest',
      planetId: 'p-0-0',
      turnsLeft: 0,
      revealed: false,
    };
    const active = materializeEvent(brewing);
    expect(active.title).toBe('Unrest');
    expect(active.kind).toBe('internal');
  });

  it('materializes rebellion events', () => {
    const brewing: BrewingEvent = {
      id: 'test-2',
      kind: 'internal',
      type: 'rebellion',
      planetId: 'p-0-0',
      turnsLeft: 0,
      revealed: false,
    };
    const active = materializeEvent(brewing);
    expect(active.title).toBe('Rebellion');
  });

  it('materializes raider events', () => {
    const brewing: BrewingEvent = {
      id: 'test-3',
      kind: 'external',
      type: 'raiders',
      planetId: 'p-1-0',
      turnsLeft: 0,
      revealed: false,
    };
    const active = materializeEvent(brewing);
    expect(active.title).toBe('Raider Incursion');
    expect(active.kind).toBe('external');
    expect(active.options.length).toBeGreaterThanOrEqual(2);
  });

  it('materializes refugee events', () => {
    const brewing: BrewingEvent = {
      id: 'test-4',
      kind: 'external',
      type: 'refugees',
      planetId: 'p-1-0',
      turnsLeft: 0,
      revealed: false,
    };
    const active = materializeEvent(brewing);
    expect(active.title).toBe('Refugee Fleet');
    expect(active.options.length).toBeGreaterThanOrEqual(2);
  });

  it('materializes trade opportunity events', () => {
    const brewing: BrewingEvent = {
      id: 'test-5',
      kind: 'external',
      type: 'traders',
      planetId: 'p-1-0',
      turnsLeft: 0,
      revealed: false,
    };
    const active = materializeEvent(brewing);
    expect(active.title).toBe('Trade Opportunity');
  });

  it('materializes pirate base escalation events', () => {
    const brewing: BrewingEvent = {
      id: 'test-6',
      kind: 'external',
      type: 'pirate-base',
      planetId: 'p-1-0',
      turnsLeft: 0,
      revealed: false,
    };
    const active = materializeEvent(brewing);
    expect(active.title).toBe('Pirate Base Established');
  });

  it('materializes anomaly events', () => {
    const brewing: BrewingEvent = {
      id: 'test-7',
      kind: 'cosmic',
      type: 'anomaly',
      planetId: 'p-0-0',
      turnsLeft: 0,
      revealed: false,
    };
    const active = materializeEvent(brewing);
    expect(active.title).toBe('Anomaly');
    expect(active.kind).toBe('cosmic');
  });
});
