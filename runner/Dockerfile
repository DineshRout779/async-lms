FROM node:20-alpine

# Create non-root user
RUN addgroup -S runner && adduser -S runner -G runner

WORKDIR /workspace

USER runner

# Keep container alive for exec
CMD ["node", "index.js"]
