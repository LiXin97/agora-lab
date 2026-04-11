#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LAB_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

PYTHON_BIN="${PYTHON_BIN:-}"
supports_smoke_python() {
  "$1" - <<'PY' >/dev/null 2>&1
import sys
raise SystemExit(0 if sys.version_info >= (3, 8) else 1)
PY
}

if [[ -z "$PYTHON_BIN" ]]; then
  if command -v python3 >/dev/null 2>&1 && supports_smoke_python python3; then
    PYTHON_BIN="python3"
  elif command -v python >/dev/null 2>&1 && supports_smoke_python python; then
    PYTHON_BIN="python"
  else
    echo "ERROR: python3 (or python mapped to Python >= 3.8) is required for scripts/smoke-prototype-skills.sh" >&2
    exit 1
  fi
fi

"$PYTHON_BIN" - "$LAB_DIR" <<'PY'
import atexit
import shutil
import subprocess
import signal
import re
import sys
import tempfile
from pathlib import Path

lab_dir = Path(sys.argv[1]).resolve()
scratch_root = lab_dir.parent / ".prototype-skill-smoke"
temp_dirs = []
cleaned_up = False


def cleanup():
    global cleaned_up
    if cleaned_up:
        return
    cleaned_up = True
    signal.signal(signal.SIGINT, signal.SIG_IGN)
    signal.signal(signal.SIGTERM, signal.SIG_IGN)
    for path in reversed(temp_dirs):
        shutil.rmtree(path, ignore_errors=True)
    try:
        scratch_root.rmdir()
    except OSError:
        pass


atexit.register(cleanup)


def handle_signal(signum, _frame):
    cleanup()
    raise SystemExit(128 + signum)


signal.signal(signal.SIGINT, handle_signal)
signal.signal(signal.SIGTERM, handle_signal)


def clone_tree(prefix):
    scratch_root.mkdir(parents=True, exist_ok=True)
    previous_int = signal.signal(signal.SIGINT, signal.SIG_IGN)
    previous_term = signal.signal(signal.SIGTERM, signal.SIG_IGN)
    try:
        dst = Path(tempfile.mkdtemp(prefix=prefix, dir=str(scratch_root)))
        temp_dirs.append(dst)
    finally:
        signal.signal(signal.SIGINT, previous_int)
        signal.signal(signal.SIGTERM, previous_term)
    shutil.copytree(
        lab_dir,
        dst,
        dirs_exist_ok=True,
        ignore=shutil.ignore_patterns(".git", ".worktrees", "__pycache__", ".pytest_cache"),
    )
    return dst


def run(cmd, cwd):
    return subprocess.run(cmd, cwd=cwd, text=True, capture_output=True)


def assert_success(proc, label):
    if proc.returncode != 0:
        raise AssertionError(f"{label} failed:\nSTDOUT:\n{proc.stdout}\nSTDERR:\n{proc.stderr}")


def assert_failure(proc, label):
    if proc.returncode == 0:
        raise AssertionError(f"{label} unexpectedly succeeded:\nSTDOUT:\n{proc.stdout}\nSTDERR:\n{proc.stderr}")


