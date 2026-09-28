# Work Order Status — Hub Clínico Psoriasis Valme

**Última actualización:** 2026-09-28  
**Repositorio:** `b32majus/Hub-Clinico-PsO-Valme`  
**Propósito:** tablero vivo de trabajo para el rescate mínimo de PsO-Valme y el handoff hacia PROMueve Dermatología.  

## Estado de autoridad

| Elemento | Estado |
|---|---|
| `main` | Base original del prototipo; HEAD inicial verificado para este plan: `9d722c8da792ffe51ce2ea9a1420af71a70522f1` |
| Rama de ejecución actual | `work/pso-valme-train-a-20260928` |
| Cambio funcional en esta rama | PSO-02 (aislamiento de estado) y PSO-03 (missingness de scores) en `index.html`; PSO-04 (cohorte de estado actual) en `Cuadro_Mando_Psoriasis_Valme_v2.html`; PSO-05 (longitudinalidad y fechas) en `index.html` y V2 |
| Dashboard de referencia | `Cuadro_Mando_Psoriasis_Valme_v2.html` adjudicado como baseline donante por PSO-01 (veredicto `V2_WITH_V1_FEATURES_TO_PORT`) |
| Dashboard v1 | Referencia histórica temporal; no borrar; única capacidad V1-only: caché local con auto-restauración |
| Estado asistencial | Prototipo / datos sintéticos; no piloto ni producción |
| Prioridad de producto | PROMueve Extremadura / módulo Dermatología |

> Los SHAs de repositorios externos, especialmente `Hub-Clinico-Badajoz`, nunca se fijan aquí como autoridad futura. Se verifican live al ejecutar cada auditoría o WO.

## Leyenda

| Estado | Significado |
|---|---|
| `DONE_DOCS` | Documentación completada; sin ejecución técnica |
| `PLANNED` | Planificada, no autorizada para ejecución |
| `READY_FOR_READONLY` | Puede ejecutarse como revisión read-only cuando se solicite |
| `BLOCKED` | Falta dependencia o decisión |
| `IN_PROGRESS` | Ejecución autorizada en curso |
| `DONE_VERIFIED` | Implementada y verificada en su alcance |
| `DEFERRED` | Fuera de prioridad actual |

## WOs / bloques

| ID | Título | Tipo | Estado | Dependencias | Repo de ejecución |
|---|---|---|---|---|---|
| DOC-00 | Baseline, auditoría y plan maestro | Documental | `DONE_DOCS` | Ninguna | PsO-Valme |
| PSO-01 | Caracterización V1 vs V2 | Read-only / QA | `DONE_VERIFIED` | DOC-00 | PsO-Valme |
| PSO-02 | Aislamiento de estado por paciente | Clínica/funcional | `DONE_VERIFIED` | PSO-01 | PsO-Valme (`index.html`) |
| PSO-03 | Missingness PASI/DLQI/PURE-4 | Clínica/funcional | `DONE_VERIFIED` | PSO-01; PSO-02 | PsO-Valme (`index.html`) |
| PSO-04 | Cohorte actual y filtros dashboard | Analítica/funcional | `DONE_VERIFIED` | PSO-01 | PsO-Valme (`Cuadro_Mando_Psoriasis_Valme_v2.html`) |
| PSO-05 | Longitudinalidad y fechas | Datos/funcional | `DONE_VERIFIED` | PSO-01 | PsO-Valme (`index.html`, V2) |
| PSO-06 | Portabilidad XLSX + schema | Técnica | `PLANNED` | PSO-01 | PsO-Valme |
| PSO-07 | Contrato donante Psoriasis | Documental/contrato | `BLOCKED` | PSO-02/03/04/05 adjudicadas | PsO-Valme |
| DERMA-READ-01 | Auditoría onboarding PROMueve live (Reuma) | Read-only arquitectura/producto | `DONE_VERIFIED` | DOC-00 | lectura de Hub-Clinico-Badajoz; informe aquí |
| DERMA-READ-01B | Auditoría onboarding Farmacia + Nexus/Foundation | Read-only arquitectura/producto | `DONE_VERIFIED` | DOC-00 | lectura de Hub-Clinico-Badajoz; informe aquí |
| DERMA-DESIGN-01 | Diseño módulo Dermatología | Arquitectura/producto | `BLOCKED` | PSO-07 + DERMA-READ-01 + DERMA-READ-01B | PsO-Valme |
| PROMUEVE-DERMA-* | Implementación Psoriasis en Nexus | Técnica | `BLOCKED` | gate de transferencia + autorización | Hub-Clinico-Badajoz |
| VALME-FULL-* | Rescate completo independiente | Técnica | `DEFERRED` | necesidad real | PsO-Valme |

