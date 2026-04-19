# Development stage
FROM node:22-alpine AS development

WORKDIR /app

COPY package.json package-lock.json* tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/

RUN npm install

COPY packages/shared/ packages/shared/
COPY apps/api/ apps/api/

RUN npm run build --workspace=packages/shared

EXPOSE 3000

CMD ["npm", "run", "dev", "--workspace=apps/api"]

# Production build
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/

RUN npm ci

COPY packages/shared/ packages/shared/
COPY apps/api/ apps/api/

RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=apps/api

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

COPY --from=build /app/package.json ./
COPY --from=build /app/apps/api/package.json apps/api/
COPY --from=build /app/packages/shared/package.json packages/shared/

RUN npm ci --omit=dev

COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/packages/shared/dist packages/shared/dist

EXPOSE 3000

CMD ["node", "apps/api/dist/main"]
