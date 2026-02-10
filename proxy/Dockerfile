FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --production

COPY dist/ ./dist/

ENV PROXY_PORT=3001
EXPOSE 3001

CMD ["node", "dist/index.js"]