## DOC-00 — cierre

### Objetivo

Crear una autoridad documental mínima y navegable sin modificar funcionalidad.

### Base verificada

`main` @ `9d722c8da792ffe51ce2ea9a1420af71a70522f1`.

### Rama

`docs/pso-valme-promueve-derma-plan-20260928`.

### Entregables

- `docs/audits/PSO_VALME_INITIAL_AUDIT_20260928.md`;
- `docs/plans/PSO_VALME_TO_PROMUEVE_DERMATOLOGY_MASTER_PLAN_20260928.md`;
- `docs/ops/WORK_ORDER_STATUS.md`;
- `docs/INDEX.md`;
- `README.md` como puerta de entrada.

### NO TOCA

- `index.html`;
- dashboards V1/V2;
- XLSX/CSV/DOCX;
- `main`;
- `Hub-Clinico-Badajoz`;
- issues/PR/merge.

### Verificación realizada

Comparación contra la base antes del commit de cierre:

- rama `ahead`, `behind_by = 0`;
- 5 commits documentales acumulados en ese punto;
- únicos paths modificados: `README.md` y cuatro Markdown bajo `docs/`;
- cero HTML/JS/XLSX/CSV/DOCX funcional modificado;
- `main` intacto.

El commit de este cierre modifica únicamente este tablero, por lo que mantiene el mismo boundary documental.

### Reversión

La rama puede descartarse sin impacto en `main`.

### Delivery boundary

La instrucción actual autorizó dejar la documentación publicada en una rama del repositorio. **No se ha abierto PR ni se ha mergeado a `main`.**

## PSO-01 — cierre

### Objetivo

Adjudicar con evidencia directa de código si V2 es la baseline donante correcta y si V1 contiene capacidad o semántica que deba preservarse.

### Rama / base

`work/pso-valme-train-a-20260928`; HEAD de partida `8cffc18d5608d89765bbdebc18ab87d227aa5215`; árbol limpio.

### Entregable

`docs/audits/PSO_DASHBOARD_V1_V2_CHARACTERIZATION_20260928.md`.

### Veredicto

`V2_WITH_V1_FEATURES_TO_PORT`. V2 es superconjunto funcional de V1 (habilita Gestión Global y exportación; añade timeline tx-change y relleno de área). Única capacidad V1-only: `persistDatasetCache`/`restoreCachedDataset` (caché local + auto-restauración), a adjudicar explícitamente. V1 no se borra.

### NO TOCA

V1/V2, `index.html`, XLSX/CSV/DOCX, fixtures, `main`, `Hub-Clinico-Badajoz`.

### Delivery

Informe documental; un único commit local `docs(pso): characterize dashboard v1 vs v2`; sin push/PR/merge.

## PSO-02 — cierre

### Objetivo

Impedir que el estado clínico del paciente A sobreviva en UI, estado interno o exportación al
buscar/seleccionar el paciente B en `index.html` sin pulsar `Nuevo Paciente`.

### Base / rama

`work/pso-valme-train-a-20260928`; HEAD de partida `65ee0d2432ba4f71b80256d18971a37f62d3c543`; árbol limpio.

### Causa raíz

`clearVisitSpecificUI()` limpiaba una lista manual incompleta y solo reseteaba `followTherapyState`.
`derivacion_derma_reuma`, `impresion_clinica`, `objetivo_terapeutico`, `otras_derivaciones`,
`proxima_revision`, `comentarios_finales` y `tx_primera_*` quedaban fuera; `syncTherapiesToS()`
reinyectaba la terapia de primera visita del paciente anterior. Además, la rama de NUSHA
vacío/desconocido de `autoSearchByNusha()` no limpiaba nada. Los campos estables del paciente A
también sobrevivían cuando la fila del paciente B traía el campo vacío.

### Cambio

- `VISIT_SPECIFIC_FIELDS` se deriva de `HEADERS` menos los campos estables y menos `nusha`/`fecha_visita`
  (fecha de encuentro compartida), evitando listas frágiles.
- `clearVisitSpecificUI()` se sustituye por `resetPatientState()`, frontera única que limpia todo el
  estado de paciente (estables + visita + terapia primera y seguimiento), re-renderiza y sincroniza.
