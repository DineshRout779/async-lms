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

# Create directory as root and assign ownership first
WORKDIR /prebaked_modules
RUN chown playground:playground /prebaked_modules

# Switch to the non-root user
USER playground

# Copy package.json with the correct ownership
COPY --chown=playground:playground package.json .

# Now npm install runs safely!
RUN npm install

WORKDIR /workspace
CMD ["bash"]
