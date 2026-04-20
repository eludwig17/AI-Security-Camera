import os, json, time, struct, base64, logging, threading, asyncio, math, cv2, av, uvicorn, asyncpg, httpx
from pathlib import Path
from datetime import datetime
from contextlib import asynccontextmanager
from fractions import Fraction
import numpy as np
from aiortc import (
    RTCPeerConnection,
    RTCSessionDescription,
    RTCIceServer,
    RTCConfiguration,
    MediaStreamTrack,
)
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import config
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("server")
TURN_SERVERS = []

# frame buffering
class FrameBuffer:
    def __init__(self):
        self._frame = None
        self._lock = threading.Lock()

    def put(self, frame: np.ndarray):
        with self._lock:
            self._frame = frame

    def get(self) -> np.ndarray | None:
        with self._lock:
            return self._frame

frame_buffer = FrameBuffer()

# frame reciever from tcp connection
class FrameReceiverProtocol(asyncio.Protocol):
    def __init__(self):
        self._buf = bytearray()
        self._expected = None
        self._count = 0

    def connection_made(self, transport):
        peer = transport.get_extra_info("peername")
        logger.info(f"Jetson connected: {peer}")

    def connection_lost(self, exc):
        logger.info(f"Jetson disconnected: {exc}")

    def data_received(self, data: bytes):
        self._buf.extend(data)
        while True:
            if self._expected is None:
                if len(self._buf) < 4:
                    break
                self._expected = struct.unpack(">I", self._buf[:4])[0]
                self._buf = self._buf[4:]

            if len(self._buf) < self._expected:
                break

            jpeg = bytes(self._buf[:self._expected])
            self._buf = self._buf[self._expected:]
            self._expected = None

            arr = np.frombuffer(jpeg, dtype=np.uint8)
            frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            if frame is not None:
                frame_buffer.put(frame)
                self._count += 1
                if self._count % 100 == 0:
                    logger.info(f"Frames received: {self._count}")

# webrtc protocol setup
class CameraStreamTrack(MediaStreamTrack):
    kind = "video"

    def __init__(self):
        super().__init__()
        self._start = time.time()
        self._count = 0
        self._fps = 15

    async def recv(self) -> av.VideoFrame:
        self._count += 1
        target = self._start + self._count * (1.0 / self._fps)
        wait = target - time.time()
        if wait > 0:
            await asyncio.sleep(wait)

        frame = frame_buffer.get()
        if frame is None:
            black = np.zeros((720, 1280, 3), dtype=np.uint8)
            vf = av.VideoFrame.from_ndarray(black, format="bgr24")
        else:
            vf = av.VideoFrame.from_ndarray(frame, format="bgr24")

        vf.pts = self._count
        vf.time_base = Fraction(1, self._fps)
        return vf

active_pcs: set[RTCPeerConnection] = set()

async def handle_offer(sdp: str, sdp_type: str) -> dict:
    ice_servers = [RTCIceServer(urls=[u]) for u in config.stunServers]
    for t in TURN_SERVERS:
        ice_servers.append(RTCIceServer(
            urls=[t["urls"]], username=t.get("username", ""),
            credential=t.get("credential", ""),
        ))

    rtc_config = RTCConfiguration(iceServers=ice_servers)
    pc = RTCPeerConnection(configuration=rtc_config)
    active_pcs.add(pc)

    @pc.on("iceconnectionstatechange")
    async def on_ice():
        state = pc.iceConnectionState
        logger.info(f"ICE: {state}")
        if state in ("failed", "closed", "disconnected"):
            await pc.close()
            active_pcs.discard(pc)

    @pc.on("connectionstatechange")
    async def on_conn():
        if pc.connectionState in ("failed", "closed"):
            await pc.close()
            active_pcs.discard(pc)

    pc.addTrack(CameraStreamTrack())

    offer = RTCSessionDescription(sdp=sdp, type=sdp_type)
    await pc.setRemoteDescription(offer)
    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    return {"sdp": pc.localDescription.sdp, "type": pc.localDescription.type}

# database

_pool: asyncpg.Pool | None = None

async def initDb():
    global _pool
    _pool = await asyncpg.create_pool(
        host=config.dbHost, port=config.dbPort, database=config.dbName,
        user=config.dbUser, password=config.dbPassword,
        min_size=config.dbMinConnections, max_size=config.dbMaxConnections,
    )
    logger.info(f"Database pool: {config.dbName}@{config.dbHost}")

async def closeDb():
    global _pool
    if _pool:
        await _pool.close()