- `applyStablePreload()` hidrata siempre desde la fila del paciente destino, incluido el valor vacío.
- `autoSearchByNusha()` invoca la frontera con NUSHA vacío y no encontrado.
- `resetPatient()` reutiliza la misma frontera.

### No toca

Dashboards V1/V2; semántica de missingness de scores (PSO-03); selección de visita previa/fechas
(PSO-05); dependencia/vendor XLSX; fixtures; `main`; `Hub-Clinico-Badajoz`.

### Regresión determinista

`tests/patient_state_isolation.test.js` (Playwright + CSV sintético) cubre A→B existente, A→B
desconocido, consistencia UI/estado, aislamiento de terapia primera/seguimiento y reseteo explícito
`Nuevo Paciente`. Pre-fix: 27/46; post-fix: 46/46. QA de navegador realizada con el mismo harness.

### Delivery

Un único commit local `fix(pso): isolate patient state on patient switch`; sin push/PR/merge.

### Reversión

Revertir el commit restaura el comportamiento previo sin tocar datos.

## PSO-03 — cierre

### Objetivo

Impedir que un instrumento clínico no contestado o incompleto se serialice, muestre o exporte como un
score válido de cero. `missing` no puede convertirse en `0` para PASI, DLQI ni PURE-4, sin impedir que
un resultado legítimamente cero (instrumento completo y todo cero) siga siendo representable.

### Base / rama

`work/pso-valme-train-a-20260928`; HEAD de partida `8ba6420ab4cd36297066b3f8274f448f9807d3a9`; árbol limpio.

### Causa raíz

- `recalcPASI()` leía los componentes con `?.value || 0`, calculaba siempre y escribía los 16
  componentes como `"0"` cuando no se habían tocado; el select PASI nacía en `0`.
- `recalcDLQI()` sumaba `Number(S["dlqi_qN"] || 0)` para los 10 ítems y siempre fijaba `dlqi_total`.
- `recalcPUREMorisky()` sumaba los 4 ítems con `|| 0`, siempre fijaba `pure4_total_positivas` y, con
  total ≥2, escribía `derivacion_derma_reuma = 1` sin acción clínica explícita.
- Morisky ya distinguía pendiente/incompleto de resultado válido y se reutilizó como patrón conceptual.

### Cambio

- PASI: el select incorpora una opción vacía inicial; `recalcPASI()` exige los 16 componentes
  (4 regiones × 4 métricas) para fijar `pasi`. Sin completar: pendiente/incompleto y componentes
  vacíos. Todo cero completo: `pasi = "0.0"`.
- DLQI: `dlqi_total` solo se fija con los 10 ítems contestados. Todo cero explícito: `0`.
  Vacío o parcial: pendiente/incompleto.
- PURE-4: `pure4_total_positivas` solo se fija con los 4 ítems contestados. Cuatro negativos: `0`.
  Positivo (≥2) muestra recomendación pero ya no escribe `derivacion_derma_reuma`; la decisión
  manual del clínico se conserva.
- Estado/UI/exportación: total, vista (`Pendiente` / `Incompleto (n/N)` / valor) y fila exportada
  comparten la misma semántica. El reset de PSO-02 devuelve los instrumentos a pendiente.

### No toca

Dashboards V1/V2 y su semántica de cohorte/control (PSO-04); umbrales clínicos; rediseño de
formularios/estilos; texto de ítems; importación XLSX; fixtures demo; `main`; `Hub-Clinico-Badajoz`.

### Regresión determinista

`tests/clinical_score_missingness.test.js` (Playwright headless, datos sintéticos) cubre, para
PASI/DLQI/PURE-4: sin contestar → pendiente; parcial → incompleto; completo todo cero → `0`;
completo no cero → valor esperado; reset → pendiente; y la separación PURE-4 positivo ↔ derivación
realizada. Resultado: 42/42 PASS. La regresión PSO-02 `tests/patient_state_isolation.test.js`
permanece 46/46 PASS. `git diff --check` PASS. No se realizó QA visual manual.

### Delivery

Un único commit local `fix(pso): preserve missingness in clinical scores`; sin push/PR/merge.

### Reversión

Revertir el commit restaura el comportamiento previo sin tocar datos.

## PSO-04 — cierre

### Objetivo

Separar en el pipeline de cohorte del dashboard V2 el *visit scope* temporal, la *fila actual* por
paciente y los *filtros de estado actual*, de modo que un filtro clínico como "biológico activo",
fármaco, control, comorbilidad, zona especial, fenotipo o curso no pueda incluir a un paciente por
una visita antigua cuando su visita elegible más reciente ya no cumple el criterio.

