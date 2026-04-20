CREATE TABLE IF NOT EXISTS events (
    id              SERIAL PRIMARY KEY,
    class_id        INTEGER NOT NULL,
    class_name      VARCHAR(64) NOT NULL,
    confidence      REAL NOT NULL,
    bbox_x1         INTEGER NOT NULL,
    bbox_y1         INTEGER NOT NULL,
    bbox_x2         INTEGER NOT NULL,
    bbox_y2         INTEGER NOT NULL,
    snapshot_path   VARCHAR(512),
    detected_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_detected_at
    ON events (detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_class_id
    ON events (class_id);

CREATE INDEX IF NOT EXISTS idx_events_class_name
    ON events (class_name);

CREATE TABLE IF NOT EXISTS known_faces (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    embedding   FLOAT8[] NOT NULL,
    photo_path  TEXT,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_known_faces_name ON known_faces (name);

ALTER TABLE events ADD COLUMN IF NOT EXISTS face_match TEXT DEFAULT NULL;
ALTER TABLE events ALTER COLUMN detected_at SET DEFAULT NOW();