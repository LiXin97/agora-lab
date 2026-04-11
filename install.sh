#!/usr/bin/env bash
# install.sh — Install Agora Lab framework to ~/.agora/
# Downloads framework files (scripts, templates, skills, hooks, CLI) and
# makes the `agora` command available system-wide.
set -euo pipefail

err() { echo "ERROR: $1" >&2; exit "${2:-1}"; }
info() { echo "==> $1"; }
warn() { echo "WARN: $1" >&2; }

# --- OS detection ---
OS="$(uname -s)"
case "$OS" in
  Linux)  OS_TYPE="linux" ;;
  Darwin) OS_TYPE="macos" ;;
  *)      err "Unsupported OS: $OS. Agora Lab supports Linux and macOS." ;;
esac

info "Detected OS: $OS ($OS_TYPE)"

# --- Dependency checks ---
MISSING=()

check_cmd() {
  if ! command -v "$1" &>/dev/null; then
    MISSING+=("$1")
    warn "$1 not found"
    return 1
  fi
  return 0
}

# Bash version check (need 4.0+)
check_bash_version() {
  local major="${BASH_VERSINFO[0]:-0}"
  if [[ "$major" -lt 4 ]]; then
    warn "Bash $BASH_VERSION detected — Agora Lab requires Bash 4.0+"
    if [[ "$OS_TYPE" == "macos" ]]; then
      warn "macOS ships Bash 3.x. Install newer: brew install bash"
    fi
    MISSING+=("bash4+")
  else
    info "Bash $BASH_VERSION — OK"
  fi
}

check_bash_version
check_cmd tmux   && info "tmux — OK"
check_cmd jq     && info "jq — OK"
check_cmd git    && info "git — OK"
check_cmd flock  && info "flock — OK"

# --- Report missing dependencies ---
if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo ""
  warn "Missing dependencies: ${MISSING[*]}"
  echo ""
  if [[ "$OS_TYPE" == "macos" ]]; then
    echo "  Install with Homebrew:"
    echo "    brew install bash tmux jq flock"
  else
    echo "  Install on Ubuntu/Debian:"
    echo "    sudo apt-get update && sudo apt-get install -y tmux jq util-linux"
    echo ""
    echo "  Install on Fedora/RHEL:"
    echo "    sudo dnf install -y tmux jq util-linux"
  fi
  echo ""
  err "Please install missing dependencies and re-run this script."
fi

# --- Configuration ---
AGORA_HOME="${AGORA_HOME:-$HOME/.agora}"
REPO_URL="https://github.com/LiXin97/agora-lab.git"
AGORA_VERSION="0.1.0"

info "Installing Agora Lab to $AGORA_HOME ..."

# --- Fetch source ---
# Clone to a temporary directory, then copy framework files into AGORA_HOME.
TMPDIR_CLONE="$(mktemp -d)"
_cleanup_tmpdir=true
trap '[[ "$_cleanup_tmpdir" == true ]] && rm -rf "$TMPDIR_CLONE"' EXIT

if [[ -d "$AGORA_HOME/.source" && -d "$AGORA_HOME/.source/.git" ]]; then
  info "Updating existing source..."
  existing_origin="$(git -C "$AGORA_HOME/.source" remote get-url origin 2>/dev/null || true)"
  if [[ "$existing_origin" != "$REPO_URL" ]]; then
    err "Existing source checkout origin '$existing_origin' does not match expected '$REPO_URL'. Remove $AGORA_HOME/.source and retry."
  fi
  if ! git -C "$AGORA_HOME/.source" fetch --depth 1 origin main \
    || ! git -C "$AGORA_HOME/.source" reset --hard FETCH_HEAD; then
    err "Failed to update existing source checkout at $AGORA_HOME/.source"
  fi
  rm -rf "$TMPDIR_CLONE"
  _cleanup_tmpdir=false
  TMPDIR_CLONE="$AGORA_HOME/.source"
else
  info "Cloning Agora Lab..."
  git clone --depth 1 --branch main "$REPO_URL" "$TMPDIR_CLONE"
fi

# --- Verify clone has expected structure ---
for required in scripts/lab-init.sh scripts/lab-agent.sh agora; do
  [[ -f "$TMPDIR_CLONE/$required" ]] \
    || err "Source verification failed — $required not found in cloned repo."
