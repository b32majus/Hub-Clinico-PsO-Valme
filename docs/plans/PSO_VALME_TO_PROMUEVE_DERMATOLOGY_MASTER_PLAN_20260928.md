# Plan maestro — Psoriasis Valme → PROMueve Dermatología / Nexus

**Fecha:** 2026-09-28  
**Repositorio de coordinación:** `b32majus/Hub-Clinico-PsO-Valme`  
**Base inicial:** `main` @ `9d722c8da792ffe51ce2ea9a1420af71a70522f1`  
**Estado:** `PLANNED / TECHNICAL_EXECUTION_NOT_AUTHORIZED_BY_THIS_DOCUMENT`  
**Prioridad de producto:** Extremadura / PROMueve  

## 1. Decisión de producto

Este repositorio se utilizará como **workspace aislado de análisis, rescate mínimo y diseño de handoff** para Psoriasis antes de incorporar Dermatología a PROMueve.

No se convertirá Valme en PROMueve Nexus ni se copiarán sus HTML directamente al Hub Clínico Badajoz.

La estrategia es:

```text
PsO-Valme
  ↓ saneamiento mínimo
referencia clínica fiable
  ↓ extracción de contrato
contrato donante Psoriasis
  +
auditoría live Reuma/Farmacia/Nexus
  ↓
diseño módulo Dermatología
  ↓
WO separada en Hub-Clinico-Badajoz
  ↓
primera vertical Psoriasis en PROMueve Nexus
```

La prioridad temporal es llegar a **Dermatología en Extremadura** con seguridad, no perfeccionar Valme como producto independiente.

## 2. Separación estricta de repositorios

### `b32majus/Hub-Clinico-PsO-Valme`

Responsabilidades:

- conservar auditoría de Valme;
- reparar únicamente defectos necesarios para obtener una referencia fiable;
- caracterizar V1/V2;
- documentar el contrato clínico/longitudinal de Psoriasis;
- ejecutar auditorías read-only de PROMueve cuando sean necesarias para diseñar el handoff;
- documentar el diseño de onboarding de Dermatología antes de tocar PROMueve.

### `b32majus/Hub-Clinico-Badajoz`

Responsabilidades futuras, solo tras autorización explícita:

- implementación real del módulo Dermatología;
- adaptación a contratos/stranglers Nexus;
- navegación/Home/qualification hospital×módulo;
- integración con Farmacia/Reuma donde exista contrato explícito;
- release, QA y documentación de PROMueve.

### Regla

**No se modifica `Hub-Clinico-Badajoz` desde una WO de Valme.**

Cualquier cambio en PROMueve requerirá:

1. verificación GitHub live;
2. lectura de `docs/INDEX.md` y `docs/ops/WORK_ORDER_STATUS.md` vigentes;
3. WO propia en el repo PROMueve;
4. rama/worktree aislado;
5. autorización explícita para commit/push/PR/merge según corresponda.

## 3. Autoridad de arquitectura futura

En la verificación live realizada al redactar este plan, PROMueve Nexus ya define:

- monolito modular en `b32majus/Hub-Clinico-Badajoz`;
- Home hospitalaria sin carga clínica inicial;
- hospital fijo por deployment;
- qualification `hospital × módulo`;
- sin paciente universal por ahora;
- Read Ports por módulo mediante strangler;
- actos de escritura independientes;
- Excel como adapter de primera clase, no como modelo conceptual;
- sin form builder ni rule engine genérico en Foundation;
- Dermatología como futuro módulo real, no equivalente a una plantilla.

La rama publicada de Farmacia sigue siendo `recovery/farmacia-pr-replay-20260727`; su tip es volátil y debe verificarse live antes de cualquier diseño o ejecución posterior.

Este plan **no congela** SHAs de PROMueve como verdad futura.

## 4. Principios rectores

