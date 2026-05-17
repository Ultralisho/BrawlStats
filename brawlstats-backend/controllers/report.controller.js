const { Report, Player, Stat, Brawler, Battle, User } = require('../models');
const supercell = require('../services/supercell.service');
const { ok, created, notFound } = require('../utils/apiResponse');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs   = require('fs');

const MODE_LABELS_PDF = {
  gemGrab:'Gem Grab', brawlBall:'Brawl Ball', showdown:'Showdown',
  soloShowdown:'Solo Showdown', duoShowdown:'Duo Showdown', hotZone:'Hot Zone',
  knockout:'Knockout', bounty:'Bounty', heist:'Heist', duels:'Duels',
  wipeout:'Wipeout', siege:'Siege', basketBrawl:'Basket Brawl',
  holdTheTrophy:'Hold The Trophy', botDrop:'Bot Drop',
};

async function getAll(req, res, next) {
  try {
    const reports = await Report.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
    });
    return ok(res, reports);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { name, type, period, params } = req.body;

    const report = await Report.create({
      userId: req.user.id,
      name,
      type,
      period,
      params,
      status: 'generating',
    });

    setImmediate(async () => {
      try {
        const dir = path.join(__dirname, '..', 'uploads', 'reports');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        const filename = `report_${report.id}.pdf`;
        const filepath = path.join(dir, filename);

        const player  = await Player.findOne({ where: { userId: req.user.id } });
        let   battles = [];
        let   accBattles = [];
        if (player) {
          try { battles = await supercell.getBattleLog(player.tag); } catch { battles = []; }
          accBattles = await Battle.findAll({
            where: { playerId: player.id },
            order: [['battleAt', 'DESC']],
            limit: 200,
          });
        }

        await buildPdf(filepath, { name, type, period, player, battles, accBattles });

        await report.update({
          status:   'ready',
          filePath: `/uploads/reports/${filename}`,
          fileSize: fs.statSync(filepath).size,
        });
      } catch (e) {
        await report.update({ status: 'error' }).catch(() => {});
      }
    });

    return created(res, report);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const report = await Report.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!report) return notFound(res, 'Reporte no encontrado');
    if (report.filePath) {
      const abs = path.join(__dirname, '..', report.filePath);
      if (fs.existsSync(abs)) fs.unlinkSync(abs);
    }
    await report.destroy();
    return ok(res, { message: 'Reporte eliminado' });
  } catch (err) { next(err); }
}

function ensureSpace(doc, needed) {
  if (doc.y + needed > 780) doc.addPage();
}