### Base / rama

`work/pso-valme-train-a-20260928`; HEAD de partida `68f949f1cf8a27794d670f48388b3beac560daaf`; árbol limpio.
V2 confirmado como baseline donante por PSO-01 (`V2_WITH_V1_FEATURES_TO_PORT`); dependencia satisfecha.

### Causa raíz

`applyFilters()` filtraba `rawRows` con todos los criterios (incluidos los de estado actual) y solo
después aplicaba `getLatestRows()`. Una visita antigua que cumplía el filtro sobrevivía y pasaba a
representar al paciente como si su estado actual fuese el antiguo (auditoría inicial P0.3).

### Cambio (tres etapas explícitas)

1. **Visit scope** (`visitScopeRows`): ventana temporal (`dateFrom`/`dateTo`) y criterios
genuinamente de visita (`tipo_visita`, `procedencia`).
2. **Fila actual** (`getLatestRows(visitScopeRows)`): la visita elegible más reciente por paciente,
con orden determinista `__date` y desempate `__index`.
3. **Filtros de estado actual** (`latestRows`): fenotipo, curso, comorbilidad, zona especial,
familia terapéutica, fármaco y control se aplican DESPUÉS de seleccionar la fila actual.

El *trend* global (`renderTrendTable`) sigue usando TODO `visitScopeRows`; no se colapsa a las
filas actuales. La vista longitudinal de paciente (`searchPatient`/`currentPatientRows`) permanece
independiente de los filtros de cohorte.

**Ventana temporal (comportamiento explícito, escenario D):** la fila actual se elige dentro del
visit scope, no necesariamente la última de toda la vida del paciente. Si el usuario acota fechas,
el estado actual evaluado es el de la última visita elegible dentro de esa ventana. Es intencional
y queda documentado aquí y en el comentario de `applyFilters()`.

### Missingness de estado de control

`getControlStatus()` conserva la autoridad explícita del prototipo (rojo disyuntivo
`PASI>10 o BSA>10 o PGA>=3 o DLQI>10`; verde solo con las 4 métricas) y añade la distinción que
faltaba: con métricas parciales, sin rojo y sin las cuatro, devuelve el nuevo estado `incompleto`
("Datos Incompletos") en lugar de forzar `intermedia`. `intermedia` queda reservada a registros
plenamente evaluables. No se inventan umbrales nuevos; `sin_datos` se mantiene para ausencia total.

### No toca

V1; `index.html`; umbrales PASI/BSA/PGA/DLQI; rediseño visual amplio (solo etiqueta/estado
"incompleto" para hacer honesto el estado existente); dependencia/importación XLSX; schema de datos;
fixtures; `main`; `Hub-Clinico-Badajoz`.

### Regresión determinista

`tests/dashboard_current_state_cohort.test.js` (Playwright headless sobre V2, dataset sintético)
cubre los escenarios A–F: biológico retirado, fármaco cambiado, control cambiado, ventana temporal,
missingness/incompleto y preservación del trend longitudinal. Resultado: 39/39 PASS. El mismo
harness falla sobre el V2 pre-fix. PSO-02 (46/46) y PSO-03 (42/42) permanecen PASS.
`git diff --check` PASS. QA de navegador: el harness headless ejercita los filtros
biológico/fármaco/control sobre V2; no hubo QA visual manual.

### Deuda analítica restante (fuera de este ticket)

Denominadores KPI sin distinguir población total de evaluable (P1.4); escalas incompatibles en el
gráfico longitudinal PASI/BSA/PGA (P1.5); identidad de visita dependiente de `__index` (P1/P2).

### Delivery

Un único commit local `fix(pso): apply dashboard filters to current patient state`; sin push/PR/merge.

### Reversión

Revertir el commit restaura el pipeline anterior sin tocar datos.

## PSO-05 — cierre

### Objetivo

Impedir que una visita futura se hidrate como historia previa y unificar el parsing de
fechas entre formulario y dashboard V2, sin rediseñar el modelo de almacenamiento.

### Base / rama

`work/pso-valme-train-a-20260928`; HEAD de partida `566575309912a3180492d29200c8ac0fe7b55a10`; árbol limpio.

### Causa raíz

- `getLatestVisitRow(id, currentDate)` solo restringía a visitas anteriores si existía al menos una;
  sin visita anterior devolvía la última visita global, que podía ser **futura** (auditoría inicial P1.1).
