# Handoff de QA manual — Train-C (20260930)

**Tipo:** documentación / handoff de QA manual consolidado (desde cero)\
**Ticket:** [#19 — DOC-C](https://github.com/b32majus/Hub-Clinico-PsO-Valme/issues/19) (padre [#16](https://github.com/b32majus/Hub-Clinico-PsO-Valme/issues/16))\
**Repo:** `b32majus/Hub-Clinico-PsO-Valme`\
**Fecha:** 2026-09-30

> Este es el **único** handoff de QA manual vigente. Sustituye a
> [`TRAIN_B_MANUAL_QA_HANDOFF_20260929.md`](./TRAIN_B_MANUAL_QA_HANDOFF_20260929.md), que queda
> **SUPERSEDED / histórico**.

Autoridad viva relacionada:

- [`docs/INDEX.md`](../INDEX.md)
- [`docs/ops/WORK_ORDER_STATUS.md`](../ops/WORK_ORDER_STATUS.md)
- [`docs/plans/PSO_VALME_TO_PROMUEVE_DERMATOLOGY_MASTER_PLAN_20260928.md`](../plans/PSO_VALME_TO_PROMUEVE_DERMATOLOGY_MASTER_PLAN_20260928.md)
- [`docs/ops/PSO-05_LONGITUDINAL_DATE_CONTRACT.md`](../ops/PSO-05_LONGITUDINAL_DATE_CONTRACT.md)

---

## 1. Estado real del train y frontera de publicación

```text
TRAIN-C = IMPLEMENTATION_COMPLETE / AUTOMATED_QA_COMPLETE / MANUAL_QA_PENDING / NOT_PUBLISHED_BY_TRAIN-C
```

La documentación debe distinguir explícitamente estas capas, que **no** son equivalentes:

| Dimensión | Estado factual (verificado 2026-09-30) |
|---|---|
| **Train-B publicado remotamente** | Sí. `work/pso-valme-train-b-20260929` @ `7976663bdd97ee0e759090f6f8caa32799d5bb1a` (DOC-B). |
| **Train-C implementación** | Completa. #17 (PSO-06C) @ `d91fbc2357c8f5af7a307effb35b86773d8c388a`; #18 (PSO-QA-03) @ `011d624234cc5fb5a07387bf5f0e6aaeed09a4a6`. |
| **Tests deterministas** | Verdes en el HEAD de Train-C (detalle en sección 2). |
| **QA de navegador automatizado (headless Chromium)** | Completo. Incluye la suite de carrera de cargas (`tests/load_race_isolation.test.js`). |
| **QA visual manual** | **PENDIENTE.** El harness headless **no** es QA visual manual. |
| **Publicación de Train-C** | **Local-only / NOT PUBLISHED.** `push`, PR, merge y Pages **no** están autorizados por el padre #16. |
| **`main`** | **Intacto** en `9d722c8da792ffe51ce2ea9a1420af71a70522f1`. |
| **PSO-07** | **`BLOCKED`** por el gate de QA manual; no se cierra por documentación. |

> Este documento **no reclama** que la publicación de Train-C ni el QA manual hayan ocurrido.
> Describe la secuencia humana a ejecutar **después** de una publicación de Train-C autorizada por
> separado.

---

## 2. Evidencia técnica ya establecida (automatizada)

### 2.1 Cambios de Train-C

| Ticket | Commit (local) | Cambio | Oráculo / regresión | Resultado |
|---|---|---|---|---|
| PSO-06C (#17) | `d91fbc2357c8f5af7a307effb35b86773d8c388a` | Coordinación *latest-request-wins* de cargas asíncronas en `index.html` y `Cuadro_Mando_Psoriasis_Valme_v2.html`: cada carga recibe un id monótono; el éxito/fallo stale es libre de efectos | [`tests/load_race_isolation.test.js`](../../tests/load_race_isolation.test.js) | PASS |
| PSO-QA-03 (#18) | `011d624234cc5fb5a07387bf5f0e6aaeed09a4a6` | Consolidación y extensión de la regresión de navegador de cargas fuera de orden (escenarios A/B/C + cargas ordinarias/CSV/demo) | [`tests/load_race_isolation.test.js`](../../tests/load_race_isolation.test.js) | 31/31 PASS |

### 2.2 Matriz de regresión determinista en el HEAD de Train-C

| Suite | Resultado |
|---|---|
| `tests/load_race_isolation.test.js` (PSO-QA-03 / #17+#18) | **31/31 PASS** |
| `tests/patient_state_isolation.test.js` (PSO-02) | **46/46 PASS** |
| `tests/clinical_score_missingness.test.js` (PSO-03) | **42/42 PASS** |
| `tests/dashboard_current_state_cohort.test.js` (PSO-04) | **39/39 PASS** |
| `tests/longitudinal_date_semantics.test.js` (PSO-05) | **49/49 PASS** |
| `tests/jszip_local_dependency.test.js` (PSO-06A) | **21/21 PASS** |
| `tests/xlsx_load_contract.test.js` (PSO-06B) | **34/34 PASS** |
| `tests/demo_xlsx_fixture.test.js` (PSO-QA-01) | **17/17 PASS** |
| `tests/dashboard_xlsx_current_state.test.js` (PSO-QA-02) | **21/21 PASS** |

Total: **300/300 checks PASS**, 0 failures. El único *seam* de test es la retención
determinista de `JSZip.loadAsync`/`Blob.prototype.text`; la interacción de fichero es la real
(`<input type="file">` + Playwright `setInputFiles`) y ninguna aserción fabrica estado DOM.

### 2.3 Límite de evidencia

Esto es **QA de navegador automatizado (headless Chromium)**, no QA visual manual. La validación
visual manual en GitHub Pages sigue **PENDIENTE** y es el objeto de la sección 4.

---

## 3. Precondiciones (fuera del alcance de #19)

1. Autorización humana **separada y explícita** para publicar Train-C (`push` / cambio de Pages).
2. Decisión del commit publicado (por ejemplo el HEAD de Train-C `011d624`) que será el objeto del QA.
3. Acceso a un navegador de escritorio con consola de desarrollo.

Hasta que 1–3 se cumplan, este handoff permanece **no ejecutado**. La rama Train-C sigue siendo
local-only.

---

## 4. Secuencia de QA manual desde cero

Sea `<PAGES_BASE>` la URL base de Pages efectivamente publicada para este repositorio
(por defecto esperada `https://b32majus.github.io/Hub-Clinico-PsO-Valme/` **una vez autorizada y
publicada**; no asumir que ya existe). Se permite añadir un *query* de cache-busting. No se admite
manipulación de DOM ni de consola de depuración como evidencia.

| # | Acción | Resultado esperado |
|---|---|---|
| 1 | **Verificar el HEAD servido** (solo tras autorización separada de publicación de Train-C). Abrir `<PAGES_BASE>/index.html?v=<HEAD>` y `<PAGES_BASE>/Cuadro_Mando_Psoriasis_Valme_v2.html?v=<HEAD>`. | Pages sirve el HEAD autorizado de Train-C; JSZip repo-local (`vendor/jszip/3.10.1/jszip.min.js`) disponible; **no** aparece `JSZip no disponible`. Registrar URL y *query*. |
| 2 | Abrir `index.html` y cargar la base/demo soportada (`Base Datos_PsO_Valme_demo.xlsx` o `Base Datos_PsO_Valme_demo.csv`). | `Base cargada` / estado de éxito; sin errores de carga. |
| 3 | **PSO-02 — aislamiento A→B** con IDs sintéticos: buscar/seleccionar el paciente A existente, anotar valores; buscar/seleccionar el paciente B (y un NUSHA desconocido). | Ningún valor de A (estables, visita, terapia primera/seguimiento, derivación, impresión, objetivo, otras derivaciones, próxima revisión, comentarios) sobrevive en la UI/estado de B. |
| 4 | **PSO-03 — missingness** de PASI/DLQI/PURE-4 con interacción soportada: instrumento sin contestar; instrumento parcial; instrumento completo todo cero; instrumento completo no cero. | Sin contestar → `Pendiente`; parcial → `Incompleto (n/N)`; completo todo cero → `0` legítimo; completo no cero → valor esperado. Ningún vacío se serializa como `0`. PURE-4 positivo **no** escribe `derivacion_derma_reuma` por sí solo. |
| 5 | **PSO-05 — longitudinalidad**: fijar una fecha de encuentro sin visita previa válida; después con una visita previa válida; probar serial Excel y `dd/mm/yyyy`. | Sin visita estrictamente anterior → no se precarga ninguna visita futura; con visita previa válida → se hidrata la correcta; formatos de fecha equivalentes. |
| 6 | Abrir el dashboard V2 `Cuadro_Mando_Psoriasis_Valme_v2.html`. | V2 abre sin error de página. |
| 7 | Cargar `Base Datos_PsO_Valme_demo.xlsx` con el input de fichero real del dashboard. | `Base cargada`; baseline sin filtros `Pacientes Únicos = 4`. |
| 8 | **Escenario A (PSO-04)**: sin ventana de fechas, `Fármaco Activo = Acitretina`. | KPI `0` pacientes (sin resurrección de visitas antiguas). |
| 9 | **Escenario B (PSO-04)**: limpiar filtros; cota superior de fecha `2024-12-31`; `Fármaco Activo = Acitretina`. | `1` paciente, `VALM0004`, dentro del scope histórico. |
| 10 | **Fail-closed XLSX**: cargar `psoriasis_valme_base_longitudinal.xlsx`. | Error explícito `XLSX incompatible` (citando la columna ausente `nusha`); shell/dashboard oculto; **sin** cohorte stale retenida. |
| 11 | **Concurrencia (smoke manual acotado, opcional)**. La garantía *latest-request-wins* está cubierta por QA de navegador automatizado (`tests/load_race_isolation.test.js`, 31/31). Como smoke humano ejecutable y fiable, sin *throttling* artificial: seleccionar un fichero válido y, acto seguido, seleccionar otro fichero válido distinto por el mismo input. | El dataset y el estado visibles corresponden al **último** fichero elegido; no aparece ni persiste el estado del primero. Si el smoke no es fiable, no se inventa un ritual flaky: prevalece la cobertura automatizada. |
| 12 | **Consola y discrepancia visual**: abrir la consola del navegador durante los pasos 1–11 y observar la UI. | Registrar cualquier error de runtime, *warning* o discrepancia visual; adjuntar capturas si aplica. No se usa manipulación de consola como evidencia funcional. |

---

## 5. Resultados esperados (resumen)

| Paso | Entrada | Resultado esperado |
|---|---|---|
| 1 | `<PAGES_BASE>` + cache-busting | Sirve el HEAD autorizado; JSZip repo-local disponible |
| 2 | `index.html` + base/demo | Carga correcta, sin errores |
| 3 | IDs sintéticos A→B | Aislamiento total; sin contaminación |
| 4 | Interacción PASI/DLQI/PURE-4 | Pendiente / Incompleto / cero real / valor, sin coerciones |
| 5 | Fechas y visita previa | Sin precarga futura; formatos equivalentes |
| 6 | V2 | Abre sin error |
| 7 | `Base Datos_PsO_Valme_demo.xlsx` | `Base cargada`; `Pacientes Únicos = 4` |
| 8 | `Acitretina`, sin fechas | `0` pacientes |
| 9 | Fecha hasta `2024-12-31` + `Acitretina` | `1` paciente / `VALM0004` |
| 10 | `psoriasis_valme_base_longitudinal.xlsx` | `XLSX incompatible`, shell oculto, sin cohorte stale |
| 11 | Dos cargas válidas consecutivas | El último fichero elegido es el autoritativo |
| 12 | Consola | Errores/discrepancias registrados y reportados |

---

## 6. Qué reportar al finalizar

- URL(s) exactas probadas y *query* de cache-busting.
- Commit/página efectivamente servidos.
- Resultado de cada paso 1–12 (PASS/FAIL + evidencia).
- Cualquier discrepancia visual/runtime y capturas.
- Declaración explícita de si el QA manual de **PSO-04** queda **aprobado** o **abierto**.

---

## 7. No objetivos y prohibiciones

- No modificar HTML/JS/datos/fixtures desde este handoff.
- No cerrar **PSO-07** solo con documentación.
- No iniciar el contrato donante PSO-07 ni diseñar/implementar PROMueve Dermatología.
- No asumir `push`, PR, merge, cambio de Pages ni mutación de `main`.
- No reclamar QA visual manual donde solo existe QA automatizado.
- No usar manipulación de DOM/consola de depuración como evidencia de comportamiento.

---

## 8. Reversión

Revertir el commit documental de #19 no altera los checkpoints técnicos
(`d91fbc2`, `011d624`) ni los de Train-B (`bc1fa80`, `774dd1d`, `59754cd`, `93fd325`) ni `main`.
