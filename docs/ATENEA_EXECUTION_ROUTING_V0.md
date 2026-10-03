# PsO-Valme — Atenea C-083 execution routing

Status: **CURRENT PROJECT-LOCAL EXECUTION ROUTING**
Date: 2026-10-03

This file binds current Atenea C-083 roles for this repository. It does not duplicate Matt skill procedures. Launch OpenCode with `--pure`; older global Gentle/Pi/OpenCode V1 components are outside the active route.

## Profiles

| Role | `volume` | `complex` |
| --- | --- | --- |
| Coordinator | `atenea-volume` → MiMo 2.6 Flash | `atenea-complex` → MiMo 2.6 Flash |
| Explorer | `atenea-explorer` → Qwen 3.8 Flash | same |
| Implementer | `atenea-implementer-volume` → DeepSeek V4 Flash | `atenea-implementer-complex` → DeepSeek V4 Flash |
| Merger | `atenea-merger` → MiMo 2.6 Flash | same |
| Standards review | `atenea-review-standards` → GPT-6 Luna high | same |
| Spec review | `atenea-review-spec-volume` → GPT-6 Luna high | `atenea-review-spec-complex` → GPT-6.1 Sol high |
| Correction | `atenea-corrector-volume` → DeepSeek V4 Flash | `atenea-corrector-complex` → GLM 5.3 Flash high |
| Deep OCR | normally off | GLM high only when materially triggered |
| Integrated feature/train/PR audit | Cora when material | Cora when material |

The stable NaN ID `nan/deepseek-v4-flash` is intentional even when the provider backend serves the qualified newer V4.x implementation behind that ID.

## Launch

```bash
opencode --pure --agent atenea-volume
opencode --pure --agent atenea-complex
```

Herdr may keep the session/process persistent; it is not product/correctness authority.

## Profile selection

Use `volume` by default.

Use `complex` at a clean work boundary when the accepted work has material risk such as:

- difficult patient/file state ordering or concurrency;
- clinically meaningful temporal/longitudinal semantics;
- cross-cutting architecture or strongly coupled cross-file semantics;
- material privacy/auth/tenancy/trust-boundary risk;
- delicate migration/back-compat invariants;
- repeated semantic failure showing ordinary assurance is insufficient.

File count, ticket length, many tests, ordinary UI work or business importance alone are not triggers.

Do not silently switch models inside an active work unit because of quota or convenience.

## Matt ownership and bounded correction

Matt owns `implement`, `implement-spec`, TDD when applicable, task graph/frontier, implementer worktrees, integration/merger flow and Standards/Spec review method.

When Matt names a role, use the exact project-local `atenea-*` binding above. If review finds actionable defects, use **one** fresh correction agent from the selected profile and rerun focused deterministic evidence. If a blocker/new material problem remains, HUMAN STOP.

## Project-specific assurance

First line is repo-native deterministic evidence. The current regression suites under `tests/` are the authoritative executable checks for stabilized donor semantics.

Semgrep is conditional and should only be added when the changed artifact/risk benefits from static analysis. Deep OCR is selective for material security/privacy/state/concurrency/cross-file semantic risk; it is not routine per ticket.

No current C-083 task may call old Gentle ASSESS/RDD/4R/lineage/burn/OpenCode V1 flows.

## Publication

Review/audit does not grant push, PR, merge or deploy authority. Follow the accepted issue plus `AGENTS.md` and current human instruction.
