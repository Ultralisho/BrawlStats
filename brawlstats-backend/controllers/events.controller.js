const supercell = require('../services/supercell.service');
const { ok } = require('../utils/apiResponse');

const MODE_LABELS = {
  gemGrab:'Gem Grab', brawlBall:'Brawl Ball', showdown:'Showdown',
  soloShowdown:'Solo Showdown', duoShowdown:'Duo Showdown', hotZone:'Hot Zone',
  knockout:'Knockout', bounty:'Bounty', heist:'Heist', duels:'Duels',
  wipeout:'Wipeout', siege:'Siege', basketBrawl:'Basket Brawl',
  holdTheTrophy:'Hold The Trophy', botDrop:'Bot Drop',
};

async function getRotation(req, res, next) {
  try {
    const items = await supercell.getEventRotation();
    const events = items.map(ev => ({
      slotId:    ev.slotId,
      startTime: ev.startTime,
      endTime:   ev.endTime,
      mode:      MODE_LABELS[ev.event?.mode] || ev.event?.mode || 'unknown',
      modeKey:   ev.event?.mode || '',
      map:       ev.event?.map  || '—',
      eventId:   ev.event?.id   || null,
    }));
    return ok(res, events);
  } catch (err) {
    if (err.response?.status === 403)
      return ok(res, [], { warning: 'API de Brawl Stars no disponible: token inválido o IP no autorizada' });
    if (err.response?.status === 404)
      return ok(res, []);
    next(err);
  }
}

module.exports = { getRotation };
