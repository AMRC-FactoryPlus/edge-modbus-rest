#!/usr/bin/env node

const server = require('../lib/server');
const version = require('../package.json').version;
const logger = require('../lib/logger');

logger.info("▶️  App starting")

// start the server
server.start();