1. **Extremadura manda el ritmo.**
2. **Valme es donante, no arquitectura objetivo.**
3. **Primero correctitud clínica; después limpieza técnica.**
4. **No usar comportamiento defectuoso como contrato donante.**
5. **Missing no equivale a cero ni a NO.**
6. **Estado actual del paciente se determina antes de filtros de estado actual.**
7. **No inferir decisiones clínicas desde scores o catálogos sin regla explícita aprobada.**
8. **Datos sintéticos únicamente en repositorios y QA.**
9. **V2 es candidata de referencia; V1 no se elimina hasta caracterización.**
10. **No reescritura masiva ni framework nuevo para rescatar Valme.**
11. **No implementar Nexus dentro de Valme.**
12. **No tocar PROMueve hasta completar el gate de diseño y recibir autorización específica.**

## 5. Flujo de trabajo global

### Fase 0 — Baseline documental

**Objetivo:** preservar lo descubierto y fijar el plan antes de modificar código.

Entregables:

- auditoría inicial;
- plan maestro;
- índice documental;
- tablero de WOs;
- README de entrada.

Estado: **en ejecución documental en esta rama**.

### Fase 1 — Saneamiento mínimo de PsO-Valme

No busca dejar Valme terminado. Solo elimina defectos capaces de contaminar el conocimiento que trasladaremos.

Orden:

1. caracterización V1/V2;
2. aislamiento de estado por paciente;
3. semántica de scores incompletos;
4. semántica de cohorte/última visita del dashboard;
5. visita previa y fechas longitudinales;
6. portabilidad mínima XLSX/schema.

**Gate F1:** existe una referencia Psoriasis reproducible con datos sintéticos en la que los defectos P0 clínicos/analíticos están cerrados.

### Fase 2 — Contrato donante Psoriasis

Extraer del prototipo, sin copiar su implementación:

- identidad de paciente/visita;
- tipos de visita;
- datos estables vs por visita;
- índices y PROs;
- comorbilidades;
- localizaciones/zonas especiales;
- tratamiento;
- decisión/seguimiento;
- reglas derivadas;
- longitudinalidad;
- dashboard de paciente;
- dashboard poblacional;
- missingness y cobertura;
- inputs/outputs;
- provenance mínima;
- elementos específicos de Valme que **no** deben exportarse.

**Gate F2:** existe un documento de contrato suficientemente preciso para diseñar Psoriasis en otro sistema sin abrir los HTML para adivinar su semántica.

### Fase 3 — Auditoría dirigida de PROMueve live

Auditoría read-only contra `b32majus/Hub-Clinico-Badajoz`.

Preguntas, no auditoría general:

1. ¿Qué patrón de Reuma sirve para un módulo clínico longitudinal multipatología?
2. ¿Qué seams de Farmacia son realmente reutilizables?
3. ¿Qué partes del Architecture Freeze ya existen en runtime y cuáles siguen solo decididas?
4. ¿Qué contrato de lectura/escritura debe respetar Dermatología?
5. ¿Qué componentes horizontales ya deben compartirse y cuáles deben permanecer de dominio?
6. ¿Cómo debe entrar Psoriasis sin crear paciente universal ni engine genérico?
7. ¿Qué impacto tiene Foundation en la secuencia de incorporación?

Se revisarán, como mínimo, en su estado live:

- repo/rama/HEAD/PRs relevantes;
- `docs/INDEX.md`;
- `docs/ops/WORK_ORDER_STATUS.md`;
- Architecture Decision Freeze;
- Foundation Train Plan;
- runtime/config/ports reales de Reuma y Farmacia;
- contratos y oráculos vivos relacionados.

El informe se guardará inicialmente **en este repositorio** para mantener el onboarding de Dermatología aislado hasta aprobar su traslado.

**Gate F3:** matriz factual `REUTILIZAR / ADAPTAR / NO REUTILIZAR / AÚN NO EXISTE`.

### Fase 4 — Diseño objetivo PROMueve Dermatología

Combinar F2 + F3.

Salida esperada:

```text
PROMueve Nexus
└── Dermatología
    ├── Psoriasis [primera vertical]
    ├── HS [posterior]
    ├── DA [posterior]
    ├── Vitíligo [posterior]
    └── Alopecia areata [posterior]
```

