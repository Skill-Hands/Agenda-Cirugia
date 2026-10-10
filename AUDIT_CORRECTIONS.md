# Correcciones de auditoría — Agenda

Base: 44952f5819995eefa9be8e1c6bf9608350c26a15.

- Identidad fija para páginas dedicadas, incluso con ?s=otro.
- Agenda vacía válida y representación explícita.
- Semanas agrupadas por lunes de inicio, evitando mezcla entre años.
- Selección revalidada al actualizar; no se almacena una actualización cuyo renderizado falló.
- Validación de fechas reales y semana 1..53.
- Precarga de recursos comunes y páginas activas; otras páginas visitadas se guardan al descargarse.
- Prueba de navegador con datos y HTML sintéticos, sin consultar agendas reales; preparada para Chromium y WebKit.

Ejecutado en aislado JavaScript: seis casos de modelo, compilación del JavaScript modificado.
La prueba Playwright debe ejecutarse en CI antes de integrar. No se ha modificado GitHub Pages ni AppDeploy.
Reversión: revertir commits y avanzar el identificador de caché si fuera necesario distribuir la reversión.
