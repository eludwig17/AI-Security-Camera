import cv2, socket, struct, time, threading, logging, config

logger = logging.getLogger(__name__)

class FrameSender:
    """sends the jpeg frames to recieving device from tcp connection"""
    def __init__(self):
        self._sock = None
        self._running = False
        self._thread = None
        self._latestFrame = None
        self._lock = threading.Lock()

    def start(self):
        self._running = True
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()
        logger.info(f"frame sender started, {config.gceVmIp}:{config.gceFramePort}")

    def send(self, frame):
        with self._lock:
            self._latestFrame = frame

    def stop(self):
        self._running = False
        if self._thread:
            self._thread.join(timeout=3)
        if self._sock:
            try:
                self._sock.close()
            except Exception:
                pass
        logger.info("the frame sender stopped")

    def _connect(self) -> bool:
        if self._sock:
            try:
                self._sock.close()
            except Exception:
                pass
        try:
            self._sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self._sock.settimeout(5)
            self._sock.connect((config.gceVmIp, config.gceFramePort))
            self._sock.settimeout(None)
            logger.info("connected to vm frame receiver")
            return True
        except (socket.error, OSError) as e:
            logger.warning(f"frame receiver connection failed: {e}")
            self._sock = None
            return False

    def _loop(self):
        interval = 1.0 / config.sendFps
        while self._running:
            if self._sock is None:
                if not self._connect():
                    time.sleep(2)
                    continue

            with self._lock:
                frame = self._latestFrame
                self._latestFrame = None

            if frame is None:
                time.sleep(0.01)
                continue

            ok, jpeg = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, config.jpegQuality])
            if not ok:
                continue

            payload = jpeg.tobytes()
            header = struct.pack(">I", len(payload))

            try:
                self._sock.sendall(header + payload)
            except (socket.error, OSError, BrokenPipeError):
                logger.warning("frame send failed, attempting to reconnect")
                self._sock = None
                continue

            time.sleep(interval)