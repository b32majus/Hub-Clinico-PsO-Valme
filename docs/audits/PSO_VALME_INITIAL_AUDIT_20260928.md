# Auditoría inicial — Hub Clínico Psoriasis Valme

**Fecha:** 2026-09-28  
**Repositorio:** `b32majus/Hub-Clinico-PsO-Valme`  
**Base auditada:** `main` @ `9d722c8da792ffe51ce2ea9a1420af71a70522f1`  
**Modo:** read-only; sin modificación de código funcional  
**Estado:** `AUDIT_BASELINE / ACTION_REQUIRED`  

## 1. Propósito

Esta auditoría conserva el diagnóstico técnico y funcional inicial del prototipo de Psoriasis de Valme antes de cualquier reparación.

El repositorio se creó como una prueba rápida y no debe interpretarse como una arquitectura consolidada ni como una implementación preparada para piloto real. Su valor actual es doble:

1. prototipo clínico funcional de Psoriasis con formulario, modelo longitudinal y cuadros de mando;
2. futuro **donante de conocimiento clínico y UX** para el módulo Dermatología de PROMueve Nexus, no base técnica que deba copiarse sin adjudicación.

## 2. Inventario factual del repositorio

En la base auditada existen ocho artefactos raíz:

- `index.html` — formulario estructurado de Psoriasis;
- `Cuadro_Mando_Psoriasis_Valme_v1.html` — dashboard versión 1;
- `Cuadro_Mando_Psoriasis_Valme_v2.html` — dashboard versión 2;
- `Base Datos_PsO_Valme.xlsx`;
- `psoriasis_valme_base_longitudinal.xlsx`;
- `Base Datos_PsO_Valme_demo.csv`;
- `Guia_Operativa_Psoriasis_Valme.docx`;
- `README.md`.

No existen todavía `src/`, tests, CI, package manager, schema versionado ni backend.

El modelo de datos es longitudinal: una fila representa una visita y `nusha` identifica al paciente. El CSV demo contiene 4 pacientes sintéticos (`VALM0001`–`VALM0004`) y 9 visitas.

## 3. Interpretación de V1 y V2

`Cuadro_Mando_Psoriasis_Valme_v2.html` es la **candidata de referencia operativa** porque es la versión nominalmente más avanzada y contiene la misma familia funcional que V1 con evolución posterior.

Esto **no autoriza todavía a borrar V1**. Antes de archivarla se realizará una caracterización/diff funcional para confirmar que V2 no perdió comportamiento útil.

Hasta completar esa comprobación:

- V2 = candidata de trabajo;
- V1 = referencia histórica temporal;
- ninguna de las dos se considera canónica para piloto real.

## 4. Hallazgos prioritarios

### P0 — Integridad clínica / analítica

#### P0.1. Estado potencialmente contaminable entre pacientes

El formulario intenta separar campos estables de campos de visita mediante `VISIT_SPECIFIC_FIELDS` y `clearVisitSpecificUI()`, pero la limpieza es parcial.

Campos como `derivacion_derma_reuma`, `impresion_clinica`, `objetivo_terapeutico`, `otras_derivaciones`, `proxima_revision` y `comentarios_finales` no quedan cubiertos por el mismo mecanismo. El estado terapéutico de primera visita tampoco se reconstruye de forma inequívoca al cambiar de paciente.

**Riesgo:** un valor de un paciente puede sobrevivir internamente al cambio de NUSHA y terminar exportado en otro registro aunque visualmente parte de la interfaz parezca limpia.

#### P0.2. `missing` puede convertirse en cero

PASI, DLQI y PURE-4 calculan valores numéricos incluso cuando el cuestionario/escala no está completado.

Ejemplos conceptuales:

- PASI no cumplimentado puede terminar en `0.0`;
- DLQI sin respuestas puede resultar `0`;
- PURE-4 incompleto puede producir un total.

Morisky está mejor resuelto porque distingue pendiente/incompleto de resultado válido y debe servir como patrón.

**Riesgo:** confundir ausencia de medición con ausencia de enfermedad/impacto y contaminar medias, clasificación y longitudinalidad.

#### P0.3. Semántica incorrecta de “última visita” en filtros de gestión

En el dashboard, `applyFilters()` filtra todas las visitas por criterios clínicos/terapéuticos y después aplica `getLatestRows()`.

Esto permite recuperar una visita antigua que cumplía el filtro aunque la visita más reciente del paciente ya no lo cumpla.

Ejemplo: paciente con biológico en junio y sin biológico en septiembre puede aparecer en el filtro “biológico activo”, porque septiembre se elimina antes de seleccionar la última visita sobreviviente.

**Riesgo:** cohortes y porcentajes incorrectos aunque la UI parezca coherente.

### P1 — Semántica clínica y longitudinal

#### P1.1. Precarga desde una visita futura

`getLatestVisitRow(id, currentDate)` intenta encontrar la visita previa a la fecha en curso, pero cuando no existe una visita anterior puede terminar seleccionando una visita posterior.

**Riesgo:** construir retrospectivamente una visita con información futura.

#### P1.2. PURE-4 positivo y derivación realizada se mezclan

Un PURE-4 positivo activa automáticamente `derivacion_derma_reuma = 1`.

Debe distinguirse entre:

