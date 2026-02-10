FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY src/ ./src/
COPY tsconfig.json ./

RUN npx tsc

RUN npm prune --production

ENV PORT=3001
EXPOSE 3001

CMD ["node", "dist/index.js"]
