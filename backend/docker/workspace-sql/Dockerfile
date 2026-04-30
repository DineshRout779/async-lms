FROM alpine:3.19

RUN apk update && apk add --no-cache \
    postgresql15-client \
    git \
    sudo \
    nano \
    vim \
    bash

RUN deluser ubuntu || true \
    && deluser node || true \
    && adduser -u 1000 -D -s /bin/bash playground \
    && echo "playground ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

USER playground
WORKDIR /workspace

CMD ["bash"]
