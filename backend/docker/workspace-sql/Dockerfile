FROM alpine:3.19

RUN apk update && apk add --no-cache \
    postgresql15-client \
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
