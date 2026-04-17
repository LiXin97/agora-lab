# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