async def insertEvent(classId, className, confidence, bbox, snapshotB64=None, clipB64=None, faceMatch=None):
    snapshotPath = None
    if snapshotB64:
        os.makedirs(config.snapshotDir, exist_ok=True)
        ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S_%f")
        filename = f"{className}_{ts}.jpg"
        snapshotPath = os.path.join(config.snapshotDir, filename)
        try:
            with open(snapshotPath, "wb") as f:
                f.write(base64.b64decode(snapshotB64))
        except Exception as e:
            logger.warning(f"Snapshot save failed: {e}")
            snapshotPath = None

    clipPath = None
    if clipB64:
        os.makedirs(config.snapshotDir, exist_ok=True)
        ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S_%f")
        filename = f"{className}_{ts}.mp4"
        clipPath = os.path.join(config.snapshotDir, filename)
        try:
            with open(clipPath, "wb") as f:
                f.write(base64.b64decode(clipB64))
        except Exception as e:
            logger.warning(f"Clip save failed: {e}")
            clipPath = None

    bboxStr = ",".join(str(c) for c in bbox) if bbox else ""
    row = await _pool.fetchrow(
        "INSERT INTO events (class_id, class_name, confidence, bbox, snapshot_path, clip_path, face_match, detected_at) "
        "VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING id",
        classId, className, confidence, bboxStr, snapshotPath, clipPath, faceMatch,
    )
    return row["id"]

async def getEvents(limit=50, offset=0):
    rows = await _pool.fetch(
        "SELECT id, class_id, class_name, confidence, bbox, snapshot_path, clip_path, face_match, detected_at "
        "FROM events ORDER BY detected_at DESC LIMIT $1 OFFSET $2",
        limit, offset,
    )
    return [dict(r) | {"detected_at": r["detected_at"].isoformat()} for r in rows]

async def getStats():
    row = await _pool.fetchrow(
        "SELECT COUNT(*) as total_events, COUNT(DISTINCT class_name) as unique_classes, "
        "MAX(detected_at) as last_event_at FROM events"
    )
    hour = await _pool.fetchval(
        "SELECT COUNT(*) FROM events WHERE detected_at > NOW() - INTERVAL '1 hour'"
    )
    return {
        "total_events": row["total_events"],
        "unique_classes": row["unique_classes"],
        "last_event_at": row["last_event_at"].isoformat() if row["last_event_at"] else None,
        "events_last_hour": hour,
    }

