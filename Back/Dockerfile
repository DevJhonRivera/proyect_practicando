FROM node:22-bookworm-slim

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY index.js ./
COPY src ./src

ENV NODE_ENV=production
USER node
CMD ["npm", "start"]