done

# --- Install framework directories ---
mkdir -p "$AGORA_HOME"/bin

copy_tree() {
  local src="$1" dst="$2"
  rm -rf "$dst"
  mkdir -p "$dst"
  (cd "$src" && tar cf - .) | (cd "$dst" && tar xpf -)
}

info "Installing scripts..."
copy_tree "$TMPDIR_CLONE/scripts" "$AGORA_HOME/scripts"

info "Installing templates..."
copy_tree "$TMPDIR_CLONE/templates" "$AGORA_HOME/templates"

info "Installing skills..."
copy_tree "$TMPDIR_CLONE/skills" "$AGORA_HOME/skills"

info "Installing hooks..."
copy_tree "$TMPDIR_CLONE/hooks" "$AGORA_HOME/hooks"

# --- Install CLI ---
info "Installing CLI to $AGORA_HOME/bin/agora ..."
cp "$TMPDIR_CLONE/agora" "$AGORA_HOME/bin/agora"
chmod +x "$AGORA_HOME/bin/agora"

# --- Write version ---
echo "$AGORA_VERSION" > "$AGORA_HOME/version"

# --- Make CLI available on PATH ---
SYMLINK_TARGET="/usr/local/bin/agora"

install_symlink() {
  if [[ -L "$SYMLINK_TARGET" ]]; then
    local existing_target
    existing_target="$(readlink "$SYMLINK_TARGET" 2>/dev/null || true)"
    if [[ "$existing_target" != "$AGORA_HOME/bin/agora" ]]; then
      if [[ "$existing_target" == /*/bin/agora ]]; then
        local existing_home
        existing_home="${existing_target%/bin/agora}"
        if [[ ! -e "$existing_target" ]]; then
          warn "Replacing stale Agora symlink at $SYMLINK_TARGET -> $existing_target"
        elif [[ -f "$existing_home/scripts/lab-init.sh" && -d "$existing_home/templates" && -d "$existing_home/skills" && -d "$existing_home/hooks" ]]; then
          info "Updating existing Agora symlink at $SYMLINK_TARGET -> $existing_target"
        else
          warn "Refusing to replace existing symlink at $SYMLINK_TARGET -> $existing_target"
          return 1
        fi
      else
        warn "Refusing to replace existing symlink at $SYMLINK_TARGET -> $existing_target"
        return 1
      fi
    fi
  elif [[ -e "$SYMLINK_TARGET" ]]; then
    warn "Refusing to replace existing file at $SYMLINK_TARGET"
    return 1
  fi

  if [[ -w "$(dirname "$SYMLINK_TARGET")" ]]; then
    ln -sfn "$AGORA_HOME/bin/agora" "$SYMLINK_TARGET"
  else
    info "Creating symlink at $SYMLINK_TARGET (requires sudo)..."
    sudo ln -sfn "$AGORA_HOME/bin/agora" "$SYMLINK_TARGET"
  fi
}

# Try to create symlink; fall back to PATH advice
if install_symlink 2>/dev/null; then
  info "Symlinked $SYMLINK_TARGET -> $AGORA_HOME/bin/agora"
else
  warn "Could not create symlink at $SYMLINK_TARGET."
  echo ""
  echo "  Add Agora to your PATH manually:"
  echo "    echo 'export PATH=\"\$HOME/.agora/bin:\$PATH\"' >> ~/.bashrc"
  echo "    source ~/.bashrc"
  echo ""
  echo "  Or for zsh:"
  echo "    echo 'export PATH=\"\$HOME/.agora/bin:\$PATH\"' >> ~/.zshrc"
  echo "    source ~/.zshrc"
fi

# --- Success ---
echo ""
echo "============================================"
echo "  Agora Lab installed successfully!"
echo "  Version: $AGORA_VERSION"
echo "  Location: $AGORA_HOME"
echo "============================================"
echo ""
echo "  Quick start:"
echo "    mkdir my-research && cd my-research"
echo "    agora init \"Your research topic\" --students 2 --paper-reviewers 1"
echo "    agora start"
echo ""
echo "  Run 'agora help' for all available commands."
echo ""
