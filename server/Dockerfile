FROM node:20-alpine

WORKDIR /app

COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev

COPY server ./server
COPY venue-demo ./venue-demo

WORKDIR /app/server

EXPOSE 3001

CMD ["npm", "run", "start"]
