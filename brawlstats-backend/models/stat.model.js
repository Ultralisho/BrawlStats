const { DataTypes } = require('sequelize');
const sequelize     = require('../config/database');

// Cada fila = snapshot de estadísticas de un jugador con un brawler en un momento dado
const Stat = sequelize.define('Stat', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  playerId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  brawlerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  trophies: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  highestTrophies: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  rank: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  // Wins y losses calculados del historial de batallas
  wins: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  losses: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  // Win rate en porcentaje (0-100)
  winRate: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  // Modo de juego (null = estadística global del brawler)
  gameMode: {
    type: DataTypes.STRING(40),
    allowNull: true,
  },
  // Fecha del snapshot, permite histórico
  recordedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'stats',
  timestamps: true,
});

module.exports = Stat;
