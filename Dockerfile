# Backend deployment Dockerfile for Railway
FROM node:18

WORKDIR /app

# Install dependencies
COPY backend/package*.json ./
RUN npm install --production=false

# Copy backend source code
COPY backend/ ./

ENV NODE_ENV=production

EXPOSE 8080

CMD ["npm", "run", "start"]
