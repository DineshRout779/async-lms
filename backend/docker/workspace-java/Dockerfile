FROM eclipse-temurin:21-jdk-alpine

RUN apk update && apk add --no-cache \
    git \
    sudo \
    nano \
    vim \
    bash

RUN adduser -D -s /bin/bash playground \
    && echo "playground ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

USER playground
WORKDIR /workspace

CMD ["bash"]
