'use strict';

const logger = require('./logger');
const ModbusRTU = require("modbus-serial");

// Sessions
let activeSessions = []

// Main reader
async function readRegister(ip, port, unitId, regType, startAddress, qty, dataType, endianness) {
  let reading = "😬 Reading failed";

  let client = null;
  // Check if active connection exists
  for (const sessionId in activeSessions) {
    if (activeSessions[sessionId]._port.connectOptions.host == ip && activeSessions[sessionId]._port.connectOptions.port == port) {
      logger.debug("👌 Device Connection EXISTS: " + activeSessions[sessionId]._port.connectOptions.host + ":" + activeSessions[sessionId]._port.connectOptions.port);
      logger.debug("🔌 Connection is Open: " + String(activeSessions[sessionId].isOpen))

      if (activeSessions[sessionId].isOpen) {
        // Session still open
        client = activeSessions[sessionId];
      } else {
        // No open any more, remove from list
        activeSessions.splice(sessionId, 1)
      }
      break;
    }
  }

  // Do a reading
  try {
    if (client == null) {
      client = new ModbusRTU();
      await client.connectTCP(ip, { port: Number(port) });
      await client.setTimeout(1000);

      activeSessions.push(client)
      logger.info("➕ Device Connection ADDED: " + client._port.connectOptions.host + ":" + client._port.connectOptions.port);
    }

    await client.setID(unitId);

    logger.debug("🔢 Active session count: " + activeSessions.length);
    logger.debug("Modbus is Connected: ", client.isOpen);
    logger.debug("Device Connection: " + client._port.connectOptions.host + ":" + client._port.connectOptions.port);

    if (regType === "input") {
      const { data } = await readInputRegisters(client, startAddress, qty);
      reading = data;
    } else if (regType === "holding") {
      const { data } = await readHoldingRegisters(client, startAddress, qty);
      reading = data;
    } else if (regType === "coil") {
      const { data } = await readCoils(client, startAddress, qty);
      reading = data;
    } else {
      reading = "Invalid regType"
    }
    reading = await dataTypeParser(reading, dataType, endianness)
    //   await client.close();
  } catch (error) {
    console.log(error);
    logger.error("Register " + startAddress + " error: " + JSON.stringify(error))
    logger.debug("❌ Could not connect")
  }
  return reading
}

async function readInputRegisters(client, startAddress, qty) {
  return new Promise((resolve, reject) => {
    client.readInputRegisters(startAddress, qty, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

async function readHoldingRegisters(client, startAddress, qty) {
  return new Promise((resolve, reject) => {
    client.readHoldingRegisters(startAddress, qty, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

async function readCoils(client, startAddress, qty) {
  return new Promise((resolve, reject) => {
    client.readCoils(startAddress, qty, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

async function dataTypeParser(values, dataType, endian) {
  let result
  let buffer

  switch (dataType) {
    case "float":
    case "float32":
    case "float64":
    case "integer":
      buffer = Buffer.alloc(8);

      // Fill up buffer
      for (index in values) {
        if (endian == "big") {
          buffer.writeUInt16BE(values[index], index * 2)
        } else {
          buffer.writeUInt16LE(values[index], index * 2)
        }
      }
  }


  // Convert
  switch (dataType) {
    case "raw":
      result = values;
      break;
    case "float":
    case "float32":
    case "float64":
      if (endian == "big") {
        result = buffer.readFloatBE();
      } else {
        result = buffer.readFloatLE();
      }
      break;
    case "integer":
      if (endian == "big") {
        result = buffer.readInt16BE();
      } else {
        result = buffer.readInt16LE();
      }
      break;
    case "string":
      // Change to "little" for little-endian
      result = values.map(value => {
        const hexValue = value.toString(16).padStart(4, '0');

        // Convert to 4-character hexadecimal string
        let ascii = Buffer.from(hexValue, 'hex').toString('ascii');
        if (endian === "little") {
          // Reverse the order of bytes for big-endian
          ascii = ascii.split("").reverse().join('');
        }
        return ascii;
      }).join('');
      break;
    default:
      logger.error(); ("😢 Conversion not implemented for: " + dataType);
      result = "Conversion not Implemented"
  }
  logger.debug("🧠 Converted to type: " + result);
  return result
}

module.exports.readRegister = readRegister;
