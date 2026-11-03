# Zenc SDK

TypeScript/JavaScript SDK for the Zenc livestreaming platform.

## Installation

```bash
npm install @cyper98/zenc-sdk
```

## Quick Start

```typescript
import { ZencClient } from '@cyper98/zenc-sdk';

// Initialize client
const zenc = new ZencClient({
  url: 'wss://your-zenc-server.com',
  token: 'your-jwt-token',
  autoConnect: true
});

// Join a room
const room = await zenc.joinRoom('room-id', {
  audio: true,
  video: true,
  role: 'publisher'
});

// Create and publish video track
const videoTrack = await zenc.createVideoTrack({
  resolution: '1080p',
  frameRate: 30
});
await room.publishTrack(videoTrack);

// Attach to video element
const videoElement = document.getElementById('local-video') as HTMLVideoElement;
videoTrack.attach(videoElement);

// Create and publish audio track
const audioTrack = await zenc.createAudioTrack({
  echoCancellation: true,
  noiseSuppression: true
});
await room.publishTrack(audioTrack);

// Listen for participants
room.on('participantJoined', async (participant) => {
  console.log('Participant joined:', participant.id);
  
  // Subscribe to their tracks
  participant.on('trackPublished', async (track) => {
    const remoteTrack = await room.subscribe(track.id);
    
    if (remoteTrack.kind === 'video') {
      const remoteVideo = document.getElementById('remote-video') as HTMLVideoElement;
      remoteTrack.attach(remoteVideo);
    }
  });
});

// Hold/resume tracks
await videoTrack.hold();  // Pause sending
await videoTrack.resume(); // Resume sending

// Leave room
await room.leave();
```

## Features

- ✅ WebRTC-based real-time streaming
- ✅ Auto-reconnection with exponential backoff
- ✅ Track management (publish/unpublish)
- ✅ Subscribe to remote participants
- ✅ Hold/resume functionality
- ✅ Connection quality monitoring
- ✅ Event-driven architecture
- ✅ TypeScript support

## API Reference

### ZencClient

Main client for connecting to Zenc server.

```typescript
const client = new ZencClient({
  url: 'wss://server.com',
  token: 'jwt-token',
  autoConnect: true,
  reconnect: true,
  reconnectAttempts: 5,
  reconnectDelay: 1000
});
```

**Methods:**
- `connect(): Promise<void>` - Connect to server
- `disconnect(): Promise<void>` - Disconnect from server
- `joinRoom(roomId, options): Promise<Room>` - Join a room
- `createVideoTrack(options): Promise<LocalVideoTrack>` - Create video track
- `createAudioTrack(options): Promise<LocalAudioTrack>` - Create audio track
- `createScreenShareTrack(): Promise<LocalVideoTrack>` - Create screen share track
- `getConnectionState(): ConnectionState` - Get connection state

**Events:**
- `connected` - Connected to server
- `disconnected` - Disconnected from server
- `reconnecting` - Attempting reconnection
- `connectionStateChanged` - Connection state changed
- `roomJoined` - Joined a room
- `participantJoined` - Participant joined room
- `participantLeft` - Participant left room
- `trackPublished` - Track published
- `trackSubscribed` - Track subscribed

### Room

Represents a streaming room.

**Properties:**
- `id: string` - Room ID
- `name: string` - Room name
- `participants: Map<string, Participant>` - Room participants
- `localParticipant: LocalParticipant` - Local participant

**Methods:**
- `publishTrack(track): Promise<void>` - Publish a track
- `unpublishTrack(track): Promise<void>` - Unpublish a track
- `subscribe(trackId): Promise<RemoteTrack>` - Subscribe to track
- `unsubscribe(trackId): Promise<void>` - Unsubscribe from track
- `leave(): Promise<void>` - Leave room

**Events:**
- `participantJoined` - Participant joined
- `participantLeft` - Participant left
- `trackPublished` - Track published
- `trackUnpublished` - Track unpublished
- `trackSubscribed` - Track subscribed
- `trackUnsubscribed` - Track unsubscribed

### LocalVideoTrack / LocalAudioTrack

Local media tracks.

**Methods:**
- `attach(element): void` - Attach to HTML element
- `detach(element?): void` - Detach from element(s)
- `hold(): Promise<void>` - Pause sending
- `resume(): Promise<void>` - Resume sending
- `stop(): void` - Stop track

### RemoteTrack

Remote participant tracks.

**Methods:**
- `attach(element): void` - Attach to HTML element
- `detach(element?): void` - Detach from element(s)
- `requestQuality(quality): void` - Request quality change

## Examples

See the [examples](./examples) directory for complete examples:

- **basic** - Simple video call
- **conference** - Multi-party conferencing
- **broadcast** - Live broadcast setup

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Run tests
npm test

# Type check
npm run typecheck

# Lint
npm run lint
```

## License

Apache License 2.0 - see [LICENSE](LICENSE) for details.

## Links

- [Documentation](https://zenc.example.com/docs)
- [GitHub](https://github.com/cyper98/zenc-sdk)
- [Issues](https://github.com/cyper98/zenc-sdk/issues)
