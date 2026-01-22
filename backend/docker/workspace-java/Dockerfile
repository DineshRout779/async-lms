FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    openjdk-21-jdk git sudo nano vim bash \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -ms /bin/bash playground \
    && echo "playground ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

USER playground
WORKDIR /workspace

CMD ["bash"]
