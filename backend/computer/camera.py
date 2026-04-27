import cv2, logging, config

logger = logging.getLogger(__name__)

def _gstreamerPipeline():
    return (
        f"nvarguscamerasrc "
        f"exposuretimerange='13000 683709000' "
        f"gainrange='1 8' "
        f"ispdigitalgainrange='1 4' "
        f"saturation=1.4 "
        f"wbmode=1 "
        f"! "
        f"video/x-raw(memory:NVMM), "
        f"width=(int){config.captureWidth}, "
        f"height=(int){config.captureHeight}, "
        f"framerate=(fraction){config.captureFps}/1 ! "
        f"nvvidconv ! "
        f"video/x-raw, "
        f"width=(int){config.captureWidth}, "
        f"height=(int){config.captureHeight}, "
        f"format=(string)BGRx ! "
        f"videoconvert ! "
        f"video/x-raw, format=(string)BGR ! "
        f"appsink drop=1"
    )

class Camera:
    def __init__(self):
        self._cap = None

    def open(self) -> bool:
        if config.cameraType == "csi":
            pipeline = _gstreamerPipeline()
            logger.info("opening the csi camera via gstreamer")
            self._cap = cv2.VideoCapture(pipeline, cv2.CAP_GSTREAMER)
        else:
            logger.info(f"opening usb camera index {config.usbCameraIndex}")
            self._cap = cv2.VideoCapture(config.usbCameraIndex)
            self._cap.set(cv2.CAP_PROP_FRAME_WIDTH, config.captureWidth)
            self._cap.set(cv2.CAP_PROP_FRAME_HEIGHT, config.captureHeight)
            self._cap.set(cv2.CAP_PROP_FPS, config.captureFps)

        if not self._cap.isOpened():
            logger.error(f"failed to open {config.cameraType.upper()} camera")
            return False

        logger.info("camera opened")
        return True

    def read(self):
        return self._cap.read()

    def release(self):
        if self._cap:
            self._cap.release()