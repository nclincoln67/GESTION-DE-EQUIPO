# Gestión de Equipo — Plan funcional de la primera versión

## 1. Propósito y alcance

Aplicación interna para administrar un equipo pequeño de hasta 20 personas, con énfasis en:

- Información básica de los empleados.
- Cálculo y seguimiento de pagos mensuales.
- Registro de movimientos económicos.
- Registro sencillo de eventos de asistencia que afectan la gestión o el pago.
- Conservación del historial.

La primera versión tendrá cinco módulos:

1. Inicio
2. Equipo
3. Pagos
4. Asistencia
5. Configuración

No será un ERP, una planilla contable oficial ni un sistema avanzado de Recursos Humanos. Tampoco incluirá todavía múltiples roles, marcación biométrica, GPS, cálculo tributario, exportaciones ni integraciones externas.

---

## 2. Reglas generales del sistema

1. Los empleados no se eliminan: se marcan como inactivos.
2. Los movimientos económicos no se eliminan: se anulan, conservando motivo, fecha y registro original.
3. Los pagos parciales están permitidos.
4. Cada movimiento pertenece a un empleado y a un periodo mensual.
5. Un evento de asistencia puede originar un movimiento económico, pero la generación debe ser confirmada por el administrador.
6. El sueldo guardado en el perfil representa el sueldo vigente. Al preparar un periodo, el sistema debe conservar el importe usado en ese mes para que cambios posteriores no alteren el historial.
7. Todo importe se muestra en soles (`S/`) y con dos decimales.
8. Los estados financieros simples serán: Pendiente, Pago parcial y Pagado.
9. Los estados de un movimiento serán: Vigente y Anulado.
10. Podrá existir uno o más administradores. Cada visitante solo podrá consultar los datos de su empleado vinculado.

### Fórmula del pago mensual

```text
Pago estimado del periodo =
Sueldo base del periodo
+ Comisiones
+ Bonos
+ Feriados trabajados
+ Días libres trabajados
+ Horas extra
+ Reembolsos
+ Otros ingresos
- Adelantos
- Descuentos
- Faltas
- Préstamos
- Otros descuentos
```

```text
Saldo pendiente = Pago estimado del periodo - Pagos realizados vigentes
```

Un movimiento anulado no participa en los cálculos.

---

# 3. Estructura definitiva de los módulos

## Módulo 1: Inicio

### Pantalla 1.1 — Dashboard

Es la pantalla inicial y ofrece una vista operativa del mes actual, sin gráficos innecesarios.

#### Información visible

- Mes seleccionado, por defecto el mes actual.
- Empleados activos.
- Total estimado a pagar.
- Adelantos del mes.
- Comisiones del mes.
- Pagos pendientes.
- Personas con día libre hoy.
- Próximo feriado.
- Lista breve de pagos pendientes o parciales.
- Lista breve de eventos relevantes próximos.

#### Controles y filtros

- Selector de mes.

#### Botones principales

- Registrar adelanto.
- Registrar comisión.
- Registrar pago.
- Agregar empleado.
- Ver todos los pagos pendientes.

#### Acciones

- Abrir directamente el formulario correspondiente desde un acceso rápido.
- Entrar al perfil de un empleado desde una alerta o pago pendiente.
- Cambiar el mes para consultar un resumen anterior.

#### Criterio de simplicidad

No se incorporarán gráficos en la primera versión. Los indicadores, alertas y listas cortas resuelven mejor la necesidad operativa de un equipo de 20 personas.

---

## Módulo 2: Equipo

### Pantalla 2.1 — Lista de empleados

#### Información de la tabla

- Nombre completo.
- Cargo.
- Teléfono.
- Fecha de ingreso.
- Sueldo actual.
- Día libre habitual.
- Estado.

#### Filtros

- Buscar por nombre o DNI.
- Estado: Todos, Activos, Inactivos.
- Cargo.
- Día libre habitual.

#### Botones principales

