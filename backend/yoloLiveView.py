from ultralytics import YOLO
import cv2

def main():
    model = YOLO("yolov8n.pt")
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Couldn't open camera")
        return

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        results = model(frame, stream=False)
        annotedFrame = results[0].plot()
        cv2.imshow("CV Security Camera", annotedFrame)

        if cv2.waitKey(1) & 0xFF == 27:
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()