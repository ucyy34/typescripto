# Backend için Node tabanlı Dockerfile
FROM node:18

# Çalışma dizinini oluştur
WORKDIR /app

# package.json backend dizininde olduğu için oradan kopyala
COPY backend/package*.json ./

RUN npm install

# Projedeki tüm dosyaları kopyala
COPY . .

# Railway'in dinleyeceği port
EXPOSE 5050

# Uygulamayı başlat
CMD ["npm", "run", "dev"]