# facial recognition
def cosineDistance(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    magA = math.sqrt(sum(x * x for x in a))
    magB = math.sqrt(sum(y * y for y in b))
    if magA == 0.0 or magB == 0.0:
        return 2.0
    return 1.0 - (dot / (magA * magB))

async def identifyFace(embedding: list[float]) -> tuple[str, float]:
    rows = await _pool.fetch("SELECT name, embedding FROM known_faces")
    if not rows:
        return "unknown", 2.0

    bestName = "unknown"
    bestDist = 2.0
    for row in rows:
        dist = cosineDistance(embedding, list(row["embedding"]))
        if dist < bestDist:
            bestDist = dist
            bestName = row["name"]

    if bestDist > config.faceRecognitionThreshold:
        return "unknown", bestDist

    return bestName, bestDist

# push notification through ntfy
async def sendAlert(message: str, title: str = "AI Security Camera", priority: str = "default") -> bool:
    if not config.ntfyTopic:
        return False

    url = f"{config.ntfyServer.rstrip('/')}/{config.ntfyTopic}"
    headers = {"Title": title, "Priority": priority, "Content-Type": "text/plain"}

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(url, content=message.encode(), headers=headers)
            response.raise_for_status()
            logger.info(f"Alert sent: {message}")
            return True
    except httpx.HTTPError as e:
        logger.error(f"Alert failed: {e}")
        return False

# vm app lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    await initDb()
    loop = asyncio.get_event_loop()
    frameServer = await loop.create_server(FrameReceiverProtocol, config.serverHost, config.frameRecieverPort)
    os.makedirs(config.snapshotDir, exist_ok=True)
    logger.info(f"Ready — HTTP :{config.serverPort} | Frames :{config.frameRecieverPort}")
    yield
    for pc in list(active_pcs):
        await pc.close()
    active_pcs.clear()
    frameServer.close()
    await closeDb()

app = FastAPI(title="AI Security Camera", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

@app.websocket("/ws/signaling")
async def signaling(ws: WebSocket):
    await ws.accept()
    logger.info("Signaling WS opened")
    try:
        iceCfg = {
            "type": "ice_config",
            "servers": [{"urls": u} for u in config.stunServers] + [
                {"urls": t["urls"], "username": t.get("username", ""),
                 "credential": t.get("credential", "")} for t in TURN_SERVERS
            ],
        }
        await ws.send_json(iceCfg)

        while True:
            data = await ws.receive_json()
            if data.get("type") == "offer":
                answer = await handle_offer(sdp=data["sdp"], sdp_type=data["type"])
                await ws.send_json(answer)
                logger.info("SDP answer sent")
    except WebSocketDisconnect:
        logger.info("Signaling WS closed")
    except Exception as e:
        logger.error(f"Signaling error: {e}")

# event creation on detection
class EventCreate(BaseModel):
    class_id: int
    class_name: str
    confidence: float
    bbox: list[int] = []
    snapshot_b64: str | None = None
    clip_b64: str | None = None
    face_embedding: list[float] | None = None

@app.post("/api/events")
async def createEvent(event: EventCreate):
    faceMatch = None

    if event.face_embedding:
        matchedName, distance = await identifyFace(event.face_embedding)
        faceMatch = matchedName
        logger.info(f"Face match: {matchedName} (distance={distance:.4f})")

    eid = await insertEvent(
        event.class_id, event.class_name, event.confidence,
        event.bbox, event.snapshot_b64, event.clip_b64, faceMatch,
    )

    if event.class_name == "person":
        if faceMatch is None or faceMatch == "unknown":
            await sendAlert(
                message=f"Person detected — confidence {event.confidence:.0%}, event {eid}",
                title="Security Alert",
                priority="high",
            )

    return {"id": eid, "status": "ok", "face_match": faceMatch}

@app.delete("/api/events/{event_id}")
async def delete_event(event_id: int):
    async with _pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM events WHERE id = $1", event_id)
        if not row:
            raise HTTPException(status_code=404, detail="Event not found.")

        if row["snapshot_path"] and os.path.exists(row["snapshot_path"]):
            try:
                os.remove(row["snapshot_path"])
            except OSError as e:
                print(f"Warning: could not delete snapshot {row['snapshot_path']}: {e}")

        if row["clip_path"] and os.path.exists(row["clip_path"]):
            try:
                os.remove(row["clip_path"])
            except OSError as e:
                print(f"Warning: could not delete clip {row['clip_path']}: {e}")

        await conn.execute("DELETE FROM events WHERE id = $1", event_id)

    return {"deleted": event_id}

@app.get("/api/events")
async def listEvents(limit: int = 50, offset: int = 0):
    return {"events": await getEvents(limit, offset)}

@app.get("/api/stats")
async def stats():
    return await getStats()

@app.get("/api/snapshots/{filename}")
async def snapshot(filename: str):
    path = os.path.join(config.snapshotDir, filename)
    if not os.path.exists(path):
        return JSONResponse(status_code=404, content={"error": "Not found"})
    return FileResponse(path, media_type="image/jpeg")

@app.get("/api/clips/{filename}")
async def clip(filename: str):
    path = os.path.join(config.snapshotDir, filename)
    if not os.path.exists(path):
        return JSONResponse(status_code=404, content={"error": "Not found"})
    return FileResponse(path, media_type="video/mp4")

@app.get("/api/health")
async def health():
    return {"status": "ok", "jetson_connected": frame_buffer.get() is not None}


# facial recognition setup
class FaceEnroll(BaseModel):
    name: str
    embedding: list[float]
    photo_path: str | None = None

@app.post("/api/faces")
async def enrollFace(face: FaceEnroll):
    row = await _pool.fetchrow(
        "INSERT INTO known_faces (name, embedding, photo_path) VALUES ($1, $2, $3) RETURNING id, enrolled_at",
        face.name, face.embedding, face.photo_path,
    )
    logger.info(f"Face enrolled: {face.name} (id={row['id']})")
    return {"id": row["id"], "name": face.name, "enrolled_at": row["enrolled_at"].isoformat()}

@app.get("/api/faces")
async def listFaces():
    rows = await _pool.fetch(
        "SELECT id, name, photo_path, enrolled_at FROM known_faces ORDER BY name, enrolled_at"
    )
    return [{"id": r["id"], "name": r["name"], "photo_path": r["photo_path"], "enrolled_at": r["enrolled_at"].isoformat()} for r in rows]

@app.delete("/api/faces/{faceId}")
async def deleteFace(faceId: int):
    result = await _pool.execute("DELETE FROM known_faces WHERE id = $1", faceId)
    if result.split()[-1] == "0":
        raise HTTPException(status_code=404, detail="Face not found")
    return {"deleted": True, "id": faceId}

@app.post("/api/faces/identify")
async def identifyFaceEndpoint(payload: dict):
    embedding = payload.get("embedding")
    if not embedding:
        raise HTTPException(status_code=400, detail="embedding required")
    name, distance = await identifyFace(embedding)
    return {"match": name, "distance": round(distance, 4), "threshold": config.faceRecognitionThreshold}

frontend = Path(config.frontendBuildDir).resolve()
if frontend.exists() and (frontend / "assets").exists():
    app.mount("/assets", StaticFiles(directory=frontend / "assets"), name="assets")

    @app.get("/{path:path}")
    async def spa(path: str):
        file = frontend / path
        if file.is_file():
            return FileResponse(file)
        return FileResponse(frontend / "index.html")
else:
    logger.warning(f"Frontend files not found at {config.frontendBuildDir}")

    @app.get("/")
    async def noFrontend():
        return JSONResponse(content={
            "message": "AI Security Camera API running",
            "note": "Build frontend: cd frontend && npm install && npm run build",
            "endpoints": {
                "signaling": "ws://HOST:8000/ws/signaling",
                "events": "/api/events",
                "stats": "/api/stats",
                "health": "/api/health",
                "faces": "/api/faces",
            },
        })

if __name__ == "__main__":
    uvicorn.run("app:app", host=config.serverHost, port=config.serverPort, log_level="info")