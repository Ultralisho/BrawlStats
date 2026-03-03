const { DataTypes } = require('sequelize');
const sequelize     = require('../config/database');

const Brawler = sequelize.define('Brawler', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    // ID oficial de la API de Supercell
    autoIncrement: false,
  },
  name: {
    type: DataTypes.STRING(60),
    allowNull: false,
  },
  rarity: {
    type: DataTypes.ENUM('common','rare','super_rare','epic','mythic','legendary'),
    allowNull: false,
  },
  role: {
    type: DataTypes.STRING(40),
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  rawData: {
    // Caché de la respuesta combinada de la API de Supercell + DB local.
    // Estructura: { id, name, rarity, role, description, starPowers, gadgets, ... }
    type: DataTypes.JSON,
    allowNull: true,
  },
  rawDataUpdatedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'brawlers',
  timestamps: true,
});

module.exports = Brawler;
