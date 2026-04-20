import os

serverHost = os.environ.get("SERVER_HOST", "0.0.0.0")
serverPort = int(os.environ.get("SERVER_PORT", "8000"))

frameRecieverHost = os.environ.get("FRAME_RECEIVER_HOST", "0.0.0.0")
frameRecieverPort = int(os.environ.get("FRAME_RECEIVER_PORT", "9000"))

dbHost = os.environ.get("DB_HOST", "localhost")
dbPort = int(os.environ.get("DB_PORT", "5432"))
dbName = os.environ.get("DB_NAME", "ai_camera")
dbUser = os.environ.get("DB_USER", "camera_user")
dbPassword = os.environ.get("DB_PASSWORD", "changeme_in_production")
dbMinConnections = int(os.environ.get("DB_MIN_CONNECTIONS", "2"))
dbMaxConnections = int(os.environ.get("DB_MAX_CONNECTIONS", "10"))

snapshotDir = os.environ.get("SNAPSHOT_DIR", "snapshots")

stunServers = [
    "stun:stun.l.google.com:19302",
    "stun:stun1.l.google.com:19302",
]

frontendBuildDir = os.environ.get("FRONTEND_BUILD_DIR", "frontend/dist")

logLevel = os.environ.get("LOG_LEVEL", "INFO")

ntfyServer = os.environ.get("NTFY_SERVER", "https://ntfy.sh")
ntfyTopic = os.environ.get("NTFY_TOPIC", "")

faceRecognitionThreshold = float(os.environ.get("FACE_RECOGNITION_THRESHOLD", "0.4"))