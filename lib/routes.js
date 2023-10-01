'use strict';

const logger = require('./logger');
const modbus = require('./modbus');

var setup = function (app, router) {

  // Mount the router with a base URL
  app.use('/v1', router);

  router.get('/', (req, res) => {
    logger.info("🛎️  Route /")
    res.status(200).json({ "value": "Modbus REST API" })
  });

  router.get('/random', (req, res) => {
    logger.info("🛎️  Route /random")
    res.status(200).json({ "value": (Math.random() * 100) })
  });

  router.get('/debug', (req, res) => {
    logger.info("🛎️  Route /debug")
    logger.level = 'debug'
    res.status(200).json({ "value": "Debug Mode On"})
  });

  router.get('/stop', (req, res) => {
    logger.info("🛎️  Route /stop")
    res.status(200).json({ "value": "Stopping application"})
    process.exit();
  });

  router.get('/read/:ip/:port/:unitId/:regType/:startAddress/:quantity', (req, res) => {
    // Example
    // http://localhost:20900/read/192.168.255.1/502/1/holding/4110/1/float?offset=111&multiplier=2
    logger.info("🛎️  Route /read/... " + JSON.stringify(req.params))

    logger.debug("🧩 Incoming Params: " + JSON.stringify(req.params));
    logger.debug("🔑 Incoming keys: " + JSON.stringify(req.query));

    let reading = null

    // Conversion Values
    req.query.conversion = (req.query.hasOwnProperty('conversion')) ? req.query.conversion : "raw"
    req.query.endianness = (req.query.hasOwnProperty('endianness')) ? req.query.endianness : "little"
    req.query.debug = (req.query.hasOwnProperty('debug')) ? req.query.debug : false


    // Reading
    modbus.readRegister(
      req.params.ip,
      req.params.port,
      req.params.unitId,
      req.params.regType,
      req.params.startAddress,
      req.params.quantity,
      req.query.conversion,
      req.query.endianness
    ).then((reading) => {
      if (isNaN(reading) || reading == null) {
        res.status(400).json({ "params": req.params, "reading": String(reading), "error": "NaN" })
      } else {
        // Scaling
        req.query.multiplier = (req.query.hasOwnProperty('multiplier')) ? req.query.multiplier : 1
        req.query.offset = (req.query.hasOwnProperty('offset')) ? req.query.offset : 0
        const transformedReading = transformReading(reading, req.query.offset, req.query.multiplier)

        // Respond
        if (req.query.debug) {
          res.status(200).json({ "params": req.params, "query": req.query, "reading": reading, "transformedReading": transformedReading })
        } else {
          res.status(200).json({ "reading": reading, "transformedReading": transformedReading })
        }
      }
    })
  });

  // Default route
  router.get("*", (req, res) => {
    res.status(404).json({ "value": "PAGE NOT FOUND" })
  });

  logger.debug("🚙 Routes set up")
};

function transformReading(value, offset, multiplier) {
  return (value * Number(multiplier) + Number(offset))
}

module.exports.setup = setup;
