# Índice documental — Hub Clínico Psoriasis Valme

**Última actualización:** 2026-09-28  
**Repositorio:** `b32majus/Hub-Clinico-PsO-Valme`  
**Objetivo actual:** rescate mínimo fiable de Psoriasis + preparación del onboarding de Dermatología en PROMueve Extremadura.

## 1. Fuente de verdad local

Orden recomendado dentro de este repositorio:

1. instrucción/WO actual;
2. GitHub live: rama, HEAD y código publicado;
3. este `docs/INDEX.md`;
4. `docs/ops/WORK_ORDER_STATUS.md`;
5. plan maestro vigente;
6. auditorías preservadas;
7. artefactos históricos del prototipo.

Para `b32majus/Hub-Clinico-Badajoz`, este repo **no es autoridad**. Cualquier afirmación sobre PROMueve/Reuma/Farmacia/Nexus debe verificarse live en el repo PROMueve antes de actuar.

## 2. Documentos vigentes

### Plan maestro

[`plans/PSO_VALME_TO_PROMUEVE_DERMATOLOGY_MASTER_PLAN_20260928.md`](./plans/PSO_VALME_TO_PROMUEVE_DERMATOLOGY_MASTER_PLAN_20260928.md)

Define:

- prioridad Extremadura;
- papel de Valme como donante clínico, no arquitectura objetivo;
- fases F0–F6;
- WOs candidatas;
- gate para transferir el trabajo a `Hub-Clinico-Badajoz`;
- límites entre repositorios.

### Estado de trabajo

[`ops/WORK_ORDER_STATUS.md`](./ops/WORK_ORDER_STATUS.md)

Tablero vivo de WOs, dependencias y estado.

### Auditoría inicial

[`audits/PSO_VALME_INITIAL_AUDIT_20260928.md`](./audits/PSO_VALME_INITIAL_AUDIT_20260928.md)

Preserva la auditoría técnica/funcional inicial del prototipo antes de modificar código.

### Caracterización V1 vs V2 (PSO-01)

[`audits/PSO_DASHBOARD_V1_V2_CHARACTERIZATION_20260928.md`](./audits/PSO_DASHBOARD_V1_V2_CHARACTERIZATION_20260928.md)

Adjudica V2 como baseline donante (`V2_WITH_V1_FEATURES_TO_PORT`), documenta la única capacidad V1-only (caché local con auto-restauración) y lista defectos compartidos por ambos.

### Contrato de fechas y longitudinalidad (PSO-05)

[`ops/PSO-05_LONGITUDINAL_DATE_CONTRACT.md`](./ops/PSO-05_LONGITUDINAL_DATE_CONTRACT.md)

Contrato semántico mínimo compartido por `index.html` y `Cuadro_Mando_Psoriasis_Valme_v2.html`:
formas de fecha soportadas (ISO, `dd/mm/yyyy`, serial Excel), valores inválidos como desconocidos,
selección de visita estrictamente anterior, fila actual del dashboard y limitación documentada del
empate del mismo día sin `visit_id`/`record_id`.

### Auditoría de onboarding Reuma → Dermatología (DERMA-READ-01)

[`audits/PROMUEVE_REUMA_DERMATOLOGY_ONBOARDING_AUDIT_20260928.md`](./audits/PROMUEVE_REUMA_DERMATOLOGY_ONBOARDING_AUDIT_20260928.md)

Auditoría read-only de la Reumatología **live** en `b32majus/Hub-Clinico-Badajoz` para el futuro
módulo Dermatología. Verifica baseline GitHub live, mapea arquitectura/flujo de datos, clasifica
patrones con `REUSE_CONCEPT` / `REUSE_AFTER_STRANGLER` / `DERMA_OWN_DOMAIN` /
`LEGACY_DO_NOT_COPY` / `PLANNED_NOT_IMPLEMENTED`, y separa lo implementado (Read Port F5.1) de lo
pendiente (F5.2/F5.3/F5.4, F6, F7) y de los defectos `KNOWN_LEGACY` preservados. No modifica PROMueve.

