# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **L1 idle heartbeat** (`packages/cli/src/automation/watchdog.ts`) — when an agent's signature has not changed for `IDLE_HEARTBEAT_MS` (20 min default) since its last injection, the watchdog pings it with a "re-run your Session Start Checklist" prompt. Without this, an event-driven signature-diff scheduler deadlocks the moment everyone goes idle (no new messages → no signature change → no injection forever). Skipped while the pane is mid-inference and for agents that have never been kicked off.
- **L2 supervisor orchestrator** (`packages/cli/src/automation/orchestrator-tick.ts`) — per-cycle pure aggregator that computes a global view across the kanban, the latest meeting, and recent messages: counts per status, stuck `in_progress` / `review` tasks (> `stuckTaskMs`, default 2h), `Review` column empty while `In Progress` is non-empty, stalled meetings (> `stalledMeetingMs`, default 1h), and a string-match `#ID`-based blocking-chain heuristic. When `hasSignal` is true and the supervisor would otherwise be skipped this cycle, `runRuntimeCycle` overlays a supervisor-targeted orchestrator prompt with an action policy: act on the root blocker, reassign / decompose via `agora kanban`, or write a `supervisor_to_user_*_status.md` note — silent idle is explicitly forbidden. Dedup signature is bucketed in 30-min windows so the same global signal does not re-inject every cycle.
- **`isPaneBusy` guard** (`packages/cli/src/tmux.ts`) — detects an active Claude Code spinner line via regex (`/[✽✻✶✳]\s+\w+…/`) on the captured pane tail. The watchdog and orchestrator both check this before sending input; without it, prompts stack into stray bracketed-paste blocks that never execute.
- **Bracketed-paste delay in `sendTmuxInput`** — 150 ms pause between `send-keys -l` and the trailing `Enter` so Claude Code's TUI processes the paste-end sequence before the submit key arrives.
- **Kickoff prompt** (`KICKOFF_PROMPT` in `packages/cli/src/tmux.ts`) — `agora start` now launches each backend with a real first user prompt (`"You have just been launched by the Agora lab runtime. Read your CLAUDE.md and follow its Session Start Checklist now…"`) instead of swallowing the workspace path as the first user message. CLAUDE.md auto-discovery still works because the tmux pane is created with `-c <workspacePath>`.
- Tests for orchestrator aggregation, prompt rendering, watchdog heartbeat (fires when stale, skipped when busy / recent / never-injected), and end-to-end deadlock break in `runRuntimeCycle` (overlay fires when supervisor's pending signature equals `lastPromptSignature`).

### Changed
- `runRuntimeCycle` now triggers the L2 overlay whenever the supervisor would NOT receive a fresh injection this cycle — either no pending at all, or pending whose signature matches the recorded `lastPromptSignature` — not only when there is no pending. The earlier guard let stale `task-in-progress` pendings preempt the orchestrator, defeating the deadlock break.
- `runRuntimeCycle` is now exported and `RuntimeCycleDeps` parameterized so tests can substitute `hasTmuxSession` / `sendTmuxInput` / `isPaneBusy`.

### Fixed
- Agents started by `agora start` no longer greet with "Ready. What would you like to work on?" — the workspace path is no longer passed as the first user prompt.

## [0.2.0] - 2026-04-16

### Added
- **Web dashboard** (`packages/web`) — pixel-art lab visualization with interactive controls
  - Canvas-based 2D renderer with tile map, furniture sprites, and animated characters
  - Characters walk via A* pathfinding, sit at desks when working, attend meetings
  - Keyboard shortcuts: `K` (kanban), `M` (meeting), `Escape` (close), drag to pan, scroll to zoom
  - Dynamic layout engine: rooms and desks auto-scale based on agent count and roles
  - Two separate buildings: main lab (supervisor office, meeting room, workspace, break room) and independent reviewer building connected by outdoor path
  - Dark pixel-art CSS theme
- **Bidirectional WebSocket** (`packages/server`) — browser can send commands to server
  - `kanban:add`, `kanban:move`, `kanban:assign` — manage tasks from the web UI
  - `meeting:create`, `meeting:advance` — create and advance meeting phases from the web UI
  - Server executes core functions, writes to disk, chokidar broadcasts updates
- **Interactive kanban overlay** — add tasks with priority (P0-P3), move status, assign agents
- **Interactive meeting overlay** — select participants, decision maker, create meetings, advance phases
- **Agent sidebar** — click agent to view status, assigned tasks, recent messages
- **Toast notifications** — error messages from server displayed as auto-dismissing toasts
- **Sprite system** (`sprites.ts`, `spriteData.ts`) — SpriteData (2D hex color arrays) with offscreen canvas caching and palette recoloring
- **Particle system** and **ambient lighting** (day/night cycle)
- **`agora dev` command** — starts WebSocket server + Vite dev server together
- **Vite WebSocket proxy** — dev mode proxies `/ws` to server, avoids port conflicts

### Changed
- `packages/web/src/engine/layout.ts` — completely rewritten for dynamic room generation
- `packages/web/src/engine/types.ts` — added `floor_dark_wood` tile, `monitor`/`sofa` furniture, `sitting` character state
- `packages/web/src/engine/tileMap.ts` — chairs no longer block pathfinding
- `packages/web/src/engine/assets.ts` — added sitting animation, missing tile/furniture renderers
- `packages/web/src/App.tsx` — dynamic layout, desk-based character spawning, free camera mode
- `packages/web/src/hooks/useWebSocket.ts` — fixed reconnection loop via useRef pattern, added `send()`
- `packages/cli/src/commands/dev.ts` — passes `VITE_WS_PORT` env to Vite child process

### Fixed
- WebSocket reconnection loop caused by unstable callback reference
- Camera locked on selected agent (removed auto-follow, free pan always works)
- Reset camera button now centers on map instead of going to top-left
- Reviewer agents overlapping at single position (now each gets own desk)
- Drag/click conflict on canvas (track drag distance, only fire click if < 2px)

## [0.1.0] - 2026-04-10

### Added
- Initial public release of Agora Lab
- Multi-agent adversarial research orchestration system
- Four agent roles: Supervisor, Student, Research Staff, and Paper Reviewer
- 5-phase group meeting protocol (Prepare, Cross-Read, Challenge, Respond, Decision)
- File-based inter-agent communication via structured Markdown
- Markdown-based research task board with flock locking for concurrency
- Dynamic agent scaling — add/remove students, research staff, and paper reviewers at runtime
- Multi-backend support: Claude Code, Codex CLI, Copilot CLI, Gemini CLI
- Workspace isolation enforced by shell hooks
- 21 skills organized as shared core + role-specific overlays
- Persona preset catalog with MBTI types, research backgrounds, and notable results
- 7-step research pipeline (literature → hypothesis → design → implementation → execution → analysis → paper)
- Agent heartbeat monitoring with configurable timeout
- Centralized research task board schema validation (`kanban-schema.sh`)
- Smoke test suite for skill system verification (`smoke-prototype-skills.sh`)
- Security model with runtime-bound caller identity and role-based access control
- Per-agent session persistence via `memory.md`
- Tree search strategy: multiple students explore different directions simultaneously

### Changed
- Split architecture: global install under `~/.agora/` plus per-project `.agora/` working directories
- Unified `agora` CLI now supports `add` / `remove` and source-checkout bootstrap
- Docker examples are now explicitly init-only and persist the full `.agora/` project state

### Fixed
- Installer now points to the published `LiXin97/agora-lab` repository and uses portable copy behavior
- Runtime tmux sessions are project-unique, and watchdog heartbeat updates no longer treat idle shells as live agents
- Meeting, poll, hook, template, and skill paths are aligned to the executable split-layout contract
- Documentation and examples now use `M001` meeting IDs and `experiment_results_{id}.md` artifact naming