- `parseDateToTs()` usaba `new Date(value)` en el formulario: los seriales Excel se interpretaban como
  año (`new Date("46023")` → año 46023) y `dd/mm/yyyy` como formato US (`new Date("01/06/2026")` → 6 ene).
- El dashboard V2 ya manejaba seriales y `dd/mm/yyyy`, pero con desbordamiento de mes (`13/13`) y
  *fallback* genérico `new Date` que podía fabricar cronología. Dashboard y formulario divergían.

### Contrato normalizado

`docs/ops/PSO-05_LONGITUDINAL_DATE_CONTRACT.md`. Función semántica única `parseCalendarDate(value)`:
ISO `yyyy-mm-dd`/`yyyy/mm/dd` (hora ignorada), `dd/mm/yyyy`, serial Excel 1900 en `[20000, 80000]`,
inválido → desconocido. Devuelve día de calendario local a medianoche; sin inferencia de timestamps.

### Cambio

- `index.html`: `parseCalendarDate` + `buildCalendarDate` canónicos; `parseDateToTs` y `formatDateEs`
  delegan en ellos. `getLatestVisitRow` solo considera visitas con fecha válida y, con D válida,
  exige fecha **estrictamente anterior**; sin visita elegible devuelve `null` y no hidrata nada.
  El estado distingue «paciente sin visita previa a la fecha indicada» de «NUSHA no encontrado».
- `Cuadro_Mando_Psoriasis_Valme_v2.html`: mismo parser canónico; `getLatestRows` ignora filas sin
  fecha válida (la cronología desconocida no cae a orden de origen).
- Empate del mismo día: `__index` mayor en ambas superficies, documentado como limitación, no como
  orden clínico. Con D válida, el mismo día no es «previo» (`< D` estricto).

### No toca

V1; umbrales/missingness de scores; cohorte/filtros de PSO-04 salvo el parser compartido; schema;
importación/exportación XLSX; fixtures demo; `main`; `Hub-Clinico-Badajoz`.

### Regresión determinista

`tests/longitudinal_date_semantics.test.js` (Playwright headless sobre ambos HTML, datos sintéticos)
cubre A (sin visita previa → nada de futuro), B (visita previa válida), C (serial Excel ≡ texto),
D (vacío/inválido desconocido y no seleccionado), E (empate del mismo día determinista), F (paridad
de orden formulario ↔ V2). Resultado: 49/49 PASS. Regresiones previas: PSO-02 46/46, PSO-03 42/42,
PSO-04 39/39 PASS. `git diff --check` PASS.

### Limitación de mismo día

Sin `visit_id`/`record_id`, dos filas del mismo paciente y fecha no admiten orden clínico. Se resuelve
de forma determinista por orden de origen (`__index`) y queda documentado; la deuda de identidad de
visita permanece fuera de este ticket.

### Delivery

Un único commit local `fix(pso): harden longitudinal visit and date semantics`; sin push/PR/merge.

### Reversión

Revertir el commit restaura el comportamiento previo sin tocar datos.

## DERMA-READ-01 — cierre

### Objetivo

Auditar la Reumatología **live** de `b32majus/Hub-Clinico-Badajoz` para determinar qué patrones
puede reutilizar con seguridad el futuro módulo Dermatología, qué debe esperar al strangler y qué
debe permanecer propio de Dermatología.

### Baseline externo verificado (live, read-only)

