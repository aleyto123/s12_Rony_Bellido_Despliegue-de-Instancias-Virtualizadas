# Laboratorio Calificado - Mundial Quiniela / Prode

## Descripción
Este proyecto consiste en el desarrollo de una aplicación web para jugar una quiniela del Mundial, permitiendo registrar usuarios, crear salas, predecir partidos, acumular puntaje y visualizar rankings.

## Objetivos
1. Diseñar e implementar una arquitectura de backend, frontend y base de datos.
2. Implementar autenticación de usuarios.
3. Crear salas privadas con invitación por código.
4. Registrar predicciones por partido con timestamp.
5. Calcular el puntaje según reglas definidas.
6. Implementar panel de administrador para resultados reales.
7. Contenerizar con Docker y preparar despliegue generalizado para AWS.
8. Ejecutar pruebas de estrés / load testing.

## Reglas de puntuación aplicadas
- Resultado exacto: +5 puntos
- Ganador correcto: +3 puntos
- Diferencia de goles correcta: +2 puntos
- Racha: +2 por cada 3 partidos consecutivos acertados (al menos ganador)
- Predicción anticipada: +1 si se realiza con más de 24 horas de anticipación

## Entregables
- Propuesta de arquitectura del sistema
- Desarrollo funcional de la aplicación
- Contenerización con Docker
- Documentación de pruebas y stress testing
- Sistema de puntuación automatizado

## Criterios de evaluación
- Calidad de arquitectura
- Correctitud de la lógica de scoring
- Persistencia de datos
- Facilidad de uso de la interfaz
- Contenerización correcta
- Capacidad de despliegue en entorno cloud

## Estructura del proyecto
```text
/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/scoringService.js
│   │   └── app.js
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── public/
│   ├── src/
│   └── Dockerfile
├── docker-compose.yml
├── load_test.py
├── README.md
└── LABORATORIO CALIFICADO.md
```

## Observaciones del docente
La solución se evaluará por funcionalidad, claridad, documentación y capacidad de ejecución en contenedores.
