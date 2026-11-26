"""PR meta labels: type/* from conventional-commit title, priority/* markers.

Reads the PR via the `gh` CLI (PR data comes from the API; the workflow's
checkout step provides this script file) and enforces the exact label
state for the computed dimensions: adds missing labels and removes stale
ones. Idempotent: re-running on an already-correct PR changes nothing.

Type mapping (conventional-commit prefix in the PR title):
    feat -> type/feat      fix -> type/fix          refactor -> type/refactor
    style -> type/style    docs -> type/docs        chore -> type/chore
Other prefixes (test, perf, build, ci, ...) map to no type/* label.

Priority rules:
    - "BREAKING" anywhere in the title, a "!" before the colon
      (e.g. "feat!: ..."), or "priority: high" in title or body
      -> priority/high
    - "priority: low" in title or body -> priority/low
    - priority/high wins when both could apply.
"""

import json
import os
import re
import subprocess
import sys

REPO = os.environ.get("GITHUB_REPOSITORY", "Ham3dParsa/beatframe")

TYPE_LABELS = {
    "feat": "type/feat",
    "fix": "type/fix",
    "refactor": "type/refactor",
    "style": "type/style",
    "docs": "type/docs",
    "chore": "type/chore",
}
MANAGED = set(TYPE_LABELS.values()) | {"priority/high", "priority/low"}

# Conventional-commit prefix: "type", "type(scope)", optional "!".
CONVENTIONAL_TITLE = re.compile(r"^([a-zA-Z]+)(?:\([^)]*\))?!?:")
BREAKING_TITLE = re.compile(r"^[\w-]+(\([^)]*\))?!:")
BREAKING_WORD = re.compile(r"\bBREAKING\b", re.IGNORECASE)
PRIORITY_HIGH = re.compile(r"priority\s*:\s*high\b", re.IGNORECASE)
PRIORITY_LOW = re.compile(r"priority\s*:\s*low\b", re.IGNORECASE)


def gh(*args):
    result = subprocess.run(["gh", *args], capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(
            f"gh {' '.join(args)} failed: {result.stderr.strip()[:200]}"
        )
    return json.loads(result.stdout.strip().lstrip("﻿"))


def compute_labels(title: str, body: str):
    want = set()

    match = CONVENTIONAL_TITLE.match(title.strip())
    if match:
        label = TYPE_LABELS.get(match.group(1).lower())
        if label:
            want.add(label)

    haystack = f"{title}\n{body or ''}"
    if (
        BREAKING_TITLE.search(title.strip())
        or BREAKING_WORD.search(haystack)
        or PRIORITY_HIGH.search(haystack)
    ):
        want.add("priority/high")
    elif PRIORITY_LOW.search(haystack):
        want.add("priority/low")

    return want


def main(pr_number: str) -> int:
    pr = gh(
        "pr", "view", pr_number, "--repo", REPO,
        "--json", "title,body,labels",
    )
    existing = {label["name"] for label in pr.get("labels", [])}
    want = compute_labels(pr.get("title", ""), pr.get("body", ""))

    to_add = sorted(want - existing)
    to_remove = sorted((existing & MANAGED) - want)

    for label in to_add:
        subprocess.run(
            ["gh", "pr", "edit", pr_number, "--repo", REPO,
             "--add-label", label],
            check=True,
        )
    for label in to_remove:
        subprocess.run(
            ["gh", "pr", "edit", pr_number, "--repo", REPO,
             "--remove-label", label],
            check=True,
        )

    print(f"PR #{pr_number}: added={to_add} removed={to_remove}")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("usage: pr_meta_labels.py <pr-number>", file=sys.stderr)
        sys.exit(2)
    sys.exit(main(sys.argv[1]))
