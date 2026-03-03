require('dotenv').config();
const app    = require('./app');
const { sequelize } = require('./models');

const PORT = process.env.PORT || 3001;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL conectado');

    await sequelize.sync();
    console.log('✅ Tablas sincronizadas');

    app.listen(PORT, () => {
      console.log(`🚀 Servidor en http://localhost:${PORT}`);
      console.log(`   Entorno: ${process.env.NODE_ENV}`);
    });
  } catch (err) {
    console.error('❌ Error al iniciar:', err.message);
    process.exit(1);
  }
}

start();
