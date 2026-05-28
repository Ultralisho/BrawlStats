const { DataTypes } = require('sequelize');
const sequelize     = require('../config/database');

const Tutorial = sequelize.define('Tutorial', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  category: {
    type: DataTypes.ENUM('Básico', 'Intermedio', 'Avanzado', 'Modos de juego'),
    allowNull: false,
    defaultValue: 'Básico',
  },
  brawler: {
    type: DataTypes.STRING(80),
    allowNull: true,
  },
  youtubeQuery: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  level: {
    type: DataTypes.ENUM('Básico', 'Intermedio', 'Avanzado'),
    allowNull: false,
    defaultValue: 'Básico',
  },
}, {
  tableName: 'tutorials',
  timestamps: true,
});

module.exports = Tutorial;
