import cv2, os, time, base64, logging, threading, requests, urllib3, config
from collections import deque

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
logger = logging.getLogger(__name__)

class RollingBuffer:
    def __init__(self):
        maxFrames = int(config.preRecordSeconds * config.recordFps)
        self.buffer = deque(maxlen=maxFrames)

    def add(self, frame):
        self.buffer.append((time.time(), frame.copy()))

    def dump(self) -> list:
        frames = list(self.buffer)
        self.buffer.clear()
        return frames

class ClipRecorder:
    def __init__(self):
        self._recording = False
        self._writer = None
        self._filepath = None
        self._startTime = 0
        self._frameSize = None
        self._detectionInfo = None
        self._snapshotFrame = None
        self._lastMotionTime = 0.0
        os.makedirs(config.clipDir, exist_ok=True)

    @property
    def recording(self) -> bool:
        return self._recording

    def _fourcc(self):
        return cv2.VideoWriter_fourcc(*"X264")

    def startRecording(self, preBuffer: list, frameSize: tuple, detectionInfo: dict, snapshotFrame):
        if self._recording:
            return

        ts = time.strftime("%Y%m%d_%H%M%S")
        className = detectionInfo.get("class_name", "event")
        self._filepath = os.path.join(config.clipDir, f"{className}_{ts}.mp4")
        self._frameSize = frameSize
        self._detectionInfo = detectionInfo
        self._snapshotFrame = snapshotFrame.copy()
        self._startTime = time.time()
        self._lastMotionTime = self._startTime
        self._recording = True

        self._writer = cv2.VideoWriter(
            self._filepath,
            self._fourcc(),
            config.recordFps,
            frameSize,
        )

        for _, frame in preBuffer:
            self._writer.write(frame)

        logger.info(f"recording started: {self._filepath}")

    def addFrame(self, frame):
        if self._recording and self._writer:
            self._writer.write(frame)

    def shouldStop(self, motionActive: bool = True) -> bool:
        if not self._recording:
            return False

        now = time.time()
        if motionActive:
            self._lastMotionTime = now

        elapsed = now - self._startTime
        if elapsed >= config.postRecordSeconds:
            return True

        if elapsed >= config.minClipSeconds and (now - self._lastMotionTime) >= config.motionNoMotionStopSeconds:
            return True

        return False

    def stopAndUpload(self):
        if not self._recording:
            return

        self._recording = False
        if self._writer:
            self._writer.release()
            self._writer = None

        filepath = self._filepath
        detectionInfo = self._detectionInfo
        snapshotFrame = self._snapshotFrame

        threading.Thread(
            target=self._upload,
            args=(filepath, detectionInfo, snapshotFrame),
            daemon=True,
        ).start()

    def _upload(self, filepath: str, detectionInfo: dict, snapshotFrame):
        try:
            _, jpeg = cv2.imencode(".jpg", snapshotFrame, [cv2.IMWRITE_JPEG_QUALITY, 90])
            snapshotB64 = base64.b64encode(jpeg.tobytes()).decode()

            clipB64 = None
            if filepath and os.path.exists(filepath):
                with open(filepath, "rb") as f:
                    clipB64 = base64.b64encode(f.read()).decode()

            payload = {
                "class_id": detectionInfo["class_id"],
                "class_name": detectionInfo["class_name"],
                "confidence": detectionInfo["confidence"],
                "bbox": detectionInfo.get("bbox", []),
                "snapshot_b64": snapshotB64,
                "clip_b64": clipB64,
            }

            r = requests.post(config.gceApiUrl, json=payload, timeout=30, verify=False)
            if r.status_code == 200:
                logger.info(f"event uploaded: {detectionInfo['class_name']} ({detectionInfo['confidence']:.0%})")
                if filepath and os.path.exists(filepath):
                    os.remove(filepath)
            else:
                logger.warning(f"upload failed: HTTP {r.status_code}")

        except requests.exceptions.RequestException as e:
            logger.warning(f"upload error: {e}")
        except Exception as e:
            logger.error(f"unexpected upload error: {e}")