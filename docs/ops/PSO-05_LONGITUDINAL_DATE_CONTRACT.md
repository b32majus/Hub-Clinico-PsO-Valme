# Contrato de fechas y longitudinalidad — PSO-05

**Fecha:** 2026-09-28  
**WO:** PSO-05 (issue #8)  
**Ámbito:** `index.html` (formulario) y `Cuadro_Mando_Psoriasis_Valme_v2.html` (dashboard).  
**Tipo:** contrato semántico mínimo, no rediseño de schema.

## 1. Normalización de fechas (contrato único)

Las dos superficies comparten la misma función semántica `parseCalendarDate(value)`
(en el formulario `parseDateToTs` la envuelve). Devuelve un `Date` a medianoche
**local** (o `null`/`NaN` si la entrada es desconocida), de modo que un día de
calendario nunca se desplaza por zona horaria.

Formas soportadas:

| Entrada | Interpretación |
|---|---|
| `yyyy-mm-dd`, `yyyy/mm/dd` (parte horaria opcional ignorada) | día de calendario local |
| `dd/mm/yyyy`, `d/m/yyyy` | día de calendario local |
| serial Excel (sistema 1900) en `[20000, 80000]` | día de calendario local |
| vacío / ilegible | desconocido (`null` / `NaN`) |

Reglas:

- Un número desnudo fuera del rango de serial **no** es una fecha.
- La parte fraccionaria de un serial se descarta (`Math.floor`): el día de
  calendario no se desplaza por la hora.
- Fechas con desbordamiento (`31/02/2026`) o mes inválido (`13/13/2026`) se
  rechazan; no hay *fallback* a otro formato que las convierta en válidas.
- Ningún valor inválido se transforma en epoch, fecha actual ni fecha por defecto.

## 2. Selección de visita previa (formulario)

Dado el paciente P y la fecha de encuentro D:

- solo son elegibles visitas de P con fecha válida **estrictamente anterior** a D;
- sin visita elegible → `null` y **no se hidrata nada** (ni campos estables ni
  terapia) desde una visita futura o del mismo día;
- las fechas inválidas/ilegibles nunca se convierten en visita previa.

**D desconocida (vacía/inválida):** el formulario no puede probar orden alguno.
Conserva su comportamiento histórico de precargar la última visita conocida
(útil al teclear el NUSHA antes de la fecha) pero ignora filas sin fecha válida.
Es una limitación explícita: el clínico debe fijar la fecha de visita para
restringir la precarga a historia realmente previa.

## 3. Fila actual del dashboard (V2)

`getLatestRows()` elige la visita de fecha válida más reciente por paciente.
Una fila sin fecha válida **no** puede representar el estado actual del paciente
(no hay *fallback* a orden de origen): los pacientes sin ninguna fecha válida no
entran en la cohorte de estado actual. La ventana temporal del *visit scope* ya
excluía las fechas inválidas cuando hay filtro de fecha.

## 4. Empates del mismo día (limitación)

No existe `visit_id`/`record_id` (deuda P1/P2 de la auditoría inicial). Ante dos
registros del mismo paciente y misma fecha:

- el formulario usa el **mayor `__index`** (última fila del fichero);
- el dashboard usa el **mayor `__index`** vía `getLatestRows()`;
- el empate es determinista y reproducible, pero **no** implica que una visita
  sea clínicamente posterior a la otra. Es una limitación documentada, no una
  afirmación de orden clínico.

Con D válida, una visita del mismo día **no** cuenta como previa (`< D`
estricto), lo que evita presentar como historia una visita simultánea.

## 5. Deuda restante

- Añadir identidad explícita de visita (`visit_id`/`record_id`) para resolver
  empates por identidad y no por orden físico. Fuera del alcance de PSO-05.
- El dashboard sigue mostrando en el historial de paciente filas sin fecha; se
  rotulan con `-` y no participan en la selección de fila actual ni en el trend.
