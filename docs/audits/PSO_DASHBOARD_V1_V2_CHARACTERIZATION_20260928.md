# Caracterización V1 vs V2 — Cuadros de Mando Psoriasis Valme

**Fecha:** 2026-09-28
**Repositorio:** `b32majus/Hub-Clinico-PsO-Valme`
**WO:** PSO-01 (issue #2)
**Rama:** `work/pso-valme-train-a-20260928`
**HEAD al iniciar:** `8cffc18d5608d89765bbdebc18ab87d227aa5215`
**Modo:** read-only sobre funcionalidad; sin modificar V1, V2 ni fixtures
**Estado:** `DONE_VERIFIED` (caracterización documental)

## 0. Alcance y método

Se compararon los dos cuadros de mando completos, no solo títulos ni tamaño:

- `Cuadro_Mando_Psoriasis_Valme_v1.html` (en adelante **V1**), 2706 líneas.
- `Cuadro_Mando_Psoriasis_Valme_v2.html` (en adelante **V2**), 2751 líneas.

Método: `diff -u` completo entre ambos ficheros, extracción de la lista de funciones de cada uno, lectura íntegra del bloque `<script>` de V2 y verificación dirigida de V1 en cada punto de divergencia. Todo hallazgo se cita por ruta + función/identificador. Los nombres de función coinciden salvo donde se indica.

Este documento **no** modifica V1 ni V2, **no** borra V1 y **no** es un rediseño. Es una adjudicación factual del estado donante/referencia.

## 1. Inventario funcional y superficies

Ambos HTML contienen una aplicación completa con:

- carga de base XLSX (`onFileSelected`, `parseXLSX`, `processMatrix`);
- módulo **Gestión Global** (cohorte por última visita): `applyFilters`, `renderGestion`;
- módulo **Seguimiento de Paciente**: `searchPatient`, `renderPatient`;
- exportación XLSX: `exportFilteredXlsx`.

La estructura de paneles es idéntica en ambos (mismos `id`): `#moduleSwitch`, `#gestionBundle` (envuelve `#gestionPanel` + `#kpiGrid` + rejilla de gráficos + sección Exportación) y `#pacientePanel`.

Verificación de DOM: no hay `getElementById` sin `id` correspondiente en ninguno de los dos; los contenedores `#chart*` y `#kpiGrid` se resuelven por variable `containerId` dentro de `renderPie`/`buildBarList`/`renderGestion`, no por acceso directo. No hay UI rota por `id` huérfano.

## 2. Diferencias reales V1 → V2 (diff completo)

El diff íntegro entre V1 y V2 son 621 líneas y se agota en estos bloques:

| # | Ubicación | Naturaleza | ¿Cambia semántica clínica? |
|---|---|---|---|
| 1 | Bloque CSS (`:root`, `.kpi`, `.chart-card`, `.timeline`, `.visit-card`, `.module-switch`, `@keyframes pulseAlert`, etc.) | Estilo | No |
| 2 | HTML de `#loadStatus` (icono SVG + texto) | Cosmético | No |
| 3 | HTML de las 8 tarjetas KPI (atributos `title`, subtítulos `s`) | Cosmético | No |
| 4 | `const PATIENT_ONLY_MODE`: V1 `true` → V2 `false` | **Funcional** | **Sí (exposición de módulos)** |
| 5 | `renderPatientTimeline` | **Funcional** | No (añade indicador visual) |
| 6 | Cabeceras de `renderPatientHistoryTable` (atributos `title`) | Cosmético | No |
| 7 | `buildLineChartSvg` | **Funcional** | No (mismo dato, se añade relleno de área) |
| 8 | Eliminación en V2 de `buildRowsFromPlain`, `activateDataset`, `persistDatasetCache`, `restoreCachedDataset` (+ `DATA_CACHE_KEY`) | **Funcional** | **Sí (elimina caché local)** |
| 9 | `processMatrix`: V2 inlinea la activación y elimina la llamada a `persistDatasetCache` | Refactor equivalente | No (salvo que ya no persiste) |
| 10 | `wireEvents`/init: V2 elimina la llamada a `restoreCachedDataset()` | **Funcional** | **Sí (no auto-restaura)** |

No existe ninguna otra diferencia de comportamiento. Las funciones no listadas son **byte-idénticas** entre V1 y V2.

## 3. Matriz de capacidades

| Eje | V1 | V2 | Evidencia |
|---|---|---|---|
| Formato de importación | XLSX (`.xlsx`) únicamente | XLSX únicamente | `onFileSelected`, regex `/\.xlsx$/i` en ambos |
| Schema mínimo exigido | `nusha`, `fecha_visita`, `tipo_visita` | idéntico | `processMatrix`, ambos |
| Fallo ante schema incompleto | Cierra con error | idéntico | `processMatrix` lanza `Cabecera inválida…` |
| Parser XLSX | `parseXLSX` (`xl/workbook.xml`, rels, `sharedStrings.xml`, primera hoja) | idéntico | `parseXLSX`, ambos |
| Normalización de fechas | `parseDateValue` (serial 20000–80000, `dd/mm/yyyy`, `new Date`) | idéntico | `parseDateValue`, ambos |
| Modelo de fila | `__index`, `__date` | idéntico | `processMatrix`, ambos |
| Agrupación de paciente | `nusha` normalizado | idéntico | `getLatestRows`, `searchPatient` |
| Última visita | `getLatestRows` (máx `__date`, desempate `__index`) | idéntico | `getLatestRows`, ambos |
| Orden de visitas de paciente | ascendente por `__date`, desempate `__index` | idéntico | `searchPatient`, ambos |
| Filtros poblacionales | `applyFilters` (fecha, tipo, procedencia, fenotipo, curso, comorbilidad, zonas, familia, fármaco, control) | idéntico | `applyFilters`, ambos |
| Orden filtro → última visita | filtra visitas y luego `getLatestRows` | idéntico | `applyFilters` → `latestRows = getLatestRows(filteredVisitRows)` |
| Clasificación de control | `getControlStatus` (rojo PASI>10, BSA>10, PGA≥3, DLQI>10; verde todo ≤ umbral; resto intermedia) | idéntico | `getControlStatus`, ambos |
| KPIs de cohorte | `renderGestion` (8 KPIs) | idéntico | `renderGestion`, ambos |
| Denominadores KPI | `total = latestRows.length` | idéntico | `renderGestion`, ambos |
| Detalle de paciente | `renderPatient` → `renderPatientKpis`, `renderVisitActivityCharts`, `renderVisitTreatment`, `renderVisitDecision`, `renderVisitComorb`, `renderVisitLocations`, `renderPatientHistoryTable` | idéntico | mismos nombres en ambos |
| Gráficos longitudinales | `buildLineChartSvg` + `renderVisitActivityCharts` (PASI/BSA/PGA y DLQI/EVA/EVA, `yMax=30`) | idéntico + relleno de área | V2 `buildLineChartSvg`: nodos `<path>` de área |
| Historial de tratamiento | `summarizeTherapy`, `renderVisitTreatment`, `renderPatientHistoryTable` | idéntico | mismos nombres |
| Exportación | XLSX de `latestRows` (`exportFilteredXlsx`) | idéntica | `exportFilteredXlsx`, ambos |
| Tipado de export | todas las celdas `inlineStr` | idéntico | `createCellXml`, ambos |
| Módulos visibles | **solo Paciente** (`PATIENT_ONLY_MODE=true`; oculta `#moduleSwitch` y fuerza `module="paciente"`) | **Paciente + Gestión Global** (`PATIENT_ONLY_MODE=false`) | `toggleModule`, línea de declaración |
| Caché local de dataset | **sí** (localStorage, guarda y auto-restaura) | **no** | V1 `persistDatasetCache`/`restoreCachedDataset`; eliminadas en V2 |
| Dependencia XLSX | JSZip externo `../../materials_hs_valme/node_modules/jszip/dist/jszip.min.js` (ausente en el repo) | idéntica ruta ausente | `<script src=…>` en ambos |
| Escape HTML en plantillas | `escapeHtml` | idéntico | `escapeHtml`, ambos |
| Escape XML en export | `escapeXml` | idéntico | `escapeXml`, ambos |

## 4. Diferencias semánticas materiales

### 4.1 V2-only: se habilita el módulo Gestión Global completo

- V1: `const PATIENT_ONLY_MODE = true;` (V1 ~1441). `toggleModule` (V1 ~1549) fuerza `module = "paciente"` y añade `hidden` a `#moduleSwitch`. En consecuencia, `#gestionBundle` (que contiene `#gestionPanel`, `#kpiGrid`, los gráficos y la sección **Exportación**) queda oculto y **no es alcanzable por UI**. Los cálculos de cohorte se ejecutan sobre DOM oculto al cargar, pero el usuario no puede verlos ni exportar.
- V2: `const PATIENT_ONLY_MODE = false;` (V2 ~1536). El conmutador es visible y `btnGestion` muestra el dashboard poblacional y habilita `exportFilteredXlsx`.

**Impacto:** el valor funcional principal de V2 frente a V1 es exponer la gestión poblacional y la exportación XLSX. No es una pérdida de V1, sino una capacidad añadida.

### 4.2 V1-only: caché local del dataset con auto-restauración

- V1 implementa `persistDatasetCache()` (V1 ~2407) y `restoreCachedDataset()` (V1 ~2428) con clave `DATA_CACHE_KEY = "pso_valme_dashboard_cache_v1"` (V1 ~1442), apoyadas en `buildRowsFromPlain` y `activateDataset`. `processMatrix` llama a `persistDatasetCache()` y la inicialización llama a `restoreCachedDataset()` (V1 ~2688).
- V2 elimina las cuatro funciones, la constante y ambas llamadas (`processMatrix` inlinea la activación; `wireEvents`/init ya no restaura).

**Impacto:** en V1, tras cargar un XLSX una vez, al recargar la página el dataset se reconstruye desde `localStorage` sin volver a seleccionar el fichero. En V2 hay que recargar el fichero cada vez. Es la **única capacidad funcional presente en V1 y ausente en V2**. Tiene además implicación de gobierno de datos (persistencia de contenido clínico en el navegador) que debe adjudicarse explícitamente; los fixtures son sintéticos, pero la capacidad no debe descartarse en silencio.

### 4.3 V2-only: indicador de cambio de tratamiento en timeline

`renderPatientTimeline` en V2 calcula `txChange = normalizeText(row.seguimiento_motivo_cambio) !== ""` y añade la clase `tx-change` y un `.timeline-node`; V1 solo marca la visita activa. Es una mejora visual informativa, no cambia datos ni agregados.

### 4.4 V2-only: relleno de área en gráficos longitudinales

`buildLineChartSvg` en V2 genera `<path>` de área (`fill-opacity="0.1"`) además de la línea; V1 solo pinta `<polyline>`. Los valores, el `yMax=30` y los ejes son idénticos.

### 4.5 Equivalentes (refactor sin cambio de semántica)

- `processMatrix`: V2 inlinea lo que V1 hacía vía `activateDataset`; mismo `__index`, `__date`, mismo filtro de NUSHA vacío y mismo `setLoadStatus`/`buildFilterOptions`/`applyFilters`/`toggleModule("paciente")`.
- `renderPatientHistoryTable` y HTML de KPIs: solo metadatos `title` y subtítulos.
- Bloque CSS: rediseño visual sin impacto en datos.

## 5. Cobertura de datos y fixtures

- `Base Datos_PsO_Valme.xlsx`: hoja `Base_PsO`, **174 columnas**, cabecera `nusha, fecha_visita, tipo_visita, …` — compatible con el schema que exige el dashboard.
- `Base Datos_PsO_Valme_demo.csv`: **174 columnas**, misma cabecera; 9 filas de visita para 4 pacientes sintéticos (`VALM0001`×3, `VALM0002`×2, `VALM0003`×1, `VALM0004`×3).
- `psoriasis_valme_base_longitudinal.xlsx`: hojas `VISITAS, DICCIONARIO, README, CATALOGOS`; la hoja `VISITAS` usa `id_paciente`/`nhc` y **no contiene `nusha`** (124 columnas, esquema distinto: `napsi`, `seguimiento_motivo_modificacion`, `tx_instaurado_*`, `comorb_otras_hepatopatias`…).

**Conclusión de fixtures:** ambos dashboards **fallan en cerrado** ante el XLSX longitudinal porque `processMatrix` exige `nusha`. Es decir, V1 y V2 solo aceptan el esquema `Base Datos_PsO_Valme` y no el longitudinal. Los fixtures no se han modificado (verificado por `git status` limpio en estos paths).

Campos leídos por el dashboard (V2; idénticos en V1): directos `nusha, fecha_visita, tipo_visita, procedencia, fenotipo, curso_evolutivo, bsa, pga, pasi, dlqi_total, pure4_total_positivas, eva_prurito, eva_dolor, derivacion_derma_reuma, seguimiento_adherencia_categoria, seguimiento_ajuste_terapeutico, seguimiento_efectos_adversos, seguimiento_morisky_total_no_adherencia, seguimiento_motivo_cambio`, más los definidos en `COMORBIDITY_FIELDS` (19), `SPECIAL_ZONE_FIELDS` (7), `LOCATION_FIELDS` (10) y `THERAPY_FAMILIES` (4 familias × 3 slots × fármaco/posología + `*_otros`, y prefijos `tx_primera`/`tx_seguimiento`).

## 6. Defectos compartidos por ambos (no legitimados por esta caracterización)

Los siguientes defectos existen en el código de V1 y V2 (muchos solo son alcanzables por UI en V2, porque V1 oculta la gestión). Se listan como defectos pendientes, no como contrato válido:

1. **Filtro de estado resucita visitas antiguas.** `applyFilters` filtra visitas y después aplica `getLatestRows`, por lo que un criterio clínico puede recuperar una visita antigua aunque la más reciente ya no lo cumpla. Ambos. (Auditoría inicial P0.3.)
2. **Control “intermedia” mezcla estado clínico y datos incompletos.** `getControlStatus` devuelve `intermedia` cuando hay algún dato pero no todos y no es rojo; no distingue `datos_incompletos`. Ambos. (P1.3.)
3. **Denominadores KPI no distinguen población total de evaluable.** `renderGestion` usa `total = latestRows.length` como denominador de PASI>10, BSA>10, biológico y zonas especiales. Ambos. (P1.4.)
4. **Escalas incompatibles en gráfico longitudinal.** `renderVisitActivityCharts` pinta PASI, BSA y PGA juntos con `yMax=30` fijo; PASI puede superar 30, BSA llega a 100 y PGA usa escala menor. Ambos. (P1.5.)
5. **Export XLSX tipa todo como texto.** `createCellXml` genera `t="inlineStr"` para toda celda. Ambos. (P1/P2.)
6. **Validación de schema insuficiente.** `processMatrix` solo exige 3 columnas; columnas clínicas ausentes/renombradas cargan silenciosamente. Ambos. (P1.)
7. **Dependencia JSZip ausente en checkout limpio.** Ruta externa `../../materials_hs_valme/node_modules/jszip/dist/jszip.min.js` no existe en el repo; rompe lectura y exportación XLSX en aislamiento. Ambos. (P0/P1 de la auditoría inicial.)
8. **Inyección/escape incompleto en detalle de tratamiento.** `renderVisitTreatment` inserta `item.drug` y `item.posology` (procedentes del Excel) en `innerHTML` **sin `escapeHtml`**, mientras el resto de renderizadores sí escapan. Ambos. (Riesgo de sanitización de la auditoría inicial.)
9. **Sin identidad de visita.** No existe `visit_id`/`record_id`; el desempate depende de `__index` (orden físico). `getLatestRows` y `searchPatient`. Ambos. (Sección 6 de la auditoría inicial.)
10. **Código muerto/orfandad.** `updatePatientModuleAfterFilter` es un stub vacío no invocado en ambos. En V1, `#gestionBundle`/`#gestionPanel`/`#moduleSwitch` son UI inalcanzable por `PATIENT_ONLY_MODE=true`.

**Nota de exactitud:** los defectos P0.2 (missing→0 en PASI/DLQI/PURE-4), P1.1 (precarga desde visita futura) y P1.2 (PURE-4 positivo → derivación) descritos en la auditoría inicial pertenecen al formulario `index.html`, **no** a V1/V2. Los dashboards leen totales precalculados (`pasi`, `dlqi_total`, `pure4_total_positivas`) y tratan vacío como `NaN` vía `toNumber`. No se citan aquí como defectos de los dashboards.

**Nota:** la inyección de fórmulas CSV (`=`,`+`,`-`,`@`) pertenece a la exportación CSV de `index.html`, no a los dashboards, que solo exportan XLSX.

## 7. Veredicto de baseline donante

**Veredicto: `V2_WITH_V1_FEATURES_TO_PORT`**

Justificación basada en evidencia:

- V2 es funcionalmente **superconjunto** de V1 en todas las superficies clínicas evaluadas: contiene el mismo parser, schema, normalización de fechas, agrupación/última visita, filtros, `getControlStatus`, KPIs, detalle de paciente, gráficos longitudinales, historial de tratamiento y exportación; además **habilita** el módulo Gestión Global completo (`PATIENT_ONLY_MODE=false`) y añade indicador de cambio de tratamiento y relleno de área.
- V1 **no** contiene ninguna capacidad clínica o analítica ausente en V2. La única capacidad funcional V1-only es la **caché local con auto-restauración** (`persistDatasetCache`/`restoreCachedDataset`), que V2 eliminó. Debe adjudicarse explícitamente (portar, sustituir o descartar de forma consciente) antes de fijar el contrato donante, por lo que la baseline es V2 *con* un elemento a adjudicar.
- Por tanto, `V2_BASELINE_CONFIRMED` sería inexacto (omitiría la caché V1-only) y `NO_BASELINE_YET` no procede (V2 es claramente la referencia más completa).

**Alcance del veredicto:** se refiere **solo** al estatus donante/referencia entre V1 y V2. **No** implica aptitud para piloto, ni que V2 esté libre de los defectos compartidos de la sección 6, ni que su arquitectura técnica deba trasladarse a PROMueve Nexus. V1 **permanece intacto** y no debe borrarse en esta fase.

## 8. Recomendaciones para tickets posteriores

1. Adjudicar la caché local V1 en PSO-06 (portabilidad/offline) o descartarla motivadamente; no eliminarla sin registro.
2. Cerrar los defectos compartidos de la sección 6 en los P0/P1 correspondientes (PSO-02…PSO-06) sobre V2.
3. Usar V2 como única referencia de lectura para caracterizar comportamiento; no tratar el comportamiento defectuoso como contrato donante (principio 4 del plan maestro).
