FROM oven/bun:1.0.3
WORKDIR /app
COPY package*.json .
RUN bun install
COPY . .
USER bun
CMD ["bun", "./bin/modbus-rest.js"]