No se construirá un engine genérico de patologías si los seams Foundation no lo justifican.

El diseño debe definir:

- ownership del módulo;
- rutas y navegación;
- qualification hospital×módulo;
- contratos de lectura;
- actos de escritura;
- modelo longitudinal;
- configuración permitida;
- scores y reglas clínicas gobernadas;
- persistencia/adapters;
- dashboard paciente/poblacional;
- handoffs con Farmacia;
- límites con Reuma/APs;
- release/QA.

**Gate F4:** diseño aprobado y backlog de WOs para `Hub-Clinico-Badajoz`.

### Fase 5 — Transferencia a PROMueve

Solo después de autorización explícita.

Acciones:

1. verificar autoridad live de PROMueve;
2. crear issue/WO en el repo correcto si se autoriza;
3. crear rama/worktree aislado;
4. implementar primera vertical Psoriasis nativamente contra Nexus;
5. QA sintético;
6. revisión independiente cuando el riesgo lo justifique;
7. PR/merge solo dentro de autorización;
8. reconciliar documentación viva de PROMueve.

### Fase 6 — Valme completo, si sigue aportando valor

Deferred.

Solo se ejecutará si existe una necesidad real de mantener Valme como producto independiente.

Puede incluir:

- modularización amplia;
- limpieza final de V1;
- seguridad adicional;
- export XLSX tipado;
- automatización de persistencia;
- CI completo;
- packaging local.

No bloquea Extremadura.

## 6. Work Orders candidatas

Los siguientes IDs son **nombres de planificación**, no issues creados ni autorización de ejecución.

### DOC-00 — Baseline y plan maestro

**Objetivo:** dejar autoridad documental mínima en este repo.  
**Base esperada:** `main` @ `9d722c8...`.  
**Preflight:** repo/branch/HEAD, árbol raíz, README, ausencia de docs.  
**Alcance:** solo Markdown/README.  
**NO TOCA:** HTML, XLSX, CSV, DOCX, `main`.  
**Reversión:** eliminar la rama documental; `main` queda intacto.  
**Tests/QA:** verificar enlaces Markdown y que el diff solo contiene documentación.  
**Aceptación:** audit + master plan + INDEX + WOS + README navegables.  
**Commit/push:** permitido por la instrucción de documentar el repositorio, exclusivamente en rama aislada.  
**PR/merge:** no autorizado por esta instrucción.  

### PSO-01 — Caracterización V1 vs V2

**Objetivo:** adjudicar V2 como referencia o detectar regresiones respecto a V1.  
**Base:** HEAD live de la rama de trabajo que se cree desde `main`.  
**Preflight:** hashes V1/V2, árbol limpio, navegador disponible.  
**Alcance:** comparación de comportamiento, DOM, inputs, filtros, dashboard y dependencias.  
**NO TOCA:** lógica clínica, bases, UX, Promueve.  
**Reversión:** N/A si es read-only.  
**Tests/QA:** abrir ambos con mismo dataset sintético y registrar diferencias.  
**Aceptación:** matriz de diferencias + decisión explícita sobre V2; V1 no se elimina en esta WO.  
**Delivery:** informe documental; no PR/merge salvo autorización.

### PSO-02 — Aislamiento de estado por paciente

**Objetivo:** impedir contaminación entre NUSHA/pacientes.  
**Preflight:** reproducir el defecto con fixture sintético A→B.  
**Alcance:** reconstrucción/reset de estado al cambiar paciente y al crear nuevo paciente.  
**NO TOCA:** scores, dashboard poblacional, arquitectura Nexus, estilo.  
**Reversión:** commit atómico.  
**Tests:** A→B, B→A, nuevo paciente, primera/seguimiento, tratamiento, derivación, plan.  
**QA navegador:** obligatoria.  
**Aceptación:** cero valores de A en export/UI/estado de B.  
**Commit/push/PR/merge:** según autorización específica de la WO.

### PSO-03 — Missingness de PASI/DLQI/PURE-4

