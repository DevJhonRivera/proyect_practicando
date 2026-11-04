FROM node:22-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends chromium fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY index.js ./
COPY src ./src

ENV NODE_ENV=production CHROMIUM_BIN=/usr/bin/chromium CHROMIUM_NO_SANDBOX=1
USER node
CMD ["npm", "start"]
