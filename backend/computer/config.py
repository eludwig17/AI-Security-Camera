import os

# vm connection from tailscale vpn
gceVmIp = os.environ.get("GCE_VM_IP", "100.85.143.65")
gceFramePort = int(os.environ.get("GCE_FRAME_PORT", "9000"))
gceApiUrl = os.environ.get("GCE_API_URL", "https://open-cv-frontend.taila8654.ts.net:8000/api/events")

# camera
cameraType = os.environ.get("CAMERA_TYPE", "csi")
usbCameraIndex = int(os.environ.get("USB_CAMERA_INDEX", "0"))
captureWidth = 1920
captureHeight = 1080
captureFps = 30

# yolo
modelPath = os.environ.get("MODEL_PATH", "yolo26n.engine")
modelPtPath = os.environ.get("MODEL_PT_PATH", "yolo26n.pt")
confidenceThreshold = float(os.environ.get("CONFIDENCE_THRESHOLD", "0.5"))

# classes that trigger events
eventClasses = {0: "person", 3: "motorcycle", 15: "cat", 16: "dog"}

# frame sending
jpegQuality = 95
sendFps = int(os.environ.get("SEND_FPS", "30"))

# recording
preRecordSeconds = 5
postRecordSeconds = 10
recordFps = 15
clipDir = "clips"
eventCooldownSeconds = int(os.environ.get("EVENT_COOLDOWN_SECONDS", "30"))
motionMinPixels = float(os.environ.get("MOTION_MIN_PIXELS", "20"))
motionNoMotionStopSeconds = float(os.environ.get("MOTION_NO_MOTION_STOP_SECONDS", "2.5"))
minClipSeconds = float(os.environ.get("MIN_CLIP_SECONDS", "2"))

eventMinDisplacementPixels = float(os.environ.get("EVENT_MIN_DISPLACEMENT_PIXELS", "80"))

# bounding box colors
colors = {
    0: (0, 0, 255),     # person
    2: (255, 165, 0),   # car
    3: (255, 0, 255),   # motorcycle
    5: (0, 255, 255),   # bus
    7: (128, 128, 0),   # truck
    15: (0, 255, 0),    # cat
    16: (255, 0, 0),    # dog
}
defaultColor = (200, 200, 200)

logLevel = os.environ.get("LOG_LEVEL", "INFO")