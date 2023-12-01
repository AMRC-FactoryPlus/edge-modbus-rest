'use strict';

const logger = require('./logger');
const modbus = require('./modbus');
const async = require('async');

const queueDelay = 100;
const queueMaxSize = 100;

// Queue handler
var q = async.queue(function (task, callback) {
  logger.debug('🚥 Processing task: ' + task.name);

  // Force callbacks to only execute one at a time
  setTimeout(() => {
    callback();
  }, queueDelay);
}, 1);

// assign an error callback
q.error(function (err, task) {
  console.error('🚥 Task experienced an error:' + err);
});

// Queue empty callback
q.drain(function () {
  logger.debug('🚥 Queue Empty');
});

// Queue Auto Flusher
setInterval(() => {
  if (q.length() > queueMaxSize) {
    logger.error("🚥 Queue max size hit. Flushing queue 🔥.")
    q.kill()
  }
}, 5000);



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
    logger.info("🛎️  Route /read Queued")
    logger.debug("🧩 Incoming Params: " + JSON.stringify(req.params));
    logger.debug("🔑 Incoming keys: " + JSON.stringify(req.query));

    // Add item to queue with callback
    q.push({ name: 'Modbus Reading' }, function (err) {
      if (err) {
        // Handle error
        console.error(err);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      let reading = null

      // Conversion Values
      req.query.conversion = (req.query.hasOwnProperty('conversion')) ? req.query.conversion : "interger"
      req.query.endianness = (req.query.hasOwnProperty('endianness')) ? req.query.endianness : "big"
      req.query.debug = (req.query.hasOwnProperty('debug')) ? req.query.debug : false

      // Reading
      reading = modbus.readRegister(
        req.params.ip,
        req.params.port,
        req.params.unitId,
        req.params.regType,
        req.params.startAddress,
        req.params.quantity,
        req.query.conversion,
        req.query.endianness
      )

      if (isNaN(reading) || reading == null) {
        return res.status(400).json({ "params": req.params, "reading": String(reading), "error": "NaN" })
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
