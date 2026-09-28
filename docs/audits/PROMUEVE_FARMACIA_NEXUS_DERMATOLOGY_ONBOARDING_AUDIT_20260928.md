# Auditoría de onboarding — Farmacia live + Nexus/Foundation para el futuro módulo Dermatología

**Fecha:** 2026-09-28
**WO:** DERMA-READ-01B (GitHub issue #4, parent train #1)
**Repositorio de escritura:** `b32majus/Hub-Clinico-PsO-Valme`
**Repositorio auditado (READ ONLY):** `b32majus/Hub-Clinico-Badajoz`
**Modo:** read-only externo; sin escritura de ningún tipo en `Hub-Clinico-Badajoz`
**Datos:** exclusivamente sintéticos/públicos
**Estado:** `DONE_VERIFIED` (auditoría documental factual)

---

## 0. Alcance, método y reglas de evidencia

**Pregunta que responde esta auditoría:** ¿qué seams de Farmacia y de PROMueve Nexus/Foundation
puede depender Dermatología **hoy**, cuáles serían ficción arquitectónica si se asumieran como
implementados, y qué debe evitarse copiar de Farmacia?

**Método:** verificación GitHub live (API + `git ls-remote`) + clon throwaway **fuera** del worktree
(`/srv/kairos-lab/tmp/pso-valme-train-a-20260928/Hub-Clinico-Badajoz-readonly`), lectura live de
`docs/INDEX.md` y `docs/ops/WORK_ORDER_STATUS.md`, seguimiento del índice al Architecture Decision
Freeze / Foundation Plan y a los documentos Farmacia recovery/status/spec/debt, e inspección del
código/runtime Farmacia y plataforma realmente publicado. Los oráculos Farmacia relevantes se
ejecutaron sobre ese checkout para confirmar que las rutas declaradas `IMPLEMENTED` operan.

**Reglas aplicadas:**
- GitHub live > documentos locales históricos. Código publicado > prosa de roadmap.
- Se distingue `exists in code` / `wired` / `visible` / `supported interaction` / `published` /
  `demo` / `pilot` / `future`.
- Una decisión de freeze **no** implementa un seam. Toda clasificación `IMPLEMENTED` se respalda con
  una ruta de código/runtime inspeccionada, no solo con un documento de diseño.
- `KNOWN_LEGACY` / `NON_GOLDEN` y la deuda aceptada no son contrato ni aceptación.
- Esta WO **no** modifica PROMueve, no rediseña Farmacia/Reuma, no propone paciente universal,
  form builder, rule engine, backend ni FHIR/openEHR, y **no** infiere clínica en el handoff
  Dermatología→Farmacia.

---

## 1. Baseline live verificado y fuentes usadas

| Elemento | Valor verificado live |
|---|---|
| Repositorio externo | `b32majus/Hub-Clinico-Badajoz` (público, `archived=false`, `fork=false`) |
| Rama por defecto | `main` |
| `origin/main` HEAD | `a25cccb8e5a9b90558c462b3e3b96d823f87cb68` (**stale**; sin `docs/INDEX.md`) |
| Rama canónica activa | `promueve/nexus-v4` (**ACTIVE** desde PR #381) |
| Tip Git live de la rama canónica | `b5028ecdd4c0cb5e3385352c6028d9a48ef4b41d` — *Merge PR #437: reconcile published D007 closure*; **documentation-only** (`docs/INDEX.md`, `docs/ops/NEXUS_DEBT_REGISTER.md`, `docs/ops/PROMUEVE_FOUNDATION_TRAIN_PLAN_20260924.md`, `docs/ops/WORK_ORDER_STATUS.md`) |
| Último HEAD de producto Nexus | `e17512384b96fc361668202cdbec5e09022614ff` — merge PR #435 (NEXUS-DEBT-007 hardening; F5.3 sigue pendiente) |
| Último train clínico publicado | TRAIN-NEXUS-CLINICAL-STRANGLER-05 (#426); PR #430 candidate `988c2089d1dfa34d5bd1d74b606b410e6e79903c` → merge `10422f4e5b7578dbbb17af17e3b953b5501eb4b2` |
| Línea Farmacia de procedencia | `recovery/farmacia-pr-replay-20260727` (**HISTORICAL** para nuevo desarrollo desde PR #381) |
| Tip Git live de `recovery` | `a8cec03522017a1f4b68e18b92c944601659c84f` (administrativo/doc posterior a PR #374) |
| Último HEAD de producto Farmacia publicado | `771fb80c5081aa974b86d6a0119ab30059970a25` — merge PR #374 |
| HEAD clínico funcional congelado | `e1120ba85817a1807cea8c1e938867ad778921f4` (PR #341; source/last-functional de Cáceres 0.6) |
| Snapshot estable | `CÁCERES-REVIEW-0.6`; manifest source/last-functional `e1120ba8…` |
| PR abierto relevante | #439 `docs/promueve-sil-product-review-438-20260928` (auditoría de producto Sil, abierta; documentación) |
| Madurez asistencial | Evaluación/demo sintética; **no piloto / no producción** |

**Comprobaciones de verificación:**
- `gh api repos/b32majus/Hub-Clinico-Badajoz` → `default_branch=main`, `archived=false`.
- `git ls-remote --heads` → `promueve/nexus-v4=b5028ec…`, `recovery/farmacia-pr-replay-20260727=a8cec035…`.
- `gh api .../pulls/430,435,437` → #430 y #435 `merged`; #437 `merged` documentation-only; #439 `open`.
- Clon throwaway + `git fetch/reset --hard FETCH_HEAD` sobre `promueve/nexus-v4`.
- Oráculos ejecutados en el clon: `farmacia_patient_read_contract_v2_check.mjs` **22/22 PASS**,
  `farmacia_patient_read_facade_v2_check.mjs` **18/18 PASS**, `farmacia_eorden_parser_check.mjs`
  **180/0 PASS**, `farmacia_eorden_producer_check.mjs` **35/0 PASS**,
  `nexus_home_navigation_check.mjs` **11/0 PASS**.
- `nexus_home_check.mjs` y `deployment_manifest_check.mjs` requieren `npm ci` (dependencia `ajv`) no
  instalada en el clon throwaway; su evidencia publicada se cita como CI documentado, no como
  ejecución local de esta auditoría.

**Documentos autoridad leídos live en `promueve/nexus-v4`:** `docs/INDEX.md`,
`docs/ops/WORK_ORDER_STATUS.md`, `docs/architecture/PROMUEVE_ARCHITECTURE_DECISION_FREEZE_20260924.md`,
`docs/architecture/adr/ADR-004/005/006`, `docs/ops/PROMUEVE_FOUNDATION_TRAIN_PLAN_20260924.md`,
`docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260908.md`, `docs/ops/FARMACIA_DEBT_REGISTER.md`,
`docs/specs/SPEC_FH_UNIFIED_CLINICAL_INTAKE_V0.md`, `docs/plantilla_solicitud_dermatologia.html`.

---

## 2. Matriz `IMPLEMENTED` vs `DOCUMENTED_DECIDED` vs `PLANNED` vs `NOT_FOUND`

Clases exactas: `IMPLEMENTED`, `DOCUMENTED_DECIDED`, `PLANNED`, `NOT_FOUND`.
`IMPLEMENTED` exige ruta de código/runtime inspeccionada.

### A. Estado de la plataforma Nexus

| Ítem | Clase | Evidencia / matiz |
|---|---|---|
| platform/home shell | `IMPLEMENTED` | `nexus_home.html`; `modules/home/home-bootstrap.js`, `home-page.js`, `home-renderer.js`; F3.2 #404 y F3.3/F3.4 #415 publicados. Shell sin carga clínica. |
| module registry / navigation | `IMPLEMENTED` | `data/platform/home/module-registry.json` (`farmacia`→`farmacia_index.html`, `reuma`→`index.html`); `PlatformContext.getModuleRoute`; navegación click-time; `tools/nexus_home_navigation_check.mjs` 11/0. |
| fixed site/deployment identity | `IMPLEMENTED` (sintético) | `data/platform/home/deployment-profile.json` (`siteId: BAD`, `deploymentId`), `modules/platform/configuration-repository.js`; ADR-003. Solo fixture sintético; no identidad hospitalaria real. |
| hospital×module qualification | `IMPLEMENTED` (infra) + `PLANNED` (evidencia real) | Gate existe: `data/platform/home/module-readiness.json` (`qualificationState`), Home no navega módulos no `available`; ADR-003 §3.6. Cualificación real hospital×módulo = F7 pendiente; Reuma se apoya en evidencia **sintética** ("not a real hospital qualification"). |
| shared PlatformContext/config contracts | `IMPLEMENTED` | F3.1 #400; `modules/platform/configuration-repository.js`, `modules/platform/platform-context.js`; schemas `schemas/deployment/*.schema.json`. |
| release/manifest behavior | `IMPLEMENTED` (sintético) | `data/platform/home/deployment-manifest.json` (generado por `tools/deployment_manifest_build.mjs`); F3.4 `tools/home_release_build.mjs`/`home_release_check.mjs`. Release hospitalaria institucional = `PLANNED`/`SES_DECISION`. |
| cross-module patient/context behavior | `NOT_FOUND` (rechazado por diseño) | ADR-002 §3.7 / Freeze §3.7: la shell no transporta paciente/historia/workbook/cohorte. No existe código de paciente compartido. |
| current canonical Git authority / transition | `IMPLEMENTED` (proceso) | `promueve/nexus-v4` **ACTIVE** / `recovery` **HISTORICAL** desde PR #381; tip live `b5028ec…`, product HEAD `e175123…`. |

### B. Seam de lectura/datos de Farmacia

| Ítem | Clase | Evidencia / matiz |
|---|---|---|
| Fuente de paciente/datos real usada por runtime | `IMPLEMENTED` | `FarmaciaApplicationDataPort` (`scripts/farmacia_application_data_port.js`) sobre `FarmaciaRawExcelDataSource` (`scripts/farmacia_raw_excel_data_source.js`), alimentado desde el read model de `FarmaciaBridgeV2Reader.readWorkbook`; se cablea al importar en `scripts/farmacia_common.js` (≈L2571). En memoria, sin workbook crudo en el puerto de aplicación. |
| Unified Clinical Intake (fronteras + provenance/guards) | `IMPLEMENTED` | `scripts/fh_intake_segmenter.js`, `fh_eorden_parser.js`, `fh_presalud_parser.js`, `fh_intake_pipeline.js`, `fh_intake_apply.js`, `fh_intake_review_ui.js`; montado en `farmacia_validacion.html`. Spec `SPEC_FH_UNIFIED_CLINICAL_INTAKE_V0.md` publicada. |
| Read Port / DTO seam (actual o planeado) | `IMPLEMENTED` (F4.1) | `scripts/farmacia_patient_read_contract_v2.js` (`contract_version 2.0.0`, envelope `ok/not_found/ambiguous/unavailable/error`, `forbidden keys` físicas). Migración restante de consumidores = `PLANNED` (F4.3). |
| Async read facade + commit capability | `IMPLEMENTED` (F4.2) | `scripts/farmacia_patient_read_facade_v2.js`; cableada en `scripts/farmacia_index.js` (búsqueda por CIP) con fallback legacy; commit delegado en `scripts/farmacia_patient_flow_runtime.js`. |
| Excel/local vs dato conceptual de aplicación | `IMPLEMENTED` (separación) | El DTO prohíbe claves físicas (`canonical_row`, `rows`, `workbook`, `bytes`, `storage`…). Excel es adapter, no dominio (ADR-006). Reimport/roundtrip confirma copia observada, no copia más reciente. |
| Acoplamiento directo a storage a evitar | `IMPLEMENTED` (deuda abierta) | Envelope clínico en `sessionStorage` (`scripts/farmacia_current_patient_session.js`); `FH-DEBT-001` **OPEN** (P1 antes de piloto). Ledger `localStorage` retirado por PR #231. |

### C. Seam de escritura/acto de Farmacia

| Ítem | Clase | Evidencia / matiz |
|---|---|---|
| Frontera solicitado ≠ validado | `IMPLEMENTED` | `scripts/fh_intake_apply.js` escribe solo conceptos de solicitud con decisión explícita; la validación terapéutica permanece separada; adapters de export v2 de Validación/Primera Visita/Seguimiento. |
| Comportamiento actual de escritura/export | `IMPLEMENTED` (transporte) | `FarmaciaExportV2Core` (`scripts/farmacia_export_v2_core.js`, `2.0.0-draft.1`, fila TSV de 152 columnas) + adapters (`farmacia_export_v2_*_adapter.js`) + `farmacia_excel_row_export.js`. Es **proyección de transporte**, no acto conceptual. |
| Contract de acto clínico completo (Pharmacy Act, F4.4) | `PLANNED` (`CONTRACT_PENDING`) | Foundation F4.4 no ejecutada; ADR-005 fija el envelope conceptual pero el DTO/schema/firma exactos no existen. |
| Semántica de resultado de entrega | `NOT_FOUND` (solo arquitectura) | `prepared_for_transfer` / `persisted` / `already_recorded` / `conflict` / `rejected` / `outcome_unknown` aparecen **solo en docs** (Freeze §6.4, ADR-005/006); grep en runtime (`*.js/*.html/*.mjs`, fuera de `docs/`) = 0 coincidencias. F4.5 `PLANNED`. |
| Propiedad que debe permanecer Farmacia | `IMPLEMENTED` | Catálogo local/CIMA, validación farmacoterapéutica, líneas/tratamiento, evaluación prebiológica, reconciliación Enfermería↔FH por `solicitud_id`, forma de la fila v2. |

### D. Seam inter-módulo Dermatología ↔ Farmacia

| Ítem | Clase | Evidencia / matiz |
|---|---|---|
| Contrato de transporte hoy | `IMPLEMENTED` | Texto e-Orden `D17`/`D17_EXT_V1` (`SOLICITUD DERMATOLOGÍA → FARMACIA - <Título>` + bloque `PROGRAMA SES` + `EXTENSIÓN CLÍNICA DERMATOLOGÍA V1`); reconocido por `scripts/fh_intake_segmenter.js` y `scripts/fh_eorden_parser.js`. |
| Producer Dermatología | `IMPLEMENTED` como **UI/plantilla suelta** | `docs/plantilla_solicitud_dermatologia.html` (`exportSolicitud()` emite el contrato D17_EXT_V1; CIP-only identity). **No** es un módulo Nexus: no hay `moduleId` Derma en `module-registry.json`. |
| Parser/consumidor Farmacia | `IMPLEMENTED` | `scripts/fh_eorden_parser.js` (180/0), `fh_presalud_parser.js`, `fh_intake_apply.js`; UI en `farmacia_validacion.html`. |
| Presentación/provenance segura | `IMPLEMENTED` | `scripts/fh_intake_presentation_context.js` (auto-reveal servicio Dermatología/patología solo con coherencia explícita SES↔patología); `scripts/fh_intake_ses_program.js` (allowlist cerrada de 5 programas). |
| Estados/acciones no inferibles cruzando la frontera | `IMPLEMENTED` (por ausencia de contrato) | Farmacia no devuelve a Dermatología validación, dispensación, creación de línea, cambios de tratamiento ni causalidad. No existe canal inverso. |
| Contrato bidireccional | `NOT_FOUND` (trabajo futuro) | Solo existe Dermatología→Farmacia (transporte) y Enfermería→Farmacia. La bidireccionalidad Derma↔Farmacia no está diseñada ni cualificada. |

### E. Invariantes de seguridad clínica (autoridad actual)

| Invariante | Clase | Evidencia |
|---|---|---|
| solicitado ≠ validado | `IMPLEMENTED` | `scripts/fh_intake_apply.js`; `farmacia_export_v2_validation_adapter.js`; `WORK_ORDER_STATUS` §Garantías. |
| ausencia ≠ NO (nunca limpia) | `IMPLEMENTED` | `fh_intake_apply.js` (`STATE_NO_PROPOSAL`, `NO_VALUE`/`target NONE` no borran); parser `can_apply=false`. |
| catálogo/CIMA/nombre/historial no infieren dosis/vía/pauta/presentación/inducción/duración | `IMPLEMENTED` | `fh_eorden_parser.js` (sin catálogo/CIMA, sin fuzzy); `fh_presalud_parser.js` (sin CIMA); `fh_intake_ses_program.js` (tabla cerrada). |
| parser/preview ≠ apply | `IMPLEMENTED` | `fh_intake_pipeline.js`/`fh_intake_apply.js` (`can_apply=false`; gates de identidad/asociación separados). |
| valores existentes protegidos | `IMPLEMENTED` | `fh_intake_apply.js` (`PROTECTED_EXISTING`, `ALREADY_MATCHES_CURRENT`). |
| compuestos/serologías combinadas no se trocean | `IMPLEMENTED` | `fh_intake_apply.js` (`derma_viral_serologies` permanece `NONE/NO_PROPOSAL`); `fh_eorden_parser.js` conserva detalles compuestos (`da_detalle`, `pso_detalle`). |
| mismo identificador de paciente no colapsa actos distintos | `IMPLEMENTED` (Farmacia) | `scripts/farmacia_common.js` (`solicitud_id` exacto; `RECONCILIATION_CONFLICT` fail-closed); `farmacia_index.js`; DTO con `patient_id` + `identifiers` + `event_ids`. |

### F. Implicaciones de onboarding (mínimas, sin diseñar el módulo)

| Ítem | Clase | Evidencia / matiz |
|---|---|---|
| Dermatología como módulo Nexus | `NOT_FOUND` | No existe `moduleId` Derma; Freeze §15/§7: una plantilla no equivale a módulo. |
| Engine de configuración reutilizable | `NOT_FOUND` / `DEFERRED` | Freeze §4.2/§12 rechaza form builder y rule engine en Foundation; config clínica Reuma hard-coded. |
| Cualificación real multi-site | `PLANNED` (F7) | Infra publicada; cada hospital×módulo requiere evidencia propia. |
| Lifecycle de estado de navegador / vendor | `PLANNED` (F6) | Antes de piloto; Reuma aún depende de CDN (contradice `offline-capable` declarado). |

---

## 3. Mapa de flujo de datos Farmacia (lectura / escritura / handoff)

```text
LECTURA (Farmacia)
  Workbook Excel (Bridge v2 raw)
    └─ FarmaciaBridgeV2Reader.readWorkbook            scripts/farmacia_bridge_v2_reader.js
         └─ read model en memoria
              └─ FarmaciaRawExcelDataSource             scripts/farmacia_raw_excel_data_source.js
                   └─ FarmaciaApplicationDataPort        scripts/farmacia_application_data_port.js
                        └─ FarmaciaPatientReadContractV2 scripts/farmacia_patient_read_contract_v2.js
                             (DTO sin detalle físico; ok/not_found/ambiguous/unavailable/error)
                             └─ FarmaciaPatientReadFacadeV2  scripts/farmacia_patient_read_facade_v2.js
                                  (supersesión async + commit capability delegada)
                                  └─ commit → FarmaciaPatientFlowRuntime applySelection
                                       └─ FarmaciaCurrentPatientSession (sessionStorage envelope)  ← deuda FH-DEBT-001
                                  └─ consumidor visible: búsqueda por CIP en farmacia_index.html

ESCRITURA / ACTO (Farmacia)
  Validación / Primera Visita / Seguimiento (casos de uso independientes)
    └─ formularios farmacia_*.html
         └─ FarmaciaExportV2Core (+ adapters)  → fila TSV 152 columnas  (proyección de transporte)
              └─ farmacia_excel_row_export.js   → portapapeles/descarga / pegado manual
    [FALTA] Pharmacy Act F4.4 (PLANNED) y delivery result semantics F4.5 (NOT_FOUND en runtime)

HANDOFF Dermatología → Farmacia (único canal existente)
  docs/plantilla_solicitud_dermatologia.html  (UI/plantilla suelta; NO módulo Nexus)
    └─ exportSolicitud() → texto D17_EXT_V1  (SOLICITUD DERMATOLOGÍA → FARMACIA … + PROGRAMA SES)
         └─ [copia/pegado humano]
              └─ farmacia_validacion.html: fh_intake_review_ui.js
                   └─ fh_intake_segmenter.js → fh_eorden_parser.js / fh_presalud_parser.js
                        └─ fh_intake_pipeline.js (reconciliación + provenance)
                             └─ fh_intake_apply.js (preview → confirmación profesional → apply)
                                  → requested treatment (nunca validated)
```

**Nota de frontera:** el handoff es **unidireccional** y de **texto**. Farmacia no devuelve ningún
resultado clínico a Dermatología. No hay paciente/contexto transportado por la shell Nexus.

---

## 4. Tabla de seams

| seam | current maturity | Dermatology implication | owner | evidence path |
|---|---|---|---|---|
| Home shell + navegación por módulo | `IMPLEMENTED` (sintético) | Derma se registra como módulo y se entra por tile; sin paciente en la shell | Core/Platform | `nexus_home.html`; `modules/home/home-renderer.js`; `tools/nexus_home_navigation_check.mjs` |
| `module-registry` / deployment profile | `IMPLEMENTED` (sintético) | Añadir descriptor Derma; no incrustar hospital en el módulo | Core/Platform | `data/platform/home/module-registry.json`; `modules/platform/configuration-repository.js` |
| PlatformContext (site/módulo/ruta) | `IMPLEMENTED` | Lecturas read-only; fail-closed ante ruta/módulo desconocido | Core/Platform | `modules/platform/platform-context.js`; `docs/engineering/PLATFORM_CONTEXT_API.md` |
| Gate de qualification hospital×módulo | infra `IMPLEMENTED`; evidencia real `PLANNED` (F7) | Derma debe planificar su qualification; no asumir disponibilidad por existir en repo | Platform/Site | `data/platform/home/module-readiness.json`; ADR-003; Foundation F7 |
| Release manifest sintético | `IMPLEMENTED` (sintético) | Derma hereda el formato de manifest cuando exista módulo; release hospitalaria es SES | Core/Release | `tools/home_release_build.mjs`; `tools/home_release_check.mjs`; Freeze §9 |
| Paciente compartido entre módulos | `NOT_FOUND` (DEFERRED) | Derma **no** debe esperar handoff de paciente desde Shell/Nexus | Platform (decidido) | ADR-002 §3.7; Freeze §3.7 |
| Farmacia Application Data Port | `IMPLEMENTED` | Patrón de abstracción de fuente de módulo reutilizable como concepto | Farmacia | `scripts/farmacia_application_data_port.js`; `scripts/farmacia_raw_excel_data_source.js` |
| Read DTO v2 (F4.1) | `IMPLEMENTED` (22/22) | Patrón: DTO sin detalle físico, ausencia/error/provenance/completitud; Derma implementa su equivalente propio | Farmacia | `scripts/farmacia_patient_read_contract_v2.js`; `tools/farmacia_patient_read_contract_v2_check.mjs` |
| Async read facade (F4.2) | `IMPLEMENTED` (18/18) | Patrón: supersesión de peticiones + commit capability inyectada; Derma lo reproduce con su dominio | Farmacia | `scripts/farmacia_patient_read_facade_v2.js`; `tools/farmacia_patient_read_facade_v2_check.mjs` |
| Envelope de sesión de paciente | `IMPLEMENTED` con `FH-DEBT-001` OPEN | **No copiar**: persistencia de import clínico en `sessionStorage` sin política de piloto | Farmacia | `scripts/farmacia_current_patient_session.js`; `docs/ops/FARMACIA_DEBT_REGISTER.md` |
| Unified Clinical Intake (segmenter/parsers/reconciliación/apply) | `IMPLEMENTED` | Lado receptor del e-Orden; Derma es productor, Farmacia consumidor | Farmacia | `scripts/fh_intake_*.js`; `scripts/fh_eorden_parser.js`; `tools/farmacia_eorden_parser_check.mjs` |
| Contrato de transporte D17/D17_EXT_V1 | `IMPLEMENTED` producer + parser (35/0, 180/0) | **Seam seguro de apuntar ahora** para la primera vertical Psoriasis | Farmacia (parser) / Derma (producer) | `docs/plantilla_solicitud_dermatologia.html`; `scripts/fh_intake_segmenter.js`; `docs/specs/SPEC_FH_UNIFIED_CLINICAL_INTAKE_V0.md` §D17 |
| Allowlist cerrada de Programa SES | `IMPLEMENTED` | Derma selecciona explícitamente; sin inferencia ni fuzzy | Farmacia/Derma | `scripts/fh_intake_ses_program.js`; `scripts/fh_intake_presentation_context.js` |
| Export v2 core + adapters | `IMPLEMENTED` (`2.0.0-draft.1`) | Proyección de transporte; **no** usarla como modelo de dominio Derma | Farmacia | `scripts/farmacia_export_v2_core.js`; `schemas/farmacia_export_row_v2.schema.json` |
| Pharmacy Act / write contract (F4.4) | `PLANNED` (`CONTRACT_PENDING`) | **Esperar**: Derma no puede depender hoy de un contrato de acto Farmacia | Farmacia/Foundation | ADR-005; Foundation F4.4 |
| Delivery result semantics (`prepared_for_transfer`, `persisted`…) | `NOT_FOUND` (solo docs) | **Esperar**: no existe vocabulario runtime; asumirlo sería ficción | Farmacia/Foundation | Freeze §6.4; ADR-006; Foundation F4.5 |
| Guardas anti-inferencia catálogo/CIMA | `IMPLEMENTED` | Derma no debe inferir dosis/vía/pauta desde fármaco/CIMA/historial | Farmacia | `scripts/fh_eorden_parser.js`; `scripts/fh_presalud_parser.js` |
| Reconciliación por `solicitud_id` (Enfermería v6) | `IMPLEMENTED` | Patrón de identidad fuerte: mismo CIP con IDs distintos permanece independiente | Farmacia | `scripts/farmacia_common.js` (§reconciliación); `scripts/farmacia_index.js` |
| Módulo Dermatología en Nexus | `NOT_FOUND` | Derma no es módulo; plantilla ≠ módulo | Derma (futuro) | `data/platform/home/module-registry.json`; Freeze §15 |
| Config engine / form builder / rule engine | `NOT_FOUND` / `DEFERRED` | Derma define su modelo clínico propio; no hay engine que heredar | Foundation | Freeze §4.2 y §12 |
| Cualificación real multi-site | `PLANNED` (F7) | Esperar a necesidad real por hospital×módulo | Platform/Site | Foundation F7 |
| Lifecycle de estado / vendor policy | `PLANNED` (F6) | Antes de piloto; no asumir `offline-capable` real | Foundation | Foundation F6.1/F6.3 |

---

## 5. `SAFE_TO_TARGET_NOW`

Seams que Dermatología **puede** apuntar hoy (concepto/contrato ya publicado, sin asumir fiction):

1. **Registro y navegación de módulo en Nexus Home** (`module-registry` + `PlatformContext` + tile).
   Derma se registra con su `moduleId`/`entryPath`; la Home no transporta paciente.
2. **Identidad de deployment/site como artefacto validado** (concepto): el `siteId` es explícito en
   config, no un selector oculto ni un hardcode de página.
3. **Patrón Read DTO + facade async** (concepto, no código Farmacia): DTO libre de detalle físico,
   envelope de ausencia/error/ambigüedad/provenance/completitud y supersesión de peticiones.
4. **Contrato de transporte e-Orden D17/D17_EXT_V1 Dermatología→Farmacia**: el parser Farmacia está
   publicado y pasa 180/0; es el canal real de handoff de solicitud. Derma produce el texto, no
   escribe Farmacia.
5. **Selección explícita de Programa SES sobre allowlist cerrada** (código+denominación), sin
   inferencia ni fuzzy, como parte del contrato de solicitud.
6. **Invariantes de seguridad clínica** (solicitado ≠ validado; ausencia ≠ NO; parser/preview ≠
   apply; valores existentes protegidos; compuestos/serologías no troceados).
7. **Método oracle-first** con separación `ACCEPTANCE` vs `KNOWN_LEGACY`, y patrón de gate de
   qualification por módulo.
8. **Patrón de identidad fuerte por acto/solicitud** (`solicitud_id` exacto; no colapsar mismo CIP).

---

## 6. `WAIT_FOR_FOUNDATION_OR_SEPARATE_WO`

Seams que **no** deben asumirse hoy (serían ficción arquitectónica):

1. **Pharmacy Act / contrato de acto clínico completo (F4.4)**: `PLANNED`/`CONTRACT_PENDING`. Derma no
   puede depender de una firma que no existe.
2. **Semántica de resultado de entrega (F4.5)**: `prepared_for_transfer`/`persisted`/… solo en
   documentos; **cero** en runtime. No asumir un adapter que declare persistencia.
3. **Contrato bidireccional Derma↔Farmacia**: no existe; cualquier devolución de validación o
   tratamiento a Derma es trabajo futuro con WO propia.
4. **Cualificación real hospital×módulo (F7)**: la infraestructura existe, pero la evidencia actual
   es sintética; Derma necesita su propia qualification.
5. **Lifecycle de estado de navegador y política de dependencias/vendor (F6)**: antes de piloto.
6. **Paciente universal / contexto compartido**: `DEFERRED` (ADR-002 §3.7). La Shell no lo provee.
7. **Engine de configuración / form builder / rule engine**: diferido/rechazado en Foundation; Derma
   define su dominio sin heredar engine.
8. **Migración de lectura Farmacia restante (F4.3)** y **writer boundary/acto Reuma (F5.3/F5.4)**:
   no bloquean una primera vertical Psoriasis conceptualmente, pero no deben declararse disponibles.
9. **Decisión de persistencia/seguridad de imports clínicos** (`FH-DEBT-001`, `OPEN`): Derma no debe
   copiar ni depender del envelope `sessionStorage` de Farmacia.

---

## 7. `DO_NOT_COPY_FROM_FARMACIA`

1. **Envelope clínico en `sessionStorage`** (`FarmaciaCurrentPatientSession`) como mecanismo de
   persistencia de import/paciente actual: superficie sin política de retención/borrado aprobada
   (`FH-DEBT-001`).
2. **Ledger clínico en `localStorage`** (ya retirado del runtime soportado por PR #231): patrón
   rechazado; no reintroducir.
3. **Fila de export v2 de 152 columnas / `FarmaciaExportV2Core` como modelo de dominio**: es
   proyección de transporte; el freeze rechaza tratar columnas Excel como acto conceptual.
4. **Hardcodes de catálogo/patología/campos/CIMA de Farmacia**: son de dominio Farmacia; Derma debe
   definir su diccionario y sus escalas propias.
5. **Inferencia desde fármaco/CIMA/nombre/historial**: prohibida por invariante; no copiar ningún
   atajo que la reintroduzca.
6. **Heurística de `importSource` (`isPharmacyAct`)**: string-matching de compatibilidad legacy;
   no es un contrato de identidad para Derma.
7. **Declaración de capability `offline-capable` sin runtime acreditado**: Reuma sigue dependiendo de
   CDN; no asumir capacidades declaradas como reales (F6.3).
8. **Acoplamiento directo de UI a `HubTools.data`/storage**: patrón legacy que el strangler está
   retirando; Derma debe nacer detrás de un Port.

---

## 8. Blockers y unknowns (decisión humana / producto posterior)

1. **No existe contrato de escritura Farmacia (F4.4)**: bloquea cualquier dependencia de Derma sobre
   un "acto Farmacia". Requiere WO Foundation separada.
2. **Semántica de `persisted`/`prepared_for_transfer` no implementada**: quién y cómo la acredita es
   una decisión de producto/seguridad pendiente.
3. **Identidad/custodia de paciente y uso de Web Storage**: `SES_DECISION` (Freeze §13). Derma no
   puede inventar su propio paciente universal.
4. **Fuente de verdad oficial y significado de "registrado"**: `SES_DECISION`.
5. **Ownership del producer e-Orden**: hoy es una plantilla HTML suelta en `docs/`, no un módulo;
   decidir si Derma lo integra como parte de su primer vertical o lo mantiene como artefacto.
6. **Qualification real de Dermatología por hospital**: requiere combinar site+módulo+evidencia (F7).
7. **Bidireccionalidad Derma↔Farmacia**: no diseñada; requiere decisión de producto y contrato.
8. **`FH-DEBT-001` abierto**: condiciona cualquier reutilización del flujo de sesión/import de
   Farmacia antes de piloto.
9. **Oráculos Farmacia F4.1/F4.2 no cableados en `verify:nexus`**: su evidencia es local/manual; no
   deben presentarse como gate determinista canónico hasta integrarse.
10. **Alcance de la primera vertical Psoriasis**: es objeto de `DERMA-DESIGN-01`, no de esta
    auditoría. No se decide aquí.

---

## 9. Respuestas directas A–F (resumen)

- **A. Nexus.** Home, registry/navegación, PlatformContext y release sintético están
  `IMPLEMENTED`; el gate de qualification existe pero su evidencia real es `PLANNED` (F7); no existe
  paciente compartido (`NOT_FOUND` por diseño); la autoridad Git canónica es `promueve/nexus-v4`
  (`ACTIVE`).
- **B. Lectura Farmacia.** Data Port + DataSource en memoria y Read DTO v2/facade async están
  `IMPLEMENTED` y cableados al runtime visible (búsqueda de Farmacia); el detalle físico está
  prohibido en el DTO; la persistencia de import en `sessionStorage` es deuda abierta y no debe
  copiarse.
- **C. Escritura Farmacia.** Solicitado vs validado está separado (`IMPLEMENTED`); el export v2 es
  transporte, no acto; el Pharmacy Act (F4.4) y la semántica de resultado de entrega (F4.5) son
  `PLANNED`/`NOT_FOUND` en runtime y no deben asumirse.
- **D. Handoff.** El único contrato es el texto e-Orden D17/D17_EXT_V1
  (Dermatología→Farmacia), con parser Farmacia publicado; la plantilla Derma es UI suelta, no módulo;
  no existe canal de vuelta.
- **E. Seguridad clínica.** Las invariantes están implementadas en el intake/parser/apply y en la
  reconciliación por `solicitud_id`; se documentan como frontera que Derma debe preservar.
- **F. Onboarding.** Derma puede apuntar ya al patrón de módulo/Nexus, al transporte e-Orden y a las
  invariantes de seguridad; debe esperar al acto de escritura Farmacia, a la qualification real, a
  F6 antes de piloto, y debe evitar copiar storage/export-columns/engine inexistente.

---

## 10. Veredicto y límite de esta WO

**Veredicto:** Dermatología puede depender **hoy** del patrón de módulo/navegación Nexus, del
contrato de transporte e-Orden D17/D17_EXT_V1 hacia Farmacia, del patrón Read DTO/facade (implementado
en Farmacia, reproducible en Derma) y de las invariantes de seguridad clínica. **No** puede depender
hoy de un contrato de acto/escritura Farmacia (F4.4), de la semántica `persisted`, de
bidireccionalidad, de qualification real hospital×módulo ni de paciente compartido: asumirlos sería
ficción arquitectónica. La próxima fase (`DERMA-DESIGN-01`) dispone de la distinción explícita entre
seams tomables y seams diferidos.

Esta auditoría **no modifica PROMueve**, no rediseña Farmacia/Reuma, no propone paciente universal,
form builder, rule engine, backend, migración ni FHIR/openEHR y no infiere clínica en el handoff.
Cualquier cambio en `Hub-Clinico-Badajoz` requiere WO propia, verificación live y autorización
explícita en el repositorio destino.

*El repositorio externo permaneció sin modificar: las refs remotas se re-verificaron idénticas al
cierre (`promueve/nexus-v4=b5028ec…`, `recovery/farmacia-pr-replay-20260727=a8cec035…`).*
