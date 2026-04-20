import config
from ultralytics import YOLO

def main():
    print(f"exporting {config.modelPtPath} to tensorrt fp16")
    model = YOLO(config.modelPtPath)
    model.export(format="engine", half=True, imgsz=640, device=0, workspace=4, verbose=True)
    print("completed")

if __name__ == "__main__":
    main()