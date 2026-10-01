# Mantenimiento del 1 de octubre de 2026

Datos escapados, respuesta remota interpretada sin ejecución, código y estilos compartidos, detección de cruces explícitos de horario y aviso de copia antigua.

## Validación y operación
Los cambios se publican primero en una rama y se verifican con GitHub Actions antes de integrar en main.
Las pruebas no leen datos clínicos reales. Las restauraciones de ensayo utilizan destinos desechables.
Los respaldos y versiones existentes se conservan; no se eliminan tablas ni índices existentes.

## Comprobaciones de dispositivo pendientes
En Safari/iPhone/iPad: apertura instalada, cierre y reapertura de sesión, cambio de usuario, pérdida y recuperación de conexión, pendientes offline y PDF/impresión cuando corresponda.
La verificación automatizada no sustituye estas comprobaciones físicas.

## Reversión
Revertir el commit de mantenimiento permite recuperar el código anterior.
Las migraciones de índices son aditivas. Los borradores offline se conservan bajo claves separadas por propietario; no volver a mezclar las colas al revertir.
