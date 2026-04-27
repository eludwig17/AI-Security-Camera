# Artifical Intelligence Security Camera

###### _My Senior Project utilizes a Jetson Orin NX (16GB) that will be accessible via a weblink to see the camera's perspective in real-time, with the goal of the using the AI computing power to detect objects and people on screen, to label those objects and track their movement._

## Overview
 
A self-hosted & privacy-focused security camera system built on edge computing hardware, which all AI inference runs locally on the Jetson meaning there is no data is sent to third-party cloud servers. Detected objects are labeled in real time, events are logged with snapshots and video clips, and everything is viewable through a dashboard in the browser.

Built as a two-semester senior capstone (CSC 495/496) at Concordia University Irvine.
 
---
 
## Contents
 
- [Features](#features)
- [Architecture](#architecture)
- [Stack](#stack)
- [Usage](#usage)
- [License](#license)
---
 
## Features
 
- Real-time yolo26n object detection (TensorRT-optimized) running on-device
- Sub-500ms WebRTC video stream from Jetson to browser
- Rolling buffer recording — 5s pre-detection, 10s post-detection MP4 clips
- Snapshot and event logging per detection (class, confidence, timestamp, bounding box)
- Archives dashboard with search, snapshot viewer, and clip playback
- Google OAuth authentication
- Jetson-to-VM networking over Tailscale (no public IP and/or port forwarding)
- Dockerized frontend/backend on Google Cloud Engine
- Dockerized backend on Jetson Computer
---
 
## Architecture
 
The CSI camera feeds frames into the Jetson, where GStreamer handles capture and YOLOv8 runs inference. Annotated frames are sent over a raw TCP socket through a Tailscale tunnel to a GCE VM (`open-cv-frontend.taila8654.ts.net`), which re-streams them via WebRTC using aiortc. The same VM hosts a FastAPI backend that handles event storage, snapshot serving, and clip playback, backed by PostgreSQL running in Docker. The React frontend connects to the WebRTC signaling server at `/ws/signaling` and displays the live feed, with the Archives page pulling from `/api/events`, `/api/snapshots`, and `/api/clips`.
 
---
 
## Stack
 
The edge device is a Seeed Studio reComputer J4012 running a Jetson Orin NX 16GB, paired with a Seeed Studio CSI camera. Inference runs locally using yolo26n with TensorRT and CUDA acceleration, and frames are captured via GStreamer. The backend is Python/FastAPI with PostgreSQL and aiortc, all running in Docker on a Google Cloud Engine VM. The frontend is React and Vite. Auth is handled by Google OAuth 2.0, and the Jetson connects to the VM privately over the mesh VPN, Tailscale.
 
---
 
## Usage
 
Log in with Google. The Live page shows the annotated real-time feed from the Jetson. The Archives page lets you browse past detection events, view snapshots, and play back video clips. Events can be filtered by class name (`person`, `car`, etc.) or date using the search bar.
 
---
 
## License
 
[MIT](https://github.com/eludwig17/AI-Security-Camera/blob/main/LICENSE)
 
