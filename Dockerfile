FROM node:20-slim

WORKDIR /app

RUN apt-get update && apt-get install -y procps && rm -rf /var/lib/apt/lists/*


COPY package.json yarn.lock* ./ 

RUN yarn install --frozen-lockfile

COPY . .

EXPOSE 3000

CMD ["yarn","start:dev"]