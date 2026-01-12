import { Box, render, Text, useApp, useInput } from 'ink';
import { useMemo, useReducer } from 'react';
import type { GameEffect, GameState, PlanetId, ShopOffer } from '../src/core';
import { createNewGame, neighborsOf, transition } from '../src/core';

type UiState = {
  game: GameState;
  messages: string[];
  showHelp: boolean;
  activeEventIndex: number;
};

type UiEvent =
  | { type: 'DISPATCH'; event: Parameters<typeof transition>[1] }
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'TOGGLE_HELP' }
  | { type: 'CYCLE_EVENT'; dir: -1 | 1 };

const effectToLine = (effect: GameEffect): string => {
  switch (effect.type) {
    case 'MESSAGE':
      return effect.message;
    case 'INVALID':
      return `Invalid: ${effect.reason}`;
    case 'GAME_OVER':
      return `${effect.outcome === 'won' ? 'Victory' : 'Defeat'}: ${effect.reason}`;
  }
};

const appendMessages = (
  messages: string[],
  effects: GameEffect[]
): string[] => {
  const next = [...messages, ...effects.map(effectToLine)];
  const max = 14;
  return next.length > max ? next.slice(next.length - max) : next;
};

const uiReducer = (state: UiState, event: UiEvent): UiState => {
  switch (event.type) {
    case 'CLEAR_MESSAGES':
      return { ...state, messages: [] };
    case 'TOGGLE_HELP':
      return { ...state, showHelp: !state.showHelp };
    case 'CYCLE_EVENT': {
      const total = state.game.events.active.length;
      if (total <= 1) return state;
      const next = (state.activeEventIndex + event.dir + total) % total;
      return { ...state, activeEventIndex: next };
    }
    case 'DISPATCH': {
      const r = transition(state.game, event.event);
      const activeCount = r.state.events.active.length;
      const idx =
        activeCount === 0
          ? 0
          : Math.min(state.activeEventIndex, activeCount - 1);
      return {
        game: r.state,
        messages: appendMessages(state.messages, r.effects),
        showHelp: state.showHelp,
        activeEventIndex: idx,
      };
    }
  }
};

const isRevealed = (game: GameState, planetId: PlanetId): boolean => {
  const p = game.planets[planetId];
  if (!p) return false;
  return p.intrinsic.ring <= game.galaxy.revealedRing;
};

const isReachable = (game: GameState, planetId: PlanetId): boolean => {
  if (!isRevealed(game, planetId)) return false;
  if (planetId === game.galaxy.homeworldId) return true;
  const controlled = Object.values(game.planets)
    .filter((p) => p.status === 'controlled' || p.status === 'partnered')
    .map((p) => p.intrinsic.id);
  for (const c of controlled) {
    if (neighborsOf(game.galaxy.routes, c).includes(planetId)) return true;
  }
  return false;
};

const visiblePlanetIds = (game: GameState): PlanetId[] =>
  game.galaxy.rings.slice(0, game.galaxy.revealedRing + 1).flat() as PlanetId[];

const cyclePlanet = (game: GameState, dir: -1 | 1): PlanetId | null => {
  const ids = visiblePlanetIds(game);
  if (ids.length === 0) return null;
  const current = game.selectedPlanetId ?? ids[0]!;
  const idx = ids.indexOf(current);
  const nextIdx = idx === -1 ? 0 : (idx + dir + ids.length) % ids.length;
  return ids[nextIdx] ?? null;
};

const pressureBand = (entropy: number) =>
  entropy < 25
    ? 'low'
    : entropy < 50
      ? 'medium'
      : entropy < 75
        ? 'high'
        : 'critical';

const formatPlanetLine = (game: GameState, id: PlanetId): string => {
  const p = game.planets[id]!;
  const reachable = isReachable(game, id);
  const isSelected = game.selectedPlanetId === id;
  const name = p.known.scouted ? p.intrinsic.name : `Planet ${id}`;
  const type = p.known.scouted ? p.intrinsic.type : 'Unknown';
  const inh = p.known.scouted ? p.intrinsic.inhabitants : 'Unknown';
  const rel =
    p.known.scouted && p.intrinsic.hasRelic && !p.relicClaimed ? ' Relic' : '';
  return `${isSelected ? '›' : ' '} ${name} [R${p.intrinsic.ring + 1}] — ${p.status} — ${reachable ? 'reach' : 'horizon'} — ${type}/${inh}${rel}`;
};

const formatOffer = (offer: ShopOffer): string =>
  `${offer.name} (T${offer.tier}, ${offer.kind}) — ${offer.costInfluence} Influence`;

