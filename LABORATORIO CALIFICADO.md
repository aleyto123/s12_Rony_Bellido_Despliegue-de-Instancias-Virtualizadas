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
7. Contenerizar con Docker Compose y documentar el despliegue en Google Cloud.
8. Ejecutar pruebas de estrés / load testing.

## Reglas de puntuación aplicadas
- Marcador exacto: +5 puntos, sin duplicar puntos de ganador o diferencia
- Ganador correcto: +3 puntos
- Ganador y diferencia correctos sin marcador exacto: +3 + 2 puntos
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
│   │   ├── middleware/auth.js
│   │   ├── services/scoring.js
│   │   ├── services/scoring.test.js
│   │   ├── app.js
│   │   └── server.js
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── public/ (SPA)
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yml
├── nginx_balancer.conf
├── load_test.js
├── ARQUITECTURA.md
├── README.md
├── .env.example
└── LABORATORIO CALIFICADO.md
```

## Observaciones del docente
La solución se evaluará por funcionalidad, claridad, documentación y capacidad de ejecución en contenedores.