### Auditoría de onboarding Farmacia + Nexus/Foundation (DERMA-READ-01B)

[`audits/PROMUEVE_FARMACIA_NEXUS_DERMATOLOGY_ONBOARDING_AUDIT_20260928.md`](./audits/PROMUEVE_FARMACIA_NEXUS_DERMATOLOGY_ONBOARDING_AUDIT_20260928.md)

Auditoría read-only de la **Farmacia live** y del estado **Nexus/Foundation** en
`b32majus/Hub-Clinico-Badajoz` para el futuro módulo Dermatología. Verifica baseline GitHub live,
clasifica cada seam con `IMPLEMENTED` / `DOCUMENTED_DECIDED` / `PLANNED` / `NOT_FOUND`, mapea el
flujo lectura/escritura/handoff de Farmacia y separa explícitamente los seams tomables ahora
(`SAFE_TO_TARGET_NOW`) de los diferidos (`WAIT_FOR_FOUNDATION_OR_SEPARATE_WO`), los comportamientos
que no deben copiarse (`DO_NOT_COPY_FROM_FARMACIA`) y los blockers que exigen decisión humana o
producto posterior. Distingue el contrato de transporte e-Orden D17/D17_EXT_V1 (publicado) del
Pharmacy Act/entrega F4.4/F4.5 (solo arquitectura). No modifica PROMueve.

## 3. Decisiones vigentes

- La prioridad de producto es **PROMueve Extremadura / Dermatología**.
- Valme no debe convertirse primero en un producto perfecto para después “migrarlo”.
- Se realiza un saneamiento mínimo para obtener un contrato clínico fiable de Psoriasis.
- `Cuadro_Mando_Psoriasis_Valme_v2.html` es la **baseline donante** adjudicada por PSO-01 (veredicto `V2_WITH_V1_FEATURES_TO_PORT`).
- V1 no se elimina; su única capacidad V1-only es la caché local con auto-restauración, pendiente de adjudicar en PSO-06.
- La implementación real de Dermatología se hará nativamente en `Hub-Clinico-Badajoz` contra la autoridad viva de PROMueve Nexus.
- Este repo puede conservar auditorías read-only y diseño previo del onboarding para evitar contaminar PROMueve antes de aprobar el traslado.
- Solo datos sintéticos/demo en repositorios y QA.

## 4. Artefactos raíz del prototipo

| Artefacto | Rol actual |
|---|---|
| `index.html` | Formulario Psoriasis; sujeto a saneamiento mínimo |
| `Cuadro_Mando_Psoriasis_Valme_v2.html` | Dashboard de referencia / baseline donante (adjudicado PSO-01) |
| `Cuadro_Mando_Psoriasis_Valme_v1.html` | Referencia histórica temporal; no borrar |
| `Base Datos_PsO_Valme_demo.csv` | Fixture/demo textual visible |
| `Base Datos_PsO_Valme.xlsx` | XLSX presente; rol exacto pendiente de adjudicación |
| `psoriasis_valme_base_longitudinal.xlsx` | XLSX longitudinal; rol exacto pendiente de adjudicación |
| `Guia_Operativa_Psoriasis_Valme.docx` | Documentación operativa histórica |

No asumir que un XLSX es “master” hasta documentarlo explícitamente.

## 5. Próxima lectura

Para continuar el trabajo:

1. leer este índice;
2. leer `ops/WORK_ORDER_STATUS.md`;
3. leer el plan maestro;
4. abrir la auditoría inicial solo cuando se necesite detalle del diagnóstico;
5. verificar GitHub live antes de iniciar cualquier WO.

## 6. Regla de frontera con PROMueve

No modificar `b32majus/Hub-Clinico-Badajoz` desde este repo.

El paso a PROMueve exige gate de transferencia, WO propia y autorización explícita en el repositorio destino.
