# Contributing to Agora Lab

Thank you for your interest in contributing to Agora Lab!
This guide covers everything you need to get started.

## Table of Contents

- [Development Setup](#development-setup)
- [Code Standards](#code-standards)
- [Commit Convention](#commit-convention)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Getting Help](#getting-help)

## Development Setup

### Prerequisites

- **Bash 4.0+** (macOS ships with Bash 3.x -- install newer: `brew install bash`)
- **tmux** -- terminal multiplexer for agent sessions
- **jq** plus **python3** (or a `python` alias) -- hook parsing and smoke tests use Python
- **flock** -- file locking (standard on Linux; macOS: `brew install flock`)
- **ShellCheck** -- for linting (`brew install shellcheck` or `apt-get install shellcheck`)
- One or more AI CLI backends:
  [Claude Code](https://claude.ai/code),
  [Codex CLI](https://github.com/openai/codex),
  [Copilot CLI](https://docs.github.com/copilot)

### Getting Started

1. Fork the repository
2. Clone your fork:

```bash
git clone https://github.com/<your-username>/agora-lab.git
cd agora-lab
```

3. Verify setup:

```bash
bash scripts/smoke-prototype-skills.sh
```

## Code Standards

### Shell Scripts

All shell scripts in this project follow a strict set of conventions.
See `scripts/lab-init.sh` as the canonical example.

- All scripts MUST start with `#!/usr/bin/env bash` followed by `set -euo pipefail`.
- Define standard helper functions at the top of every script:

```bash
err() { echo "ERROR: $1" >&2; exit "${2:-1}"; }
info() { echo "$1"; }
warn() { echo "WARN: $1" >&2; }
```

- Function naming: use the `verb_noun()` pattern (e.g., `get_agent_role`, `validate_agent_name`, `kanban_header_for_section`).
- Variable naming: `UPPER_SNAKE` for constants and globals, `lower_snake` for locals.
- Always declare locals: `local var_name`.
- Always quote variables: `"$var"` not `$var`.
- Use `[[ ]]` for conditionals, not `[ ]`.
- Use `$(command)` for command substitution, not backticks.
- ShellCheck must pass with zero warnings on all scripts.

### YAML

- Parse YAML with `awk` or `jq`/`python3`, never `eval`.
- Reference `lab.yaml` as the canonical configuration source.

### Markdown

- Use ATX-style headings (`#`, `##`, `###`).
- One sentence per line in source (for cleaner diffs).
- Code blocks with explicit language tags (e.g., ` ```bash `).

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/).

| Prefix      | Use for                                     |
|-------------|---------------------------------------------|
| `feat:`     | New features                                |
| `fix:`      | Bug fixes                                   |
| `docs:`     | Documentation changes                       |
| `test:`     | Adding or updating tests                    |
| `refactor:` | Code restructuring without behavior change  |
| `revert:`   | Reverting a previous commit                 |

Example:

```
feat: add heartbeat monitoring for agent liveness
```

Keep the subject line under 72 characters.
Use the body for additional context when needed.

## Pull Request Process

1. Create a feature branch from `main`:

```bash
git checkout -b feat/your-feature main
```

2. Make your changes following the code standards above.
3. Run linting:

```bash
shellcheck scripts/*.sh hooks/*.sh
```

4. Run tests:

```bash
bash scripts/smoke-prototype-skills.sh
```

5. Commit with a conventional commit message.
6. Push to your fork and open a Pull Request.
7. Fill out the PR template.
8. Wait for CI to pass (ShellCheck lint + smoke tests).
9. Address review feedback.
10. Merge requires 1 maintainer approval.

## Testing

Before submitting any PR, run:

```bash
# Lint all scripts
shellcheck scripts/*.sh hooks/*.sh

# Run smoke tests
bash scripts/smoke-prototype-skills.sh
```

New features should extend the smoke test suite where feasible.

If you add a new script to `scripts/` or `hooks/`, make sure ShellCheck passes on it before committing.

## Project Structure

```
agora-lab/
├── agora                       # Unified CLI wrapper
├── install.sh                  # Global installer (copies framework to ~/.agora/)
├── lab.yaml                    # Default role/config template shipped with the repo
├── scripts/                    # Global framework scripts copied into ~/.agora/scripts/
├── templates/                  # Global role/settings templates copied into ~/.agora/templates/
├── skills/                     # Shared skill library (symlinked into generated agents)
├── hooks/                      # Enforcement hooks copied into ~/.agora/hooks/
├── docs/                       # Additional documentation
└── <your project>/
    └── .agora/
        ├── lab.yaml            # Per-project lab config
        ├── LAB.md              # Per-project lab rules
        ├── agents/             # Per-agent workspaces (gitignored)
        ├── shared/             # Kanban, artifacts, messages, meetings (gitignored)
        ├── scripts -> ~/.agora/scripts
        └── hooks -> ~/.agora/hooks
```

## Getting Help

- Open a [GitHub Issue](https://github.com/LiXin97/agora-lab/issues) for bugs or feature requests.
- Start a [Discussion](https://github.com/LiXin97/agora-lab/discussions) for questions.
- Read `LAB.md` for operational documentation on how the lab works.
- Read `README.md` for an overview of the architecture and commands.