- Agregar empleado.
- Ver perfil.
- Editar.
- Activar o desactivar.

#### Acciones

- Crear un empleado.
- Consultar su perfil completo.
- Editar información personal o laboral.
- Marcarlo como inactivo sin perder su historial.
- Reactivar un empleado.

### Pantalla 2.2 — Nuevo empleado / Editar empleado

#### Datos personales

- Nombre completo — obligatorio.
- DNI — obligatorio y único.
- Teléfono — obligatorio.
- Correo — opcional.
- Dirección — opcional.
- Fecha de nacimiento — opcional.

#### Datos laborales

- Fecha de ingreso — obligatoria.
- Cargo — obligatorio, seleccionado de Configuración.
- Funciones — texto breve, opcional.
- Sueldo actual — obligatorio.
- Día libre habitual — obligatorio.
- Horario — obligatorio, seleccionado de Configuración.
- Estado — Activo o Inactivo.
- Observaciones — opcional.

#### Botones principales

- Guardar.
- Cancelar.
- Desactivar empleado, solo al editar un empleado activo.
- Reactivar empleado, solo al editar un empleado inactivo.

#### Validaciones mínimas

- DNI no repetido.
- Nombre, DNI, teléfono, fecha de ingreso, cargo, sueldo, día libre y horario obligatorios.
- Sueldo mayor o igual a cero.
- La fecha de ingreso no puede ser posterior al día actual.

### Pantalla 2.3 — Perfil del empleado

#### Cabecera resumida

- Nombre completo.
- Estado.
- Cargo.
- Fecha de ingreso.
- Sueldo actual.
- Día libre habitual.
- Adelantos del mes.
- Comisiones del mes.
- Pago estimado del mes.

#### Pestaña: Información

- Todos los datos personales.
- Todos los datos laborales.
- Botón Editar información.
- Botón Desactivar o Reactivar.

#### Pestaña: Pagos

- Periodo.
- Pago estimado.
- Total pagado.
- Saldo pendiente.
- Estado.
- Fecha del último pago.
- Botón Ver detalle.
- Botón Registrar pago.

#### Pestaña: Adelantos

- Fecha.
- Periodo.
- Descripción.
- Monto.
- Estado del movimiento.
- Botón Registrar adelanto.

#### Pestaña: Comisiones

- Fecha.
- Periodo.
- Descripción.
- Monto.
- Estado del movimiento.
- Botón Registrar comisión.

#### Pestaña: Asistencia

- Fecha de inicio.
- Fecha de fin, si aplica.
- Tipo de evento.
- Estado.
- Impacto económico asociado, si existe.
- Botón Registrar evento.

---

## Módulo 3: Pagos

Este será el módulo central. Tendrá tres vistas internas: Resumen mensual, Movimientos e Historial de pagos.

### Pantalla 3.1 — Resumen mensual

#### Controles y filtros

- Selector de mes y año.
- Estado: Todos, Pendiente, Pago parcial, Pagado.
- Buscar empleado.

#### Información de la tabla

- Empleado.
- Sueldo base del periodo.
- Ingresos adicionales.
- Descuentos reales.
- Adelantos pagados, incluidos en Total pagado.
- Total estimado.
- Total pagado.
- Saldo pendiente.
- Estado.

#### Botones principales

- Registrar pago.
- Registrar movimiento.
- Ver detalle.

#### Acciones

- Consultar el cálculo mensual de todo el equipo.
- Abrir el desglose de un empleado.
- Registrar un pago total o parcial.
- Ir al historial de meses anteriores.

### Pantalla 3.2 — Detalle de pago del empleado

#### Cabecera

- Empleado.
- Periodo.
- Estado.
- Total estimado.
- Total pagado.
- Saldo pendiente.

#### Desglose de ingresos

- Sueldo base del periodo.
- Comisiones.
- Bonos.
- Feriados trabajados.
- Días libres trabajados.
- Horas extra.
- Reembolsos.
- Otros ingresos.

