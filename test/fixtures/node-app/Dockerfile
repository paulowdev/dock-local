ARG DOCK_REGISTRY=docker.io
FROM ${DOCK_REGISTRY}/node:22-alpine
WORKDIR /app
COPY src/server.js ./server.js
EXPOSE 3000
CMD ["node", "server.js"]
