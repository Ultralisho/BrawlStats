const { DataTypes } = require('sequelize');
const sequelize     = require('../config/database');

// Snapshot del estado global del jugador en un momento dado.
// Sirve para dibujar evolución de trofeos en el tiempo.
const PlayerSnapshot = sequelize.define('PlayerSnapshot', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  playerId: {
    type: DataTypes.UUID,
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
  level: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  recordedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'player_snapshots',
  timestamps: true,
  indexes: [
    { fields: ['playerId', 'recordedAt'] },
  ],
});

module.exports = PlayerSnapshot;
