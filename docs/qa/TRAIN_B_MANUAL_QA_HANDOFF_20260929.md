# Handoff de QA manual — Train-B (20260929)

**Tipo:** documentación / handoff de QA manual\
**Ticket:** [#15 — DOC-B](https://github.com/b32majus/Hub-Clinico-PsO-Valme/issues/15) (padre [#10](https://github.com/b32majus/Hub-Clinico-PsO-Valme/issues/10))\
**Repo:** `b32majus/Hub-Clinico-PsO-Valme`\
**Fecha:** 2026-09-29

Autoridad viva relacionada:

- [`docs/INDEX.md`](../INDEX.md)
- [`docs/ops/WORK_ORDER_STATUS.md`](../ops/WORK_ORDER_STATUS.md)
- [`docs/plans/PSO_VALME_TO_PROMUEVE_DERMATOLOGY_MASTER_PLAN_20260928.md`](../plans/PSO_VALME_TO_PROMUEVE_DERMATOLOGY_MASTER_PLAN_20260928.md)
- [`docs/ops/PSO-05_LONGITUDINAL_DATE_CONTRACT.md`](../ops/PSO-05_LONGITUDINAL_DATE_CONTRACT.md)

---

## 1. Estado terminal del train y frontera de publicación

```text
TRAIN-B = IMPLEMENTATION_COMPLETE / AUTOMATED_QA_COMPLETE / MANUAL_QA_PENDING / NOT_PUBLISHED_BY_TRAIN
```

| Dimensión | Estado factual |
|---|---|
| Implementación | Completa para el alcance de Train-B (PSO-06A, PSO-06B, PSO-QA-01, PSO-QA-02). |
| Tests deterministas / QA de navegador automatizado | Verdes en el HEAD de Train-B. |
| QA visual manual | **PENDIENTE.** El harness headless **no** es QA visual manual. |
| Publicación | La rama `work/pso-valme-train-b-20260929` es **local-only / NOT PUBLISHED**. `push`, PR, merge y Pages **no** están autorizados por el padre #10. |
| `main` | **Intacto** en `9d722c8da792ffe51ce2ea9a1420af71a70522f1`. |
| PSO-07 | **`BLOCKED`** hasta que se adjudique el gate de QA manual. |

> Este documento **no reclama** que la publicación ni el QA manual hayan ocurrido. Describe los pasos
> humanos a ejecutar **después** de una publicación autorizada por separado.

---

## 2. Evidencia técnica ya establecida (automatizada)

| Ticket | Commit (local) | Cambio | Oráculo / regresión | Resultado |
|---|---|---|---|---|
| PSO-06A (#11) | `bc1fa80dfd1c2a1c45e80662bdde0f8f4b811e6c` | JSZip 3.10.1 vendorizado en `vendor/jszip/3.10.1/`; `index.html` y V2 repuntan el `<script src>` | [`tests/jszip_local_dependency.test.js`](../../tests/jszip_local_dependency.test.js) | 21/21 PASS |
| PSO-06B (#12) | `774dd1d72e24019a5d3337849e185e148423ec9e` | Contrato de carga XLSX fail-closed (`nusha`, `fecha_visita`, `tipo_visita`); sin dataset stale; sin mapeo `nhc`→`nusha` | [`tests/xlsx_load_contract.test.js`](../../tests/xlsx_load_contract.test.js) | 34/34 PASS |
| PSO-QA-01 (#13) | `59754cde28246281956c608749a6d3f0cefb73e5` | Fixture XLSX demo reproducible desde el CSV sintético (174 columnas, 9 visitas) | [`tests/demo_xlsx_fixture.test.js`](../../tests/demo_xlsx_fixture.test.js) | 17/17 PASS |
| PSO-QA-02 (#14) | `93fd3259473d55e460d6bd1480b771cea021326c` | Regresión de navegador del loader + filtros de estado actual PSO-04 | [`tests/dashboard_xlsx_current_state.test.js`](../../tests/dashboard_xlsx_current_state.test.js) | 21/21 PASS |

Regresiones Train-A sobre el HEAD de Train-B: PSO-02 46/46, PSO-03 42/42, PSO-04 39/39, PSO-05 49/49
(todas PASS). `git diff --check` PASS.

Revisión nativa Gentle 4R: los cuatro candidatos quedaron **APPROVED** con autoridad consumida; las
observaciones advisory no bloqueantes se registran como trabajo futuro en
[`docs/ops/WORK_ORDER_STATUS.md`](../ops/WORK_ORDER_STATUS.md).

---

## 3. QA manual: lo ya completado y lo pendiente

### Completado en Train-A (evidencia durable)

| WO | Comportamiento validado manualmente |
|---|---|
| PSO-02 | Aislamiento de estado entre pacientes (sin contaminación A→B). |
| PSO-03 | Missingness de PASI/DLQI/PURE-4 (pendiente/incompleto ≠ `0`). |
| PSO-05 | Longitudinalidad sin precarga desde visitas futuras. |

### Pendiente

| WO | QA manual pendiente |
|---|---|
| **PSO-04** | Dashboard V2 con XLSX publicado: baseline, filtros de estado actual y ventana temporal. Se completa con los pasos de la sección 5 en la publicación de Train-B. |

> No se traslada el QA manual de Train-A a Train-B ni se importa evidencia headless como si fuera
> visual.

---

## 4. Precondiciones (fuera del alcance de #15)

1. Autorización humana **separada y explícita** para `push` / cambio de Pages.
2. Decisión del commit publicado (por ejemplo el HEAD de Train-B o un merge posterior) que será el
   objeto del QA.
3. Acceso a un navegador de escritorio con consola de desarrollo.

Hasta que 1–3 se cumplan, este handoff permanece **no ejecutado**.

---

## 5. Pasos exactos del QA manual

Sea `<PAGES_BASE>` la URL base de Pages efectivamente publicada para este repositorio
(por defecto esperada `https://b32majus.github.io/Hub-Clinico-PsO-Valme/` **una vez autorizada y
publicada**; no asumir que ya existe). Se permite añadir un *query* de cache-busting, por ejemplo
`?v=93fd325`.

1. **Confirmar que Pages sirve el HEAD previsto de Train-B.** Abrir
   `<PAGES_BASE>/index.html?v=93fd325` y `<PAGES_BASE>/Cuadro_Mando_Psoriasis_Valme_v2.html?v=93fd325`.
   Verificar que carga el JSZip repo-local (`vendor/jszip/3.10.1/jszip.min.js`) y que no aparece el
   error `JSZip no disponible`. Registrar la URL y, si es posible, el commit servido.
2. **Abrir el dashboard V2** `<PAGES_BASE>/Cuadro_Mando_Psoriasis_Valme_v2.html`.
3. **Cargar `Base Datos_PsO_Valme_demo.xlsx`** con el input de fichero del dashboard.
   Debe mostrar `Base cargada` y no debe haber errores de carga.
4. **Verificar el baseline:** sin filtros, `Pacientes Únicos = 4`.
5. **Escenario A (sin ventana de fechas):** seleccionar `Fármaco Activo = Acitretina`.
   El KPI debe ser `0` pacientes (no debe resucitar visitas antiguas).
6. **Escenario B (ventana temporal):** limpiar filtros; fijar la cota superior de fecha a
   `2024-12-31`; volver a seleccionar `Fármaco Activo = Acitretina`.
   Debe mostrar `1` paciente, `VALM0004`, dentro del scope histórico.
7. **Fail-closed:** cargar el libro longitudinal conocido incompatible
   (`psoriasis_valme_base_longitudinal.xlsx`). Debe aparecer un error explícito
   `XLSX incompatible` (citando la columna ausente `nusha`), el dashboard debe ocultarse y **no** debe
   quedar ninguna cohorte previa retenida.
8. **Registrar** los mensajes de la consola del navegador, los errores de runtime y cualquier
   discrepancia visual, junto con capturas si aplica.

---

## 6. Resultados esperados (resumen)

| Paso | Entrada | Resultado esperado |
|---|---|---|
| 1 | `<PAGES_BASE>` + cache-busting | Sirve el HEAD autorizado; JSZip repo-local disponible |
| 2 | — | V2 abre sin error de página |
| 3 | `Base Datos_PsO_Valme_demo.xlsx` | `Base cargada`, dataset válido |
| 4 | Sin filtros | `Pacientes Únicos = 4` |
| 5 | `Acitretina`, sin fechas | `0` pacientes |
| 6 | Fecha hasta `2024-12-31` + `Acitretina` | `1` paciente / `VALM0004` |
| 7 | `psoriasis_valme_base_longitudinal.xlsx` | `XLSX incompatible`, shell oculto, sin cohorte stale |
| 8 | — | Consola/errores registrados y reportados |

---

## 7. Qué reportar al finalizar

- URL(s) exactas probadas y *query* de cache-busting.
- Commit/página efectivamente servidos.
- Resultado de cada paso 1–8 (PASS/FAIL + evidencia).
- Cualquier discrepancia visual/runtime y capturas.
- Declaración explícita de si el QA manual de **PSO-04** queda **aprobado** o **abierto**.

---

## 8. No objetivos y prohibiciones

- No modificar HTML/JS/datos/fixtures desde este handoff.
- No cerrar defectos de producto solo con documentación.
- No iniciar **PSO-07** ni crear el contrato donante en este ticket.
- No diseñar ni implementar PROMueve Dermatología.
- No asumir `push`, PR, merge, cambio de Pages ni mutación de `main`.
- No reclamar QA visual manual donde solo existe QA automatizado.

---

## 9. Reversión

Revertir el commit documental de #15 no altera los checkpoints técnicos
(`bc1fa80`, `774dd1d`, `59754cd`, `93fd325`) ni `main`.
