# Índice RB — Biblioteca S12

Implementación de la sección **TAREA** de GLAB-S12-EAREVALO-2026-1: Next.js App Router, TypeScript, Prisma y una interfaz adaptable para gestionar autores y libros.

## Abrir en tu equipo

Desde esta carpeta:

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

Si ya existe tu archivo `.env`, conserva su configuración; no vuelvas a copiar el ejemplo sobre él.

Abre [http://127.0.0.1:3000](http://127.0.0.1:3000).

El ejemplo activa `LIBRARY_DEMO=true`: 6 autores y 16 libros de demostración, sin necesidad de una cuenta externa. Las modificaciones se guardan en `.data/library.json`, ignorado por Git. Es un modo de desarrollo de un solo proceso; no representa una conexión a Supabase y no se utiliza en Vercel.

## Funcionalidades

- **Resumen** (`app/page.tsx`): estadísticas generales, crear/listar/buscar/editar/eliminar autores y acceso a sus libros.
- **Catálogo** (`app/books/page.tsx`): crear libros con selector de autor, búsqueda en tiempo real con debounce y cancelación de solicitudes anteriores, filtros de género y autor, ordenamiento, paginación y total de resultados.
- Tarjetas y tabla, detalle de libro, editar/eliminar libros, estados de carga, errores recuperables y resultados vacíos.
- **Detalle de autor** (`app/authors/[id]/page.tsx`): información completa, biografía, edición, estadísticas y todos sus libros; registro de nuevos libros con el autor preseleccionado.
- Confirmación de eliminación, formularios con validación en cliente y servidor, correos e ISBN únicos.
- La relación autor/libros se protege: para eliminar un autor con libros, primero se eliminan o reasignan sus libros.

## API de la tarea

`GET /api/books/search`

| Parámetro  | Comportamiento                                                   |
| ---------- | ---------------------------------------------------------------- |
| search     | Búsqueda parcial por título, sin distinguir mayúsculas           |
| genre      | Coincidencia exacta del género                                   |
| authorName | Búsqueda parcial por nombre del autor, sin distinguir mayúsculas |
| page       | Entero positivo; por defecto 1                                   |
| limit      | Entero entre 1 y 50; por defecto 10                              |
| sortBy     | title, publishedYear, createdAt; por defecto createdAt           |
| order      | asc o desc; por defecto desc                                     |
| authorId   | Filtro adicional por ID para seleccionar un autor sin ambigüedad |

Los parámetros se combinan. Los valores inválidos responden HTTP 400. En PostgreSQL la búsqueda y paginación se ejecutan en Prisma con `where`, `skip`, `take` y un conteo dentro de una transacción.

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 0,
    "totalPages": 0,
    "hasNext": false,
    "hasPrev": false
  }
}
```

Ejemplo:

```text
/api/books/search?search=amor&genre=Novela&authorName=Garc%C3%ADa&page=1&limit=10&sortBy=publishedYear&order=desc
```

`GET /api/authors/[id]/stats` devuelve `authorId`, `authorName`, `totalBooks`, `firstBook`, `latestBook`, `averagePages`, `genres`, `longestBook` y `shortestBook`. Para autores sin libros, los extremos son `null`, el promedio es 0 y los géneros son `[]`. Un autor inexistente responde 404.

También se implementan las API base:

| Método             | Ruta                                                  |
| ------------------ | ----------------------------------------------------- |
| GET / POST         | /api/authors                                          |
| GET / PUT / DELETE | /api/authors/[id]                                     |
| GET                | /api/authors/[id]/books                               |
| GET / POST         | /api/books                                            |
| GET / PUT / DELETE | /api/books/[id]                                       |
| GET                | /api/catalog (metadatos y estadísticas del dashboard) |

Los PUT aceptan actualización parcial. Conflictos de correo, ISBN o relaciones responden 409. Las eliminaciones exitosas responden 204.

## Conectar Supabase

1. Crea o selecciona el proyecto PostgreSQL en Supabase.
2. En **Connect**, copia las cadenas recomendadas por Supabase para Prisma. Configura en `.env`:
   - `LIBRARY_DEMO=false`
   - `DATABASE_URL`: conexión de la aplicación con Transaction pooler (puerto 6543). Para Prisma 6 debe incluir `pgbouncer=true` en los parámetros de la URI.
   - `DIRECT_URL`: conexión para las operaciones de esquema (directa o session pooler según conectividad).
3. Aplica el modelo y genera el cliente:

```powershell
npm run db:push
npx prisma generate
```

4. Opcionalmente carga el catálogo inicial en una base de prácticas vacía:

```powershell
npm run db:seed
```

5. Reinicia la aplicación y verifica que ya no se muestre el aviso de demostración.

El esquema está en `prisma/schema.prisma` y el cliente compartido en `lib/prisma.ts`. No guardes credenciales en el repositorio.

## Publicar en Vercel

1. Sube estos cambios a tu repositorio de GitHub.
2. Importa ese repositorio en Vercel y conserva **Root Directory: ./ (raíz del repositorio)**.
3. La configuración `vercel.json` de la raíz declara únicamente el servicio **biblioteca**, con framework Next.js, y envía todas las rutas a ese servicio. Sus páginas y API Routes se despliegan juntas; el backend de la quiniela no participa.
4. Configura `LIBRARY_DEMO=false`, `DATABASE_URL` y `DIRECT_URL` como variables del proyecto.
5. Aplica el esquema desde tu equipo con `npm run db:push` antes del despliegue.
6. Despliega y comprueba dashboard, catálogo y estadísticas.

El modo local basado en archivos se bloquea explícitamente en Vercel para evitar una falsa persistencia. La entrega en nube requiere una conexión real a PostgreSQL.

## Verificaciones

```powershell
npm test
npm run format:check
npm run typecheck
npm run build
npm run test:production
# Con la aplicación ejecutándose:
npm run test:api
```

- Pruebas unitarias y de persistencia: búsqueda, ordenamiento, límites, estadísticas, autor sin libros, CRUD, duplicados y concurrencia del modo local.
- Prueba HTTP: rutas reales, validación, 404, creación/edición/eliminación y protección de relaciones.
- El script HTTP crea registros temporales y los elimina al terminar; utiliza una base de prácticas.
- `test:production` inicia su propio servidor con datos temporales aislados y lo detiene al finalizar; no usa Supabase ni modifica tu catálogo local.
- El flujo `.github/workflows/biblioteca.yml` ejecuta formato, pruebas, compilación y la prueba HTTP aislada cuando se suben cambios a GitHub. Su ejecución remota se comprobará después de publicar los cambios.
- Revisión de navegador: alta y edición de autor/libro, actualización de estadísticas, filtros combinados, tabla, segunda página y vista móvil de 390 px.

## Pruebas de API

Importa [Biblioteca S12.postman_collection.json](docs/Biblioteca%20S12.postman_collection.json) en Postman para probar los endpoints.

## Estado del proyecto

Frontend oscuro adaptable con dashboard, catálogo, perfiles y formularios. La aplicación local usa Supabase con el modo demo desactivado; búsqueda, CRUD, estadísticas y relaciones se verificaron con las API. El despliegue en Vercel está pendiente.

Referencias: [Route Handlers de Next.js](https://nextjs.org/docs/app/getting-started/route-handlers), [Prisma con PostgreSQL](https://www.prisma.io/docs/orm/v6/overview/databases/postgresql).
