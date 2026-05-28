const { DataTypes } = require('sequelize');
const sequelize     = require('../config/database');

// Partidas recolectadas masivamente por recolector.py (TFG dataset)
// No requiere playerId — los jugadores no están en la tabla users
const DatasetBattle = sequelize.define('DatasetBattle', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  // battleTime + playerTag → clave de deduplicación en re-importaciones
  battleKey: {
    type: DataTypes.STRING(200),
    allowNull: false,
    unique: true,
  },
  playerTag: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  battleTime: {
    type: DataTypes.STRING(40),
    allowNull: true,
  },
  battleAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  mode: {
    type: DataTypes.STRING(40),
    allowNull: true,
  },
  map: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  result: {
    type: DataTypes.ENUM('Win', 'Loss', 'Draw'),
    allowNull: true,
  },
  brawler: {
    type: DataTypes.STRING(40),
    allowNull: true,
  },
  brawlerTrophies: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  rank: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  trophyChange: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  battleType: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
}, {
  tableName: 'dataset_battles',
  timestamps: true,
  indexes: [
    { fields: ['brawler'] },
    { fields: ['mode'] },
    { fields: ['playerTag'] },
    { fields: ['battleAt'] },
    // Covering indexes for getWinrates GROUP BY queries
    { fields: ['brawler', 'result'] },
    { fields: ['mode', 'brawler', 'result'] },
  ],
});

module.exports = DatasetBattle;
