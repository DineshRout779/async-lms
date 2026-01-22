FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    curl git build-essential python3 python3-pip \
    ca-certificates sudo nano vim bash \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

RUN useradd -ms /bin/bash playground \
    && echo "playground ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

USER playground
WORKDIR /workspace

CMD ["bash"]
