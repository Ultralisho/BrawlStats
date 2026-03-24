// Mapa de colores por modo de Brawl Stars.
// Cubre las dos formas en las que llegan los nombres en el codigo:
//   - Labels "humanos" del backend de stats (ej. "Brawl Ball", "Solo Showdown")
//   - Keys camelCase de la API de Supercell (ej. "brawlBall", "soloShowdown")
// Cualquier modo no listado cae a un gris para que la barra nunca quede vacia.

export const MODE_COLORS = {
  'Brawl Ball':    '#3b82f6',
  'Solo Showdown': '#ef4444',
  'Duo Showdown':  '#f97316',
  'Showdown':      '#ef4444',
  'Gem Grab':      '#8b5cf6',
  'Heist':         '#f59e0b',
  'Bounty':        '#06b6d4',
  'Knockout':      '#ec4899',
  'Hot Zone':      '#84cc16',
  'Wipeout':       '#14b8a6',
  'Duels':         '#a855f7',
  'Air Hockey':    '#0ea5e9',
  'Paint Brawl':   '#f43f5e',
};

const CAMEL_TO_LABEL = {
  gemGrab:      'Gem Grab',
  brawlBall:    'Brawl Ball',
  showdown:     'Showdown',
  soloShowdown: 'Solo Showdown',
  duoShowdown:  'Duo Showdown',
  hotZone:      'Hot Zone',
  knockout:     'Knockout',
  bounty:       'Bounty',
  heist:        'Heist',
  duels:        'Duels',
  wipeout:      'Wipeout',
  airHockey:    'Air Hockey',
  paintBrawl:   'Paint Brawl',
};

export const FALLBACK_MODE_COLOR = '#6b7280';

export function modeColor(mode) {
  if (!mode) return FALLBACK_MODE_COLOR;
  if (MODE_COLORS[mode]) return MODE_COLORS[mode];
  const asLabel = CAMEL_TO_LABEL[mode];
  if (asLabel && MODE_COLORS[asLabel]) return MODE_COLORS[asLabel];
  return FALLBACK_MODE_COLOR;
}

export default modeColor;