try:
    tmp = clone_tree("agora-prototype-skills-")
    init = run(
        [
            "bash",
            "scripts/lab-init.sh",
            "--force",
            "--topic",
            "Workflow smoke",
            "--students",
            "1",
            "--staff",
            "1",
            "--paper-reviewers",
            "1",
        ],
        tmp,
    )
    assert_success(init, "lab init")

    old_flag = run(["bash", "scripts/lab-init.sh", "--topic", "bad", "--reviewers", "1"], tmp)
    assert_failure(old_flag, "old --reviewers flag")
    if "use: --paper-reviewers" not in f"{old_flag.stdout}\n{old_flag.stderr}":
        raise AssertionError(f"missing replacement message for --reviewers:\n{old_flag.stdout}\n{old_flag.stderr}")

    old_role = run(["bash", "scripts/lab-agent.sh", "-add", "-name", "legacy-reviewer", "-role", "reviewer"], tmp)
    assert_failure(old_role, "legacy reviewer role")
    if "use: paper-reviewer" not in f"{old_role.stdout}\n{old_role.stderr}":
        raise AssertionError(f"missing replacement message for reviewer role:\n{old_role.stdout}\n{old_role.stderr}")

    expected = {
        "supervisor": {
            "shared-references",
            "core-kanban",
            "core-meeting",
            "core-handoff",
            "supervisor-planning",
            "supervisor-tasking",
            "supervisor-meeting",
            "supervisor-decision",
            "supervisor-integration",
        },
        "student-a": {
            "shared-references",
            "core-kanban",
            "core-meeting",
            "core-handoff",
            "student-literature",
            "student-idea-refine",
            "student-experiment-design",
            "student-run-experiment",
            "student-analyze-results",
            "student-write-paper",
            "student-meeting",
        },
        "staff-a": {
            "shared-references",
            "core-kanban",
            "core-meeting",
            "core-handoff",
            "research-staff-judgment",
            "research-staff-meeting",
        },
        "paper-reviewer-1": {
            "shared-references",
            "core-kanban",
            "core-handoff",
            "paper-reviewer-critique",
            "paper-reviewer-novelty-check",
            "paper-reviewer-results-to-claims",
            "paper-reviewer-evidence-audit",
        },
    }

    for agent, wanted in expected.items():
        skill_dir = tmp / "agents" / agent / ".claude" / "skills"
        found = {path.name for path in skill_dir.iterdir() if path.is_dir()}
        if found != wanted:
            raise AssertionError(
                f"{agent} skills mismatch: expected {sorted(wanted)}, found {sorted(found)}"
            )
        # Verify symlink semantics: each installed skill must be a symlink
        # resolving to the canonical skills/<name> directory in the temp clone.
        for skill_name in wanted:
            entry = skill_dir / skill_name
            if not entry.is_symlink():
                raise AssertionError(
                    f"{agent} skill '{skill_name}' exists but is not a symlink"
                )
            resolved = entry.resolve()
            expected_target = (tmp / "skills" / skill_name).resolve()
            if resolved != expected_target:
                raise AssertionError(
                    f"{agent} skill '{skill_name}' symlink resolves to {resolved!r},"
                    f" expected {expected_target!r}"
                )

    for legacy in [
        "group-meeting",
        "kanban-ops",
        "literature-survey",
        "experiment-design",
        "run-experiment",
        "write-paper",
        "review-critique",
    ]:
        legacy_skill = tmp / "skills" / legacy / "SKILL.md"
        if legacy_skill.exists():
            raise AssertionError(f"legacy skill directory still exists: {legacy}")

    legacy_yaml = (tmp / "lab.yaml").read_text(encoding="utf-8")
    updated_legacy_yaml, replacements = re.subn(
        r"^(\s*skills:\s*\[)shared-references,\s*core-kanban,\s*core-meeting,\s*core-handoff,\s*student-literature,\s*student-idea-refine,\s*student-experiment-design,\s*student-run-experiment,\s*student-analyze-results,\s*student-write-paper,\s*student-meeting(\]\s*)$",
        r"\1literature-survey, experiment-design, run-experiment, write-paper, kanban-ops, group-meeting\2",
        legacy_yaml,
        count=1,
        flags=re.MULTILINE,
    )
    if replacements != 1:
        raise AssertionError(
            f"legacy-skill injection failed: expected exactly one canonical skill line replacement in lab.yaml, got {replacements}"
        )
    (tmp / "lab.yaml").write_text(updated_legacy_yaml, encoding="utf-8")

    legacy_add = run(
        ["bash", "scripts/lab-agent.sh", "-add", "-name", "student-legacy", "-role", "student"],
        tmp,
    )
    assert_failure(legacy_add, "legacy skill add")
    legacy_output = f"{legacy_add.stdout}\n{legacy_add.stderr}"
    if "legacy skill 'literature-survey' is not supported in prototype mode" not in legacy_output:
        raise AssertionError(f"missing legacy rejection message:\n{legacy_output}")
    if "use: student-literature" not in legacy_output:
        raise AssertionError(f"missing legacy replacement hint:\n{legacy_output}")

    broken = clone_tree("agora-prototype-skills-broken-")
    shutil.rmtree(broken / "skills" / "supervisor-planning")
    broken_init = run(["bash", "scripts/lab-init.sh", "--force", "--topic", "Broken init"], broken)
    assert_failure(broken_init, "broken lab init")
    broken_output = f"{broken_init.stdout}\n{broken_init.stderr}"
    if "Required skill directory not found during lab init:" not in broken_output:
        raise AssertionError(f"missing strict init failure message:\n{broken_output}")

    broken_student = clone_tree("agora-prototype-skills-broken-student-")
    shutil.rmtree(broken_student / "skills" / "student-literature")
    broken_student_init = run(
        ["bash", "scripts/lab-init.sh", "--force", "--topic", "Broken student init", "--students", "1"],
        broken_student,
    )
    assert_failure(broken_student_init, "broken lab init --students")
    broken_student_output = f"{broken_student_init.stdout}\n{broken_student_init.stderr}"
    if "Skill directory not found:" not in broken_student_output:
        raise AssertionError(f"missing skill-missing error for --students path:\n{broken_student_output}")

    meeting = run(["bash", "scripts/lab-meeting.sh", "-caller", "supervisor", "-new"], tmp)
    assert_success(meeting, "create meeting")
    meta = next((tmp / "shared" / "meetings").glob("M*/meta.yaml"), None)
    if meta is None:
        raise AssertionError("meeting meta.yaml not found after successful lab-meeting.sh call")
    meta_text = meta.read_text(encoding="utf-8")
    if "research_staff:" not in meta_text:
        raise AssertionError(f"missing research_staff section in meeting meta:\n{meta_text}")
    if "paper-reviewer-1" in meta_text:
        raise AssertionError(f"paper reviewer should not be in regular meeting participants:\n{meta_text}")

    paper_review = run(
        ["bash", "scripts/lab-paper-review.sh", "-caller", "supervisor", "-new", "paper-001", "supervisor", "paper-reviewer-1"],
        tmp,
    )
    assert_success(paper_review, "create paper review case")
    paper_review_meta = tmp / "shared" / "paper-reviews" / "P001" / "meta.yaml"
    if not paper_review_meta.exists():
        raise AssertionError("paper review meta.yaml not found after successful lab-paper-review.sh call")
    paper_review_meta_text = paper_review_meta.read_text(encoding="utf-8")
    for expected_line in [
        "case_id: P001",
        "paper_id: paper-001",
        "owner: supervisor",
        "status: active",
        "active_round: R1",
        "assigned_reviewers:",
        "  - paper-reviewer-1",
    ]:
        if expected_line not in paper_review_meta_text:
            raise AssertionError(
                f"missing paper review metadata line {expected_line!r}:\n{paper_review_meta_text}"
            )
    for expected_path in [
        tmp / "shared" / "paper-reviews" / "P001" / "packet.md",
        tmp / "shared" / "paper-reviews" / "P001" / "rounds" / "R1" / "packet.md",
        tmp / "shared" / "paper-reviews" / "P001" / "rounds" / "R1" / "reviews",
    ]:
        if not expected_path.exists():
            raise AssertionError(f"missing paper review storage entry: {expected_path}")

    round_one_dir = tmp / "shared" / "paper-reviews" / "P001" / "rounds" / "R1"
    (round_one_dir / "reviews" / "paper-reviewer-1.md").write_text(
        "# Review\n\nNeeds changes before submission.\n",
        encoding="utf-8",
    )
    (round_one_dir / "supervisor-resolution.md").write_text(
        "Decision: needs changes, not submission-ready yet.\n",
        encoding="utf-8",
    )
    review_status = run(["bash", "scripts/lab-paper-review.sh", "-caller", "supervisor", "-status"], tmp)
    assert_success(review_status, "paper review status")
    if "Case P001" not in review_status.stdout:
        raise AssertionError(f"paper review status missing case output:\n{review_status.stdout}\n{review_status.stderr}")

    complete_round_one = run(["bash", "scripts/lab-paper-review.sh", "-caller", "supervisor", "-complete-round", "P001"], tmp)
    assert_success(complete_round_one, "complete paper review round one")
    round_one_meta = paper_review_meta.read_text(encoding="utf-8")
    if "status: ready-for-next-round" not in round_one_meta:
        raise AssertionError(
            "negated submission-ready prose should leave case ready-for-next-round:\n"
            f"{round_one_meta}"
        )

    round_two = run(["bash", "scripts/lab-paper-review.sh", "-caller", "supervisor", "-round", "P001"], tmp)
    assert_success(round_two, "open paper review round two")
    round_two_meta = paper_review_meta.read_text(encoding="utf-8")
    for expected_line in ["status: active", "active_round: R2"]:
        if expected_line not in round_two_meta:
            raise AssertionError(f"missing round-two metadata line {expected_line!r}:\n{round_two_meta}")

    round_two_dir = tmp / "shared" / "paper-reviews" / "P001" / "rounds" / "R2"
    (round_two_dir / "reviews" / "paper-reviewer-1.md").write_text(
        "# Review\n\nLooks good.\n",
        encoding="utf-8",
    )
    (round_two_dir / "supervisor-resolution.md").write_text(
        "Outcome: submission-ready\n\nReady to submit.\n",
        encoding="utf-8",
    )
    complete_round_two = run(["bash", "scripts/lab-paper-review.sh", "-caller", "supervisor", "-complete-round", "P001"], tmp)
    assert_success(complete_round_two, "complete paper review round two")
    round_two_closed_meta = paper_review_meta.read_text(encoding="utf-8")
    for expected_line in ["status: closed", "active_round: R2"]:
        if expected_line not in round_two_closed_meta:
            raise AssertionError(f"missing closed metadata line {expected_line!r}:\n{round_two_closed_meta}")

    print("workflow-hard-cut-smoke-ok")
finally:
    cleanup()
PY