function buildPdf(filepath, { name, type, period, player, battles, accBattles }) {
  return new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filepath);
    stream.on('finish', resolve);
    stream.on('error',  reject);
    doc.on('error',     reject);
    doc.pipe(stream);

    const GOLD = '#FACC15';
    const GREY = '#6b7280';

    doc.fillColor(GOLD).fontSize(22).font('Helvetica-Bold').text('BrawlStats');
    doc.moveDown(0.2);
    doc.fillColor('black').fontSize(16).font('Helvetica').text(name);
    doc.fillColor(GREY).fontSize(10)
       .text(`Tipo: ${type}   Periodo: ${period}   Generado: ${new Date().toLocaleString('es-ES')}`);
    doc.moveTo(50, doc.y + 6).lineTo(545, doc.y + 6).strokeColor(GOLD).lineWidth(1).stroke();
    doc.moveDown(1.2);

    if (!player) {
      doc.fillColor('black').fontSize(12).text('Sin jugador vinculado.');
      doc.end();
      return;
    }

    // ── Jugador ───────────────────────────────────────────────
    doc.fillColor(GOLD).fontSize(13).font('Helvetica-Bold').text('Jugador');
    doc.moveDown(0.3);
    doc.fillColor('black').fontSize(11).font('Helvetica');
    doc.text(`${player.name}   ${player.tag}`);
    doc.text(`Trofeos: ${player.trophies}     Maximo: ${player.highestTrophies}     Nivel: ${player.level}`);
    doc.text(`Club: ${player.club || '-'}`);
    doc.text(`Ultima sync: ${player.lastSync ? new Date(player.lastSync).toLocaleString('es-ES') : '-'}`);
    doc.moveDown(1);

    // ── Resumen estadistico global (BD acumulada) ─────────────
    const acc = accBattles || [];
    if (acc.length > 0) {
      const wins   = acc.filter(b => b.result === 'Win').length;
      const losses = acc.filter(b => b.result === 'Loss').length;
      const draws  = acc.filter(b => b.result === 'Draw').length;
      const wr     = acc.length > 0 ? Math.round((wins / acc.length) * 100) : 0;
      const tcSum  = acc.reduce((s, b) => s + (b.trophyChange || 0), 0);
      const tcPos  = acc.filter(b => b.trophyChange > 0).reduce((s, b) => s + b.trophyChange, 0);
      const tcNeg  = acc.filter(b => b.trophyChange < 0).reduce((s, b) => s + b.trophyChange, 0);

      doc.fillColor(GOLD).fontSize(13).font('Helvetica-Bold').text('Resumen estadistico');
      doc.moveDown(0.3);
      doc.fillColor('black').fontSize(11).font('Helvetica');
      doc.text(`Partidas analizadas: ${acc.length}     WR global: ${wr}%`);
      doc.text(`Victorias: ${wins}     Derrotas: ${losses}     Empates: ${draws}`);
      doc.text(`Trofeos netos: ${tcSum >= 0 ? '+' + tcSum : tcSum}     (ganados ${tcPos > 0 ? '+' + tcPos : tcPos}, perdidos ${tcNeg})`);
      doc.moveDown(1);
    }

    // ── Win Rate por Modo (barras) ────────────────────────────
    if (acc.length > 0) {
      const modes = {};
      for (const b of acc) {
        const mLabel = MODE_LABELS_PDF[b.mode] || b.mode;
        if (!modes[mLabel]) modes[mLabel] = { wins: 0, total: 0 };
        modes[mLabel].total++;
        if (b.result === 'Win') modes[mLabel].wins++;
      }
      const wrList = Object.entries(modes)
        .map(([m, d]) => ({ mode: m, wins: d.wins, total: d.total, wr: Math.round((d.wins / d.total) * 100) }))
        .sort((a, b) => b.total - a.total);

      ensureSpace(doc, 80);
      doc.fillColor(GOLD).fontSize(13).font('Helvetica-Bold').text('Win Rate por modo');
      doc.moveDown(0.5);

      const barX     = 50;
      const labelW   = 110;
      const barW     = 280;
      const valueX   = barX + labelW + barW + 10;
      const rowH     = 22;

      for (const m of wrList) {
        ensureSpace(doc, rowH);
        const y = doc.y;
        doc.fillColor('black').font('Helvetica').fontSize(10);
        doc.text(m.mode, barX, y + 4, { width: labelW });
        // Track
        doc.roundedRect(barX + labelW, y + 6, barW, 10, 3).fillAndStroke('#e5e7eb', '#e5e7eb');
        // Fill
        const filled = Math.max(2, Math.round(barW * (m.wr / 100)));
        doc.roundedRect(barX + labelW, y + 6, filled, 10, 3).fill(GOLD);
        // Value
        doc.fillColor('black').font('Helvetica-Bold').fontSize(10)
           .text(`${m.wr}%  (${m.wins}/${m.total})`, valueX, y + 4, { width: 95 });
        doc.y = y + rowH;
      }
      doc.moveDown(0.6);
    }

    // ── Brawlers (lista completa) ─────────────────────────────
    const brawlers = [...(player.rawData?.brawlers || [])]
      .sort((a, b) => b.trophies - a.trophies);
    if (brawlers.length > 0) {
      ensureSpace(doc, 60);
      doc.fillColor(GOLD).fontSize(13).font('Helvetica-Bold')
         .text(`Brawlers (${brawlers.length})`);
      doc.moveDown(0.4);
      drawTable(doc, {
        columns: [
          { label: 'Brawler', width: 160 },
          { label: 'Trofeos', width:  80, align: 'right' },
          { label: 'Maximo',  width:  80, align: 'right' },
          { label: 'Power',   width:  60, align: 'right' },
          { label: 'Rank',    width:  60, align: 'right' },
        ],
        rows: brawlers.map(b => [b.name, b.trophies, b.highestTrophies, b.power, b.rank]),
      });
      doc.moveDown(1);
    }

    // ── Ultimas 25 partidas ───────────────────────────────────
    const recent = (battles || []).slice(0, 25);
    if (recent.length > 0) {
      ensureSpace(doc, 60);
      doc.fillColor(GOLD).fontSize(13).font('Helvetica-Bold').text('Ultimas 25 partidas');
      doc.moveDown(0.4);
      drawTable(doc, {
        columns: [
          { label: 'Modo',      width: 110 },
          { label: 'Mapa',      width: 150 },
          { label: 'Brawler',   width:  90 },
          { label: 'Resultado', width:  70 },
          { label: 'Trofeos',   width:  60, align: 'right' },
        ],
        rows: recent.map(b => {
          const mode = b.event?.mode  || b.battle?.mode || '?';
          const map  = b.event?.map   || '-';
          let myBrawler = '-';
          for (const team of b.battle?.teams || []) {
            const me = team.find(p => p.tag === player.tag);
            if (me) { myBrawler = me.brawler?.name || '-'; break; }
          }
          if (myBrawler === '-') {
            const me = (b.battle?.players || []).find(p => p.tag === player.tag);
            myBrawler = me?.brawler?.name || '-';
          }
          const res_ = b.battle?.result || (b.battle?.rank ? `Rank ${b.battle.rank}` : '?');
          const tc   = b.battle?.trophyChange;
          const tcStr = tc == null ? '-' : tc > 0 ? `+${tc}` : String(tc);
          return [MODE_LABELS_PDF[mode] || mode, map, myBrawler, res_, tcStr];
        }),
      });
    } else if (acc.length === 0) {
      doc.fillColor(GREY).fontSize(11).font('Helvetica-Oblique').text('Historial de partidas no disponible.');
    }

    doc.end();
  });
}

