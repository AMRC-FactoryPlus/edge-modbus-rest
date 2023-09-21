FROM oven/bun:1.0.1
WORKDIR /app
COPY package*.json .
RUN bun install
COPY . .
USER bun
CMD ["bun", "./bin/modbus-rest.js"]