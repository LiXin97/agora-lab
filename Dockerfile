FROM ubuntu:22.04

LABEL maintainer="Agora Lab Contributors"
LABEL description="Init-only helper image for Agora Lab split-architecture projects"

# Avoid interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        bash \
        tmux \
        jq \
        git \
        python3 \
        ca-certificates \
        curl \
    && rm -rf /var/lib/apt/lists/*

# flock is part of util-linux, which is installed by default on Ubuntu

# Create non-root user
RUN useradd -m -s /bin/bash agora

# Copy project
COPY --chown=agora:agora . /opt/agora-lab

WORKDIR /opt/agora-lab

# Make scripts executable
RUN chmod +x scripts/*.sh hooks/*.sh

# Drop privileges
USER agora

# This image intentionally does not bundle any authenticated AI backend CLI.
# Use it to initialize project-local .agora/ state, then run agents where the backend exists.
CMD ["bash", "/opt/agora-lab/scripts/lab-init.sh", "--help"]
