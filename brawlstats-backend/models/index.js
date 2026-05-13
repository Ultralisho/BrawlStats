const sequelize = require('../config/database');

const User       = require('./user.model');
const Player     = require('./player.model');
const Brawler    = require('./brawler.model');
const Stat       = require('./stat.model');
const Report     = require('./report.model');

// ── Asociaciones ────────────────────────────────────────────────────────────
// Un usuario puede tener varios jugadores vinculados
User.hasMany(Player,  { foreignKey: 'userId', as: 'players' });
Player.belongsTo(User,{ foreignKey: 'userId', as: 'user'    });

// Un jugador tiene muchas entradas de estadísticas históricas
Player.hasMany(Stat,  { foreignKey: 'playerId', as: 'stats' });
Stat.belongsTo(Player,{ foreignKey: 'playerId', as: 'player'});

// Un brawler aparece en muchas estadísticas
Brawler.hasMany(Stat, { foreignKey: 'brawlerId', as: 'stats'   });
Stat.belongsTo(Brawler,{ foreignKey: 'brawlerId', as: 'brawler'});

// Un usuario puede generar muchos reportes
User.hasMany(Report,  { foreignKey: 'userId', as: 'reports' });
Report.belongsTo(User,{ foreignKey: 'userId', as: 'user'    });

module.exports = { sequelize, User, Player, Brawler, Stat, Report };
