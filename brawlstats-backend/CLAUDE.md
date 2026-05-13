# BrawlStats Backend — Contexto para Claude Code

## Stack
- Node.js + Express 4
- MySQL + Sequelize 6 (ORM)
- JWT con jsonwebtoken + bcryptjs
- Validaciones con express-validator
- API externa: Supercell Brawl Stars (https://api.brawlstars.com/v1)

## Estructura de archivos (NUNCA cambiar los nombres de carpeta)
```
index.js          → arranca el servidor, conecta DB
app.js            → Express: middlewares globales + monta rutas
config/
  database.js     → instancia Sequelize (singleton)
  seed.js         → datos de prueba (npm run seed)
models/
  index.js        → importa todos los modelos y define asociaciones
  user.model.js   → tabla users
  player.model.js → tabla players (vinculados a Supercell)
  brawler.model.js→ tabla brawlers
  stat.model.js   → tabla stats (histórico)
  report.model.js → tabla reports (PDFs generados)
controllers/      → lógica de negocio, un archivo por entidad
routes/           → rutas Express, un archivo por entidad
middlewares/
  auth.middleware.js     → protect() y adminOnly()
  error.middleware.js    → errorHandler global
  validate.middleware.js → validate() para express-validator
services/
  supercell.service.js   → cliente axios para la API de Supercell
utils/
  jwt.js          → generateToken() y verifyToken()
  apiResponse.js  → ok(), created(), notFound(), badRequest()...
```

## Convenciones OBLIGATORIAS
- Todas las respuestas usan utils/apiResponse.js (ok, created, notFound...)
- Todos los errores se pasan a next(err) → llegan a errorHandler
- JWT va en header: Authorization: Bearer <token>
- Tag de Brawl Stars siempre con # (se encodea en supercell.service.js)
- IDs de usuario son UUID v4
- IDs de brawler son enteros (vienen de la API de Supercell)

## Endpoints disponibles
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
GET    /api/v1/auth/me              [auth]
PUT    /api/v1/auth/me              [auth]
PUT    /api/v1/auth/change-password [auth]

GET    /api/v1/players/search?tag=  [auth]
GET    /api/v1/players/me           [auth]
POST   /api/v1/players              [auth]
POST   /api/v1/players/sync         [auth]

GET    /api/v1/brawlers             [auth]
GET    /api/v1/brawlers/:id         [auth]
POST   /api/v1/brawlers/sync        [admin]
PUT    /api/v1/brawlers/:id         [admin]

GET    /api/v1/stats/me             [auth]
GET    /api/v1/stats/winrate        [auth]
POST   /api/v1/stats/snapshot       [auth]

GET    /api/v1/leaderboard/global   [auth]
GET    /api/v1/leaderboard/country/:code [auth]
GET    /api/v1/leaderboard/local    [auth]

GET    /api/v1/reports              [auth]
POST   /api/v1/reports              [auth]
DELETE /api/v1/reports/:id          [auth]
```

## Variables de entorno necesarias (.env)
PORT, DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS,
JWT_SECRET, JWT_EXPIRES, BRAWL_API_TOKEN, FRONTEND_URL

## Para añadir un endpoint nuevo
1. Añadir función en controllers/[entidad].controller.js
2. Añadir ruta en routes/[entidad].routes.js
3. Si necesita modelo nuevo: crear models/[entidad].model.js
   y registrarlo en models/index.js con sus asociaciones

## Para arrancar
npm install → cp .env.example .env → (configurar DB) → npm run seed → npm run dev
