# Backend için Node tabanlı Dockerfile
FROM node:18

# Çalışma dizinini oluştur
WORKDIR /app

# Paket dosyalarını kopyala ve bağımlılıkları yükle
COPY package*.json ./
RUN npm install

# Projedeki tüm dosyaları kopyala
COPY . .

# Railway'in dinleyeceği port
EXPOSE 5050

# Uygulamayı başlat
CMD ["npm", "run", "dev"]
