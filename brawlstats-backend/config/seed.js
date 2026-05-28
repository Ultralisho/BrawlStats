require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, User, Brawler, Tutorial } = require('../models');

async function seed() {
  await sequelize.authenticate();

  // 1) Crear las tablas que no existan (no destructivo).
  await sequelize.sync();

  // 2) La tabla `tutorials` cambió de esquema (campos en español → inglés).
  //    La recreamos SOLO ella, sin tocar las demás. force:true en este modelo
  //    concreto la dropea y la vuelve a crear con el schema actual.
  await Tutorial.sync({ force: true });
  console.log('· Tabla tutorials recreada con el schema actual');

  // Admin de prueba
  const hash = await bcrypt.hash('admin1234', 10);
  await User.findOrCreate({
    where: { email: 'admin@brawlstats.gg' },
    defaults: { name: 'Admin', email: 'admin@brawlstats.gg', password: hash, role: 'admin' },
  });

  // Usuario normal de prueba
  const hash2 = await bcrypt.hash('user1234', 10);
  await User.findOrCreate({
    where: { email: 'ulises@brawlstats.gg' },
    defaults: { name: 'Ulises H.', email: 'ulises@brawlstats.gg', password: hash2, role: 'user' },
  });

  // Brawlers básicos (se amplían con POST /api/v1/brawlers/sync)
  const brawlers = [
    { id: 16000000, name: 'Shelly',  rarity: 'common',    role: 'Fighter'       },
    { id: 16000002, name: 'Colt',    rarity: 'common',    role: 'Sharpshooter'  },
    { id: 16000003, name: 'Bull',    rarity: 'common',    role: 'Tank'          },
    { id: 16000006, name: 'Mortis',  rarity: 'mythic',    role: 'Assassin'      },
    { id: 16000009, name: 'Spike',   rarity: 'legendary', role: 'Controller'    },
    { id: 16000011, name: 'Crow',    rarity: 'legendary', role: 'Assassin'      },
    { id: 16000012, name: 'Leon',    rarity: 'legendary', role: 'Assassin'      },
    { id: 16000028, name: 'Sandy',   rarity: 'legendary', role: 'Controller'    },
    { id: 16000034, name: 'Amber',   rarity: 'legendary', role: 'Controller'    },
  ];

  for (const b of brawlers) {
    await Brawler.findOrCreate({ where: { id: b.id }, defaults: b });
  }

  // Tutoriales reales (9 entradas)
  const tutorials = [
    {
      title: 'Cómo jugar Leon - Guía completa',
      description: 'Aprende a sacar el máximo partido a Leon: posicionamiento, uso del super invisible y match-ups clave.',
      category: 'Básico',
      brawler: 'Leon',
      youtubeQuery: 'Leon Brawl Stars guide 2025',
      level: 'Básico',
    },
    {
      title: 'Gem Grab: estrategia y posicionamiento',
      description: 'Cómo controlar el centro, gestionar el contador de 10 gemas y rotar con tu equipo.',
      category: 'Modos de juego',
      brawler: null,
      youtubeQuery: 'Gem Grab strategy Brawl Stars 2025',
      level: 'Intermedio',
    },
    {
      title: 'Cómo subir trofeos rápido en Ranked',
      description: 'Tips para escalar divisiones en Ranked sin estancarte: draft, comunicación y picks seguros.',
      category: 'Avanzado',
      brawler: null,
      youtubeQuery: 'how to rank up fast Brawl Stars 2025',
      level: 'Avanzado',
    },
    {
      title: 'Sandy en Hot Zone - La guía definitiva',
      description: 'Control de zona con Sandy, uso de la tormenta de arena y combos para invalidar al rival.',
      category: 'Básico',
      brawler: 'Sandy',
      youtubeQuery: 'Sandy Hot Zone Brawl Stars guide',
      level: 'Intermedio',
    },
    {
      title: 'Brawl Ball: técnicas de gol y defensa',
      description: 'Pases largos, walljumps, defensa del portero y cuándo conviene retrasar el balón.',
      category: 'Modos de juego',
      brawler: null,
      youtubeQuery: 'Brawl Ball tips tricks 2025',
      level: 'Básico',
    },
    {
      title: 'Cómo usar el super de Spike correctamente',
      description: 'Cuándo lanzar el super, cómo aprovechar el slow y errores comunes a evitar.',
      category: 'Avanzado',
      brawler: 'Spike',
      youtubeQuery: 'Spike super tips Brawl Stars',
      level: 'Avanzado',
    },
    {
      title: 'Knockout: draft y composiciones',
      description: 'Cómo armar un draft sólido en Knockout, counter-picks y roles imprescindibles.',
      category: 'Modos de juego',
      brawler: null,
      youtubeQuery: 'Knockout draft Brawl Stars 2025',
      level: 'Avanzado',
    },
    {
      title: 'Amber para principiantes',
      description: 'Manejo del super continuo, control de aceite y cómo no autodestruirte con el fuego.',
      category: 'Básico',
      brawler: 'Amber',
      youtubeQuery: 'Amber beginner guide Brawl Stars',
      level: 'Básico',
    },
    {
      title: 'Cómo leer el meta cada temporada',
      description: 'Aprende a identificar brawlers fuertes, nerf/buff patches y picks de tier alto.',
      category: 'Avanzado',
      brawler: null,
      youtubeQuery: 'Brawl Stars meta guide season 2025',
      level: 'Avanzado',
    },
  ];

  for (const t of tutorials) {
    await Tutorial.findOrCreate({
      where: { title: t.title },
      defaults: t,
    });
  }

  console.log('✅ Seed completado');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
