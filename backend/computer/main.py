import argparse, logging, math, signal, sys, time, cv2, config
from camera import Camera
from detector import Detector
from frame_sender import FrameSender
from recorder import RollingBuffer, ClipRecorder
from motion import DetectionMotionFilter

logging.basicConfig(
    level=getattr(logging, config.logLevel),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("main")

def parseArgs():
    p = argparse.ArgumentParser(description="AI Security Camera | Jetson Pipeline")
    p.add_argument("--preview", action="store_true", help="Show local OpenCV preview window")
    p.add_argument("--camera", choices=["csi", "usb"], default=None, help="Override camera type")
    p.add_argument("--model", type=str, default=None, help="Override model path")
    p.add_argument("--confidence", type=float, default=None, help="Override confidence threshold")
    return p.parse_args()

def main():
    args = parseArgs()

    if args.camera:
        config.cameraType = args.camera
    if args.model:
        config.modelPath = args.model
    if args.confidence:
        config.confidenceThreshold = args.confidence

    logger.info(f"starting pipeline: camera={config.cameraType}, model={config.modelPath}, "
                f"conf={config.confidenceThreshold}, vm={config.gceVmIp}:{config.gceFramePort}")

    camera = Camera()
    detector = Detector()
    sender = FrameSender()
    rollingBuffer = RollingBuffer()
    recorder = ClipRecorder()
    motionFilter = DetectionMotionFilter(config.motionMinPixels)

    running = True

    def onSignal(sig, frame):
        nonlocal running
        logger.info("shutdown signal received")
        running = False

    signal.signal(signal.SIGINT, onSignal)
    signal.signal(signal.SIGTERM, onSignal)

    if not camera.open():
        logger.error("can't open camera, see ya later")
        sys.exit(1)

    ret, testFrame = camera.read()
    if not ret:
        logger.error("can't read from camera, bye bye")
        sys.exit(1)

    frameSize = (testFrame.shape[1], testFrame.shape[0])
    detector.load()
    sender.start()

    lastEventTime = {}
    lastEventBbox = {}
    frameCount = 0
    fpsStart = time.time()
    fpsVal = 0.0

    logger.info("the pipeline is running, press ctrl+c to stop")

    while running:
        ret, frame = camera.read()
        if not ret:
            logger.warning("null frame")
            time.sleep(0.05)
            continue

        detections = detector.detect(frame)
        detections = motionFilter.evaluate(detections)
        movingDetections = [d for d in detections if d.get("is_moving")]
        annotated = detector.annotate(frame, detections) if detections else frame

        rollingBuffer.add(frame)
        sender.send(annotated)

        now = time.time()
        for det in movingDetections:
            cls = det["class_name"]

            # cooldown check
            if now - lastEventTime.get(cls, 0) < config.eventCooldownSeconds:
                continue

            # displacement check — skip if bbox center hasn't moved far enough
            # since the last logged event for this class
            lastBbox = lastEventBbox.get(cls)
            if lastBbox is not None:
                cx_new = (det["bbox"][0] + det["bbox"][2]) / 2
                cy_new = (det["bbox"][1] + det["bbox"][3]) / 2
                cx_old = (lastBbox[0] + lastBbox[2]) / 2
                cy_old = (lastBbox[1] + lastBbox[3]) / 2
                if math.hypot(cx_new - cx_old, cy_new - cy_old) < config.eventMinDisplacementPixels:
                    logger.debug(f"skipping event for {cls}: not enough displacement since last event")
                    continue

            lastEventTime[cls] = now
            lastEventBbox[cls] = det["bbox"]

            if not recorder.recording:
                recorder.startRecording(rollingBuffer.dump(), frameSize, det, frame)

        if recorder.recording:
            recorder.addFrame(frame)
            if recorder.shouldStop(motionActive=bool(movingDetections)):
                recorder.stopAndUpload()

        if args.preview:
            cv2.putText(annotated, f"fps: {fpsVal:.1f}", (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
            cv2.imshow("AI Security Camera", annotated)
            if cv2.waitKey(1) & 0xFF == 27:
                break

        frameCount += 1
        elapsed = time.time() - fpsStart
        if elapsed >= 1.0:
            fpsVal = frameCount / elapsed
            frameCount = 0
            fpsStart = time.time()

    logger.info("shutting down")
    sender.stop()
    camera.release()
    if args.preview:
        cv2.destroyAllWindows()
    logger.info("done")

if __name__ == "__main__":
    main()