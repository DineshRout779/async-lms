FROM ubuntu:22.04

# Prevent prompts
ENV DEBIAN_FRONTEND=noninteractive

# Install system tools
RUN apt-get update && apt-get install -y \
    sudo \
    curl \
    git \
    bash \
    ca-certificates \
    build-essential \
    python3 \
    python3-pip \
    nodejs \
    npm \
    nano \
    vim \
    unzip \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Create user
RUN useradd -m playground && \
    echo "playground ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Setup shell
USER playground
WORKDIR /workspace

ENV HOME=/home/playground
ENV PATH="$PATH:/home/playground/.npm-global/bin"

# Custom prompt
RUN echo 'export PS1="playground@playground:\\w$ "' >> ~/.bashrc

CMD ["bash"]
