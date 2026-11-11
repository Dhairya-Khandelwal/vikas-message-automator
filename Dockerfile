# Vikas Message Automator - production image
# node:sqlite requires Node 22.13+ (README's "Node 20" is not enough)
FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build

ENV NODE_ENV=production \
    BIND_HOST=0.0.0.0 \
    PORT=3000 \
    TRUST_PROXY=1

# WhatsApp session, SQLite DB and session secret live here. MOUNT A VOLUME.
VOLUME ["/app/data"]

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "require('net').connect(3000,'127.0.0.1').on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))"

CMD ["npm", "start"]
