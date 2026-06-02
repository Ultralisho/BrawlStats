const { Sequelize } = require('sequelize');

const isProduction = process.env.NODE_ENV === 'production';

const sequelize = new Sequelize(
  process.env.DB_NAME || 'brawlstats',
  process.env.DB_USER || 'root',
  process.env.DB_PASS || null,
  {
    host:    process.env.DB_HOST || '127.0.0.1',
    port:    parseInt(process.env.DB_PORT) || 3306,
    dialect: 'mysql',
    logging: false,
    dialectOptions: isProduction ? {
      ssl: {
        rejectUnauthorized: true
      }
    } : {},
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
  }
);

module.exports = sequelize;
