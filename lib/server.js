'use strict';

const routes = require('./routes');
const logger = require('./logger');

var start = function () {
  const port = 20900;
  const express = require('express');
  const app = express();
  const router = express.Router();


  routes.setup(app, router);
  app.listen(port);
  logger.info("🚀 Server started! Listening on port " + port)
  // app.route
}

module.exports.start = start;
