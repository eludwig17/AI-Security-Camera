FROM ultralytics/ultralytics:latest-jetson-jetpack6

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

# removes the pip openCV that that doesn't have gstreamer support
RUN pip3 uninstall -y opencv-python opencv-python-headless opencv-contrib-python 2>/dev/null || true

WORKDIR /app

RUN pip3 install --no-cache-dir requests urllib3

COPY config.py camera.py detector.py frame_sender.py recorder.py main.py motion.py export_model.py ./

RUN mkdir -p /app/clips

CMD ["python3", "main.py"]