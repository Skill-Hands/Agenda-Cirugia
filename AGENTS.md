# Instrucciones para agentes — Agenda Cirugía (aplicación actual)

Este repositorio corresponde a la **Agenda Cirugía actual**, no a Agenda Cirugía vNext staging. Los cambios aquí pueden afectar a usuarios reales.

## Criterios transversales de calidad, ahorro y autonomía
- Priorizar calidad profesional, seguridad, accesibilidad, compatibilidad iPhone/iPad y pruebas verificables. No prometer perfección ni declarar éxito sin evidencia.
- Presupuesto objetivo: **USD 0**. No contratar planes, vincular medios de pago, elevar cuotas ni activar recursos premium.
- Reducir uso de ChatGPT Work/Codex: inspeccionar primero código, documentación y automatizaciones existentes; usar pruebas deterministas, herramientas gratuitas y CI antes de recurrir a otro análisis de IA.
- Evitar duplicar dependencias, agentes, escáneres o flujos de GitHub Actions. Los minutos gratuitos de repositorios privados son limitados; reservar análisis pesados para ejecución manual y justificar cambios de periodicidad.
- Cuando una herramienta, plugin o servicio pueda ayudarnos, sugerirlo proactivamente con **beneficio concreto, alternativa existente, coste/cuota, permisos, privacidad y riesgo**; pedir aprobación antes de vincular cuentas o introducir servicios externos.
- Mantener las configuraciones versionadas en GitHub y operables desde iPhone/iPad o navegador. No instalar nada en el Mac compartido salvo instrucción expresa.
- Usar datos sintéticos en pruebas. Nunca subir a GitHub ni exponer en logs credenciales, tokens, RUT, nombres de pacientes, historias o documentos clínicos identificables.
- Trabajar en ramas y pull requests acotados; no fusionar en la rama productiva ni activar despliegues, migraciones, cambios de bases de datos o secretos sin autorización **específica para esa operación**.
- Conservar el trabajo de otros agentes y toda regla clínica o funcional preexistente. Reportar qué se verificó y qué sigue pendiente.

## Reglas propias de Agenda Cirugía
- Conservar información real de cirujanos, semanas, turnos, horarios y enlaces; no regenerar ni sustituir directorios operativos.
- En documentos repetidos, respetar la regla de que la última versión válida prevalece; «Entrega» no se contabiliza; usar «policlínico».
- Mantener las vistas por día/cirujano, el comportamiento PWA y offline existentes, y el uso táctil en iPhone/iPad.
- Validar con las pruebas Node y el smoke en navegador definidos en `.github/workflows/ci.yml`. No eliminar cobertura para ahorrar minutos.
- El monitoreo de disponibilidad de `.github/workflows/readonly-daily.yml` es de lectura: no convertirlo en despliegue ni afirmar que una respuesta HTTP prueba flujos clínicos completos.