const App = () => {
  const { exit } = useApp();

  const [state, dispatch] = useReducer(uiReducer, null, () => {
    const game = createNewGame(1);
    return {
      game,
      messages: [
        'Axiom Ascendant — headless core prototype (new system).',
        'Tip: Scout before claiming. Investigate to reveal brewing events.',
      ],
      showHelp: true,
      activeEventIndex: 0,
    };
  });

  const selectedPlanet = useMemo(() => {
    const id = state.game.selectedPlanetId;
    if (!id) return null;
    return state.game.planets[id] ?? null;
  }, [state.game.planets, state.game.selectedPlanetId]);

  const activeEvent = state.game.events.active[state.activeEventIndex] ?? null;

  useInput((input, key) => {
    if (input === 'q' || key.escape) exit();
    if (input === 'h' || input === '?') dispatch({ type: 'TOGGLE_HELP' });
    if (input === 'x') dispatch({ type: 'CLEAR_MESSAGES' });
    if (input === 'n')
      dispatch({
        type: 'DISPATCH',
        event: { type: 'NEW_GAME', seed: 1 },
      });

    if (activeEvent) {
      if (input === '[') dispatch({ type: 'CYCLE_EVENT', dir: -1 });
      if (input === ']') dispatch({ type: 'CYCLE_EVENT', dir: 1 });
      if (input && /^[1-9]$/.test(input)) {
        const idx = Number(input) - 1;
        const option = activeEvent.options[idx];
        if (option) {
          dispatch({
            type: 'DISPATCH',
            event: {
              type: 'ACTION',
              action: {
                type: 'RESPOND_EVENT',
                eventId: activeEvent.id,
                optionId: option.id,
              },
            },
          });
        }
      }
      return;
    }

    if (key.upArrow)
      dispatch({
        type: 'DISPATCH',
        event: { type: 'SELECT_PLANET', planetId: cyclePlanet(state.game, -1) },
      });
    if (key.downArrow)
      dispatch({
        type: 'DISPATCH',
        event: { type: 'SELECT_PLANET', planetId: cyclePlanet(state.game, 1) },
      });

    const pid = state.game.selectedPlanetId;
    if (!pid) return;

    if (input === 's')
      dispatch({
        type: 'DISPATCH',
        event: { type: 'ACTION', action: { type: 'SCOUT', planetId: pid } },
      });
    if (input === 'c')
      dispatch({
        type: 'DISPATCH',
        event: { type: 'ACTION', action: { type: 'COLONIZE', planetId: pid } },
      });
    if (input === 'p')
      dispatch({
        type: 'DISPATCH',
        event: { type: 'ACTION', action: { type: 'PARTNER', planetId: pid } },
      });
    if (input === 'd')
      dispatch({
        type: 'DISPATCH',
        event: { type: 'ACTION', action: { type: 'DEVELOP', planetId: pid } },
      });
    if (input === 'i')
      dispatch({
        type: 'DISPATCH',
        event: {
          type: 'ACTION',
          action: { type: 'INVESTIGATE', planetId: pid },
        },
      });
    if (input === 'e')
      dispatch({
        type: 'DISPATCH',
        event: { type: 'ACTION', action: { type: 'END_TURN' } },
      });

    if (input === 'r')
      dispatch({
        type: 'DISPATCH',
        event: { type: 'ACTION', action: { type: 'REROLL_SHOP' } },
      });

    if (input && /^[1-3]$/.test(input)) {
      const slot = Number(input) as 1 | 2 | 3;
      dispatch({
        type: 'DISPATCH',
        event: { type: 'ACTION', action: { type: 'BUY_SHOP', slot } },
      });
    }
  });

  const ids = visiblePlanetIds(state.game);
  const brewingRevealed = state.game.events.brewing.filter((e) => e.revealed);

  return (
    <Box flexDirection="column">
      <Box>
        <Text bold>Axiom Ascendant</Text>
        <Text> — Prototype</Text>
      </Box>

      <Box marginTop={1}>
        <Text>
          Turn {state.game.turn} | Influence {state.game.influence} | Entropy{' '}
          {state.game.entropy}{' '}
          <Text
            color={
              pressureBand(state.game.entropy) === 'low'
                ? 'green'
                : pressureBand(state.game.entropy) === 'medium'
                  ? 'yellow'
                  : pressureBand(state.game.entropy) === 'high'
                    ? 'magenta'
                    : 'red'
            }
          >
            ({pressureBand(state.game.entropy)})
          </Text>{' '}
          | Ring {state.game.galaxy.revealedRing + 1}/
          {state.game.galaxy.ringCount}
        </Text>
      </Box>

      <Box marginTop={1} flexDirection="row" gap={4}>
        <Box flexGrow={2} flexDirection="column">
          {activeEvent ? (
            <Box
              borderStyle="round"
              borderColor="magenta"
              paddingX={1}
              paddingY={0}
              flexDirection="column"
            >
              <Text bold color="magenta">
                Event {state.activeEventIndex + 1}/
                {state.game.events.active.length}: {activeEvent.title}
              </Text>
              <Text>{activeEvent.body}</Text>
              <Box marginTop={1} flexDirection="column">
                {activeEvent.options.map((o, i) => (
                  <Text key={o.id}>
                    <Text color="magenta">[{i + 1}]</Text> {o.label}{' '}
                    <Text dimColor>— cost {o.costInfluence}</Text>
                  </Text>
                ))}
              </Box>
              <Box marginTop={1}>
                <Text dimColor>
                  Choose 1..{activeEvent.options.length} · Cycle: [ / ]
                </Text>
              </Box>
            </Box>
          ) : (
            <>
              <Text bold>Sector</Text>
              <Text dimColor>
                ↑/↓ select planet · Reach = adjacent to controlled/partnered.
              </Text>
              <Box marginTop={1} flexDirection="column">
                {ids.map((id) => (
                  <Text key={id}>
                    <Text
                      color={
                        state.game.selectedPlanetId === id ? 'cyan' : undefined
                      }
                    >
                      {formatPlanetLine(state.game, id)}
                    </Text>
                  </Text>
                ))}
              </Box>
            </>
          )}
        </Box>

        <Box flexGrow={3} flexDirection="column">
          <Text bold>Selected</Text>
          {selectedPlanet ? (
            <Box marginTop={1} flexDirection="column">
              <Text>
                <Text color="cyan">{selectedPlanet.intrinsic.name}</Text> (id{' '}
                {selectedPlanet.intrinsic.id}) — {selectedPlanet.status} — dev{' '}
                {selectedPlanet.development}
              </Text>
              <Text dimColor>
                {selectedPlanet.known.scouted
                  ? `Type ${selectedPlanet.intrinsic.type} · Inhabitants ${selectedPlanet.intrinsic.inhabitants} · Base ${selectedPlanet.intrinsic.baseInfluence}`
                  : 'Scout to reveal type/inhabitants/value.'}
              </Text>
            </Box>
          ) : (
            <Text dimColor>No selection</Text>
          )}

          <Box marginTop={1} flexDirection="column">
            <Text bold>Shop</Text>
            <Text dimColor>Buy with 1/2/3 · Reroll with r</Text>
            {state.game.shop.offers.length === 0 ? (
              <Text dimColor>Empty</Text>
            ) : (
              state.game.shop.offers.map((o) => (
                <Text key={o.cardId}>
                  <Text color="green">[{o.slot}]</Text> {formatOffer(o)}
                </Text>
              ))
            )}
          </Box>

          <Box marginTop={1} flexDirection="column">
            <Text bold>Events</Text>
            <Text dimColor>
              Active {state.game.events.active.length} · Brewing{' '}
              {state.game.events.brewing.length} · Revealed{' '}
              {brewingRevealed.length}
            </Text>
            {brewingRevealed.length > 0 ? (
              <Box marginTop={1} flexDirection="column">
                {brewingRevealed.slice(0, 4).map((e) => (
                  <Text key={e.id} dimColor>
                    - {e.type} on {e.planetId} in {e.turnsLeft}t
                  </Text>
                ))}
              </Box>
            ) : null}
          </Box>

          <Box marginTop={1} flexDirection="column">
            <Text bold>Actions</Text>
            <Text dimColor>
              s scout · c colonize · p partner · d develop · i investigate · e
              end
            </Text>
          </Box>

          <Box marginTop={1} flexDirection="column">
            <Text bold>Log</Text>
            {state.messages.map((m, i) => (
              <Text key={`${i}-${m}`}>{m}</Text>
            ))}
          </Box>

          {state.showHelp ? (
            <Box marginTop={1} flexDirection="column">
              <Text bold>Help</Text>
              <Text dimColor>n new game · h/? help · x clear log · q quit</Text>
              <Text dimColor>
                Core loop: scout → claim (colonize/partner) → develop →
                investigate → end turn
              </Text>
              <Text dimColor>
                When events fire, the left panel switches into event mode until
                resolved.
              </Text>
            </Box>
          ) : null}
        </Box>
      </Box>
    </Box>
  );
};

render(<App />);