| Elemento | Valor |
|---|---|
| Repo | `b32majus/Hub-Clinico-Badajoz` (público; `main` stale en `a25cccb8…`) |
| Rama canónica activa | `promueve/nexus-v4` |
| Tip Git live | `b5028ecdd4c0cb5e3385352c6028d9a48ef4b41d` (Merge PR #437, documentation-only) |
| Último HEAD de producto Nexus | `e17512384b96fc361668202cdbec5e09022614ff` (PR #435) |
| Snapshot estable | `CÁCERES-REVIEW-0.6` (@ `e1120ba8…`) |
| Madurez | Evaluación sintética; no piloto ni producción |

### Entregable

`docs/audits/PROMUEVE_REUMA_DERMATOLOGY_ONBOARDING_AUDIT_20260928.md`.

### Veredicto

`DONE_VERIFIED` (documental). Matriz de reutilización cerrada con las cinco clases requeridas. Se
separa lo implementado y publicado (Read Port Reuma F5.1, Home/module-registry, oráculos
deterministas) de lo pendiente (F5.2/F5.3/F5.4, F6, F7) y de los defectos `KNOWN_LEGACY / NON_GOLDEN`
preservados (K1–K8; export 1–5). No existe engine declarativo de configuración ni módulo
Dermatología; una plantilla no equivale a módulo (freeze).

### NO TOCA

`Hub-Clinico-Badajoz` (solo lectura live); código Reuma/Farmacia; fixtures; `main`; V1/V2 de Valme;
PROMueve runtime. No se propone modificar PROMueve en esta WO.

### Delivery

Un único commit local `docs(derma): audit Reuma onboarding patterns`; sin push/PR/merge. El
repositorio externo permaneció sin modificar (refs remotas re-verificadas idénticas al cierre).

## DERMA-READ-01B — cierre

### Objetivo

Auditar la **Farmacia live** y el estado **Nexus/Foundation** de `b32majus/Hub-Clinico-Badajoz` para
determinar qué seams puede depender Dermatología hoy, cuáles serían ficción arquitectónica y qué
no debe copiarse de Farmacia.

### Baseline externo verificado (live, read-only)

| Elemento | Valor |
|---|---|
| Repo | `b32majus/Hub-Clinico-Badajoz` (público; `main` stale en `a25cccb8…`) |
| Rama canónica activa | `promueve/nexus-v4` |
| Tip Git live | `b5028ecdd4c0cb5e3385352c6028d9a48ef4b41d` (Merge PR #437, documentation-only) |
| Último HEAD de producto Nexus | `e17512384b96fc361668202cdbec5e09022614ff` (PR #435) |
| Último train clínico | TRAIN-NEXUS-CLINICAL-STRANGLER-05 (#426) → merge `10422f4e…` |
| Línea Farmacia | `recovery/farmacia-pr-replay-20260727` HISTORICAL; tip live `a8cec035…`; último producto `771fb80c…` |
| Madurez | Evaluación sintética; no piloto ni producción |

### Entregable

`docs/audits/PROMUEVE_FARMACIA_NEXUS_DERMATOLOGY_ONBOARDING_AUDIT_20260928.md`.

### Veredicto

`DONE_VERIFIED` (documental). Matriz `IMPLEMENTED` / `DOCUMENTED_DECIDED` / `PLANNED` / `NOT_FOUND`
cerrada con evidencia de código inspeccionada. Se separa lo implementado (Home/registry/
PlatformContext/release sintético; Farmacia Data Port + Read DTO v2 F4.1 + facade async F4.2;
Unified Clinical Intake y parser e-Orden D17/D17_EXT_V1) de lo decidido o planeado (Pharmacy Act
F4.4, delivery result F4.5, qualification real F7, lifecycle F6, paciente compartido) y de lo que no
debe copiarse (envelope `sessionStorage`, fila v2 de 152 columnas, inferencia catálogo/CIMA,
`offline-capable` no acreditado). Listas explícitas `SAFE_TO_TARGET_NOW`,
`WAIT_FOR_FOUNDATION_OR_SEPARATE_WO` y `DO_NOT_COPY_FROM_FARMACIA` publicadas.

### NO TOCA

`Hub-Clinico-Badajoz` (solo lectura live); código Farmacia/Reuma; fixtures; `main`; V1/V2 de Valme;
PROMueve runtime.

### Delivery

Un único commit local `docs(derma): audit Farmacia and Nexus onboarding seams`; sin push/PR/merge.
El repositorio externo permaneció sin modificar (refs remotas re-verificadas idénticas al cierre).

## Próxima acción recomendada

Dado que la prioridad de producto es Extremadura:

1. adjudicar la caché local V1-only en **PSO-06** (o descartarla motivadamente);
2. **PSO-02, PSO-03, PSO-04 y PSO-05 completadas** (`DONE_VERIFIED`; PSO-02/03/05 en `index.html`,
   PSO-04/05 en `Cuadro_Mando_Psoriasis_Valme_v2.html`); continuar **PSO-06**, cerrando los
   defectos listados en el informe de PSO-01;
3. **DERMA-READ-01 y DERMA-READ-01B completadas** (`DONE_VERIFIED`); sus informes (Reuma y
   Farmacia/Nexus) alimentan **DERMA-DESIGN-01**, aún `BLOCKED` por PSO-07 + DERMA-READ-01 +
   DERMA-READ-01B;
4. no iniciar cambios en `Hub-Clinico-Badajoz` hasta completar el gate de transferencia y recibir autorización explícita.
