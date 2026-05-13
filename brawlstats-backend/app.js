const express = require('express');
const cors    = require('cors');

const authRoutes       = require('./routes/auth.routes');
const playerRoutes     = require('./routes/player.routes');
const brawlerRoutes    = require('./routes/brawler.routes');
const statsRoutes      = require('./routes/stats.routes');
const reportRoutes     = require('./routes/report.routes');
const leaderboardRoutes= require('./routes/leaderboard.routes');

const { errorHandler } = require('./middlewares/error.middleware');

const app = express();

// ── Middlewares globales ────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Archivos estáticos (avatares, PDFs generados)
app.use('/uploads', express.static('uploads'));

// ── Health check ────────────────────────────────────────────────────────────
app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Rutas ───────────────────────────────────────────────────────────────────
app.use('/api/v1/auth',        authRoutes);
app.use('/api/v1/players',     playerRoutes);
app.use('/api/v1/brawlers',    brawlerRoutes);
app.use('/api/v1/stats',       statsRoutes);
app.use('/api/v1/reports',     reportRoutes);
app.use('/api/v1/leaderboard', leaderboardRoutes);

// ── 404 ─────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// ── Manejador de errores global ─────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
