# PsO-Valme Coding Standards

These are stable project-local engineering guardrails. They do not define a second implementation/review workflow; adopted Matt skills own methodology when invoked.

## 1. Smallest coherent change

Change only what the accepted issue requires. Do not mix clinical behavior, QA-harness work, documentation, architecture cleanup and future PROMueve design unless the current WO explicitly composes them.

Avoid speculative abstractions, framework migration and broad refactors in this static donor prototype.

## 2. Preserve local architecture and vocabulary

Current supported product surfaces are static/local-first HTML plus synthetic CSV/XLSX fixtures and repo-local JSZip. V2 is the adjudicated dashboard donor baseline; V1 is historical reference and must not be casually removed.

Do not turn Valme into the PROMueve target architecture. Future Dermatology implementation belongs in `Hub-Clinico-Badajoz` under a separate authorized WO.

## 3. Clinical semantics are explicit

Never infer a clinical value because it is convenient for UI, parsing or tests.

- missing/blank/unknown stays missing/blank/unknown;
- a genuine completed zero remains representable as `0`;
- screening/recommendation is not clinician action;
- drug identity/history is not authority for dose/route/regimen/presentation/induction/duration;
- future data is never prior history;
- patient A state never hydrates/exports as patient B state.

If safe meaning is not documented, fail/stop rather than guess.

## 4. State, ordering and concurrency

When correctness depends on ordering/version/generation, encode the authority explicitly.

For file loading, the latest user-initiated request is authoritative. Stale success or stale failure must be side-effect free against a newer request.

For current-state analytics, establish eligible visit scope first, then the current row per patient, then apply current-state filters. Historical trend data must not redefine current state.

For temporal history, use normalized date semantics and never fall back to a future row.

## 5. Validate at boundaries and fail closed

Treat uploaded files and external values as untrusted until validated.

- compatible XLSX must satisfy the declared minimum schema;
- incompatible schema fails closed with an explicit reason;
- a failed load must not leave stale active state;
- invalid/blank dates stay invalid/blank;
- do not silently map alternate identifiers into `nusha` without explicit contract authority.

Preserve provenance/identity needed to explain input and failures.

## 6. Deterministic verification first

Use repo-native executable evidence before extra prose or LLM opinion. Tests must be capable of disagreeing with the implementation and should include adversarial cases where risk is material.

For stale state, ordering, concurrency and repeated operations, prefer deterministic interleaving/barrier checks over timing sleeps.

Current repo has no package build/typecheck/lint authority; do not invent a generic build ceremony. Run the relevant `node tests/*.test.js` suites, JSON/config parsing and artifact-specific checks justified by changed paths.

## 7. Dependencies and static portability

Dependencies must earn their cost. Preserve repo-local/offline behavior; do not add CDN/network dependencies for runtime functionality already vendored locally.

Do not introduce a package manager/build system solely to make this prototype look conventional.

## 8. User-facing behavior

Use supported interactions as QA evidence. Do not prove a UI fix by DOM mutation, readonly override, impossible state or fixture manipulation that a real user cannot perform.

Preserve semantic controls, keyboard operability, visible focus and explicit error/state messaging when touching UI.

## 9. Security and data

Use only synthetic/demo data in committed artifacts and tests. Never commit real patient data, credentials, provider keys or secret-bearing runtime state.

Do not broaden external tool access to real clinical sources from this repository.

## 10. Reproducible configuration and publication

Execution/routing that affects behavior belongs in versioned project-local configuration. C-083 runs OpenCode with `--pure`; do not rely on old global Gentle plugins or hidden per-user routing state.

Before publication, validate the actual artifact types changed, verify exact candidate HEAD and re-read publication authority. Push/PR/merge/deploy are distinct boundaries.
