'use strict';

const logger = require('./logger');
const modbus = require('./modbus');
const async = require('async');

const queueMaxSize = 1000;

// Queue handler
var q = async.queue(async function (task) {
  await logger.debug('🚥🔁 Processing: ' + task.name);
  await task.function();
  await logger.debug(`🚥✅ Completed: ${task.name}. Remaining: ${q.length()}`);
}, 1);

// Assign an error callback
q.error(function (err, task) {
  console.error('🚥 Task experienced an error:' + err);
});

// Queue empty callback
q.drain(function () {
  logger.debug('🚥🗑️ Queue Empty');
});

// Queue Auto Flusher
setInterval(() => {
  if (q.length() > queueMaxSize) {
    logger.error(`🚥 Queue max size hit (${queueMaxSize}). Flushing queue 🔥.`)
    q.remove((item) => {
      item.data.res.status(503).send();
      logger.debug("🚥 Queue item removed: " + item.data.name)
      return true;
    })
  }
}, 10000);

// Route setup
var setup = async function (app, router) {

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
    res.status(200).json({ "value": "Debug Mode On" })
  });

  router.get('/read/:ip/:port/:unitId/:regType/:startAddress/:quantity', (req, res) => {
    logger.info("🛎️  Route /read " + JSON.stringify(req.params))
    logger.debug("🧩 Incoming Params: " + JSON.stringify(req.params));
    logger.debug("🔑 Incoming keys: " + JSON.stringify(req.query));

    // Add item to queue with callback
    q.push({
      "name": JSON.stringify(req.params), "res": res, "function": async function (err) {
        if (err) {
          console.error(err);
          return res.status(500).send();
        }

        let reading = null

        // Conversion Values
        req.query.conversion = (req.query.hasOwnProperty('conversion')) ? req.query.conversion : "integer"
        req.query.endianness = (req.query.hasOwnProperty('endianness')) ? req.query.endianness : "big"
        req.query.debug = (req.query.hasOwnProperty('debug')) ? req.query.debug : false

        try {
          // Modbus Reading
          reading = await modbus.readRegister(
            req.params.ip,
            req.params.port,
            req.params.unitId,
            req.params.regType,
            req.params.startAddress,
            req.params.quantity,
            req.query.conversion,
            req.query.endianness
          )
        } catch (error) {
          log("🚨 Failed to read Modbus. Error " + error)
          return res.status(502).json({ "params": req.params, "query": req.query, "error": error })
        }

        // Reading worked check and scale
        if (isNaN(reading) || reading == null) {
          return res.status(404).json({ "params": req.params, "reading": String(reading), "error": "NaN" })
        } else {
          // Scaling
          req.query.multiplier = (req.query.hasOwnProperty('multiplier')) ? req.query.multiplier : 1
          req.query.offset = (req.query.hasOwnProperty('offset')) ? req.query.offset : 0
          const transformedReading = transformReading(reading, req.query.offset, req.query.multiplier)

          // Respond
          if (req.query.debug) {
            return res.status(200).json({ "params": req.params, "query": req.query, "reading": reading, "transformedReading": transformedReading })
          } else {
            return res.status(200).json({ "reading": reading, "transformedReading": transformedReading })
          }
        }
      }
    });
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
