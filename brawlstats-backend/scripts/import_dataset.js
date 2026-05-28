/**
 * import_dataset.js
 * Importa partidas.json (generado por recolector.py) a la tabla dataset_battles.
 *
 * Uso (desde el directorio brawlstats-backend):
 *   node scripts/import_dataset.js
 *
 * Requiere que la DB esté arriba y .env configurado.
 */

require('dotenv').config();
const path = require('path');
const fs   = require('fs');

const { sequelize, DatasetBattle } = require('../models');

const DATASET_PATH = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, '../../partidas.json');
const BATCH_SIZE   = 500;

const RESULT_MAP = {
  victory: 'Win',
  defeat:  'Loss',
  draw:    'Draw',
};

async function run() {
  console.log('━'.repeat(50));
  console.log('  Importador dataset → dataset_battles');
  console.log('━'.repeat(50));

  // Conectar y crear tabla si no existe
  await sequelize.authenticate();
  console.log('  DB conectada.');
  await DatasetBattle.sync({ force: false });
  console.log('  Tabla dataset_battles lista.');

  // Leer JSON
  if (!fs.existsSync(DATASET_PATH)) {
    console.error(`\n  ❌  No se encuentra: ${DATASET_PATH}`);
    console.error('     Ejecuta primero: python recolector.py');
    process.exit(1);
  }

  const rows = JSON.parse(fs.readFileSync(DATASET_PATH, 'utf8'));
  console.log(`\n  ${rows.length} registros leídos de partidas.json`);

  // Mapear campos del JSON al modelo
  const records = rows.map(r => ({
    battleKey:      (r._battle_time || '') + '|' + (r._player_tag || ''),
    playerTag:      r._player_tag   || '',
    battleTime:     r._battle_time  || null,
    battleAt:       r.fecha         ? new Date(r.fecha) : null,
    mode:           r.modo          || null,
    map:            r.mapa          || null,
    result:         RESULT_MAP[r.resultado] || null,
    brawler:        r.brawler       || null,
    brawlerTrophies:r.trofeos_brawler != null ? Number(r.trofeos_brawler) : null,
    rank:           r._rank         != null ? Number(r._rank) : null,
    trophyChange:   r._trophy_change!= null ? Number(r._trophy_change) : null,
    battleType:     r._type         || null,
  }));

  // Insertar en lotes
  let inserted = 0;
  let skipped  = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch  = records.slice(i, i + BATCH_SIZE);
    const result = await DatasetBattle.bulkCreate(batch, { ignoreDuplicates: true });
    inserted += result.length;
    skipped  += batch.length - result.length;

    const done = Math.min(i + BATCH_SIZE, records.length);
    process.stdout.write(`\r  ${done}/${records.length} procesados  (${inserted} insertados, ${skipped} duplicados)`);
  }

  console.log('\n');
  console.log('━'.repeat(50));
  console.log(`  RESUMEN`);
  console.log('━'.repeat(50));
  console.log(`  Insertados  : ${inserted}`);
  console.log(`  Duplicados  : ${skipped}`);
  console.log(`  Total en DB : ${await DatasetBattle.count()}`);
  console.log('━'.repeat(50));

  await sequelize.close();
}

run().catch(err => {
  console.error('\n  ❌  Error:', err.message);
  process.exit(1);
});
