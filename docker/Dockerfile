# Imagen estática: build de Angular servido por nginx.
#   CONFIGURATION=demo        → build optimizado con mocks (no necesita backend)
#   CONFIGURATION=production  → build de producción contra la API real
FROM node:22-alpine AS build
WORKDIR /app
ENV NG_CLI_ANALYTICS=false
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG CONFIGURATION=demo
RUN npx ng build --configuration ${CONFIGURATION}

FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/argos-web/browser /usr/share/nginx/html
EXPOSE 80
