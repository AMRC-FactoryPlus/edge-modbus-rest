RESTful(ish) API to Modbus
=======

### Overview

Modbus is a serial communication protocol used to exchange information between electronic devices. Typically, only the modbus master in a modbus network is the one initiating communication and slaves respond to these requests. In this case, the modbus-rest acts as the master and communication (writing and reading registers) is initated through the REST API.


### API
Common path parameters in the API are:
- `ip` - IP of target device, such as `192.168.1.11`
- `port` - Modbus port, commonly `502`
- `unitId` - the slave ID as a numeric, commonly `1`
- `regType` - The register type such as `input`, `holding`
- `startAddress` - the starting address of a read non incremented by 1.
- `quantity` - the number of registers to read
- `dataType` - the data type to convert the reading to, such as `float32/uint32/...`

| URL | Method | Description |
|-----|--------|-------------|
| `/random` | GET | Test page to hit to check service. |
| `/read/{ip}/{port}/{unitId}/{regType}/{startAddress}/{quantity}/` | GET | Reads the values of a register. |

### Query Parameters
#### Conversion
The `/read/...` endpoint offers the transformation of the reading by providing `conversion` and `endianness` key value pair by appending the URL with `?conversion=raw`.
The following conversion are supported:
- `conversion`:
    - `raw` - Do not default to any conversion, always return raw response (default)
    - `integer` (default for registers) - Returns an integer representation of the register value
    - `float32` - Interpret the input as a floating value according to IEEE-754.
- `endianness`:
    - `little` (default)
    - `big`

#### Offset and Multiplication
The `/read/...` endpoint offers the scaling of the reading by providing `offset` and `multiplier` key value pairs by appending the URL with `?offset=<value>&multiplier=<value>`

**Example:** http://localhost:20900/read/192.168.255.1/502/1/holding/4110/1/float32?offset=111&multiplier=0.1&conversion=raw&endianness=big


### Build
```bash
docker build -t amrc-factoryplus.shef.ac.uk:5000/modbus-rest:<version_number> .
docker push amrc-factoryplus.shef.ac.uk:5000/modbus-rest:<version_number>
```

## Acknowledgments
https://github.com/pakerfeldt/node-modbus-rest