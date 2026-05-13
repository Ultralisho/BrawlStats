const { DataTypes } = require('sequelize');
const sequelize     = require('../config/database');

const Report = sequelize.define('Report', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING(120),
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('player','meta','club','brawler_comparison'),
    allowNull: false,
  },
  period: {
    type: DataTypes.ENUM('7d','30d','90d','season'),
    defaultValue: '30d',
  },
  filePath: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('pending','generating','ready','error'),
    defaultValue: 'pending',
  },
  // Parámetros del reporte en JSON (playerId, brawlerIds, etc.)
  params: {
    type: DataTypes.JSON,
    allowNull: true,
  },
}, {
  tableName: 'reports',
  timestamps: true,
});

module.exports = Report;
