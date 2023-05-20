FROM node:20 as build

WORKDIR /app

COPY ./package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
ENV PORT 8080
WORKDIR /app

RUN apk add dumb-init

COPY ./package*.json ./

RUN npm ci --only=production

COPY --from=build /app/build .

CMD ["dumb-init", "node", "--max_old_space_size=512", "./index.js"]