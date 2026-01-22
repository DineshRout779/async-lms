FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    git \
    build-essential \
    ca-certificates \
    sudo \
    nano \
    vim \
    bash \
    && rm -rf /var/lib/apt/lists/*

# Create python alias
RUN ln -s /usr/bin/python3 /usr/bin/python

# Create playground user
RUN useradd -ms /bin/bash playground \
    && echo "playground ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

USER playground
WORKDIR /workspace

CMD ["bash"]
