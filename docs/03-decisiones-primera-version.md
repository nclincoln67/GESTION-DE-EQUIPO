# Decisiones aplicadas en la primera versión local

- Múltiples administradores. Cada visitante se vincula a un empleado; solo consulta su perfil, movimientos, pagos y asistencia. Configuración pertenece a administradores.
- Datos locales exclusivamente ficticios. La autorización está centralizada en los servicios como control funcional; al publicar debe repetirse en el backend.
- Scripts clásicos con espacio de nombres `GE`, evitando propiedades globales nativas como `window.name`, imports, fetch de archivos locales y dependencias externas.
- Persistencia mediante un repositorio central, con copia antes de cada transacción. Fallos de guardado impiden mostrar éxito y conservan el estado previo.
- Sueldo base conservado por persona y periodo; no se registra manualmente como otro ingreso. Cambio de sueldo conserva previamente el mes actual.
- Cálculos en céntimos para evitar diferencias por decimales. Adelantos son pagos inmediatos: forman parte de Ya pagado, no de Descuentos. Se muestran en Movimientos e Historial de pagos desde un único registro. El tipo original `advance` conserva compatibilidad con datos antiguos sin duplicar dinero. Ver decisión 06.
- Cambios financieros mediante anulación con motivo y un nuevo registro correcto. No hay eliminación definitiva.
- Los eventos de asistencia pueden generar un movimiento manualmente; no hay tarifas legales ni descuentos automáticos. Solo un movimiento vigente por evento.
- Un cambio de día libre indica un nuevo día concreto y reemplaza el descanso habitual de la semana domingo–sábado. Los cambios futuros del patrón habitual se hacen en la ficha.
- Horarios sencillos con nombre, entrada y salida. No hay marcación ni cálculo de horas efectivas.
- Feriados configurados manualmente; no se presume un calendario legal. Sin feriados cargados, Inicio muestra el estado vacío.
- Diseño con verde petróleo, acentos lima, iconos SVG consistentes y tipografía de sistema disponible sin conexión. Navegación lateral en escritorio e inferior en celular.
- Los catálogos se crean cuando se usan. La arquitectura del documento 02 es una guía evolutiva; se ha implementado una estructura más compacta, conservando las responsabilidades separadas.
- Exportaciones, importación de datos, respaldos, servidor, base de datos, acceso remoto y autenticación segura quedan para la siguiente etapa.