#### Desglose de descuentos

- Descuentos.
- Faltas.
- Préstamos.
- Otros descuentos.

#### Pagos realizados

- Adelantos entregados y otros pagos, sin duplicar registros.
- Fecha de pago.
- Monto.
- Método.
- Número de operación.
- Observación.
- Estado.

#### Botones principales

- Registrar pago.
- Registrar movimiento.
- Ver movimiento.
- Anular movimiento.
- Anular pago.

#### Acción de anulación

Antes de anular, el sistema solicita:

- Motivo de anulación — obligatorio.
- Confirmación.

El registro queda visible como Anulado y deja de afectar los cálculos.

### Pantalla 3.3 — Registrar movimiento

#### Campos

- Empleado — obligatorio.
- Fecha — obligatoria.
- Naturaleza — Ingreso adicional, Descuento o Adelanto (pago inmediato), determinada por el tipo.
- Tipo de movimiento — obligatorio.
- Concepto o descripción — obligatorio.
- Monto — obligatorio y mayor que cero.
- Periodo — obligatorio.
- Observaciones — opcionales.
- Evento de asistencia relacionado — opcional.

#### Tipos de ingreso iniciales

- Comisión.
- Bono.
- Feriado trabajado.
- Día libre trabajado.
- Hora extra.
- Reembolso.
- Otro ingreso.

#### Tipos de descuento iniciales

- Descuento.
- Falta.
- Préstamo.
- Otro descuento.

#### Tipo de pago inmediato

- Adelanto. Confirma dinero entregado, con método obligatorio y operación opcional. Cuenta en Ya pagado, no reduce el estimado. Ver decisión 06.

#### Botones principales

- Guardar movimiento.
- Guardar y registrar otro.
- Cancelar.

#### Nota sobre “Sueldo”

El sueldo base se toma del perfil y se congela para cada periodo. No se registrará manualmente como un movimiento repetitivo en la primera versión, porque duplicaría información y aumentaría el riesgo de errores.

### Pantalla 3.4 — Movimientos

#### Filtros

- Periodo.
- Rango de fechas.
- Empleado.
- Tipo de movimiento.
- Naturaleza: Ingreso o Descuento.
- Estado: Vigente o Anulado.

#### Información de la tabla

- Fecha.
- Empleado.
- Tipo.
- Descripción.
- Periodo.
- Monto.
- Estado.
- Indicador de asistencia relacionada.

#### Botones principales

- Registrar movimiento.
- Ver detalle.
- Anular.

### Pantalla 3.5 — Registrar pago

#### Campos

- Empleado — obligatorio.
- Periodo — obligatorio.
- Total estimado — solo lectura.
- Total pagado anteriormente — solo lectura.
- Saldo pendiente — solo lectura.
- Monto a pagar — obligatorio, mayor que cero y no mayor al saldo.
- Fecha de pago — obligatoria.
- Método de pago — obligatorio.
- Número de operación — opcional.
- Observaciones — opcionales.

#### Métodos iniciales

- Efectivo.
- Transferencia.
- Yape.
- Plin.
- Otro.

#### Botones principales

- Registrar pago.
- Cancelar.

#### Comportamiento

- Si el monto es menor al saldo, el estado queda en Pago parcial.
- Si cubre el saldo, el estado cambia a Pagado.
- No se permite registrar un pago superior al saldo pendiente.

### Pantalla 3.6 — Historial de pagos

#### Filtros

- Mes y año.
- Empleado.
- Estado.

#### Información de la tabla

- Periodo.
- Empleado.
- Total estimado.
- Total pagado.
- Saldo.
- Estado.
- Fecha del último pago.

#### Botones principales

- Ver detalle.

---

## Módulo 4: Asistencia

### Pantalla 4.1 — Calendario

#### Vistas

- Vista mensual por defecto.
- Lista del mes como alternativa útil para celular.

