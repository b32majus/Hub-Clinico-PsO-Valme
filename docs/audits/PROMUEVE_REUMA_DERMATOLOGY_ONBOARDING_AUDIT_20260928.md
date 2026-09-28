# Auditoría de onboarding — patrones live de Reumatología para el futuro módulo Dermatología

**Fecha:** 2026-09-28
**WO:** DERMA-READ-01 (GitHub issue #3, parent train #1)
**Repositorio de escritura:** `b32majus/Hub-Clinico-PsO-Valme`
**Repositorio auditado (READ ONLY):** `b32majus/Hub-Clinico-Badajoz`
**Modo:** read-only externo; sin escritura en `Hub-Clinico-Badajoz`
**Datos:** exclusivamente sintéticos/públicos
**Estado:** `DONE_VERIFIED` (auditoría documental factual)

---

## 0. Alcance, método y reglas de evidencia

**Pregunta que responde esta auditoría:** ¿qué puede tomar Dermatología hoy de la Reumatología live,
qué debe esperar al strangler y qué debe permanecer propio de Dermatología, sin inferirlo de prosa
de roadmap?

**Método:** verificación GitHub live + clon throwaway **fuera** del worktree
(`/srv/kairos-lab/tmp/pso-valme-train-a-20260928/Hub-Clinico-Badajoz-readonly`), lectura de
`docs/INDEX.md` y `docs/ops/WORK_ORDER_STATUS.md` live, seguimiento del índice al Architecture
Decision Freeze / Foundation Plan y a las autoridades Reuma de lectura/export, e inspección del
código Reuma publicado. Ninguna afirmación material sobre PROMueve depende de un SHA recordado.

**Reglas aplicadas:**
- GitHub live > documentos locales históricos. Código publicado > prosa de roadmap.
- Se distingue `exists in code` / `wired` / `visible` / `supported interaction` / `published` /
  `demo` / `pilot` / `future`.
- `KNOWN_LEGACY` / `NON_GOLDEN` **no** es aceptación ni contrato.
- Tests/oráculos **no** equivalen a QA de navegador salvo evidencia de navegador encontrada.
- Esta WO **no** modifica PROMueve, no rediseña Reuma y no propone engine genérico.

---

## 1. Baseline live verificado

| Elemento | Valor verificado |
|---|---|
| Repositorio externo | `b32majus/Hub-Clinico-Badajoz` (público, `archived=false`, `fork=false`) |
| Rama por defecto | `main` |
| `origin/main` HEAD | `a25cccb8e5a9b90558c462b3e3b96d823f87cb68` (**stale**; sin `docs/INDEX.md`) |
| Rama canónica activa | `promueve/nexus-v4` (**ACTIVE** desde PR #381) |
| Tip Git live de la rama canónica | `b5028ecdd4c0cb5e3385352c6028d9a48ef4b41d` — *Merge PR #437: reconcile published D007 closure* (2026-09-28, **documentation-only**: solo `docs/INDEX.md`, `docs/ops/NEXUS_DEBT_REGISTER.md`, `docs/ops/PROMUEVE_FOUNDATION_TRAIN_PLAN_20260924.md`, `docs/ops/WORK_ORDER_STATUS.md`) |
| Último HEAD de producto Nexus | `e17512384b96fc361668202cdbec5e09022614ff` — merge PR #435 (NEXUS-DEBT-007) |
| Línea Reuma/Farmacia histórica | `recovery/farmacia-pr-replay-20260727` (**HISTORICAL**); último HEAD de producto `771fb80c5081aa974b86d6a0119ab30059970a25` |
| PR abierto relevante | #439 `docs/promueve-sil-product-review-438-20260928` (auditoría de producto Sil, abierta) |
| Snapshot estable | `CÁCERES-REVIEW-0.6`, source `e1120ba85817a1807cea8c1e938867ad778921f4` |
| Madurez asistencial | Evaluación/demo sintética; **no piloto / no producción** |

**Comprobaciones de verificación:**
- `gh api repos/b32majus/Hub-Clinico-Badajoz` → `default_branch=main`, `archived=false`.
- `git ls-remote --heads` + `gh api .../pulls/435,437,439`.
- Clon throwaway + `git log` / `git diff --stat b5028ec^1 b5028ec`.
- Refs remotas re-verificadas al cierre: `main=a25cccb8…`, `promueve/nexus-v4=b5028ec…` **sin cambios**
  (el repositorio externo permaneció intacto).

**Documentos autoridad leídos live en `promueve/nexus-v4`:** `docs/INDEX.md`,
`docs/ops/WORK_ORDER_STATUS.md`, `docs/architecture/PROMUEVE_ARCHITECTURE_DECISION_FREEZE_20260924.md`,
`docs/architecture/adr/ADR-002/004/005/006`, `docs/ops/PROMUEVE_FOUNDATION_TRAIN_PLAN_20260924.md`,
`docs/engineering/REUMA_READ_CHARACTERIZATION.md`, `docs/engineering/REUMA_EXPORT_KNOWN_LEGACY.md`,
`docs/ARQUITECTURA_FUNCIONAL_HUB_REUMA_V2_1.md`, `docs/CONTRATO_DATOS_REUMA_V2.md`.

---

## 2. Mapa de arquitectura y flujo de datos (conciso)

### 2.1 Entrada / navegación (pregunta A)

```text
PROMueve Nexus Home (nexus_home.html)
  └─ modules/platform/configuration-repository.js + platform-context.js
  └─ modules/home/home-*.js
        └─ module-registry.json  → { farmacia: farmacia_index.html, reuma: index.html }
        └─ deployment-profile.json → siteId BAD (synthetic demo)
        └─ module-readiness.json  → reuma: available=true, QUALIFIED_FOR_SITE (fixture sintético)
              │ click-time route resolution (PlatformContext.getModuleRoute)
              ▼
        index.html  (Reuma legacy home: session gate → cargar XLSX → seleccionar profesional)
              ├─ primera_visita.html
              ├─ seguimiento.html
              ├─ dashboard_search.html  ──┐
              ├─ dashboard_paciente.html ─┤ consumen ReumaPatientReadPort (F5.1)
              ├─ estadisticas.html        ┘ (estadísticas aún directas a HubTools.data)
              ├─ manage_drugs.html / manage_professionals.html
              └─ farmacia_index.html (enlace cruzado, no transporte de paciente)
```

- **Reuma ya está registrado como módulo Nexus** (`moduleId: reuma`, `entryPath: index.html`), pero
  la entrada sigue siendo una **superficie legacy completa** detrás del contrato Home.
- La **Home no transporta paciente/dataset**; el `siteId` es explícito en el deployment profile
  mientras `index.html` **hardcodea** "Hospital Universitario de Badajoz".
- La qualification de Reuma en el deployment actual es **sintética** ("not a real hospital
  qualification"), no una cualificación hospitalaria real (`F7` pendiente).

### 2.2 Modelo de configuración clínica (pregunta B)

No existe configuración declarativa de patologías/campos/scores/visibilidad en el código publicado.
Todo está **hard-coded**:

- patologías = lista literal de hojas `['ESPA','APS','AR','LES','SJOGREN']`;
- campos = mapa literal de alias (`FIELD_ALIASES`);
- visibilidad por patología = clases CSS + selectores en `formController` (`.espa-only`, `.aps-only`, …);
- scores/cutoffs = funciones y umbrales literales (`scoreCalculators.js`, `HubTools.dashboard.activityCutoffs`);
- reglas de derivación = condicionales en `dataManager`/`treatmentEventsManager`.

El freeze **prohíbe** construir form builder/rule engine genérico ahora; las fuentes históricas que
lo "planificaban" (v2.2) no son autoridad vigente.

### 2.3 Flujo de lectura (pregunta C)

```text
Hub_Clinico_Maestro.xlsx (y data/Hub_Clinico_Maestro_V2_DEMO.xlsx)
   └─ SheetJS XLSX.read + sheet_to_json            (modules/dataManager.js: loadDatabase)
        └─ appState.db { ESPA, APS, AR, LES, SJOGREN, Profesionales, Frmacos }
             ├─ sessionStorage['hubClinicoDB']     (caché con truncado 100/30 visitas)
             └─ HubTools.data = { getAllPatients, findPatientById, getPatientHistory,
                                   getPoblacionalData, getFarmacosPorTipo, … }
                  ├─ ReumaPatientReadPort (scripts/reuma_patient_read_port.js)  ← F5.1 IMPLEMENTADO
                  │     ├─ listPatients()       ← script_dashboard_search.js
                  │     └─ readPatientBundle()  ← script_dashboard.js
                  └─ consumidores directos aún NO migrados (F5.2 pendiente):
                        script_primera_visita.js, script_seguimiento.js,
                        script_estadisticas.js, script.js (quick view en index.html)
```

- **Read Port implementado:** `ReumaPatientReadPort` es un wrapper async **delegante** sobre
  `HubTools.data`, con envelope congelado `ok | unavailable | not_found | ambiguous | error`, copia
  profunda y freeze. No escribe `sessionStorage` ni inventa contenido clínico.
- **Parser/storage NO extraídos:** ADR-004 dice "primero envolver `HubTools.data`; extraer
  parser/storage después". Eso sigue **pendiente**.
- **Semántica observable:** `getPatientHistory` fusiona filas de las 5 hojas por `ID_Paciente`,
  normaliza, ordena descendente por `parseVisitDate`, `latestVisit=visits[0]`, `firstVisit=último`.
  La provenance se limita a `pathology` (nombre de hoja en minúsculas) + spread del registro crudo.

### 2.4 Flujo de escritura/export (pregunta D)

```text
formularios primera_visita.html / seguimiento.html
   └─ modules/exportManager.js
        └─ generarFilaCSV_<Patología>_<PrimeraVisita|Seguimiento>() → fila de 497 campos
             └─ exportarYCopiarCSV() → portapapeles / descarga (copia manual)
                  └─ el profesional pega la fila en el Excel (no hay persistencia de aplicación)
```

- `FINAL_V2_EXPORT_COLUMN_COUNT = 497` con bloques legacy 220 / histórico 321 (evidencia:
  `modules/exportManager.js:34-36`, `REUMA_EXPORT_KNOWN_LEGACY.md`).
- La longitud se valida **solo con `console.warn`** (`validateExportRowLength`); no bloquea.
- El freeze (`§6.2`, `ADR-005`) declara la fila 152/497 como **proyección/compatibilidad de
  transporte, no acto clínico conceptual**; `guardarFilaExcel()` como intención de aplicación está
  rechazado.

### 2.5 Dashboards / longitudinal (pregunta E)

- `dashboard_search.html` → búsqueda de paciente (migrada a `ReumaPatientReadPort.listPatients`).
- `dashboard_paciente.html` → dashboard longitudinal del paciente: timeline, gráficos de índices,
  historial de tratamiento, tabla de visitas (migrado a `readPatientBundle`).
- `estadisticas.html` → dashboard poblacional (`HubTools.data.getPoblationalData`), **sin migrar**.
- `treatmentEventsManager.js` / `extractKeyEvents` derivan eventos (cambio de tratamiento, flares)
  comparando visitas.

### 2.6 Calidad operativa (pregunta F)

- **Oráculos deterministas Reuma** integrados en `npm run verify:nexus`:
  `check:reuma:read`, `check:reuma:export-harness`, `check:reuma:export`
  (`tools/reuma_read_acceptance_check.mjs`, `tools/reuma_export_acceptance_check.mjs`,
  `tools/reuma_patient_read_port_check.mjs`).
- **QA de navegador** del vertical migrado existe como herramienta
  (`tools/reuma_read_vertical_browser_check.mjs`), pero **no** está cableada en `verify:nexus` y
  depende de CDN alcanzable (XLSX, Chart.js).
- **Dependencias de runtime:** las páginas Reuma cargan SheetJS/FontAwesome/Chart.js desde **CDN**;
  solo Farmacia y las herramientas usan `vendor/sheetjs`.
- **Defectos semánticos preservados explícitamente** como `KNOWN_LEGACY / NON_GOLDEN`:
  K1–K8 (`REUMA_READ_CHARACTERIZATION.md`) y 1–5 (`REUMA_EXPORT_KNOWN_LEGACY.md`).

---

## 3. Respuestas directas A–F

- **A. Frontera módulo/dominio.** Reuma se entra desde la Home Nexus por `moduleId=reuma → index.html`
  o directamente a `index.html`. Reuma-específico: hojas por patología, 497 columnas, scores
  BASDAI/DASDAI/DAPSA/SLEDAI/ESSDAI, bloques prebiológicos. Compartido: `hubTools`/`utils`/
  `customSelect`, contrato Home/registro/readiness. **Hoy Reuma se comporta como superficie legacy
  registrada como módulo, no como workspace de módulo con contratos propios.** El contexto
  implícito es sesión+Excel+`sessionStorage`; el `siteId` es implícito en Reuma y explícito en Home.
- **B. Configuración clínica.** No hay modelo declarativo; todo es hard-coded. No existe engine
  reutilizable, y el freeze difiere su construcción. Lo aprovechable para Dermatología es el
  **concepto** de separar patología/campos/visibilidad/scores, no su implementación Reuma.
- **C. Read path.** Fuente Excel + SheetJS + `appState` en memoria + caché `sessionStorage`;
  consumidores `HubTools.data`. Acoplamiento directo al almacenamiento que Nexus decidió envolver
  (strangler). El **Read Port async está implementado y publicado** (F5.1); la extracción de
  parser/storage (F5.2/F5.3) y el acto/contrato de escritura (F5.4) **no** lo están.
- **D. Write/export.** La frontera de 497 columnas es transporte de compatibilidad con validación
  warn-only y pegado manual; no debe copiarse como arquitectura de dominio. No existe todavía
  contrato de acto Reuma ni writer encapsulado (F5.3/F5.4 pendientes).
- **E. Dashboards/longitudinal.** El dashboard de paciente (timeline/historial) y el poblacional son
  patrones UX/producto reutilizables, pero su data-shape depende de campos y semánticas Reuma; el
  vertical búsqueda+historia ya está migrado al Port y el poblacional aún no.
- **F. Calidad operativa.** Oráculos deterministas Reuma publicados y en gate; QA de navegador del
  vertical existe como tool no gateada; dependencia CDN contradice la capability `offline-capable`
  declarada; F6.1/F6.3 pendientes; defectos K1–K8 y 1–5 preservados como no-golden.

---

## 4. Matriz de reutilización

Clases permitidas (exactas): `REUSE_CONCEPT`, `REUSE_AFTER_STRANGLER`, `DERMA_OWN_DOMAIN`,
`LEGACY_DO_NOT_COPY`, `PLANNED_NOT_IMPLEMENTED`.

| pattern | actual state | reuse class | reason | evidence path |
|---|---|---|---|---|
| Registro de módulo y navegación Home sin paciente | published config; wired; visible (Home F3.2, synthetic) | `REUSE_CONCEPT` | Muestra cómo registrar/navegar un módulo sin transportar paciente ni dataset | `Hub-Clinico-Badajoz@promueve/nexus-v4:data/platform/home/module-registry.json`; `modules/home/home-renderer.js` |
| Home hospitalaria con `siteId`/deployment explícito | published config; synthetic demo | `REUSE_CONCEPT` | El sitio debe ser artefacto validado, no selector oculto | `data/platform/home/deployment-profile.json`; ADR-003; Freeze §3.5 |
| Gate de qualification hospital×módulo | infra published; solo evidencia sintética; F7 pendiente | `REUSE_CONCEPT` | Patrón de qualification; no existe qualification real que heredar | `data/platform/home/module-readiness.json`; Foundation F7; Freeze §3.6 |
| Sin paciente universal entre módulos | DECIDED | `REUSE_CONCEPT` | Derma debe definir su propio contexto de paciente | ADR-002; Freeze §3.7 |
| `index.html` como entrada Reuma legacy completa | exists; wired; visible | `REUSE_AFTER_STRANGLER` | UX de entrada reutilizable solo tras fijar frontera/contratos de módulo | `Hub-Clinico-Badajoz@promueve/nexus-v4:index.html`; `script.js` |
| Hardcode de hospital en página Reuma | exists in code | `LEGACY_DO_NOT_COPY` | Identidad de site incrustada no debe heredarse | `index.html` (título "Hub Clínico - Reumatología", "Hospital Universitario de Badajoz") |
| Lista de patologías como hojas literales | exists in code | `DERMA_OWN_DOMAIN` | Catálogo de patologías es de dominio; Reuma no aporta engine | `modules/dataManager.js` (`requiredSheets`, `getAllPatients`); `modules/fieldNormalizer.js` |
| Alias/canonicalización de campos | exists in code | `REUSE_CONCEPT` (idea) / `DERMA_OWN_DOMAIN` (campos) | Normalizar alias es útil; el diccionario Reuma no | `modules/fieldNormalizer.js` (`FIELD_ALIASES`, `normalizeRecord`) |
| Visibilidad de campos por patología vía CSS/selectores | exists; wired | `LEGACY_DO_NOT_COPY` | No es un modelo de configuración gobernado | `modules/formController.js` (`.espa-only`…`hideElementsBySelector`); `primera_visita.html` |
| Scores y cutoffs clínicos | exists; wired | `DERMA_OWN_DOMAIN` | BASDAI/DAPSA/SLEDAI/ESSDAI son Reuma-owned; Derma contrata sus PROs | `modules/scoreCalculators.js`; `modules/hubTools.js` (`activityCutoffs`) |
| Config declarativa de patologías / form builder / rule engine | NOT implemented; DEFERRED/REJECTED | `PLANNED_NOT_IMPLEMENTED` | Prohibido construir engine genérico prematuro | Freeze §4.2 y §12; `docs/ARQUITECTURA_FUNCIONAL_HUB_REUMA_V2_1.md` §8.2 (planned histórico) |
| Parser XLSX/SheetJS y filas-hoja en la app | exists; wired | `LEGACY_DO_NOT_COPY` | El soporte físico no debe definir el dominio; Derma necesita DTO/Port | `modules/dataManager.js` (`loadDatabase`, `sheet_to_json`) |
| Caché clínica en `sessionStorage` con truncado | exists; wired; KNOWN_LEGACY K1 | `LEGACY_DO_NOT_COPY` | Persistencia clínica lossy en cliente; F6.1 pendiente | `modules/dataManager.js` (`saveToSessionStorage`, `initDatabaseFromStorage`, límites `[100,30]`); `REUMA_READ_CHARACTERIZATION.md` K1 |
| Read Port async Reuma (wrapper) | implemented; published; wired; visible | `REUSE_AFTER_STRANGLER` | Envelope y guards son la superficie tomable; aún envuelve legacy | `scripts/reuma_patient_read_port.js`; `tools/reuma_patient_read_port_check.mjs`; Foundation F5.1 |
| Semántica de recuperación de historia (merge por paciente, orden desc) | implemented | `REUSE_AFTER_STRANGLER` (forma) / `DERMA_OWN_DOMAIN` (semántica clínica) | Forma longitudinal reutilizable; semántica temporal/ausencia no | `modules/dataManager.js` (`getPatientHistory`, `selectLatestVisitPerPatient`) |
| Fecha ausente → "hoy" | exists; KNOWN_LEGACY K3 | `LEGACY_DO_NOT_COPY` | Ausencia no debe convertirse en fecha actual | `modules/dataManager.js` (`parseVisitDate`); `REUMA_READ_CHARACTERIZATION.md` K3 |
| Fallback a `MockPatients` para ID desconocido | exists; KNOWN_LEGACY K8 | `LEGACY_DO_NOT_COPY` | Ausencia no debe enmascararse con demo | `modules/dataManager.js` (`findPatientById`/`getPatientHistory`); characterization K8 |
| Colapso `null`/`undefined`/`''` en campo canónico | exists; KNOWN_LEGACY K4 | `LEGACY_DO_NOT_COPY` | Ausencia vs vacío explícito debe seguir distinguiéndose | `modules/fieldNormalizer.js` (`getCanonicalField`); characterization K4 |
| Agregación poblacional `getPoblationalData` | exists; wired; visible; **no migrada** | `REUSE_AFTER_STRANGLER` | Patrón de cohorte útil tras migrar a Port (F5.2) | `modules/dataManager.js`; `scripts/script_estadisticas.js` |
| Extracción de parser/storage y migración de consumidores | planned; NOT implemented | `PLANNED_NOT_IMPLEMENTED` | ADR-004: envolver primero, extraer después | ADR-004; Foundation F5.2 |
| Export 497 columnas (TSV/CSV) | exists; wired; visible; transporte | `LEGACY_DO_NOT_COPY` | Compatibilidad de transporte, no acto clínico ni arquitectura Derma | `modules/exportManager.js` (`FINAL_V2_EXPORT_COLUMN_COUNT=497`, `generarFilaCSV_*`); `REUMA_EXPORT_KNOWN_LEGACY.md` |
| Validación de longitud 497 solo `console.warn` | exists; KNOWN_LEGACY (export 1) | `LEGACY_DO_NOT_COPY` | Un shape inválido no debe pasar silenciosamente | `modules/exportManager.js` (`validateExportRowLength`); `REUMA_EXPORT_KNOWN_LEGACY.md` §1 |
| Pegado manual como persistencia | exists; wired | `LEGACY_DO_NOT_COPY` | No es persistencia trazable ni acto | `modules/exportManager.js` (`exportarYCopiarCSV`); ADR-005/006 |
| Separación solicitado ≠ validado (patrón Farmacia) | implemented; published | `REUSE_CONCEPT` | Frontera de seguridad clínica a adoptar | `docs/ops/WORK_ORDER_STATUS.md` (garantías); Freeze §10; ADR-008 |
| Envelope de acto y vocabulario de resultado | DECIDED; detalles `CONTRACT_PENDING` | `REUSE_CONCEPT` | Inspira el diseño de acto Derma sin congelar firmas | Freeze §6.2/6.4; ADR-005 |
| Writer boundary Reuma (F5.3) y contrato de acto (F5.4) | planned; NOT implemented | `PLANNED_NOT_IMPLEMENTED` | No declarar implementado un seam futuro | Foundation F5.3/F5.4; Freeze §15 |
| Dashboard paciente longitudinal (timeline/historial) | exists; wired; visible; vertical migrado | `REUSE_CONCEPT` (UX) / `REUSE_AFTER_STRANGLER` (data) | Buena UX; los gráficos dependen de campos Reuma | `dashboard_paciente.html`; `scripts/script_dashboard.js` |
| Dashboard poblacional | exists; wired; visible; no migrado | `REUSE_AFTER_STRANGLER` | Reutilizable tras F5.2; hoy acoplado | `estadisticas.html`; `scripts/script_estadisticas.js` |
| Gráfico de actividad con escalas Reuma compartidas | exists; defecto conocido | `LEGACY_DO_NOT_COPY` | Derma debe fijar sus propias escalas | `scripts/script_dashboard.js`; `PSO_DASHBOARD_V1_V2_CHARACTERIZATION_20260928.md` §6.4 |
| Derivación de eventos longitudinales desde visitas | exists; wired | `REUSE_CONCEPT` | Patrón reutilizable si Derma modela eventos explícitos | `modules/treatmentEventsManager.js`; `modules/dataManager.js` (`extractKeyEvents`) |
| Oráculos deterministas de lectura/export + split acceptance/characterization | implemented; published; en gate | `REUSE_CONCEPT` | Método oracle-first con defectos no-golden es directamente adoptable | `package.json` (`verify:nexus`); `tools/reuma_read_acceptance_check.mjs`; `tools/reuma_export_acceptance_check.mjs` |
| QA de navegador del vertical Reuma | tool exists; **no** en gate; requiere CDN | `PLANNED_NOT_IMPLEMENTED` (como evidencia CI/soportada) | No equivale a test determinista; dependencia de red | `tools/reuma_read_vertical_browser_check.mjs`; `package.json` |
| Capability `offline-capable` declarada vs CDN runtime (Reuma) | declarado en config; contradicho en runtime | `LEGACY_DO_NOT_COPY` | No asumir que "offline" declarado es real | `data/platform/home/module-registry.json`; `index.html` (CDN XLSX); `dashboard_paciente.html` (Chart.js CDN) |
| Lifecycle de estado de navegador y política de vendor (F6.1/F6.3) | pending; NOT implemented | `PLANNED_NOT_IMPLEMENTED` | Requerido antes de piloto | Foundation F6.1/F6.3 |
| Defectos semánticos preservados K1–K8 y 1–5 | documented `KNOWN_LEGACY / NON_GOLDEN` | `LEGACY_DO_NOT_COPY` | No deben heredarse como contrato | `docs/engineering/REUMA_READ_CHARACTERIZATION.md`; `docs/engineering/REUMA_EXPORT_KNOWN_LEGACY.md` |

---

## 5. Gaps y blockers explícitos para Dermatology onboarding

1. **Dermatología no es un módulo.** No existe `moduleId` Derma en `module-registry.json`. El
   `docs/plantilla_solicitud_dermatologia.html` es una **plantilla/salida**, y el freeze establece que
   una plantilla no equivale a módulo habilitable. Falta workspace, contexto, contratos, capabilities
   y qualification.
2. **No hay engine de configuración que reutilizar.** La configuración clínica Reuma es hard-coded y
   el freeze difiere/rechaza form builder y rule engine. Derma debe definir su modelo de
   patología/visita/campo/visibilidad/scores como dominio propio, sin heredar un engine inexistente.
3. **El strangler de Reuma está incompleto.** F5.1 (Read Port wrapper) está publicado, pero F5.2
   (migración de consumidores y extracción de parser/storage) y F5.3/F5.4 (writer boundary y contrato
   de acto) siguen pendientes. No existe todavía un seam de parser/storage limpio que Derma pueda
   heredar.
4. **El borde de escritura no es arquitectura de dominio.** La frontera de 497 columnas es transporte
   de compatibilidad, con validación warn-only y pegado manual; copiarla como arquitectura Derma es
   un anti-patrón explícitamente rechazado por el freeze.
5. **Semántica clínica Reuma no transferible.** Patologías por hoja, 497 columnas, tokens
   `SI/NO/ND/NA`, bloques prebiológicos, scores BASDAI/DAPSA/SLEDAI/ESSDAI y los PROs presentes dentro
   de APs (PASI/BSA/LEI) son Reuma-owned. La psoriasis dermatológica debe modelarse como dominio
   Derma, no como hoja APs.
6. **Ausencia/tiempo defectuosos preservados.** K3 (fecha ausente → hoy), K4 (colapso vacío/ausencia),
   K8 (fallback a mock) siguen en el código legacy; no deben convertirse en contrato Derma.
7. **Capability `offline-capable` no acreditada en runtime Reuma.** Las páginas Reuma dependen de CDN
   (XLSX, Chart.js, FontAwesome); solo Farmacia vendora SheetJS. Derma no debe asumir el
   comportamiento declarado como real hasta resolver F6.3.
8. **Qualification real inexistente.** La entrada Reuma en Home usa evidencia sintética
   (`QUALIFIED_FOR_SITE` de fixture) y `F7` está pendiente por combinación real; Derma deberá planificar
   su propia qualification hospital×módulo.
9. **QA de navegador no gateada.** El vertical Reuma tiene herramienta de navegador, pero no está en
   `verify:nexus` y depende de red; su evidencia no debe presentarse como equivalente a test
   determinista ni a validación de navegador soportada de Derma.
10. **Sin paciente universal ni transporte de contexto.** La Home no transporta CIP/paciente/workbook;
    Reuma usa sesión+Excel+`sessionStorage`. Derma no debe esperar handoff de paciente desde el shell.
11. **Interoperabilidad institucional no disponible.** FHIR/openEHR/hosting/identidad son
    `SES_DECISION`; no existen adapters Derma ni mapping aprobado.
12. **Relación con Farmacia.** Existe handoff Reuma→Farmacia a nivel de solicitud (texto/estructura),
    pero el handoff Derma↔Farmacia no está diseñado ni cualificado.

---

## 6. Conclusión acotada: qué puede tomar Dermatología

**Tomar hoy (concepto / método), sin copiar código Reuma:**
- registro y navegación de módulo en la Home sin paciente compartido;
- deployment/site explícito y gate de qualification hospital×módulo (como patrón, no como evidencia);
- separación solicitado ≠ validado y fronteras de seguridad clínica;
- método oracle-first con split `ACCEPTANCE` vs `KNOWN_LEGACY/NON_GOLDEN`;
- envelope conceptual de acto y vocabulario de resultado (`prepared_for_transfer`, `persisted`, …)
  como inspiración, sin congelar firmas;
- patrones UX de dashboard longitudinal de paciente y de cohorte poblacional.

**Esperar al strangler (no usable como seam limpio todavía):**
- Read Port/DTO async como contrato estable más allá del wrapper actual (F5.2);
- extracción de parser/storage y migración de consumidores restantes;
- writer boundary y contrato de acto Reuma (F5.3/F5.4);
- política de dependencias/vendor y lifecycle de estado de navegador (F6.1/F6.3).

**Propio de Dermatología (definir y contratar, no heredar):**
- patologías, tipos de visita, campos y visibilidad;
- PROs/escalas (p. ej. PASI/BSA/DLQI) y sus reglas clínicas gobernadas;
- modelo longitudinal y semántica de ausencia/tiempo;
- actos de escritura y outputs;
- navegación interna, dashboards y qualification de su site.

**Veredicto de la auditoría:** Dermatología puede reutilizar hoy **conceptos, fronteras de seguridad
y método de oráculos**; debe **esperar** a que el strangler Reuma extraiga parser/storage y contrate
el borde de escritura; y debe asumir como **propio de dominio** todo el modelo clínico de psoriasis.
No existe hoy un engine de configuración ni un módulo Derma que copiar.

---

## 7. Límite de esta WO

Esta auditoría **no modifica PROMueve**, **no rediseña Reuma** y **no propone** un paciente universal,
form builder, rule engine ni backend nuevo. Cualquier cambio en `Hub-Clinico-Badajoz` requiere WO
propia, verificación live y autorización explícita en el repositorio destino.

*El repositorio externo permaneció sin modificar: las refs remotas se re-verificaron idénticas al
cierre (`main=a25cccb8…`, `promueve/nexus-v4=b5028ec…`).*
