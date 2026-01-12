import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import type { GameEffect, GameEvent, GameState } from '../src/core';
import { createNewGame, transition } from '../src/core';

type CliArgs = {
  session: string;
  seed?: number;
  reset: boolean;
  showOnly: boolean;
  commands: string[];
};

const parseArgs = (argv: string[]): CliArgs => {
  const commands: string[] = [];
  let session = 'default';
  let seed: number | undefined;
  let reset = false;
  let showOnly = false;

  for (const raw of argv) {
    if (raw === '--help' || raw === '-h') showOnly = true;
    else if (raw === '--reset' || raw === '--new') reset = true;
    else if (raw.startsWith('--session='))
      session = raw.slice('--session='.length);
    else if (raw.startsWith('--sesion='))
      session = raw.slice('--sesion='.length);
    else if (raw.startsWith('--seed='))
      seed = Number(raw.slice('--seed='.length));
    else if (raw === '--show') showOnly = true;
    else if (raw.startsWith('--do=')) commands.push(raw.slice('--do='.length));
    else if (raw === '--do') commands.push('');
    else if (!raw.startsWith('-')) commands.push(raw);
  }

  if (seed !== undefined && !Number.isFinite(seed)) seed = undefined;

  return {
    session: session.trim() === '' ? 'default' : session.trim(),
    seed,
    reset,
    showOnly,
    commands: commands.filter((c) => c.trim() !== ''),
  };
};

const repoRootDir = (): string => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, '..');
};

const sessionDir = (session: string): string =>
  path.join(repoRootDir(), '.llm-sessions', session);

const safeMkdirp = async (dir: string) => {
  await fs.mkdir(dir, { recursive: true });
};

