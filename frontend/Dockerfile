FROM node:24-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

ARG VITE_API_URL=https://backend-production-c7a3.up.railway.app
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build


FROM nginx:alpine AS production

COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

ENV BACKEND_URL=http://backend:3000

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
