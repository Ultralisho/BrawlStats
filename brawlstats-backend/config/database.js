const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'brawlstats',
  process.env.DB_USER || 'root',
  process.env.DB_PASS || null,   // null en vez de string vacío
  {
    host:    process.env.DB_HOST || '127.0.0.1',
    port:    parseInt(process.env.DB_PORT) || 3306,
    dialect: 'mysql',
    logging: false,
    dialectOptions: {
      // Para MariaDB/XAMPP sin contraseña
      allowPublicKeyRetrieval: true,
    },
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
  }
);

module.exports = sequelize;