#### Información visible

- Feriados.
- Días libres habituales.
- Faltas.
- Permisos.
- Vacaciones.
- Descansos médicos.
- Feriados trabajados.
- Días libres trabajados.
- Cambios de día libre.
- Otros eventos.

#### Filtros

- Mes.
- Empleado.
- Tipo de evento.

#### Botones principales

- Registrar evento.
- Ver evento.

#### Acciones

- Consultar eventos por día.
- Abrir el perfil del empleado.
- Crear un movimiento económico a partir de un evento cuando corresponda.

### Pantalla 4.2 — Lista de eventos

#### Filtros

- Rango de fechas.
- Empleado.
- Tipo.
- Con impacto económico / Sin impacto económico.

#### Información de la tabla

- Fecha o rango.
- Empleado.
- Tipo.
- Descripción.
- Impacto económico.
- Movimiento relacionado.
- Estado.

#### Botones principales

- Registrar evento.
- Ver detalle.
- Editar.
- Anular evento.
- Generar movimiento.

### Pantalla 4.3 — Registrar evento

#### Campos

- Empleado — obligatorio.
- Tipo de evento — obligatorio.
- Fecha de inicio — obligatoria.
- Fecha de fin — opcional para eventos de varios días.
- Descripción — opcional.
- ¿Afecta el pago? — Sí o No.
- Tipo de movimiento sugerido — visible si afecta el pago.
- Monto — opcional; puede completarse al generar el movimiento.
- Observaciones — opcionales.

#### Tipos iniciales

- Falta.
- Permiso.
- Vacaciones.
- Descanso médico.
- Feriado trabajado.
- Día libre trabajado.
- Cambio de día libre.
- Otro.

#### Botones principales

- Guardar evento.
- Guardar y generar movimiento.
- Cancelar.

#### Regla de seguridad operativa

Registrar un evento no debe modificar automáticamente el pago. El administrador confirma el tipo, concepto, periodo y monto antes de generar el movimiento económico.

---

## Módulo 5: Configuración

La configuración se presenta como una sola pantalla con secciones, evitando crear un módulo excesivamente grande.

### Pantalla 5.1 — Configuración general

#### Sección: Empresa

- Nombre de la empresa.
- Nombre comercial, opcional.
- RUC, opcional.
- Teléfono, opcional.
- Dirección, opcional.
- Moneda, inicialmente PEN.
- Día habitual de pago, opcional.

#### Sección: Tipos de movimientos

- Nombre.
- Naturaleza: Ingreso o Descuento.
- Estado: Activo o Inactivo.
- Orden de visualización.

Acciones:

- Agregar tipo.
- Editar tipo.
- Activar o desactivar tipo.

Los tipos utilizados en movimientos históricos no se eliminan.

#### Sección: Métodos de pago

- Nombre.
- Estado.

Acciones:

- Agregar.
- Editar.
- Activar o desactivar.

#### Sección: Feriados

- Nombre.
- Fecha.
- Año.
- Observación, opcional.

Acciones:

- Agregar feriado.
- Editar.
- Anular.

#### Sección: Horarios

- Nombre del horario.
- Hora de inicio.
- Hora de fin.
- Días laborables.
- Estado.

Acciones:

- Agregar.
- Editar.
- Activar o desactivar.

#### Sección: Cargos

- Nombre del cargo.
- Descripción, opcional.
- Estado.

Acciones:

- Agregar.
- Editar.
- Activar o desactivar.

#### Sección: Preferencias generales

- Mes mostrado por defecto: mes actual.
- Confirmación obligatoria antes de anular registros.
- Mostrar empleados inactivos en búsquedas históricas: Sí o No.

#### Botones principales

- Guardar cambios.
- Cancelar cambios.

---

# 4. Relaciones entre módulos

