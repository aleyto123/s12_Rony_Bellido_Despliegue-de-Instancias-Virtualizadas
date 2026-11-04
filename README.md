# Mundial Quiniela / Prode

Aplicación web para predecir resultados del Mundial y acumular puntos por precisión, ganador, diferencia de goles, racha y anticipación.

## Stack
- Backend: Node.js + Express + SQLite
- Frontend: HTML5 + CSS3 + JavaScript vanilla
- Docker: Compose para backend y frontend
- Testing: Locust

## Requisitos
- Docker Desktop / Docker Engine
- Docker Compose

## Inicio rápido

1. Clonar el repositorio.
2. Ejecutar:

```bash
docker compose up --build
```

3. Abrir:
- Frontend: http://localhost
- API: http://localhost:3001

## Credenciales por defecto
- Usuario administrador: `admin` / `admin123`

## Endpoints principales
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/matches`
- `POST /api/matches/:id/predictions`
- `GET /api/groups`
- `POST /api/groups`
- `POST /api/groups/join`
- `GET /api/groups/:id/leaderboard`
- `GET /api/leaderboard/global`
- `POST /api/admin/matches/:id/result`
- `POST /api/admin/recalculate`
- `GET /api/ai/insights`

## Regla de puntuación
- Resultado exacto: +5
- Ganador correcto: +3
- Diferencia de goles correcta: +2
- Racha: +2 por cada 3 partidos consecutivos acertados
- Predicción anticipada: +1 si se hace con más de 24 horas de anticipación

## Arquitectura

- Backend API REST en `backend/`
- Frontend estático en `frontend/public/`
- Base de datos SQLite alojada en `backend/data/app.db`
- Orquestación por Docker Compose

## AWS / Escalado
El servicio puede desplegarse en ECS / EKS / EC2 con un balanceador. Para producción se recomienda:
- mover la base de datos a RDS PostgreSQL
- usar ALB
- dividir frontend y backend en contenedores independientes
- activar HTTPS con ACM y Route53

## Pruebas de carga

```bash
pip install locust
locust -f load_test.py --host http://localhost:3001
```

Luego abrir http://localhost:8089
