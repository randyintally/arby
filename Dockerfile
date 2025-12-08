FROM node:20-alpine
WORKDIR /app
COPY . .
CMD ["node", "-e", "console.log('Arby bot placeholder running')"]
