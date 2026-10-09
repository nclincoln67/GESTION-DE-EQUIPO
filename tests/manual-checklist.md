# Comprobación manual

## Acceso

- Abrir index.html mediante doble clic sin conexión.
- Credenciales incorrectas muestran mensaje.
- admin y admin2 entran al panel completo.
- valeria entra y solo ve su información; sin Configuración ni botones de modificación.
- Cerrar sesión y entrar como otro rol no conserva modales o filtros anteriores.

## Equipo

- Crear persona con DNI único de ocho dígitos y todos los campos obligatorios.
- Buscar por nombre o DNI, filtrar estado/cargo y abrir ficha.
- Editar sueldo y verificar conservación del sueldo de los periodos preparados.
- Comprobar las cuatro tarjetas: sueldo base del mes + todos los ingresos adicionales − descuentos reales = estimado.
- Revisar debajo de las tarjetas: adelantos entregados, otros pagos y saldo pendiente.
- En Camila, con comisión 200 y bono 250: sueldo base 2100, ingresos adicionales 450, descuentos 0 y estimado 2550.
- Registrar un descuento de tipo personalizado y un ingreso distinto de comisión: ambos se incluyen en sus tarjetas; anularlos los excluye.
- Desactivar/reactivar; conservar registros previos.
- Pulsar Eliminar en la tabla y ficha: comprobar confirmación y cancelar sin cambios.
- Confirmar: desaparecer de Equipo y nuevos formularios, conservar pagos y asistencia históricos.
- Comprobar que visitantes vinculados al trabajador eliminado ya no acceden.

## Pagos

- Preparar un periodo nuevo, comprobar sueldo base.
- Registrar sueldo 1500, adelantos 300 y 200 con método: estimado 1500, ya pagado 500, saldo 1000.
- Agregar comisión 100 y bono 200: estimado 1800, ya pagado 500, saldo 1300.
- Registrar pago 1000: parcial, pendiente 300.
- Revisar Movimientos: los adelantos muestran Pagado desde su registro, los bonos/comisiones siguen Vigentes mientras el pago sea parcial.
- Registrar pago 300: pagado, pendiente 0.
- Revisar Movimientos y sus detalles: los no anulados muestran Pagado, los anulados conservan Anulado.
- Filtrar por Vigente, Pagado y Anulado; comprobar también Todos los periodos y acceso visitante.
- Cambiar el mes seleccionado: el estado de cada movimiento corresponde a su propio periodo.
- Confirmar que Historial de pagos mantiene Vigente/Anulado y Resumen mensual conserva sus estados actuales.
- Corregir un recibo separado erróneo: recalcula saldo, pero los movimientos ya liquidados siguen Pagados y protegidos. Los anulados no se reactivan.
- Historial incluye cada adelanto una vez y Ver/Anular apunta a su movimiento original.
- Intentar adelanto sin método, con método desactivado o mayor que el saldo: bloquear sin modificar datos.
- Cambiar de Adelanto a Bono: aparece «¿Este ingreso ya se pagó?». No oculta método y operación si eliges Sí; al elegir No se ocultan.
- Con datos antiguos, estimado y ya pagado aumentan por igual por los adelantos y el saldo pendiente se conserva.
- Intentar pagar más que el saldo: bloquear.
- Anular un adelanto con motivo: conservar registro y recalcular.
- Con pago parcial y saldo pendiente, anular un adelanto que nunca fue liquidado: recalcular y conservar historial. Los liquidados anteriormente siguen protegidos.
- Tras completar el pago, adelantos/comisiones muestran «Liquidado · protegido» y no permiten anular.
- Añadir ingreso de 80 a un mes pagado: saldo 80, originales siguen Pagados y protegidos incluso al recargar.
- Registrar ingreso adicional ya entregado de 20 junto con su pago: estimado y Ya pagado aumentan 20, sin duplicarse ni absorber los 80 pendientes.
- Completar los 80 pendientes: los nuevos movimientos también quedan protegidos, sin modificar los recibos anteriores.
- Intentar anular el recibo asociado a un ingreso ya liquidado: bloquear.
- Intentar agregar descuento o anticipo sin saldo en un mes pagado: bloquear.
- Registrar pago para persona sin saldo: abre ingreso adicional con la opción de pago conjunto seleccionada.
- Con pago parcial, no permitir anular un ingreso o registrar un descuento que deje el total por debajo de lo pagado.
- Abrir anulación, completar el pago por otra acción y confirmar el modal anterior: bloquear al guardar.
- Consultar detalle y filtro de historial, incluidos anulados.

## Asistencia

- Registrar evento de varios días y ver calendario/lista.
- Asociar movimiento y comprobar que no se duplica.
- Anular evento: conservar y revisar por separado el movimiento.
- Cambio de día libre sustituye el descanso de esa semana.

## Configuración

- Editar empresa; comprobar marca en barra lateral.
- Crear cargo, horario, tipo, método y feriado; aparecen en formularios/calendario.
- Desactivar catálogo y mantener historia.
- Crear otro administrador y un visitante vinculado a otra persona.
- No permitir desactivar la cuenta propia ni dejar sin administradores activos.
- Eliminar otra cuenta: desaparecer de Usuarios y no poder iniciar sesión; conservar la autoría histórica.
- Eliminar tipos, métodos, cargos y horarios referenciados: salir de su lista y conservar los nombres y cálculos anteriores.
- Eliminar feriado: desaparecer de Configuración, Inicio y calendario.
- Recargar: las eliminaciones siguen aplicadas, sin regenerar datos de ejemplo.

## Persistencia y diseño

- Cerrar y reabrir el navegador: conservar cambios.
- Probar anchos 390, 768 y 1440 px.
- Revisar modales, desplazamiento de tablas, calendario y navegación inferior.
- Navegar mediante Tab y cerrar modales con Escape.
- Comprobar sin errores en consola después de cada flujo.
