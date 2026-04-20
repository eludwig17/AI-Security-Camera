FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* frontend/pnpm-lock.yaml* ./
RUN npm install --legacy-peer-deps
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libopus0 \
    libsrtp2-1 \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY backend/vm/VMRequirements.txt ./VMRequirements.txt
RUN pip install --no-cache-dir -r VMRequirements.txt
COPY backend/vm/app.py backend/vm/config.py ./
COPY schema.sql ./
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist
RUN mkdir -p /app/snapshots
EXPOSE 8000 9000
CMD ["python3", "app.py"]
