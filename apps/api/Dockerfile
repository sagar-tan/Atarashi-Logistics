FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/domain/package.json packages/domain/package.json
COPY apps/customer/package.json apps/customer/package.json
COPY apps/driver/package.json apps/driver/package.json
COPY apps/admin/package.json apps/admin/package.json
COPY apps/api/package.json apps/api/package.json
RUN npm ci --workspace=@atarashi/api --workspace=@atarashi/domain
COPY packages/domain packages/domain
COPY apps/api apps/api
RUN npm run build -w @atarashi/api

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/domain/package.json packages/domain/package.json
COPY apps/customer/package.json apps/customer/package.json
COPY apps/driver/package.json apps/driver/package.json
COPY apps/admin/package.json apps/admin/package.json
COPY apps/api/package.json apps/api/package.json
RUN npm ci --omit=dev --workspace=@atarashi/api --workspace=@atarashi/domain
COPY packages/domain/src packages/domain/src
COPY --from=build /app/apps/api/dist apps/api/dist
EXPOSE 8080
CMD ["npm", "run", "start", "-w", "@atarashi/api"]