```text
EQUIPO
  ├─ proporciona empleados, sueldo, cargo, horario y día libre
  ├─ alimenta PAGOS
  └─ alimenta ASISTENCIA

ASISTENCIA
  ├─ registra eventos del empleado
  └─ puede generar, previa confirmación, un movimiento en PAGOS

PAGOS
  ├─ usa el sueldo del empleado congelado por periodo
  ├─ suma ingresos y resta descuentos vigentes
  ├─ registra pagos totales o parciales
  └─ alimenta los indicadores de INICIO

CONFIGURACIÓN
  ├─ define cargos y horarios usados en EQUIPO
  ├─ define feriados usados en ASISTENCIA
  └─ define tipos de movimiento y métodos usados en PAGOS

INICIO
  └─ resume información de EQUIPO, PAGOS, ASISTENCIA y CONFIGURACIÓN
```

### Relaciones clave

- Un empleado tiene muchos movimientos.
- Un empleado tiene muchos pagos.
- Un empleado tiene muchos eventos de asistencia.
- Un movimiento puede estar relacionado con un evento de asistencia.
- Un periodo mensual consolida el sueldo, movimientos, pagos y estado de cada empleado.
- Los catálogos de Configuración se reutilizan y no duplican en formularios.

---

# 5. Flujo normal de uso

## Flujo inicial

1. El administrador configura empresa, cargos, horarios, feriados, métodos de pago y tipos de movimientos.
2. Registra a los empleados activos.
3. Cada empleado queda asociado a sueldo, cargo, horario y día libre habitual.

## Flujo cotidiano

1. El administrador abre Inicio y revisa alertas del mes.
2. Registra adelantos, comisiones, bonos o descuentos cuando ocurren.
3. Registra únicamente los eventos de asistencia relevantes.
4. Si un evento afecta el pago, revisa y confirma la creación del movimiento.

## Flujo de cierre y pago mensual

1. Abre Pagos → Resumen mensual.
2. Revisa el desglose de cada empleado.
3. Corrige errores anulando el movimiento incorrecto y creando uno nuevo.
4. Registra el pago total o parcial.
5. El sistema actualiza automáticamente total pagado, saldo y estado.
6. Consulta los pendientes hasta completar el mes.

## Flujo cuando un empleado deja de trabajar

1. Abre su perfil.
2. Revisa si tiene saldo pendiente.
3. Registra los últimos movimientos y pagos necesarios.
4. Cambia su estado a Inactivo.
5. El perfil y todo su historial permanecen disponibles.

---

# 6. Funciones imprescindibles para la primera versión

1. Crear, editar, consultar, desactivar y reactivar empleados.
2. Buscar y filtrar empleados.
3. Mantener sueldo, cargo, horario y día libre habitual.
4. Registrar movimientos de ingreso y descuento.
5. Anular movimientos conservando el historial y motivo.
6. Calcular el pago mensual por empleado.
7. Mostrar el desglose completo del cálculo.
8. Registrar pagos totales y parciales.
9. Calcular saldo pendiente y estado del pago.
10. Consultar el historial mensual.
11. Registrar eventos sencillos de asistencia.
12. Relacionar un evento de asistencia con un movimiento económico confirmado.
13. Administrar los catálogos básicos de Configuración.
14. Mostrar un dashboard operativo y accesos rápidos.
15. Funcionar correctamente en computadora y celular.
16. Incluir confirmaciones, validaciones y mensajes claros de éxito o error.

---

# 7. Funciones para versiones futuras

## Segunda etapa razonable

- Exportación a Excel.
- Exportación a PDF.
- Copias de seguridad y restauración.
- Más usuarios con permisos simples.
- Adjuntar comprobantes de pago o documentos.
- Importación inicial de empleados.
- Reglas configurables para horas extra y feriados.

## Etapa posterior, solo si la operación lo exige

- Aplicación alojada en Internet.
- Acceso desde múltiples dispositivos con información sincronizada.
- Autenticación real y auditoría por usuario.
- Notificaciones.
- Aprobaciones de movimientos.
- Portal de consulta para empleados.
- Integración contable o bancaria.
- Firma digital.
- Control detallado de entrada y salida.
- GPS, biometría o reconocimiento facial.

