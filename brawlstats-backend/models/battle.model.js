const { DataTypes } = require('sequelize');
const sequelize     = require('../config/database');

// Cada fila = una batalla individual del jugador, acumulada al sincronizar
const Battle = sequelize.define('Battle', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  playerId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  // Identificador único de batalla devuelto por Supercell (ej: 20260516T203000.000Z)
  // Combinado con playerId forma la clave de deduplicación
  battleTime: {
    type: DataTypes.STRING(40),
    allowNull: false,
  },
  mode: {
    type: DataTypes.STRING(40),
    allowNull: false,
  },
  map: {
    type: DataTypes.STRING(80),
    allowNull: true,
  },
  brawler: {
    type: DataTypes.STRING(40),
    allowNull: true,
  },
  result: {
    type: DataTypes.ENUM('Win', 'Loss', 'Draw'),
    allowNull: false,
  },
  rank: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  trophyChange: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  // Timestamp parseado para queries por fecha
  battleAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
  tableName: 'battles',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['playerId', 'battleTime'] },
    { fields: ['playerId', 'battleAt'] },
  ],
});

module.exports = Battle;