const readJsonIfExists = async <T>(filePath: string): Promise<T | null> => {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const writeJson = async (filePath: string, value: unknown) => {
  const raw = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(filePath, raw, 'utf8');
};

const appendJsonl = async (filePath: string, value: unknown) => {
  const raw = `${JSON.stringify(value)}\n`;
  await fs.appendFile(filePath, raw, 'utf8');
};

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

const printHelp = () => {
  // Keep this terse; this is intended for repeated LLM-style invocations.
  process.stdout.write(
    [
      'Usage:',
      '  bun terminal/llm.ts --session=a [--seed=1] [--reset] [--do "COMMAND"]...',
      '',
      'Commands (use multiple --do):',
      '  select <planetId>',
      '  scout [planetId]',
      '  colonize [planetId]',
      '  partner [planetId]',
      '  develop [planetId]',
      '  investigate [planetId]',
      '  respond <eventId|eventIndex> <optionId|optionIndex>',
      '  buy <1|2|3>',
      '  reroll',
      '  use <relicId> [planetId]',
      '  end',
      '',
      'Notes:',
      `  Session data is stored under ${path.join('.llm-sessions', '<session>')}`,
      '',
    ].join('\n')
  );
};

const parseCommand = (
  command: string,
  state: GameState
): GameEvent[] | { error: string } => {
  const parts = command.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return [];

  const verb = parts[0]!.toLowerCase();
  const arg1 = parts[1];
  const arg2 = parts[2];

  const planetArg = (fallbackToSelected: boolean): string | null => {
    if (arg1) return arg1;
    return fallbackToSelected ? state.selectedPlanetId : null;
  };

  if (verb === 'select') {
    if (!arg1) return { error: 'select requires a planetId' };
    return [{ type: 'SELECT_PLANET', planetId: arg1 }];
  }

  if (verb === 'end' || verb === 'end_turn' || verb === 'endturn') {
    return [{ type: 'ACTION', action: { type: 'END_TURN' } }];
  }

  if (verb === 'reroll' || verb === 'reroll_shop') {
    return [{ type: 'ACTION', action: { type: 'REROLL_SHOP' } }];
  }

  if (verb === 'buy') {
    const slot = Number(arg1);
    if (![1, 2, 3].includes(slot)) return { error: 'buy requires slot 1|2|3' };
    return [
      {
        type: 'ACTION',
        action: { type: 'BUY_SHOP', slot: slot as 1 | 2 | 3 },
      },
    ];
  }

  if (verb === 'respond') {
    if (!arg1 || !arg2)
      return {
        error: 'respond requires <eventId|eventIndex> <optionId|optionIndex>',
      };

    let eventId = arg1;
    if (/^\d+$/.test(arg1)) {
      const idx = Number(arg1) - 1;
      const e = state.events.active[idx];
      if (!e) return { error: `No active event at index ${arg1}` };
      eventId = e.id;
    }

    let optionId = arg2;
    if (/^\d+$/.test(arg2)) {
      const e = state.events.active.find((x) => x.id === eventId);
      if (!e) return { error: `Unknown active event: ${eventId}` };
      const opt = e.options[Number(arg2) - 1];
      if (!opt) return { error: `No option ${arg2} for event ${eventId}` };
      optionId = opt.id;
    }

    return [
      {
        type: 'ACTION',
        action: { type: 'RESPOND_EVENT', eventId, optionId },
      },
    ];
  }

  if (verb === 'scout') {
    const planetId = planetArg(true);
    if (!planetId) return { error: 'scout requires planetId or a selection' };
    return [{ type: 'ACTION', action: { type: 'SCOUT', planetId } }];
  }

  if (verb === 'colonize') {
    const planetId = planetArg(true);
    if (!planetId)
      return { error: 'colonize requires planetId or a selection' };
    return [{ type: 'ACTION', action: { type: 'COLONIZE', planetId } }];
  }

  if (verb === 'partner') {
    const planetId = planetArg(true);
    if (!planetId) return { error: 'partner requires planetId or a selection' };
    return [{ type: 'ACTION', action: { type: 'PARTNER', planetId } }];
  }

  if (verb === 'develop') {
    const planetId = planetArg(true);
    if (!planetId) return { error: 'develop requires planetId or a selection' };
    return [{ type: 'ACTION', action: { type: 'DEVELOP', planetId } }];
  }

  if (verb === 'investigate') {
    const planetId = planetArg(true);
    if (!planetId)
      return { error: 'investigate requires planetId or a selection' };
    return [{ type: 'ACTION', action: { type: 'INVESTIGATE', planetId } }];
  }

  if (verb === 'use') {
    if (!arg1) return { error: 'use requires a relicId' };
    const relicId = arg1;
    const targetPlanetId = arg2 ?? undefined;
    return [
      {
        type: 'ACTION',
        action: { type: 'USE_RELIC', relicId, targetPlanetId },
      },
    ];
  }

  return { error: `Unknown command: ${verb}` };
};

const formatStateSummary = (state: GameState): string[] => {
  const lines: string[] = [];
  lines.push(
    `Phase=${state.phase} Turn=${state.turn} Influence=${state.influence} Entropy=${state.entropy} Ring=${state.galaxy.revealedRing + 1}/${state.galaxy.ringCount}`
  );

  const sel = state.selectedPlanetId;
  if (sel) {
    const p = state.planets[sel];
    if (p) {
      const known = p.known.scouted
        ? `${p.intrinsic.type}/${p.intrinsic.inhabitants} base=${p.intrinsic.baseInfluence}`
        : 'Unknown (not scouted)';
      lines.push(
        `Selected=${p.intrinsic.id} "${p.intrinsic.name}" status=${p.status} dev=${p.development} | ${known}`
      );
    } else {
      lines.push(`Selected=${sel} (missing planet record)`);
    }
  } else {
    lines.push('Selected=(none)');
  }

  lines.push(
    `Events: active=${state.events.active.length} brewing=${state.events.brewing.length} (revealed=${state.events.brewing.filter((e) => e.revealed).length})`
  );

  if (state.shop.offers.length > 0) {
    lines.push('Shop:');
    for (const o of state.shop.offers) {
      lines.push(
        `  [${o.slot}] ${o.name} (${o.kind} T${o.tier}) — ${o.costInfluence} Influence`
      );
    }
  } else {
    lines.push('Shop: (empty)');
  }

  const visible = state.galaxy.rings
    .slice(0, state.galaxy.revealedRing + 1)
    .flat();
  lines.push(`Visible planets (${visible.length}):`);
  for (const id of visible) {
    const p = state.planets[id];
    if (!p) continue;
    const name = p.known.scouted
      ? p.intrinsic.name
      : `Planet ${p.intrinsic.id}`;
    const extra = p.known.scouted
      ? `${p.intrinsic.type}/${p.intrinsic.inhabitants}`
      : 'Unknown';
    lines.push(`  ${p.intrinsic.id} ${name} — ${p.status} — ${extra}`);
  }

  if (state.events.active.length > 0) {
    const a = state.events.active[0]!;
    lines.push(`Active event: ${a.title} on ${a.planetId} (id=${a.id})`);
    for (const [i, o] of a.options.entries()) {
      lines.push(`  (${i + 1}) ${o.label} — cost ${o.costInfluence}`);
    }
    lines.push(
      'Resolve via: --do "respond <eventId> <optionId>" or --do "respond <eventIndex> <optionIndex>"'
    );
  }

  return lines;
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const dir = sessionDir(args.session);
  const turnsDir = path.join(dir, 'turns');
  const statePath = path.join(dir, 'state.json');
  const metaPath = path.join(dir, 'meta.json');
  const eventsPath = path.join(dir, 'events.jsonl');

  if (args.showOnly) {
    printHelp();
  }

  await safeMkdirp(turnsDir);

  const existing = args.reset
    ? null
    : await readJsonIfExists<GameState>(statePath);

  const seed =
    args.seed ??
    (await readJsonIfExists<{ seed: number }>(metaPath))?.seed ??
    1;

  let state = existing ?? createNewGame(seed);
  await writeJson(metaPath, { seed });

  if (!existing || args.reset) {
    await writeJson(statePath, state);
    await writeJson(
      path.join(turnsDir, `turn-${String(state.turn).padStart(4, '0')}.json`),
      state
    );
    await appendJsonl(eventsPath, {
      type: 'INIT',
      seed,
      at: new Date().toISOString(),
    });
  }

  const allEffects: GameEffect[] = [];
  const appliedEvents: GameEvent[] = [];

  for (const cmd of args.commands) {
    const parsed = parseCommand(cmd, state);
    if ('error' in parsed) {
      allEffects.push({ type: 'INVALID', reason: parsed.error });
      continue;
    }
    for (const ev of parsed) {
      const beforeTurn = state.turn;
      const r = transition(state, ev);
      state = r.state;
      allEffects.push(...r.effects);
      appliedEvents.push(ev);
      await appendJsonl(eventsPath, ev);
      if (state.turn !== beforeTurn) {
        const file = path.join(
          turnsDir,
          `turn-${String(state.turn).padStart(4, '0')}.json`
        );
        await writeJson(file, state);
      }
    }
  }

  await writeJson(statePath, state);

  process.stdout.write(`Session: ${args.session}\n`);
  process.stdout.write(`Dir: ${dir}\n`);

  if (allEffects.length > 0) {
    process.stdout.write('Effects:\n');
    for (const e of allEffects) process.stdout.write(`- ${effectToLine(e)}\n`);
  }

  process.stdout.write('\n');
  for (const line of formatStateSummary(state))
    process.stdout.write(`${line}\n`);

  if (args.commands.length === 0) {
    process.stdout.write('\n');
    process.stdout.write(
      'Next:\n- Try: --do "select p-0-1" --do "scout" --do "colonize"\n- Or:  --do "end"\n'
    );
  }

  if (args.showOnly) {
    process.stdout.write('\n');
    process.stdout.write(
      'Tip: omit --show to avoid printing help every time.\n'
    );
  }
};

await main();
