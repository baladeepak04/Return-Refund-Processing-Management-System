FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
# BuildKit cache mount: npm's download cache persists across builds/folders
# instead of re-downloading all ~210 packages every time.
RUN --mount=type=cache,target=/root/.npm npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