Estas funciones no deben incorporarse en la primera versión porque aumentan considerablemente la complejidad sin resolver una necesidad inmediata del equipo actual.

---

# 8. Propuesta de navegación

## Computadora

Barra lateral fija o contraíble:

```text
Inicio
Equipo
Pagos
  ├─ Resumen mensual
  ├─ Movimientos
  └─ Historial de pagos
Asistencia
  ├─ Calendario
  └─ Eventos
Configuración
```

La cabecera contendrá únicamente:

- Título de la pantalla.
- Mes o contexto actual cuando corresponda.
- Acciones principales de la vista.

## Celular

Navegación inferior con cinco accesos:

```text
Inicio | Equipo | Pagos | Asistencia | Configuración
```

Las subsecciones se muestran como pestañas dentro de Pagos y Asistencia. Las tablas extensas se transforman en listas o tarjetas compactas, priorizando nombre, monto, saldo y estado.

---

# 9. Simplificaciones recomendadas

## 9.1 No registrar el sueldo dos veces

Aunque “Sueldo” aparece conceptualmente como ingreso, registrarlo manualmente todos los meses duplicaría el sueldo del perfil. La solución simple es tomar el sueldo vigente y conservar una copia para el periodo mensual.

## 9.2 No automatizar montos desde asistencia en la primera versión

Las reglas de pago por falta, feriado u hora extra pueden variar. En lugar de construir un motor complejo, el evento propone un movimiento y el administrador confirma el importe.

## 9.3 No crear un módulo separado para adelantos y comisiones

Ambos son tipos de movimientos dentro de Pagos. Se ofrecen accesos rápidos y pestañas en el perfil, pero no necesitan módulos adicionales.

## 9.4 No construir planillas diarias de entrada y salida

El objetivo actual se cubre registrando excepciones: faltas, permisos, vacaciones, descansos y días trabajados especiales.

## 9.5 No incluir eliminación definitiva

Para empleados, movimientos, pagos y eventos se utilizarán estados Activo/Inactivo o Vigente/Anulado. Esto simplifica la auditoría y evita pérdida accidental de información.

## 9.6 Mantener Configuración en una sola pantalla

Con un equipo de 20 personas, empresa, cargos, horarios, métodos, feriados y tipos de movimientos pueden organizarse en secciones o pestañas sin crear muchas pantallas administrativas.

---

# 10. Estados y mensajes esenciales

## Estados vacíos

- No hay empleados registrados.
- No hay movimientos en este periodo.
- No hay pagos registrados.
- No hay eventos de asistencia.
- No hay resultados para los filtros aplicados.

Cada estado vacío ofrecerá una sola acción relevante, por ejemplo “Agregar empleado” o “Registrar movimiento”.

## Confirmaciones

- Desactivar empleado.
- Reactivar empleado.
- Anular movimiento.
- Anular pago.
- Anular evento de asistencia.

## Mensajes de resultado

- Empleado guardado.
- Movimiento registrado.
- Movimiento anulado.
- Pago registrado.
- Evento registrado.
- Configuración actualizada.
- Error de validación con indicación del campo a corregir.

---

# 11. Criterio de cierre de esta etapa

La definición funcional queda aprobada cuando se confirme:

- Que los cinco módulos cubren el trabajo real.
- Que los tipos iniciales de movimientos son correctos.
- Que los campos del empleado son suficientes.
- Que la fórmula y el tratamiento de pagos parciales son correctos.
- Que la relación entre asistencia y pagos es adecuada.
- Que el alcance de la primera versión puede mantenerse sin funciones futuras.

Después de esa validación se podrá pasar a una segunda etapa: definir la arquitectura local de carpetas, el modelo de datos y la tecnología, todavía sin discutir alojamiento ni publicación en Internet.
