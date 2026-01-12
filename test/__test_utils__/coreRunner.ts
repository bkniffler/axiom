import type { GameEvent, GameState, TransitionResult } from '@/core';
import { createNewGame, transition } from '@/core';

type RunResult = {
  state: GameState;
  effects: Array<TransitionResult['effects'][number]>;
  events: GameEvent[];
};

const runEvents = (initial: GameState, events: GameEvent[]): RunResult => {
  let state = initial;
  const allEffects: RunResult['effects'] = [];
  for (const event of events) {
    const r = transition(state, event);
    state = r.state;
    allEffects.push(...r.effects);
  }
  return { state, effects: allEffects, events };
};

export const newGameRun = (events: GameEvent[], seed = 1): RunResult =>
  runEvents(createNewGame(seed), events);
