# Plantilla para un futuro hosting compatible con Node y disco persistente.
FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8787 TZ=America/Lima DATABASE_PATH=/data/inkajus.sqlite BACKUP_DIR=/backups
COPY index.html package.json ./
COPY assets ./assets
COPY server ./server
COPY scripts/backup.cjs ./scripts/backup.cjs
RUN mkdir /data /backups && chown node:node /data /backups
USER node
EXPOSE 8787
CMD ["node", "server/index.cjs"]
