# Development stage
FROM node:22-alpine AS development

WORKDIR /app

COPY package.json package-lock.json* tsconfig.base.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

RUN npm install

COPY packages/shared/ packages/shared/
COPY apps/web/ apps/web/

RUN npm run build --workspace=packages/shared

EXPOSE 5173

CMD ["npm", "run", "dev", "--workspace=apps/web", "--", "--host"]

# Production build
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* tsconfig.base.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

RUN npm ci

COPY packages/shared/ packages/shared/
COPY apps/web/ apps/web/

RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=apps/web

# Production stage — serve with nginx
FROM nginx:alpine AS production

COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
