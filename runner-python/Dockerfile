FROM python:3.12-alpine

RUN addgroup -S runner && adduser -S runner -G runner

WORKDIR /workspace

USER runner

# Keep container alive for exec-based execution
CMD ["python", "main.py"]
