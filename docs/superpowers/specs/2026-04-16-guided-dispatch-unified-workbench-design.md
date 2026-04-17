# Guided Dispatch + Unified Workbench Design

## Problem

The current TypeScript rewrite has three product gaps that now need to be resolved together:

1. `agora start` launches agents, but it does not initialize a usable task flow.
2. The task model is too weak for manual delegation because it lacks an explicit assigned state and does not dispatch a real task instruction when an assignee is chosen.
3. Dashboard and Lab View feel like different products, and Lab View still relies on a visually noisy, high-motion presentation.

## Approved direction

This design follows the user-approved **Guided Dispatch + Unified Workbench** approach:

- On the first `agora start`, if the board is empty, seed starter tasks automatically.
- Do **not** auto-assign or auto-start that work. Human assignment remains the control point.
- Change the board lifecycle to `Todo -> Assigned -> In Progress -> Review -> Done`.
- Change agent status semantics to `Offline / Ready / Assigned / Working / Meeting / Review`.
- Treat Dashboard and Lab View as peer views inside one shared application shell.
- Add a three-state theme selector: `Light / Dark / System`.
- Redesign Lab View as a low-motion spatial monitor instead of a constantly animated scene.

## Goals

- Make first launch feel useful without forcing full autonomy.
- Make assignment mean real task dispatch, not just metadata editing.
- Make CLI and Web agree on agent status.
- Give the app one coherent visual system across both primary views.
- Remove the “flicker” feeling by changing Lab View from continuous spectacle to event-driven monitoring.

## Non-goals

- Full autonomous task planning and auto-execution after `start`
- Replacing Lab View with a node graph or removing it entirely
- Adding a new backend service or database for runtime state

## Runtime architecture

### 1. `agora start` becomes runtime bootstrap

`agora start` remains responsible for creating tmux sessions, but it also becomes the single place that ensures the lab runtime is initialized.

Bootstrap rules:

1. Read lab config and current board state.
2. Read a new local runtime state file at `.agora/runtime.json`.
3. If the board is empty **and** starter seeding has not been recorded, generate starter tasks.
4. Persist the new board and runtime marker.
5. Start any missing tmux sessions.

The runtime file stores only local execution metadata, for example:

```json
{
  "version": 1,
  "starterSeededAt": "2026-04-16T00:00:00Z"
}
```

This keeps starter seeding idempotent. Re-running `agora start` must never duplicate starter tasks.

### 2. Starter task generation

Starter tasks are deterministic and derived from the lab topic plus configured roles. They are seeded as **unassigned `Todo` tasks** so the user still decides who gets what.

The initial starter pack should be small and practical:

- clarify the research objective / success criteria
- collect related work / references
- propose experiment or validation directions
- prepare implementation or benchmark setup
- define review / risk / evaluation checkpoints

The exact task list can vary slightly by available roles, but the output should stay in the 3-5 task range and avoid speculative over-planning.

### 3. Assignment becomes dispatch

Assigning a task is treated as a single runtime command with two required outcomes:

1. the task is persisted with `status = Assigned`
2. a concrete task instruction is written to the assignee's communication channel

If dispatch fails, the assignment is considered failed and the task must not silently advance. This should run under one shared lock so the board and dispatch artifact stay consistent.

### 4. Agent status derivation

Agent status is no longer hardcoded in watcher defaults. It is derived from runtime facts with this precedence:

1. `Meeting` — the agent is actively part of a meeting flow
2. `Review` — the agent's active work is currently in a review phase
3. `Working` — the agent has at least one active in-progress task
4. `Assigned` — the agent has assigned work but nothing yet in progress
5. `Ready` — the agent process is running but has no active assignment
6. `Offline` — no runtime session is available

CLI and server/web must use the same derivation helper so status names and counts cannot drift apart.

## Data model changes

### Task lifecycle

Replace the current task statuses:

- `backlog`
- `in_progress`
- `review`
- `done`

with:

- `todo`
- `assigned`
- `in_progress`
- `review`
- `done`

### Compatibility

Existing boards need a compatibility path:

- read-time migration maps legacy `backlog` to `todo`
- existing `in_progress`, `review`, and `done` stay unchanged
- the first subsequent write persists the new enum set

This avoids breaking older labs while still moving the system to the new workflow.

## UI architecture

### 1. Shared application shell

Dashboard and Lab View become peer views inside one shell with shared chrome:

- top app bar with lab identity and connection health
- primary view tabs: `Dashboard` and `Lab View`
- global theme selector: `Light / Dark / System`
- consistent panel spacing, borders, typography, status chips, and overlays

The view switch should feel like changing tabs inside one product, not jumping to another mode with different rules.

### 2. Dashboard role

Dashboard remains the operational workbench:

- left: agents and high-level state
- center: task board and dispatch controls
- right: messages, meetings, decisions, and health

It is the default place for planning, assignment, and supervision.

### 3. Lab View role

Lab View remains spatial, but its role becomes **monitoring**, not decoration.

It should keep:

- the sense of where agents are in the lab
- quick access to contextual overlays and agent detail
- visible task and meeting context

It should lose:

- unnecessary ambient animation
- visually aggressive gradients and chrome mismatches
- layout collisions between sidebars and controls

Lab View uses the same panel language as Dashboard, with the spatial canvas as the center surface.

## Visual system

The approved style direction is **Operations Console**:

- crisp panels
- restrained gradients
- strong information hierarchy
- stable motion
- “serious control room” feel rather than playful pixel spectacle

The light theme should be a **light console**, not an editorial paper UI. In practice that means the same spacing and component language as dark mode, with lighter neutrals and reduced contrast, not a totally different aesthetic.

Theme behavior:

- default to `System`
- allow explicit override to `Light` or `Dark`
- persist the choice locally in the web app

## Lab View motion policy

To remove the “screen is flashing” feeling, Lab View changes from constant motion to event-driven motion:

- no continuous ambient animation by default
- redraw when camera position changes, panels open/close, messages appear, or state changes arrive
- agent movement animates only while a move is actually happening
- transient feedback like speech bubbles and highlight pulses should be short-lived and subtle

The goal is “stable monitor with informative motion,” not “always-running simulation.”

## Error handling

- Starter seeding is explicit and fail-fast. If it cannot complete, the system should surface the error and leave the runtime marker unset.
- Assignment + dispatch is treated as one user-visible action. Errors must be surfaced immediately and never appear as success.
- Unknown or legacy status values should be normalized explicitly during migration, not ignored.
- If runtime status cannot be derived for an agent, the system should surface that inconsistency rather than silently labeling it `Ready`.

## Testing plan

### Core

- task status migration from `backlog` to `todo`
- status derivation precedence
- starter seed generation and idempotency
- assignment semantics

### CLI / Server

- first `agora start` seeds starter tasks only once
- subsequent `start` does not duplicate tasks
- assigning a task emits a dispatch artifact and updates status together
- CLI and Web observe the same agent status labels

### Web

- shared shell and tab switching
- theme selector behavior and persistence
- Dashboard and Lab View both render with the same design tokens
- Lab View low-motion behavior and critical overlay/control interactions

## Implementation boundaries

This work should be implemented as two tightly related subprojects inside one plan:

1. **Runtime semantics**
   - starter seeding
   - new task lifecycle
   - real assignment dispatch
   - shared agent status derivation

2. **Unified UI system**
   - shared shell and tabs
   - three-state theme system
   - low-motion Lab View redesign
   - status/task semantics reflected in the interface

That split keeps the work understandable without pretending the two halves are independent.
