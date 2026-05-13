const { Report, Player, Stat } = require('../models');
const { ok, created, notFound } = require('../utils/apiResponse');
const path = require('path');
const fs   = require('fs');

// GET /api/v1/reports
async function getAll(req, res, next) {
  try {
    const reports = await Report.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
    });
    return ok(res, reports);
  } catch (err) { next(err); }
}

// POST /api/v1/reports  — crea y genera un reporte
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

    // Generación de PDF en background (simplificada)
    // En producción usar una cola de tareas (Bull, etc.)
    setImmediate(async () => {
      try {
        // Directorio de uploads
        const dir = path.join(__dirname, '..', 'uploads', 'reports');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        const filename = `report_${report.id}.pdf`;
        const filepath = path.join(dir, filename);

        // Placeholder: escribir un PDF mínimo
        // TODO: reemplazar por librería como pdfkit o puppeteer
        fs.writeFileSync(filepath, `BrawlStats Report\nID: ${report.id}\nTipo: ${type}\nPeriodo: ${period}`);

        await report.update({
          status:   'ready',
          filePath: `/uploads/reports/${filename}`,
          fileSize: fs.statSync(filepath).size,
        });
      } catch (e) {
        await report.update({ status: 'error' });
      }
    });

    return created(res, report);
  } catch (err) { next(err); }
}

// DELETE /api/v1/reports/:id
async function remove(req, res, next) {
  try {
    const report = await Report.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!report) return notFound(res, 'Reporte no encontrado');

    // Borra el fichero si existe
    if (report.filePath) {
      const abs = path.join(__dirname, '..', report.filePath);
      if (fs.existsSync(abs)) fs.unlinkSync(abs);
    }

    await report.destroy();
    return ok(res, { message: 'Reporte eliminado' });
  } catch (err) { next(err); }
}

module.exports = { getAll, create, remove };