**Objetivo:** `no medido` no se serializa como `0`.  
**Preflight:** caracterizar vacío, parcial y completo.  
**Alcance:** cálculo/estado de esos tres instrumentos.  
**NO TOCA:** criterios clínicos de control salvo adaptación necesaria para reconocer incompleto; Morisky salvo reutilizar patrón.  
**Tests:** vacío, parcial, todo cero legítimo, valores completos, reset.  
**QA:** UI debe diferenciar pendiente/incompleto/resultado 0 real.  
**Aceptación:** ausencia no produce score válido.

### PSO-04 — Cohorte actual y filtros del dashboard

**Objetivo:** separar scope temporal, estado actual del paciente y filtros poblacionales.  
**Preflight:** fixture con paciente que cambia tratamiento/control.  
**Alcance:** pipeline de dataset de gestión.  
**NO TOCA:** formulario de captura, diseño visual amplio.  
**Tests:** biológico iniciado/retirado, cambio de control, comorbilidad, ventana temporal.  
**Aceptación:** filtro de estado actual nunca resucita una visita antigua como estado vigente.

### PSO-05 — Longitudinalidad y fechas

**Objetivo:** impedir precarga desde el futuro y unificar parsing temporal.  
**Alcance:** selección de visita previa y parser de fechas compartible.  
**NO TOCA:** cálculo de scores, dashboard cohortal salvo uso del parser corregido.  
**Tests:** ISO, `dd/mm/yyyy`, serial Excel, visita anterior inexistente, misma fecha, orden.  
**Aceptación:** si no existe visita previa, no se precarga una posterior.

### PSO-06 — Portabilidad XLSX y validación de schema

**Objetivo:** checkout limpio capaz de leer/exportar XLSX sin depender de rutas externas y fallar cerrado ante schemas incompatibles.  
**Alcance:** dependencia XLSX/JSZip y contrato mínimo de carga.  
**NO TOCA:** backend, framework, React, Nexus.  
**Tests:** checkout aislado, XLSX válido, fichero incompatible, dependencia ausente, mensaje de error.  
**Aceptación:** modo local verdaderamente autocontenido para los recorridos declarados.\
**Estado (Train-B, 2026-09-29):** ejecutada como **PSO-06A** (JSZip repo-local) y **PSO-06B**
(contrato de carga fail-closed), ambas `DONE_VERIFIED`; ver `docs/ops/WORK_ORDER_STATUS.md` y el
handoff de QA manual. El gate de QA visual manual sigue pendiente y no está cubierto por esta
aceptación técnica.

### PSO-07 — Contrato donante Psoriasis

**Objetivo:** documentar semántica clínica independiente de HTML/Excel.  
**Dependencias:** PSO-02…PSO-05 cerradas o adjudicadas; PSO-06A/PSO-06B cerradas; **gate de QA
manual de Train-B adjudicado**.\
**Alcance:** diccionario, entidades, reglas, estados, lineage y vistas requeridas.  
**NO TOCA:** código PROMueve.  
**Aceptación:** un equipo puede diseñar una nueva implementación sin inferir la semántica desde el DOM.

### DERMA-READ-01 — Auditoría de onboarding PROMueve

**Objetivo:** identificar el patrón correcto para Dermatología en la autoridad live de PROMueve.  
**Tipo:** read-only.  
**Base:** se verifica en GitHub al ejecutarse; nunca usar SHA recordado.  
**Alcance:** Reuma + Farmacia + Foundation/Nexus.  
**NO TOCA:** ningún código ni documento de `Hub-Clinico-Badajoz`.  
**Salida:** informe en este repo con matriz `REUTILIZAR / ADAPTAR / NO REUTILIZAR / AÚN NO EXISTE`.  
**Aceptación:** diseño posterior puede distinguir seams implementados de decisiones todavía solo documentales.

### DERMA-DESIGN-01 — Diseño módulo Dermatología

