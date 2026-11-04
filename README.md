# Cancha 26 · Predicciones del Mundial

Aplicación educativa de quiniela con autenticación, predicciones, salas privadas, clasificación, panel administrativo y puntuación automática. No involucra dinero real.

## Stack

- Backend: Node.js 24, Express y PostgreSQL 16
- Frontend: HTML, CSS y JavaScript servido por Nginx
- Proxy y balanceo: Nginx con descubrimiento dinámico de réplicas Docker
- Persistencia: volumen nombrado de PostgreSQL
- Pruebas: `node:test` y k6

## Iniciar

Requiere Docker Engine y Docker Compose v2.

```bash
docker compose up --build
```

Abre `http://localhost:8080`. Nginx sirve la aplicación y enruta `/api/*` a las tres réplicas del backend. PostgreSQL y la API no publican puertos directamente al host.

El proyecto incluye valores locales para poder iniciar con ese comando. Para configurar credenciales propias, copia `.env.example` a `.env` y cambia las contraseñas antes de desplegar.

Credenciales iniciales locales:

- Usuario administrador: `admin`
- Contraseña: `Admin-Local-2026!`

La cuenta se crea solo cuando no existe. Cambiar `ADMIN_PASSWORD` después de que ya fue creada no modifica su contraseña en una base existente.

Para revisar contenedores y logs:

```bash
docker compose ps
docker compose logs -f nginx backend db
```

Para detener servicios sin borrar datos:

```bash
docker compose down
```

No uses `docker compose down -v` salvo que quieras eliminar la base de datos.

## Escalar

El Compose configura tres réplicas del backend por defecto. Se puede solicitar otro número:

```bash
docker compose up --build --scale backend=5
```

Nginx distribuye las solicitudes con `least_conn` y consulta el DNS interno de Docker para descubrir instancias. La base sigue siendo un servicio PostgreSQL único; Compose en una máquina no ofrece alta disponibilidad de base de datos.

## Puntuación

- Marcador exacto: 5 puntos; este acierto no duplica los puntos de ganador o diferencia.
- Ganador o empate correcto: 3 puntos.
- Ganador y diferencia de goles correctos sin marcador exacto: 3 + 2 puntos.
- Racha: 2 puntos al tercer acierto consecutivo y cada tres aciertos consecutivos posteriores. Un partido omitido o un ganador errado rompe la racha.
- Anticipación: 1 punto cuando el pronóstico se guarda estrictamente con más de 24 horas.

El plazo de pronóstico cierra diez minutos antes del inicio. La API vuelve a validar el plazo y no depende del navegador.

## Endpoints

- `POST /api/auth/register`, `POST /api/auth/login`
- `GET /api/matches`
- `POST /api/matches/:id/predictions`, `GET /api/matches/predictions/me`
- `POST /api/groups`, `POST /api/groups/join`, `GET /api/groups`
- `GET /api/groups/:id/leaderboard`
- `GET /api/leaderboard/global`
- `POST /api/admin/matches`, `PATCH /api/admin/matches/:id/status`
- `POST /api/admin/matches/:id/result`, `POST /api/admin/recalculate`
- `GET /api/ai/insights`
- `GET /health`, `GET /health/live`

Los endpoints de administración requieren una cuenta con rol `admin`. El secreto JWT se puede inyectar con `JWT_SECRET`; si se omite, el backend lo genera una vez y lo persiste en PostgreSQL para compartirlo entre las réplicas.

## Pruebas

Pruebas de scoring sin contenedores:

```bash
cd backend
npm ci
npm test
```

Prueba de carga con k6 (100 usuarios virtuales, una predicción por usuario):

```bash
k6 run load_test.js
```

Variables opcionales: `BASE_URL` (por defecto `http://localhost:8080`), `VUS` (100), `MATCH_ID` (elige un partido concreto) y `LOAD_TEST_PASSWORD`. Los usuarios `k6_*` se guardan en la base usada por la prueba; utiliza una base de pruebas, no datos reales.

## Google Cloud

Cloud Shell sirve para desarrollar y ejecutar la demostración, pero no es un host permanente de producción. Para un despliegue durable se recomienda Cloud Run o GKE para el backend, Cloud SQL for PostgreSQL, Secret Manager y un HTTPS Load Balancer. La arquitectura y sus límites están descritos en [ARQUITECTURA.md](ARQUITECTURA.md).

## Datos de demostración

En una base vacía se crean cuatro partidos marcados como demo y una cuenta administradora local. Sustituye esos datos por el calendario autorizado del torneo desde la API admin antes de usar la aplicación con participantes reales.