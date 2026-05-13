const { DataTypes } = require('sequelize');
const sequelize     = require('../config/database');

const Player = sequelize.define('Player', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  // Tag de Brawl Stars, ej: #2PPU8QLYL
  tag: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
  },
  name: {
    type: DataTypes.STRING(80),
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
  club: {
    type: DataTypes.STRING(80),
    allowNull: true,
  },
  avatarId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  // Datos crudos de la última sync con la API de Supercell
  rawData: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  lastSync: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'players',
  timestamps: true,
});

module.exports = Player;