**Objetivo:** producir arquitectura y backlog para primera vertical Psoriasis.  
**Dependencias:** PSO-07 + DERMA-READ-01.  
**Alcance:** contratos, ownership, rutas, datos, dashboards, persistencia, qualification, QA.  
**NO TOCA:** runtime PROMueve.  
**Aceptación:** backlog de WOs atómicas listo para trasladarse al repo PROMueve bajo autorización.

### PROMUEVE-DERMA-* — Implementación

**Estado:** fuera de este repositorio y fuera de autorización actual.  

Se crearán únicamente en `Hub-Clinico-Badajoz` después del gate F4 y de una instrucción explícita.

## 7. Orden de ejecución recomendado

Para maximizar velocidad hacia Extremadura:

```text
DOC-00
  ↓
PSO-01
  ↓
┌───────────────────────────────┐
│ PSO-02 → PSO-03 → PSO-04/05 │
│                               │
│ DERMA-READ-01  (en paralelo)  │
└───────────────┬───────────────┘
                ↓
          PSO-06 si bloquea
                ↓
             PSO-07
                +
         DERMA-READ-01
                ↓
        DERMA-DESIGN-01
                ↓
      GATE DE TRANSFERENCIA
                ↓
       Hub-Clinico-Badajoz
```

No se espera a “terminar Valme” para iniciar la auditoría read-only de PROMueve.

## 8. Gate de transferencia a PROMueve

No se toca `Hub-Clinico-Badajoz` hasta cumplir:

- [ ] V2 caracterizada frente a V1;
- [ ] P0 de contaminación entre pacientes cerrado;
- [ ] missingness de scores adjudicada;
- [ ] semántica de última visita/cohorte corregida o contractualmente excluida;
- [ ] longitudinalidad temporal fiable;
- [ ] contrato donante Psoriasis publicado en este repo;
- [ ] auditoría live Reuma/Farmacia/Nexus completada;
- [ ] matriz de reutilización cerrada;
- [ ] diseño Dermatología aprobado;
- [ ] alcance de primera vertical Psoriasis acotado;
- [ ] autorización explícita para iniciar WO en PROMueve.

## 9. Primera vertical objetivo en Extremadura

La primera incorporación propuesta será **Psoriasis**, porque permite reutilizar un prototipo ya existente y fuerza a resolver los seams necesarios para futuras patologías dermatológicas sin construir generalidad especulativa.

Debe incluir solo lo que el diseño aprobado justifique, previsiblemente:

- acceso al módulo Dermatología desde Nexus;
- contexto de deployment/site correcto;
- búsqueda/selección según contrato del módulo, no paciente universal;
- primera visita y seguimiento de Psoriasis;
- índices/PROs aprobados;
- tratamiento estructurado sin inferencias indebidas;
- longitudinal de paciente;
- dashboard poblacional;
- outputs/persistencia mediante adapters soportados;
- handoff explícito con Farmacia cuando corresponda.

## 10. Patologías posteriores

La existencia de una plantilla previa Dermatología→Farmacia para HS, Psoriasis, dermatitis atópica, vitíligo y alopecia areata se considera **material donante**, no módulos implementados.

Orden posterior se decidirá por necesidad asistencial real, no por completar una lista.

## 11. Datos y seguridad

- Solo fixtures/datos sintéticos en Git, issues, tests y documentación técnica.
- No introducir datos reales de pacientes ni identificadores clínicos reales.
- No inferir dosis, pauta, vía, presentación, duración, switch, causalidad o decisiones terapéuticas desde catálogos o datos ausentes.
- Un score positivo no equivale automáticamente a una acción clínica realizada.
- Un tratamiento registrado/solicitado no equivale a validado.

## 12. Criterio de éxito del plan

El plan se considera cumplido cuando:

1. Psoriasis Valme ha dejado de ser una caja negra clínica;
2. sus defectos capaces de contaminar el contrato donante están corregidos;
3. existe un contrato Psoriasis independiente de la implementación;
4. sabemos factual y live cómo encaja Dermatología en PROMueve;
5. la primera vertical de Psoriasis puede ejecutarse en `Hub-Clinico-Badajoz` mediante WOs pequeñas sin copiar deuda de Valme ni inventar Nexus.
