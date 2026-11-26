---
name: oc-merge-loop
description: Gate BeatFrame PRs from push to MERGEABLE using the 5-gate Merge-Ready check (check, label, meta, review, Review Gate commit status, pulls/<n>/reviews, GraphQL reviewThreads, MERGEABLE). Trigger after gh pr create or git push, on CONFLICTING state, or before gh pr merge.
license: MIT
compatibility: opencode
metadata:
  category: workflow
  gate: post-pr
  author: Ham3dParsa
  author_url: https://github.com/Ham3dParsa
---
# Merge Loop — BeatFrame (5 Strict Gates)

Deterministic PR merge gate for `Ham3dParsa/beatframe`. Never treat green `gh pr checks` alone as merge-ready. Read comments and reviews only from `github-actions[bot]` and `opencode-agent[bot]`; ignore raw Kilo comments.

Run via a dedicated subagent per PR — the main session dispatches one subagent with this skill and receives `READY TO MERGE` or `BLOCKED` with reason.

## 0. Base Freshness Gate (Before Anything Else)
```powershell
git fetch origin
git rev-list --count HEAD..origin/main
```
If non-zero: stop and rebase onto `origin/main` first (§3), then restart from Step 1.

## Merge-Ready Definition (All 5 Gates Simultaneously on Latest `headRefOid`)
1. **Checks and Commit Status (`gh pr checks <n>` + `Review Gate`):** `check`, `label`, `meta`, `review`, and `Review Gate` all report `pass` (zero `fail`), and the commit status with `context == "Review Gate"` on the latest `headRefOid` is `success`.
2. **Official Review State (`pulls/<n>/reviews`):** Latest formal review from `github-actions[bot]` or `opencode-agent[bot]` is `APPROVED` (or `COMMENT`/`COMMENTED` containing `### ✅ تایید شده` / `### ✅ APPROVED`), with **zero** active `CHANGES_REQUESTED`.
3. **Inline Threads (GraphQL `reviewThreads`):** Every blocking thread (`🔴`/`🟡` — `[critical]`/`[warning]`) and triaged thread (`🔵` — `[info]`) has `isResolved == true`.
4. **GitHub Mergeability (`gh pr view`):** `mergeable == "MERGEABLE"` and `reviewDecision != "CHANGES_REQUESTED"`.
5. **Zero Unhandled Findings:** Every `[critical]`/`[warning]` is fixed or explicitly waived, and every `[info]` is triaged.

## Steps

### 1. Inspect PR Status, Checks, Reviews, and Threads
Run all five commands for PR `<n>`:
```powershell
gh pr view <n> --repo Ham3dParsa/beatframe --json headRefOid,mergeable,reviewDecision
gh pr checks <n> --repo Ham3dParsa/beatframe
gh api repos/Ham3dParsa/beatframe/commits/<headRefOid>/statuses --jq 'map(select(.context=="Review Gate")) | .[0] | {state, description}'
gh api repos/Ham3dParsa/beatframe/pulls/<n>/reviews --jq '.[] | [.id, .state, .commit_id, .user.login, (.body|length)] | @tsv'
gh api graphql -f query='query($o:String!,$r:String!,$n:Int!){repository(owner:$o,name:$r){pullRequest(number:$n){reviewThreads(first:100){nodes{id isResolved isOutdated path line comments(first:1){nodes{body}}}}}}}' -F o=Ham3dParsa -F r=beatframe -F n=<n>
```
If checks are `pending` or `in_progress`, wait 90 seconds (90–120s window, cap 30 minutes). As soon as `CHANGES_REQUESTED` or `fail` arrives, move immediately to Step 2.
If `opencode-review` fails in `0s` with `workflow file issue`, inspect the workflow YAML and `${{ ... }}` expressions immediately (e.g., `${{ runner.* }}` inside `jobs.<id>.env`).

### 2. Triage, Fix or Escalate, and Resolve Threads
- **Valid inline `suggestion` (no behavioral risk):** Batch multiple suggestions into a single commit (**Add suggestion to batch -> Commit suggestions**, or one combined local fix commit) so `opencode-review` (`cancel-in-progress: true`) runs once.
- **Needs custom rewrite or justified waiver:** `[critical]` and `[warning]` are blocking and must be resolved before merge; fix `[info]` if simple and in scope (≤5 lines), otherwise defer with an explicit reason.
- **Behavioral, UX, product, or contract change:** Escalate to the main agent and, when needed, to the project owner before modifying behavior (remember version/changelog sync per `AGENTS.md`).
- **Reply and resolve on every thread (never delete, never resolve silently):**
```powershell
gh api graphql -f query='mutation($id:ID!,$body:String!){addPullRequestReviewThreadReply(input:{pullRequestReviewThreadId:$id,body:$body}){comment{id}}}' -F id=<threadId> -F body="Fixed in <sha> (or: Waived — <reason>)."
gh api graphql -f query='mutation($id:ID!){resolveReviewThread(input:{threadId:$id}){thread{id isResolved}}}' -F id=<threadId>
```
Push fix commits to re-trigger `opencode-review`.

### 3. Resolve Conflicts via Rebase
If `mergeable == "CONFLICTING"`:
```powershell
git fetch origin; git rebase origin/main
npm test
node --check server.js
git diff --check origin/main...HEAD
git push --force-with-lease
```

### 4. Final Verification Gate
After the final push, re-run Step 1 and confirm all 5 gates pass simultaneously (`check`, `label`, `meta`, `review`, `Review Gate` all `pass`/`success`, zero active `CHANGES_REQUESTED`, zero unresolved `reviewThreads`, `mergeable == "MERGEABLE"`). Report **READY TO MERGE** only in this state; merge only on explicit owner instruction (`gh pr merge --squash <n>`).
