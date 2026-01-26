import EventEmitter from 'eventemitter3';
import { SignalingClient } from '../connection/SignalingClient';
import { Room } from '../room/Room';
import { createVideoTrack, createAudioTrack, createScreenShareTrack } from '../track/Track';
import { RoomRole } from '../types';
import type {
  ZencClientOptions,
  JoinOptions,
  VideoTrackOptions,
  AudioTrackOptions,
  ConnectionState,
  JoinRoomRequest,
  JoinRoomResponse
} from '../types';
import type { LocalVideoTrack, LocalAudioTrack } from '../track/Track';

export class ZencClient extends EventEmitter {
  private signalingClient: SignalingClient;
  private currentRoom?: Room;
  private autoConnect: boolean;

  constructor(options: ZencClientOptions) {
    super();
    
    this.signalingClient = new SignalingClient({
      url: options.url,
      token: options.token,
      reconnect: options.reconnect,
      reconnectAttempts: options.reconnectAttempts,
      reconnectDelay: options.reconnectDelay
    });

    this.autoConnect = options.autoConnect ?? false;

    // Forward signaling client events
    this.signalingClient.on('connected', () => this.emit('connected'));
    this.signalingClient.on('disconnected', (data) => this.emit('disconnected', data));
    this.signalingClient.on('reconnecting', (data) => this.emit('reconnecting', data));
    this.signalingClient.on('reconnectFailed', () => this.emit('reconnectFailed'));
    this.signalingClient.on('connectionStateChanged', (state: ConnectionState) => {
      this.emit('connectionStateChanged', state);
    });
    this.signalingClient.on('error', (error) => this.emit('error', error));

    if (this.autoConnect) {
      this.connect().catch((error) => {
        this.emit('error', error);
      });
    }
  }

  async connect(): Promise<void> {
    return this.signalingClient.connect();
  }

  async disconnect(): Promise<void> {
    if (this.currentRoom) {
      await this.currentRoom.leave();
      this.currentRoom = undefined;
    }
    this.signalingClient.disconnect();
  }

  async joinRoom(roomId: string, options: JoinOptions = {}): Promise<Room> {
    if (this.currentRoom) {
      throw new Error('Already in a room. Leave current room first.');
    }

    const connectionState = this.signalingClient.getConnectionState();
    if (connectionState !== 'connected') {
      await this.connect();
    }

    const request: JoinRoomRequest = {
      roomId,
      userId: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: options.role || RoomRole.PUBLISHER,
      metadata: options.metadata
    };

    return new Promise((resolve, reject) => {
      this.signalingClient.once('room.joined', (response: JoinRoomResponse) => {
        try {
          const room = new Room(
            response.room,
            {
              id: response.participantId,
              userId: request.userId,
              role: request.role,
              joinedAt: Date.now()
            },
            this.signalingClient
          );

          // Add existing participants
          response.participants.forEach((participantInfo) => {
            const participant = new (require('../participant/Participant').Participant)(participantInfo);
            room.participants.set(participant.id, participant);
          });

          this.currentRoom = room;

          // Setup room event forwarding
          room.on('participantJoined', (participant) => this.emit('participantJoined', participant));
          room.on('participantLeft', (participant) => this.emit('participantLeft', participant));
          room.on('trackPublished', (track) => this.emit('trackPublished', track));
          room.on('trackSubscribed', (track, participant) => this.emit('trackSubscribed', track, participant));

          room.once('left', () => {
            this.currentRoom = undefined;
          });

          this.emit('roomJoined', room);
          resolve(room);
        } catch (error) {
          reject(error);
        }
      });

      this.signalingClient.send({
        type: 'room.join',
        data: request
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        reject(new Error('Join room timeout'));
      }, 10000);
    });
  }

  async createVideoTrack(options?: VideoTrackOptions): Promise<LocalVideoTrack> {
    return createVideoTrack(options);
  }

  async createAudioTrack(options?: AudioTrackOptions): Promise<LocalAudioTrack> {
    return createAudioTrack(options);
  }

  async createScreenShareTrack(options?: import('../types').ScreenShareOptions): Promise<LocalVideoTrack> {
    return createScreenShareTrack(options);
  }

  getCurrentRoom(): Room | undefined {
    return this.currentRoom;
  }

  getConnectionState(): ConnectionState {
    return this.signalingClient.getConnectionState();
  }
}
