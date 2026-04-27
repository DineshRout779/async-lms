FROM python:3.10-alpine
RUN apk update && apk add --no-cache \
    git \
    sudo \
    nano \
    vim \
    bash \
    build-base
# Create playground user (Alpine uses adduser)
RUN adduser -D -s /bin/bash playground \
    && echo "playground ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers
USER playground
WORKDIR /workspace
CMD ["bash"]