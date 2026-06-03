FROM node:20-alpine

RUN apk update && apk add --no-cache \
    curl \
    git \
    python3 \
    py3-pip \
    sudo \
    nano \
    vim \
    bash \
    build-base

RUN deluser node || true \
    && adduser -u 1000 -D -s /bin/bash playground \
    && echo "playground ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

USER playground
# Pre-bake node_modules for instant workspace boot
WORKDIR /prebaked_modules
COPY package.json .
RUN npm install

WORKDIR /workspace
CMD ["bash"]