function drawTable(doc, { columns, rows }) {
  const startX = doc.x;
  const rowH   = 18;
  let   y      = doc.y;

  doc.fontSize(10).font('Helvetica-Bold').fillColor('#374151');
  let x = startX;
  for (const c of columns) {
    doc.text(c.label, x, y, { width: c.width, align: c.align || 'left' });
    x += c.width;
  }
  y += rowH - 4;
  doc.moveTo(startX, y).lineTo(startX + columns.reduce((s, c) => s + c.width, 0), y)
     .strokeColor('#e5e7eb').lineWidth(0.5).stroke();
  y += 4;

  doc.font('Helvetica').fillColor('black');
  for (const row of rows) {
    if (y > 780) { doc.addPage(); y = 50; }
    x = startX;
    for (let i = 0; i < columns.length; i++) {
      doc.text(String(row[i] ?? '-'), x, y, { width: columns[i].width, align: columns[i].align || 'left' });
      x += columns[i].width;
    }
    y += rowH;
  }
  doc.y = y;
  doc.x = startX;
}

// GET /api/v1/reports/all  (admin only) — todos los reportes con su autor
async function getAllAdmin(req, res, next) {
  try {
    const reports = await Report.findAll({
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
      order: [['createdAt', 'DESC']],
    });
    return ok(res, reports);
  } catch (err) { next(err); }
}

// DELETE /api/v1/reports/admin/:id  (admin only) — borrar reporte de cualquiera
async function removeAdmin(req, res, next) {
  try {
    const report = await Report.findByPk(req.params.id);
    if (!report) return notFound(res, 'Reporte no encontrado');
    if (report.filePath) {
      const abs = path.join(__dirname, '..', report.filePath);
      if (fs.existsSync(abs)) { try { fs.unlinkSync(abs); } catch {} }
    }
    await report.destroy();
    return ok(res, { message: 'Reporte eliminado' });
  } catch (err) { next(err); }
}

module.exports = { getAll, create, remove, getAllAdmin, removeAdmin };
