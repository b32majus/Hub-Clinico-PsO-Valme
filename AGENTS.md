# Hub Clínico Psoriasis Valme — Repository Policy

Status: **CURRENT REPOSITORY AUTHORITY — Atenea C-083 local execution**

This repository is a bounded Psoriasis donor/reference workspace for future PROMueve Dermatology work. It is **not** the target PROMueve Nexus architecture and it is **not** pilot/production software.

## 1. Authority precedence

1. current human instruction / accepted issue or WO;
2. live GitHub branch, HEAD, PR and published artifact state;
3. `docs/INDEX.md`;
4. `docs/ops/WORK_ORDER_STATUS.md`;
5. the current plan/contract/audit linked from the index;
6. this repository policy and `CODING_STANDARDS.md`;
7. current Atenea C-083 execution/routing authority;
8. adopted upstream Matt skills;
9. historical train instructions, old Atenea runbooks and remembered session state.

If current authorities materially conflict, STOP and reconcile. Never use remembered SHAs or old train bodies as current execution truth.

## 2. Read before work

Read only what the task needs, normally:

- this file;
- `CODING_STANDARDS.md`;
- `CONTEXT.md`;
- `docs/INDEX.md` and `docs/ops/WORK_ORDER_STATUS.md`;
- the accepted issue/WO;
- the specific clinical/data contract or audit linked from the index;
- `docs/ATENEA_EXECUTION_ROUTING_V0.md` when executing through Atenea.

For claims about `b32majus/Hub-Clinico-Badajoz`, verify that repository live. PsO-Valme is not authority for PROMueve runtime state.

## 3. Clinical and data safety

These invariants outrank implementation convenience:

- synthetic/demo data only in repo, tests and QA;
- missing/blank/unknown is not `0`, `NO`, success or a clinical decision;
- drug/catalog/history alone must not infer dose, route, regimen, presentation, induction, duration or treatment decision;
- historical data from another patient must never survive a patient switch;
- a future visit must never become previous history;
- current-state dashboard filters must not resurrect an older visit as current state;
- stale async file loads must not replace, clear or relabel a newer authoritative load (`latest-request-wins`);
- incompatible XLSX/schema input fails closed and must not leave stale cohort/patient state active;
- no real patient identifiers, exports, credentials or secrets in Git, issues, tests or external tools.

When clinical meaning is absent or ambiguous, preserve `unknown/pending` and escalate rather than invent semantics.

## 4. Current execution path — C-083

C-083 uses project-local OpenCode V2 agents with `--pure` and upstream Matt skills.

```bash
opencode --pure --agent atenea-volume
opencode --pure --agent atenea-complex
```

`volume` is default. Use `complex` only for material architecture, concurrency/state/temporal, privacy/auth/tenancy, clinical-trust-boundary, delicate migration/back-compat or repeated semantic-failure risk.

Matt owns TDD when applicable, task graphs/frontiers, `implement`, `implement-spec`, implementer worktrees, merger flow and Standards/Spec code review. Do not duplicate those workflows here.

Atenea supplies only repo authority, stable standards, exact role/model bindings, deterministic evidence and publication boundaries. No silent model fallback. At most one autonomous correction pass; a remaining blocker or new material issue is HUMAN STOP.

## 5. Historical execution instructions

Issues/docs from Train-A/B/C/D may contain C-077/C-080-era Gentle/Pi/RDD/4R/lineage/burn/OpenCode V1 instructions. Their product requirements, test evidence and historical facts may remain useful, but their **execution procedure is HISTORICAL** and must not be followed under C-083.

`.atl/` remains ignored as preserved historical runtime state. Do not delete historical files/worktrees merely because the execution model changed.

## 6. Deterministic evidence

Existing repo tests/oracles are first-line evidence. Run changed-artifact-aware checks and the smallest relevant regression set; run the composed matrix when a change crosses the corresponding seams.

Current deterministic suites live under `tests/*.test.js` and include patient-state isolation, score missingness, current-state cohort semantics, longitudinal/date semantics, repo-local JSZip, XLSX load contract, demo fixture equivalence, dashboard XLSX/current-state behavior and load-race isolation.

Do not call headless/browser automation "human manual QA". The manual GitHub Pages gate remains a separate human product check.

## 7. Git, worktrees and publication

- Never mutate `main` without explicit human authorization.
- Verify repo/branch/HEAD/tree before writes.
- Use an isolated branch/worktree for changes.
- Do not reset, clean, overwrite or force-remove another worktree's unique state.
- No force-push, destructive history rewrite or branch/worktree deletion without explicit authorization.
- Commit, push, PR and merge are separate authorities. Review never grants merge.
- The delivery/integration worktree remains through PR review and accepted merge; cleanup is post-merge after clean/reachable/no-process/no-unique-state verification.

A local Train-D worktree contains unique unpublished commits; see `CONTEXT.md`. Treat it as HOLD until separately reconciled.

## 8. Agent skills

### Issue tracker

Issues/specs live in GitHub for `b32majus/Hub-Clinico-PsO-Valme`. See `docs/agents/issue-tracker.md`.

### Triage labels

Matt's canonical triage-role mapping is documented in `docs/agents/triage-labels.md`. Do not create or rename repository labels implicitly.

### Domain docs

This is a single-context repo. Current architecture/state lives in `CONTEXT.md`; clinical/product authority is indexed by `docs/INDEX.md`. See `docs/agents/domain.md`.
