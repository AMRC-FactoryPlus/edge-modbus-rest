RESTful(ish) API to Modbus
=======

![](./docs/overview.png)

## Overview
REST service for allowing to read from Modbus TCP devices with different IP addresses or device IDs by making a REST call.
Also allows to convert data to the desired data type and adjust data values through specifying an offset and multiplier.

At this stage only `/read` methods are supported.

## API
Base URL: `http://<serverIp>:20900/v1`

Common path parameters in the API are:
- `ip` - IP of target device, such as `192.168.1.11`.
- `port` - Modbus port, commonly `502`.
- `unitId` - the slave ID as a numeric, commonly `1`
- `regType` - The register type such as `input`, `holding` (supported).
- `startAddress` - the starting address of a read non incremented by 1.
- `quantity` - the number of registers to read.
- `dataType` - the data type to convert the reading to, such as `float/uint32/string`.

| URL | Method | Description |
|-----|--------|-------------|
| `/read/{ip}/{port}/{unitId}/{regType}/{startAddress}/{quantity}/` | GET | Reads the values of a register. |
| `/random` | GET | Test page to hit to check service. |

### Query Parameters
#### Conversion
The `/read/...` endpoint offers the transformation of the reading by providing `conversion` and `endianness` key value pair by appending the URL with `?conversion=raw`.
The following conversion are supported:
- `conversion`:
    - `raw` - Do not default to any conversion, always return raw response (default)
    - `integer` - Returns an integer representation of the register value
    - `float32` - Interpret the input as a floating value according to IEEE-754.
- `endianness`:
    - `little` (default)
    - `big`

#### Offset and Multiplication
The `/read/...` endpoint offers the scaling of the reading by providing `offset` and `multiplier` key value pairs:
- `offset` (default `0`)
- `multiplier` (default `1`)

**Example:** `http://localhost:20900/v1/read/192.168.255.1/502/1/holding/4110/1/float32?offset=111&multiplier=0.1&conversion=raw&endianness=big`


## Acknowledgments
Code base from: https://github.com/pakerfeldt/node-modbus-rest
