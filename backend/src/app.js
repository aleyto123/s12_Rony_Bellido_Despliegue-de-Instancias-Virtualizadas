require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { asyncHandler } = require('./middleware/auth');
const { initializeDatabase, pool } = require('./models/db');
const authRoutes = require('./routes/authRoutes');
const matchRoutes = require('./routes/matchRoutes');
const groupRoutes = require('./routes/groupRoutes');
const adminRoutes = require('./routes/adminRoutes');
const aiRoutes = require('./routes/aiRoutes');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  }
}));
app.use(express.json({ limit: '32kb' }));
app.use((req, res, next) => {
  if (req.body === undefined) req.body = {};
  next();
});

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 2000, standardHeaders: 'draft-8', legacyHeaders: false });
app.use('/api', apiLimiter);

app.get('/health/live', (req, res) => res.json({ ok: true }));
app.get('/health', asyncHandler(async (req, res) => {
  await pool.query('SELECT 1');
  res.json({ ok: true, database: 'ready' });
}));

app.use('/api/auth', authRoutes);
app.use('/api', matchRoutes);
app.use('/api', groupRoutes);
app.use('/api', adminRoutes);
app.use('/api', aiRoutes);

app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  console.error(error);
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 500 ? error.status : 500;
  res.status(status).json({ error: status === 500 ? 'Error interno del servidor.' : error.message });
});

async function start() {
  await initializeDatabase();
  const port = Number.parseInt(process.env.PORT || '3001', 10);
  const server = await new Promise((resolve, reject) => {
    const listener = app.listen(port, '0.0.0.0', () => resolve(listener));
    listener.once('error', reject);
  });
  console.log(`API lista en puerto ${port}`);

  const shutdown = () => {
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
  return server;
}

if (require.main === module) {
  start().catch((error) => {
    console.error('No se pudo iniciar la API:', error);
    process.exitCode = 1;
  });
}

module.exports = { app, start };