import math
from typing import Any

def _iou(a: list[int], b: list[int]) -> float:
    ax1, ay1, ax2, ay2 = a
    bx1, by1, bx2, by2 = b

    ix1 = max(ax1, bx1)
    iy1 = max(ay1, by1)
    ix2 = min(ax2, bx2)
    iy2 = min(ay2, by2)

    if ix2 <= ix1 or iy2 <= iy1:
        return 0.0

    inter = (ix2 - ix1) * (iy2 - iy1)
    area_a = max(0, ax2 - ax1) * max(0, ay2 - ay1)
    area_b = max(0, bx2 - bx1) * max(0, by2 - by1)
    denom = area_a + area_b - inter
    if denom <= 0:
        return 0.0
    return inter / denom

def _center(bbox: list[int]) -> tuple[float, float]:
    x1, y1, x2, y2 = bbox
    return ((x1 + x2) / 2.0, (y1 + y2) / 2.0)


class DetectionMotionFilter:
    """Marks detections as moving by comparing to prior frame boxes."""

    def __init__(self, min_move_pixels: float, min_iou_for_match: float = 0.1):
        self._min_move_pixels = min_move_pixels
        self._min_iou_for_match = min_iou_for_match
        self._prev_detections: list[dict[str, Any]] = []

    def evaluate(self, detections: list[dict[str, Any]]) -> list[dict[str, Any]]:
        prev_pool = [d.copy() for d in self._prev_detections]
        used_prev = set()
        evaluated = []

        for det in detections:
            cls = det.get("class_id")
            bbox = det.get("bbox", [])
            best_idx = -1
            best_iou = 0.0

            for idx, prev in enumerate(prev_pool):
                if idx in used_prev:
                    continue
                if prev.get("class_id") != cls:
                    continue
                prev_bbox = prev.get("bbox", [])
                if len(prev_bbox) != 4 or len(bbox) != 4:
                    continue
                score = _iou(bbox, prev_bbox)
                if score > best_iou:
                    best_iou = score
                    best_idx = idx

            det_out = dict(det)
            moving = True
            if best_idx >= 0 and best_iou >= self._min_iou_for_match:
                used_prev.add(best_idx)
                cx, cy = _center(bbox)
                px, py = _center(prev_pool[best_idx]["bbox"])
                moving = math.hypot(cx - px, cy - py) >= self._min_move_pixels

            det_out["is_moving"] = moving
            evaluated.append(det_out)

        self._prev_detections = [dict(d) for d in detections]
        return evaluated