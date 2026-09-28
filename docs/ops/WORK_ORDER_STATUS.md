# Work Order Status — Hub Clínico Psoriasis Valme

**Última actualización:** 2026-09-28  
**Repositorio:** `b32majus/Hub-Clinico-PsO-Valme`  
**Propósito:** tablero vivo de trabajo para el rescate mínimo de PsO-Valme y el handoff hacia PROMueve Dermatología.  

## Estado de autoridad

| Elemento | Estado |
|---|---|
| `main` | Base original del prototipo; HEAD inicial verificado para este plan: `9d722c8da792ffe51ce2ea9a1420af71a70522f1` |
| Rama documental actual | `docs/pso-valme-promueve-derma-plan-20260928` |
| Cambio funcional en esta rama | Ninguno |
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
| PSO-02 | Aislamiento de estado por paciente | Clínica/funcional | `PLANNED` | PSO-01 | PsO-Valme |
| PSO-03 | Missingness PASI/DLQI/PURE-4 | Clínica/funcional | `PLANNED` | PSO-01; preferible PSO-02 | PsO-Valme |
| PSO-04 | Cohorte actual y filtros dashboard | Analítica/funcional | `PLANNED` | PSO-01 | PsO-Valme |
| PSO-05 | Longitudinalidad y fechas | Datos/funcional | `PLANNED` | PSO-01 | PsO-Valme |
| PSO-06 | Portabilidad XLSX + schema | Técnica | `PLANNED` | PSO-01 | PsO-Valme |
| PSO-07 | Contrato donante Psoriasis | Documental/contrato | `BLOCKED` | PSO-02/03/04/05 adjudicadas | PsO-Valme |
| DERMA-READ-01 | Auditoría onboarding PROMueve live | Read-only arquitectura/producto | `READY_FOR_READONLY` | DOC-00 | lectura de Hub-Clinico-Badajoz; informe aquí |
| DERMA-DESIGN-01 | Diseño módulo Dermatología | Arquitectura/producto | `BLOCKED` | PSO-07 + DERMA-READ-01 | PsO-Valme |
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

## Próxima acción recomendada

Dado que la prioridad de producto es Extremadura:

1. adjudicar la caché local V1-only en **PSO-06** (o descartarla motivadamente);
2. ejecutar **PSO-02…PSO-05** sobre V2, cerrando defectos compartidos listados en el informe de PSO-01;
3. iniciar en paralelo **DERMA-READ-01**, auditoría read-only de Reuma/Farmacia/Foundation en PROMueve;
4. no iniciar cambios en `Hub-Clinico-Badajoz` hasta completar el gate de transferencia y recibir autorización explícita.
