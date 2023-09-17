
const debugLevel = "info" // Default debug/info

const pino = require('pino');
const pretty = require('pino-pretty');
const logger = pino(pretty());

logger.level = debugLevel;

module.exports = logger;