# iSigned.it web app — Vite build served by nginx, /api proxied to the backend service
FROM node:22-alpine AS build
WORKDIR /app
ARG VITE_ZITADEL_ISSUER
ARG VITE_ZITADEL_CLIENT_ID
ENV VITE_ZITADEL_ISSUER=$VITE_ZITADEL_ISSUER \
    VITE_ZITADEL_CLIENT_ID=$VITE_ZITADEL_CLIENT_ID
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json vite.config.ts index.html ./
COPY src ./src
RUN npx vite build

FROM nginx:1.27-alpine
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/app.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