- cribado positivo / recomendación de valorar derivación;
- decisión clínica de derivar;
- derivación efectivamente realizada.

#### P1.3. Estado de control mezcla intermedio con datos incompletos

`getControlStatus()` usa PASI, BSA, PGA y DLQI. Si existe algún dato pero no están todos, un caso que no entra en rojo puede acabar como `intermedia`.

Debe existir al menos una categoría explícita `datos_incompletos` separada de un estado clínico intermedio real.

#### P1.4. Denominadores no diferencian población total de evaluable

KPIs como `PASI > 10` usan como denominador la cohorte completa, incluso cuando parte de los pacientes no tiene PASI válido.

Para gestión deben poder distinguirse:

- `n / población total`;
- `n / evaluables`;
- cobertura de la variable.

#### P1.5. Escalas incompatibles en gráficos longitudinales

PASI, BSA y PGA comparten una escala fija de 0–30.

- PASI puede superar 30;
- BSA puede llegar a 100;
- PGA ocupa una escala mucho menor.

**Riesgo:** representación visual engañosa o fuera de rango.

## 5. Importación, exportación y portabilidad

### P0/P1. Dependencia JSZip externa al repositorio

Los HTML referencian:

`../../materials_hs_valme/node_modules/jszip/dist/jszip.min.js`

Ese árbol no existe dentro de este repositorio.

Consecuencias en un checkout limpio o publicación aislada:

- lectura XLSX rota;
- exportación XLSX del dashboard rota;
- la afirmación visual de modo autónomo resulta incompleta.

### P1. Fechas XLSX interpretadas de forma diferente

El dashboard reconoce seriales Excel y formatos de fecha; el formulario usa una lógica distinta basada en `new Date(value)`.

Dos consumidores de la misma base pueden ordenar/interpretar fechas de forma diferente.

### P1. Validación de schema insuficiente

El dashboard solo exige `nusha`, `fecha_visita` y `tipo_visita` para aceptar un fichero.

Una base incompatible puede cargarse silenciosamente con columnas clínicas ausentes/renombradas y producir un dashboard aparentemente válido.

### P1/P2. Exportación XLSX tipa todo como texto

El XLSX generado construye celdas `inlineStr`, por lo que números y fechas dejan de conservar tipo nativo.

### P1/P2. Riesgos de sanitización

- existen rutas de renderizado con `innerHTML` donde datos procedentes del Excel requieren escape consistente;
- el CSV protege delimitadores/comillas pero no neutraliza fórmulas que comiencen por `=`, `+`, `-` o `@`.

## 6. Identidad longitudinal

No existe un identificador explícito de visita como `visit_id` o `record_id`.

Cuando dos filas de un paciente comparten fecha, el desempate usa el orden físico (`__index`).

Debe formalizarse una identidad longitudinal independiente del orden de filas del Excel.

## 7. Persistencia y flujo operativo

El formulario:

1. carga una base;
2. usa esa base para precargar;
3. captura una visita;
4. exporta una fila CSV/TXT.

No existe una operación que incorpore de forma controlada esa visita al master longitudinal, detecte duplicados y confirme persistencia.

Por tanto existe un paso humano implícito entre captura y base maestra. Para un prototipo puede aceptarse, pero debe estar documentado y gobernado antes de cualquier uso real.

## 8. Duplicación y deuda técnica

V1 y V2 contienen aplicaciones completas muy similares. Además formulario y dashboard duplican utilidades como:

- parser XLSX;
- fechas;
- normalización;
- metadatos de comorbilidades y zonas especiales;
- terapia;
- escaping/renderizado.

La divergencia de fechas demuestra que esta duplicación ya genera comportamiento distinto.

Candidatos a código muerto/legado detectados:

- `updatePatientModuleAfterFilter()` sin comportamiento efectivo;
- estado de módulo con utilidad dudosa;
- compatibilidad terapéutica con columnas antiguas que debe adjudicarse antes de eliminarse.

## 9. Qué se conserva

La auditoría no recomienda reescritura total. Se consideran activos útiles:

- modelo longitudinal por visita;
- separación conceptual entre datos estables y datos de visita;
- captura estructurada de Psoriasis;
- PASI, BSA, PGA, DLQI, PURE-4 y Morisky;
- comorbilidades, localizaciones y zonas especiales;
- tratamiento estructurado por familias;
- vista longitudinal de paciente;
- dashboard poblacional;
- funcionamiento local/offline como objetivo de despliegue.

## 10. Qué NO se concluye todavía

Esta auditoría no demuestra:

- que V2 sea funcionalmente superior a V1 en todos los recorridos;
- que alguno de los XLSX sea la base maestra autorizada;
- que los XLSX binarios hayan sido verificados celda por celda;
- que la herramienta sea apta para piloto real;
- que la arquitectura técnica de Valme deba trasladarse a PROMueve Nexus.

## 11. Regla de trabajo resultante

La prioridad no es convertir este repo en la futura plataforma.

La prioridad es:

> **corregir solo lo necesario para obtener una referencia clínica fiable de Psoriasis y extraer de ella un contrato donante hacia PROMueve Dermatología.**

La implementación técnica futura de Dermatología se diseñará contra la autoridad viva de `b32majus/Hub-Clinico-Badajoz` y PROMueve Nexus, no mediante copia directa de estos HTML.
