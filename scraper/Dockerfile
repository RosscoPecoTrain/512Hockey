FROM node:20-slim

# Install Puppeteer dependencies
RUN apt-get update && apt-get install -y \
    libnss3 \
    libgconf-2-4 \
    libxss1 \
    libappindicator1 \
    libindicator7 \
    libgbm1 \
    libxrandr2 \
    libasound2 \
    fonts-liberation \
    libdbus-1-3 \
    libglib2.0-0 \
    ca-certificates \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies (including Puppeteer)
RUN npm ci --only=production

# Copy scraper code
COPY scraper.js .
COPY lib/ ./lib/

# Run scraper
CMD ["node", "scraper.js"]
