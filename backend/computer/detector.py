import cv2, time, logging, config

logger = logging.getLogger(__name__)

class Detector:
    def __init__(self):
        self._model = None

    def load(self):
        from ultralytics import YOLO
        logger.info(f"loading yolo model: {config.modelPath}")
        self._model = YOLO(config.modelPath)
        logger.info("model loaded")

    def detect(self, frame) -> list[dict]:
        if self._model is None:
            self.load()

        results = self._model(frame, imgsz=640, conf=config.confidenceThreshold, verbose=False)
        detections = []

        for result in results:
            if result.boxes is None:
                continue
            for i in range(len(result.boxes)):
                classId = int(result.boxes.cls[i].item())
                if classId not in config.eventClasses:
                    continue
                conf = float(result.boxes.conf[i].item())
                bbox = result.boxes.xyxy[i].cpu().numpy().tolist()
                detections.append({
                    "class_id": classId,
                    "class_name": config.eventClasses[classId],
                    "confidence": round(conf, 3),
                    "bbox": [int(c) for c in bbox],
                })

        return detections

    def annotate(self, frame, detections) -> object:
        out = frame.copy()
        for det in detections:
            x1, y1, x2, y2 = det["bbox"]
            label = f"{det['class_name']} {det['confidence']:.0%}"
            color = config.colors.get(det["class_id"], config.defaultColor)
            cv2.rectangle(out, (x1, y1), (x2, y2), color, 2)
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 1)
            cv2.rectangle(out, (x1, y1 - th - 10), (x1 + tw + 10, y1), color, -1)
            cv2.putText(out, label, (x1 + 5, y1 - 5),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 1, cv2.LINE_AA)

        ts = time.strftime("%Y-%m-%d %H:%M:%S")
        cv2.putText(out, ts, (10, out.shape[0] - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA)