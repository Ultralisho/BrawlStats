require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, User, Brawler } = require('../models');

async function seed() {
  await sequelize.authenticate();
  await sequelize.sync({ alter: true });

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

  console.log('✅ Seed completado');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
