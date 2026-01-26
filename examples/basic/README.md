# Basic Video Call Example

Simple video call application using Zenc SDK.

## Features

- Join/leave rooms
- Video and audio streaming
- Participant management
- Toggle video/audio

## Running

1. Build the SDK:
```bash
cd ../..
npm install
npm run build
```

2. Start zenc-server (in another terminal):
```bash
cd ../../zenc-server
./zenc-server
```

3. Serve this example:
```bash
# Use any static file server
npx serve .
# or
python3 -m http.server 8000
```

4. Open `http://localhost:8000` in multiple browser tabs to test

## Configuration

- **Server URL**: WebSocket endpoint of zenc-server (default: `ws://localhost:8080/ws`)
- **Room ID**: Room identifier (default: `test-room`)

## Code Overview

The example demonstrates:
- Client initialization
- Creating local video/audio tracks
- Joining a room
- Publishing tracks
- Subscribing to remote participants
- Hold/resume functionality
