# Core (Headless) Prototype Plan

This file tracks the plan for the **headless, deterministic game core** and its milestones.

## Principles
- **Pure state machine**: all simulation changes happen via `transition(state, event)`.
- **Serializable state**: no DOM, no timers, no class instances; JSON-friendly.
- **Headless first**: everything runs without rendering; UI is a thin adapter.
- **Deterministic**: runs should be replayable from an initial snapshot + event log.
- **Testable**: unit tests target the core reducer, not UI.

## Current Layout
- `src/core/`: milestone core reducer + types + helpers
- `terminal/`: Ink-based CLI prototype (not wired to the game renderer)
- `test/`: core and sim tests

## Milestone 1 — Core Sim “State Machine”
Goal: “a turn does something” with a minimal world and lose/win conditions, fully testable.

Scope:
- World model: 2 systems, 4 planets, 1 route
- Resources: `capacity`, `stability`, `knowledge`
- Actions: build route, colonize, stabilize, research
- Turn rules: 1 commit per turn; end-turn upkeep; stability collapse => loss
- Win stub: survive `N` turns
- Headless runner helper: apply/replay event sequences
- CLI prototype: step the machine from the terminal

Delivered:
- `src/core/machine.ts`
- `src/core/runner.ts`
- `terminal/index.tsx`
- `test/core-machine.test.ts`

## Milestone 2 — Forecast Window (Clarity Engine)
Goal: show “now + next 3 turns” for the *currently selected* action.

Scope:
- Forecast function: `forecastAction(state, action) -> { immediate, nextTurns, uncertainty }`
- Forecast UI in terminal: render a compact forecast preview before committing
- Rule: forecast for 3 turns is deterministic; uncertainty is a simple risk band

Delivered:
- `src/core/machine.ts` (`forecastAction`, `pressure` + pressure band)
- `terminal/index.tsx` (uppercase B/C/S/R previews)

## Milestone 3 — Dilemma/Card System
Goal: authored “decision cards” drive narrative consequences with the same reducer.

Scope:
- Card format (data-only): triggers + choices + deterministic effects
- Minimal card deck (10-ish) with clear short-term consequences
- Event integration: `DRAW_CARD`, `CHOOSE_OPTION`, `RESOLVE_CARD`

Delivered (initial):
- `src/core/dilemmas.ts` (authored dilemmas + triggers)
- `src/core/machine.ts` (blocking decisions + `CHOOSE_DILEMMA_OPTION`)
- `terminal/index.tsx` (dilemma UI with numeric choices)

## Milestone 4 — Routes + Expansion Pressure
Goal: make expansion feel like stress (logistics + stability interplay).

Scope:
- Route constraints (capacity/upkeep scaling)
- Expansion introduces upkeep and/or event probability
- Basic “map growth” beyond 2 systems (procedural or fixed)

Delivered (initial):
- `src/core/machine.ts` (per-turn route upkeep, pressure drift bands, persistent `modifiers`)
- `src/core/dilemmas.ts` (dilemma options can add timed/permanent modifiers)
- `terminal/index.tsx` (shows active modifiers + per-option modifier adds)
- `test/core-machine.test.ts` (modifier expiry regression)

## Milestone 5 — Diplomacy (Thin Slice)
Goal: one patron relationship meter + one “audit” enforcement event type.

Scope:
- A single external meter (e.g. `attention` or `patronFavor`)
- One audit event with branching consequences
