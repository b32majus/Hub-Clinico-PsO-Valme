# PsO-Valme — Current System Context

Updated: 2026-10-03

## Purpose

`b32majus/Hub-Clinico-PsO-Valme` is a **bounded donor/reference workspace** for Psoriasis. The product priority is PROMueve Extremadura / Dermatology; this repository is not the future Nexus architecture and is not pilot/production software.

Primary product authority and history are indexed by `docs/INDEX.md` and `docs/ops/WORK_ORDER_STATUS.md`.

## Current product surfaces

- `index.html` — Psoriasis clinical form/prototype.
- `Cuadro_Mando_Psoriasis_Valme_v2.html` — adjudicated donor dashboard baseline (`V2_WITH_V1_FEATURES_TO_PORT`).
- `Cuadro_Mando_Psoriasis_Valme_v1.html` — historical reference; its cache/auto-restore capability remains a separately adjudicated legacy capability.
- `Base Datos_PsO_Valme_demo.csv` — synthetic demo source fixture.
- `Base Datos_PsO_Valme_demo.xlsx` — lossless synthetic XLSX derivative used by browser QA.
- `psoriasis_valme_base_longitudinal.xlsx` — known incompatible-schema fail-closed fixture; not a master dataset.
- `vendor/jszip/3.10.1/` — repo-local JSZip runtime for clean checkout/Pages operation.

Do not assume any XLSX is master unless a current document explicitly adjudicates that role.

## Preserved product invariants

The stabilized donor behavior currently has deterministic coverage for:

- patient-state isolation across NUSHA changes;
- PASI/DLQI/PURE-4 missingness versus true zero;
- current-patient dashboard cohort/filter semantics;
- longitudinal previous-visit/date semantics, including Excel dates and no-future preload;
- repo-local JSZip portability;
- XLSX minimum schema + explicit fail-closed behavior;
- lossless demo XLSX generation;
- canonical Acitretina current-state/date-window browser scenario;
- `latest-request-wins` isolation for out-of-order async file loads.

The test authority is the executable `tests/*.test.js` suite set, not historical narrative alone.

## Live publication state at this reconciliation

Verified 2026-10-03 before this branch was created:

- remote published product branch: `work/pso-valme-train-c-20260930`;
- verified branch HEAD at reconciliation start: `8d6257db2c586909e9a2900a4c685f646c9bb300`;
- GitHub Pages source: that Train-C branch, path `/`, status `built`;
- human manual QA gate remains pending;
- `PSO-07` donor-contract work remains blocked by that human gate;
- `main` remains the original prototype branch and is not the active stabilized product branch.

Re-verify live GitHub before acting; these SHAs describe this reconciliation baseline, not permanent future authority.

## Unique local state — HOLD

Worktree:
`/srv/kairos-lab/projects/pso-valme-train-d-20260930`

Branch:
`work/pso-valme-train-d-20260930`

Local HEAD observed before C-083 reconciliation:
`3012034d78b9c96b3b59ad10ef5be70d7b1129ac`

It contains unpublished QA-harness/documentation-only Train-D commits. It is clean but **not remote-published**. Treat it as `HOLD`: do not reset, delete, overwrite, absorb or publish it implicitly from unrelated work.

## Execution model

Current execution authority is Atenea C-083:

- OpenCode V2 launched with `--pure`;
- upstream Matt skills own engineering method;
- project-local `atenea-*` agents bind roles/models;
- `volume` default, `complex` only on material risk triggers;
- deterministic evidence first;
- at most one autonomous correction pass;
- Cora performs integrated feature/train/PR audit when material;
- human/repository policy owns publication/merge.

Old C-077–C-082 Gentle/Pi/RDD/4R/OpenCode V1 recipes in historical train issues/docs are provenance only.

## Boundary with PROMueve

This repo may inspect `b32majus/Hub-Clinico-Badajoz` read-only when an accepted audit/design ticket requires it. It must not modify PROMueve from a Valme WO.

Any real Dermatology implementation in PROMueve requires fresh live verification, target-repo authority, its own WO, isolated branch/worktree and explicit publication/merge authority.
