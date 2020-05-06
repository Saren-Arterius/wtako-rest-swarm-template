FROM node:13-alpine

RUN npm config set unsafe-perm true
RUN npm install -g nodemon

RUN sh -c 'echo "http://dl-cdn.alpinelinux.org/alpine/edge/community" >> /etc/apk/repositories && apk update'

RUN mkdir /app
COPY . /app
WORKDIR /app

RUN npm install
# If 'sharp' is needed
# RUN npm install sharp@^0.23.4

CMD npm run dev