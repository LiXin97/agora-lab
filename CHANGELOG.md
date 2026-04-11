# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
