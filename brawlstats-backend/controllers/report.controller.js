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
  holdTheTrophy:'Hold The Trophy', botDrop:'Bot Drop', unknown:'Desconocido',
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

    const count = await Report.count({ where: { userId: req.user.id } });
    if (count >= 5) {
      return res.status(403).json({ success: false, error: 'Has alcanzado el límite de 5 reportes por cuenta.' });
    }

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

        const player = await Player.findOne({ where: { userId: req.user.id } });
        let battles = [], accBattles = [];

        if (player) {
          try { battles = await supercell.getBattleLog(player.tag); } catch { battles = []; }
          accBattles = await Battle.findAll({
            where:  { playerId: player.id },
            order:  [['battleAt', 'DESC']],
            limit:  200,
          });
        }

        await buildPdf(filepath, { name, type, period, player, battles, accBattles });

        await report.update({
          status:   'ready',
          filePath: `/uploads/reports/${filename}`,
          fileSize: fs.statSync(filepath).size,
        });
      } catch (e) {
        console.error('[report] build failed:', e.message);
        await report.update({ status: 'error' }).catch(() => {});
      }
    });

    return created(res, report);
  } catch (err) { next(err); }
}

async function download(req, res, next) {
  try {
    const report = await Report.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!report) return notFound(res, 'Reporte no encontrado');

    if (report.status !== 'ready' || !report.filePath) {
      return res.status(400).json({ success: false, error: 'El reporte aún no está listo' });
    }

    const abs = path.join(__dirname, '..', report.filePath);
    if (!fs.existsSync(abs)) {
      return res.status(404).json({ success: false, error: 'Archivo no encontrado en el servidor' });
    }

    const safeName = report.name.replace(/[^\w\s\-áéíóúñÁÉÍÓÚÑ]/g, '').trim() + '.pdf';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(safeName)}`);
    res.setHeader('Content-Length', fs.statSync(abs).size);
    fs.createReadStream(abs).pipe(res);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const report = await Report.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!report) return notFound(res, 'Reporte no encontrado');
    if (report.filePath) {
      const abs = path.join(__dirname, '..', report.filePath);
      if (fs.existsSync(abs)) try { fs.unlinkSync(abs); } catch {}
    }
    await report.destroy();
    return ok(res, { deleted: true });
  } catch (err) { next(err); }
}

// ── PDF BUILDER ──────────────────────────────────────────────────────────────

function buildPdf(filepath, { name, type, period, player, battles, accBattles }) {
  return new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ size: 'A4', margin: 0 });
    const stream = fs.createWriteStream(filepath);
    stream.on('finish', resolve);
    stream.on('error',  reject);
    doc.on('error',     reject);
    doc.pipe(stream);

    // Layout constants
    const PW = 595, PH = 842;
    const ML = 50,  CW = PW - ML * 2;   // content width = 495

    // Palette
    const C = {
      navy: '#0d1f38', navy2: '#162744', gold: '#FACC15',
      green: '#16a34a', red: '#dc2626', blue: '#3b82f6', amber: '#f59e0b',
      t1: '#111827', t2: '#6b7280', t3: '#9ca3af',
      lg: '#e5e7eb', xlg: '#f9fafb', white: '#ffffff',
    };

    const genStr = new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
    let   pageNum = 1;

    // ── Footer (call before every addPage) ──────────────────────────────────
    function drawFooter() {
      const fy = PH - 38;
      doc.rect(ML, fy - 2, CW, 0.5).fill(C.lg);
      doc.font('Helvetica').fontSize(8).fillColor(C.t3)
         .text(`BrawlStats  ·  ${name}  ·  ${genStr}`, ML, fy + 6, { width: CW - 50, align: 'left' })
         .text(`Pág. ${pageNum}`, ML, fy + 6, { width: CW, align: 'right' });
    }

    // ── New page ─────────────────────────────────────────────────────────────
    function newPage() {
      drawFooter();
      doc.addPage();
      pageNum++;
      doc.x = ML; doc.y = 50;
    }

    // ── Ensure vertical space ────────────────────────────────────────────────
    function space(needed) {
      if (doc.y + needed > PH - 52) newPage();
    }

    // ── Section header bar ───────────────────────────────────────────────────
    function sectionTitle(text) {
      space(55);
      const y = doc.y;
      doc.rect(ML, y, CW, 27).fill(C.navy2);
      doc.rect(ML, y, 4,  27).fill(C.gold);
      doc.font('Helvetica-Bold').fontSize(10).fillColor(C.white)
         .text(text.toUpperCase(), ML + 14, y + 9, { characterSpacing: 0.4 });
      doc.y = y + 35; doc.x = ML;
    }

    // ── Generic table ────────────────────────────────────────────────────────
    function drawTable({ columns, rows, resultCol = -1 }) {
      const W    = columns.reduce((s, c) => s + c.width, 0);
      const RH   = 20, HH = 24;

      function header(y) {
        doc.rect(ML, y, W, HH).fill(C.navy);
        let x = ML;
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.white);
        for (const col of columns) {
          doc.text(col.label, x + 4, y + 8, { width: col.width - 8, align: col.align || 'left', lineBreak: false });
          x += col.width;
        }
        return y + HH;
      }

      let y = header(doc.y);

      for (let i = 0; i < rows.length; i++) {
        if (y + RH > PH - 52) { newPage(); y = header(50); }

        if (i % 2 === 1) doc.rect(ML, y, W, RH).fill(C.xlg);
        doc.rect(ML, y, W, RH).stroke(C.lg);

        let x = ML;
        doc.font('Helvetica').fontSize(8.5);
        for (let j = 0; j < columns.length; j++) {
          const val = String(rows[i][j] ?? '-');
          let color = C.t1;
          if (j === resultCol) {
            color = val === 'Victoria' ? C.green : val === 'Derrota' ? C.red : C.t2;
          }
          doc.fillColor(color).text(val, x + 4, y + 5, {
            width: columns[j].width - 8, align: columns[j].align || 'left', lineBreak: false,
          });
          x += columns[j].width;
        }
        y += RH;
      }
      doc.y = y + 4; doc.x = ML;
    }

    // ════════════════════════════════════════════════════════════════════════
    //  CABECERA (página 1)
    // ════════════════════════════════════════════════════════════════════════
    const HEADER_H = 108;
    doc.rect(0, 0, PW, HEADER_H).fill(C.navy);
    doc.rect(0, HEADER_H, PW, 3).fill(C.gold);

    // Logo
    doc.font('Helvetica-Bold').fontSize(27).fillColor(C.gold).text('BrawlStats', ML, 28);
    // Report name
    doc.font('Helvetica').fontSize(14).fillColor(C.white).text(name, ML, 64, { width: 360, lineBreak: false });

    // Right-side meta
    doc.font('Helvetica').fontSize(9).fillColor(C.t3)
       .text(genStr,              PW - ML - 150, 30, { width: 150, align: 'right' })
       .text(`${type}  ·  ${period}`, PW - ML - 150, 44, { width: 150, align: 'right' });
    if (player) {
      doc.font('Helvetica-Bold').fontSize(10).fillColor(C.white)
         .text(`${player.name}  •  ${player.tag}`, PW - ML - 200, 68, { width: 200, align: 'right' });
    }

    doc.y = HEADER_H + 22; doc.x = ML;

    if (!player) {
      doc.font('Helvetica').fontSize(12).fillColor(C.t1)
         .text('Sin jugador vinculado.', ML, doc.y + 10);
      drawFooter();
      doc.end();
      return;
    }

    // ════════════════════════════════════════════════════════════════════════
    //  SECCIÓN 1: JUGADOR
    // ════════════════════════════════════════════════════════════════════════
    sectionTitle('Jugador');

    const raw  = player.rawData || {};

    // 4 stat boxes
    const BOXES = [
      { label: 'Trofeos',    value: (player.trophies        || 0).toLocaleString('es-ES'), accent: C.gold  },
      { label: 'Trofeos Máx', value: (player.highestTrophies|| 0).toLocaleString('es-ES'), accent: '#93c5fd' },
      { label: 'Nivel Exp',  value: String(player.level || '—'),                          accent: '#86efac' },
      { label: 'Club',       value: (player.club || '—').slice(0, 16),                    accent: '#f9a8d4' },
    ];
    const BW = (CW - 9) / 4, BH = 60;
    const y0 = doc.y;
    BOXES.forEach((b, i) => {
      const bx = ML + i * (BW + 3);
      doc.rect(bx, y0, BW, BH).fillAndStroke(C.xlg, C.lg);
      doc.rect(bx, y0 + BH - 4, BW, 4).fill(b.accent);
      doc.font('Helvetica').fontSize(7.5).fillColor(C.t2)
         .text(b.label.toUpperCase(), bx + 8, y0 + 9, { width: BW - 16, characterSpacing: 0.3 });
      const big = b.value.length > 9;
      doc.font('Helvetica-Bold').fontSize(big ? 13 : 17).fillColor(C.t1)
         .text(b.value, bx + 8, y0 + 22, { width: BW - 16, lineBreak: false });
    });
    doc.y = y0 + BH + 10;

    doc.font('Helvetica').fontSize(9).fillColor(C.t2)
       .text(`Última sync: ${player.lastSync ? new Date(player.lastSync).toLocaleDateString('es-ES') : '—'}`, ML, doc.y, { width: CW });
    doc.moveDown(1.4);

    // ════════════════════════════════════════════════════════════════════════
    //  SECCIÓN 2: RESUMEN DE BATALLAS
    // ════════════════════════════════════════════════════════════════════════
    const acc = accBattles || [];
    if (acc.length > 0) {
      const wins  = acc.filter(b => b.result === 'Win').length;
      const loses = acc.filter(b => b.result === 'Loss').length;
      const draws = acc.filter(b => b.result === 'Draw').length;
      const wr    = Math.round((wins / acc.length) * 100);
      const tcSum = acc.reduce((s, b) => s + (b.trophyChange || 0), 0);

      sectionTitle('Resumen de batallas acumuladas');

      const STATS = [
        { label: 'Partidas',     val: String(acc.length),                           col: C.blue  },
        { label: 'Win Rate',     val: `${wr}%`,                                     col: wr >= 50 ? C.green : C.red },
        { label: 'Victorias',    val: String(wins),                                 col: C.green },
        { label: 'Derrotas',     val: String(loses),                                col: C.red   },
        { label: 'Empates',      val: String(draws),                                col: C.t2    },
        { label: 'Trofeos neto', val: (tcSum >= 0 ? '+' : '') + tcSum,              col: tcSum >= 0 ? C.green : C.red },
      ];

      const SW = (CW - 10) / 6, SH = 52;
      const sy0 = doc.y;
      STATS.forEach((s, i) => {
        const sx = ML + i * (SW + 2);
        doc.rect(sx, sy0, SW, SH).fillAndStroke(C.xlg, C.lg);
        doc.font('Helvetica').fontSize(7.5).fillColor(C.t2)
           .text(s.label, sx + 4, sy0 + 9, { width: SW - 8, align: 'center' });
        doc.font('Helvetica-Bold').fontSize(16).fillColor(s.col)
           .text(s.val, sx + 4, sy0 + 22, { width: SW - 8, align: 'center', lineBreak: false });
      });
      doc.y = sy0 + SH + 12;
    }

    // ════════════════════════════════════════════════════════════════════════
    //  SECCIÓN 3: WIN RATE POR MODO
    // ════════════════════════════════════════════════════════════════════════
    if (acc.length > 0) {
      const modes = {};
      for (const b of acc) {
        const m = MODE_LABELS_PDF[b.mode] || b.mode;
        if (!modes[m]) modes[m] = { w: 0, t: 0 };
        modes[m].t++;
        if (b.result === 'Win') modes[m].w++;
      }
      const wrList = Object.entries(modes)
        .map(([m, d]) => ({ mode: m, wins: d.w, total: d.t, wr: Math.round((d.w / d.t) * 100) }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      if (wrList.length > 0) {
        sectionTitle('Win rate por modo de juego');

        const LW = 118, BW2 = CW - LW - 90, BX2 = ML + LW, SX2 = BX2 + BW2 + 12, RH2 = 27;

        for (const m of wrList) {
          space(RH2);
          const y = doc.y;
          doc.font('Helvetica').fontSize(10).fillColor(C.t1)
             .text(m.mode, ML, y + 5, { width: LW - 6, lineBreak: false });
          doc.roundedRect(BX2, y + 9, BW2, 11, 3).fill(C.lg);
          const fill  = Math.max(4, Math.round(BW2 * (m.wr / 100)));
          const bCol  = m.wr >= 60 ? C.green : m.wr >= 45 ? C.amber : C.red;
          doc.roundedRect(BX2, y + 9, fill, 11, 3).fill(bCol);
          doc.font('Helvetica-Bold').fontSize(9).fillColor(C.t1)
             .text(`${m.wr}%`, SX2, y + 5, { width: 32, align: 'right', lineBreak: false });
          doc.font('Helvetica').fontSize(8.5).fillColor(C.t2)
             .text(`${m.wins}/${m.total}`, SX2 + 36, y + 5, { width: 46, lineBreak: false });
          doc.y = y + RH2;
        }
        doc.moveDown(0.8);
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    //  SECCIÓN 4: BRAWLERS
    // ════════════════════════════════════════════════════════════════════════
    const brawlers = [...(raw.brawlers || [])].sort((a, b) => b.trophies - a.trophies);
    if (brawlers.length > 0) {
      sectionTitle(`Top brawlers — ${brawlers.length} desbloqueados`);
      drawTable({
        columns: [
          { label: '#',       width: 25,  align: 'center' },
          { label: 'Brawler', width: 128, align: 'left'   },
          { label: 'Trofeos', width: 65,  align: 'right'  },
          { label: 'Máx.',    width: 65,  align: 'right'  },
          { label: 'Rank',    width: 44,  align: 'right'  },
          { label: 'Power',   width: 44,  align: 'center' },
          { label: 'SP',      width: 35,  align: 'center' },
          { label: 'Gadgets', width: 50,  align: 'center' },
          { label: 'Gears',   width: 39,  align: 'center' },
        ],
        rows: brawlers.slice(0, 50).map((b, i) => [
          i + 1,
          b.name,
          (b.trophies        || 0).toLocaleString('es-ES'),
          (b.highestTrophies || 0).toLocaleString('es-ES'),
          b.rank  ?? '-',
          b.power ?? '-',
          b.starPowers?.length ?? 0,
          b.gadgets?.length    ?? 0,
          b.gears?.length      ?? 0,
        ]),
      });
      doc.moveDown(1);
    }

    // ════════════════════════════════════════════════════════════════════════
    //  SECCIÓN 5: ÚLTIMAS PARTIDAS
    // ════════════════════════════════════════════════════════════════════════
    const recentFmt = (battles || []).slice(0, 25).map(b => {
      const mode = b.event?.mode || b.battle?.mode || 'unknown';
      const map  = b.event?.map  || '-';
      let myBrawler = '-';
      for (const team of b.battle?.teams || []) {
        const me = team.find(p => p.tag === player.tag);
        if (me) { myBrawler = me.brawler?.name || '-'; break; }
      }
      if (myBrawler === '-') {
        const me = (b.battle?.players || []).find(p => p.tag === player.tag);
        myBrawler = me?.brawler?.name || '-';
      }
      const r   = b.battle?.result;
      const rk  = b.battle?.rank;
      const cut = mode === 'duoShowdown' ? 2 : 4;
      const res = r === 'victory' ? 'Victoria' : r === 'defeat' ? 'Derrota' : r === 'draw' ? 'Empate'
                : rk != null ? (rk <= cut ? 'Victoria' : 'Derrota') : '-';
      const tc  = b.battle?.trophyChange;
      return [
        MODE_LABELS_PDF[mode] || mode,
        map,
        myBrawler,
        res,
        tc == null ? '-' : tc > 0 ? `+${tc}` : String(tc),
      ];
    });

    sectionTitle('Últimas 25 partidas');
    if (recentFmt.length > 0) {
      drawTable({
        columns: [
          { label: 'Modo',      width: 115, align: 'left'   },
          { label: 'Mapa',      width: 155, align: 'left'   },
          { label: 'Brawler',   width: 90,  align: 'left'   },
          { label: 'Resultado', width: 80,  align: 'center' },
          { label: 'Trofeos',   width: 55,  align: 'right'  },
        ],
        rows: recentFmt,
        resultCol: 3,
      });
    } else {
      doc.font('Helvetica').fontSize(10).fillColor(C.t2)
         .text('Sin datos de batallas disponibles.', ML, doc.y + 8);
      doc.moveDown(1.5);
    }

    drawFooter();
    doc.end();
  });
}

// ── Admin endpoints ───────────────────────────────────────────────────────────

async function getAllAdmin(req, res, next) {
  try {
    const reports = await Report.findAll({
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
      order: [['createdAt', 'DESC']],
    });
    return ok(res, reports);
  } catch (err) { next(err); }
}

async function removeAdmin(req, res, next) {
  try {
    const report = await Report.findByPk(req.params.id);
    if (!report) return notFound(res, 'Reporte no encontrado');
    if (report.filePath) {
      const abs = path.join(__dirname, '..', report.filePath);
      if (fs.existsSync(abs)) try { fs.unlinkSync(abs); } catch {}
    }
    await report.destroy();
    return ok(res, { deleted: true });
  } catch (err) { next(err); }
}

module.exports = { getAll, create, download, remove, getAllAdmin, removeAdmin };
