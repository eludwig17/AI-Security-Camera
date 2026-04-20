FROM ultralytics/ultralytics:latest-jetson-jetpack6

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3-opencv \
    v4l-utils \
    gstreamer1.0-tools \
    gstreamer1.0-plugins-base \
    gstreamer1.0-plugins-good \
    gstreamer1.0-plugins-bad \
    gstreamer1.0-plugins-ugly \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 uninstall -y opencv-python opencv-python-headless opencv-contrib-python || true

WORKDIR /app

RUN pip3 install --no-cache-dir requests urllib3

COPY config.py camera.py detector.py frame_sender.py recorder.py main.py export_model.py ./

RUN mkdir -p /app/clips

ENV PYTHONPATH=/usr/lib/python3/dist-packages:${PYTHONPATH}
ENV PYTHONUNBUFFERED=1

CMD ["python3", "main.py"]