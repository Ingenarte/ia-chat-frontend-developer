# backend/ollama/Dockerfile
FROM ollama/ollama:latest

ENV TZ=Europe/Rome
# TODO: set your actual model tag
ENV OLLAMA_MODEL=qwen2.5-coder:3b

# Copy startup script
COPY start-ollama.sh /usr/local/bin/start-ollama.sh
RUN chmod +x /usr/local/bin/start-ollama.sh

EXPOSE 11434

# Use our entrypoint (not the default "ollama")
ENTRYPOINT ["/usr/local/bin/start-ollama.sh"]
