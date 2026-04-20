FROM ultralytics/ultralytics:latest-jetson-jetpack6

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    libx264-dev \
    v4l-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY JetsonRequirements.txt ./
RUN pip install --no-cache-dir -r JetsonRequirements.txt

COPY config.py camera.py detector.py frame_sender.py recorder.py main.py export_model.py ./

RUN mkdir -p /app/clips

ENV PYTHONUNBUFFERED=1

CMD ["python3", "main.py"]
