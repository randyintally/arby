FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --only=production || true

# Copy the rest of the app
COPY . .

# Start the bot
CMD ["npm", "start"]
